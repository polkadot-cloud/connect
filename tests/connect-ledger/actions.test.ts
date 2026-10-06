// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	type DeviceActionState,
	DeviceActionStatus,
} from '@ledgerhq/device-management-kit'
import { EMPTY, Observable, Subject, of } from 'rxjs'
import { expect, test, vi } from 'vitest'
import {
	ledgerAction,
	waitFor,
} from '../../packages/connect-ledger/src/device/actions'

test('synchronous discovery stops at the first matching device and disposes its subscription', async () => {
	const dispose = vi.fn()
	const source = new Observable<number>((subscriber) => {
		subscriber.next(0)
		subscriber.next(1)
		expect(subscriber.closed).toBe(true)
		return dispose
	})
	expect(await waitFor(source, new AbortController().signal, Boolean)).toBe(1)
	expect(dispose).toHaveBeenCalledOnce()
})

test('cancellation detaches the discovery subscription and rejects with the original reason', async () => {
	const source = new Subject<number>()
	const controller = new AbortController()
	const pending = waitFor(source, controller.signal)
	const reason = new Error('Cancelled discovery')
	controller.abort(reason)
	await expect(pending).rejects.toBe(reason)
	expect(source.observed).toBe(false)
})

test('already-cancelled waits consume late promise rejections and reject synchronous results', async () => {
	const controller = new AbortController()
	controller.abort()
	let reject!: (error: Error) => void
	const source = new Promise<never>((_, fail) => {
		reject = fail
	})
	await expect(waitFor(source, controller.signal)).rejects.toBe(
		controller.signal.reason,
	)
	reject(new Error('Late HID open failure'))
	await expect(waitFor(of(1), controller.signal)).rejects.toBe(
		controller.signal.reason,
	)
})

test('a discovery stream ending without a device rejects instead of hanging', async () => {
	await expect(waitFor(EMPTY, new AbortController().signal)).rejects.toThrow(
		'disconnected before responding',
	)
})

test('cancellation wins when the SDK synchronously emits stopped from cancel', async () => {
	const observable = new Subject<DeviceActionState<number, Error, never>>()
	const cancel = vi.fn(() =>
		observable.next({ status: DeviceActionStatus.Stopped }),
	)
	const controller = new AbortController()
	const pending = ledgerAction({ observable, cancel }, controller.signal)
	const reason = new Error('Timeout: Ledger request timed out.')
	controller.abort(reason)
	await expect(pending).rejects.toBe(reason)
	expect(cancel).toHaveBeenCalledOnce()
	expect(observable.observed).toBe(false)
})

test('completed actions return their output and remove the abort listener', async () => {
	const controller = new AbortController()
	const cancel = vi.fn()
	const observable = of({
		status: DeviceActionStatus.Completed as const,
		output: 42,
	})
	expect(await ledgerAction({ observable, cancel }, controller.signal)).toBe(42)
	controller.abort()
	expect(cancel).not.toHaveBeenCalled()
})

test('cancellation between a completed SDK result and its caller still rejects the action', async () => {
	const controller = new AbortController()
	const observable = new Observable<DeviceActionState<number, Error, never>>(
		(subscriber) => {
			subscriber.next({ status: DeviceActionStatus.Completed, output: 42 })
			queueMicrotask(() => queueMicrotask(() => controller.abort()))
		},
	)
	await expect(
		ledgerAction({ observable, cancel: vi.fn() }, controller.signal),
	).rejects.toMatchObject({ name: 'AbortError' })
})
