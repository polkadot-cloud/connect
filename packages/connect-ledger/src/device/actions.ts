// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	DeviceActionStatus,
	type ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit'
import {
	type ObservableInput,
	filter,
	firstValueFrom,
	from,
	fromEvent,
	map,
	merge,
	startWith,
	throwIfEmpty,
} from 'rxjs'

// DMK errors are tagged objects, rather than native Error instances.
export function ledgerSdkError(error: unknown): Error {
	if (error instanceof Error) return error
	if (typeof error === 'object' && error !== null) {
		const detail = error as {
			_tag?: string
			message?: string
			errorCode?: string
		}
		return new Error(
			`${detail._tag || 'LedgerError'}: ${detail.message || ''} ${detail.errorCode || ''}`.trim(),
			{ cause: error },
		)
	}
	return new Error('Ledger connection failed.', { cause: error })
}

export async function waitFor<T>(
	source: ObservableInput<T>,
	signal: AbortSignal,
	accept: (value: T) => boolean = () => true,
): Promise<T> {
	try {
		const value = await firstValueFrom(
			merge(
				// Observe promises even when already aborted, consuming late rejections.
				from(source).pipe(
					filter(accept),
					throwIfEmpty(
						() => new Error('Ledger disconnected before responding.'),
					),
				),
				fromEvent(signal, 'abort').pipe(
					startWith(null),
					filter(() => signal.aborted),
					map((): never => {
						throw signal.reason
					}),
				),
			),
		)
		signal.throwIfAborted()
		return value
	} catch (error) {
		throw signal.aborted ? signal.reason : ledgerSdkError(error)
	}
}

export async function ledgerAction<Output, Error, Intermediate>(
	action: ExecuteDeviceActionReturnType<Output, Error, Intermediate>,
	signal: AbortSignal,
): Promise<Output> {
	const cancel = () => action.cancel()
	signal.addEventListener('abort', cancel, { once: true })
	try {
		if (signal.aborted) cancel()
		const state = await waitFor(
			action.observable,
			signal,
			({ status }) =>
				status === DeviceActionStatus.Completed ||
				status === DeviceActionStatus.Error ||
				status === DeviceActionStatus.Stopped,
		)
		signal.throwIfAborted()
		if (state.status === DeviceActionStatus.Completed) return state.output
		if (state.status === DeviceActionStatus.Error)
			throw ledgerSdkError(state.error)
		throw new DOMException('Ledger operation cancelled.', 'AbortError')
	} finally {
		signal.removeEventListener('abort', cancel)
	}
}
