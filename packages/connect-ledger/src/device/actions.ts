// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	type DeviceActionState,
	DeviceActionStatus,
	type ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit'
import { type Observable, Subscription } from 'rxjs'

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

export function waitFor<T>(
	observable: Observable<T>,
	signal: AbortSignal,
	accept: (value: T) => boolean,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const subscriptions = new Subscription()
		let settled = false
		const finish = (value?: T, error?: unknown) => {
			if (settled) return
			settled = true
			subscriptions.unsubscribe()
			signal.removeEventListener('abort', abort)
			if (error !== undefined) reject(error)
			else resolve(value as T)
		}
		const abort = () => finish(undefined, signal.reason)
		if (signal.aborted) {
			abort()
			return
		}
		signal.addEventListener('abort', abort, { once: true })
		subscriptions.add(
			observable.subscribe({
				next: (value) => {
					if (accept(value)) finish(value)
				},
				error: (error) => finish(undefined, ledgerSdkError(error)),
				complete: () =>
					finish(
						undefined,
						new Error('Ledger disconnected before responding.'),
					),
			}),
		)
	})
}

export async function ledgerAction<Output, Error, Intermediate>(
	action: ExecuteDeviceActionReturnType<Output, Error, Intermediate>,
	signal: AbortSignal,
): Promise<Output> {
	const cancel = () => action.cancel()
	signal.addEventListener('abort', cancel, { once: true })
	try {
		if (signal.aborted) cancel()
		const state: DeviceActionState<Output, Error, Intermediate> = await waitFor(
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

export function waitForPromise<T>(
	promise: Promise<T>,
	signal: AbortSignal,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const abort = () => {
			signal.removeEventListener('abort', abort)
			reject(signal.reason)
		}
		if (signal.aborted) abort()
		else signal.addEventListener('abort', abort, { once: true })
		void promise.then(
			(value) => {
				signal.removeEventListener('abort', abort)
				resolve(value)
			},
			(error) => {
				signal.removeEventListener('abort', abort)
				reject(error)
			},
		)
	})
}
