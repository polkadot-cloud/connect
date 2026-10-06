// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only
// @vitest-environment jsdom

import { StrictMode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { LedgerContextInterface } from '../../packages/connect-ledger/src/types'

const ledger = vi.hoisted(() => ({
	deviceModel: 'nano_s_plus',
	initialise: vi.fn(),
	getVersion: vi.fn(),
	getAddress: vi.fn(),
	unmount: vi.fn(),
}))
vi.mock('../../packages/connect-ledger/src/device/ledger', () => ({
	Ledger: ledger,
}))
import {
	LedgerProvider,
	useLedger,
} from '../../packages/connect-ledger/src/LedgerContext'

let root: Root
let context: LedgerContextInterface
let container: HTMLDivElement
function Probe() {
	context = useLedger()
	return null
}
function deferred<T>() {
	let resolve: (value: T) => void = () => {}
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

beforeEach(async () => {
	vi.resetAllMocks()
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	ledger.initialise.mockResolvedValue({ app: {}, deviceModel: 'nano_s_plus' })
	ledger.unmount.mockResolvedValue(undefined)
	container = document.createElement('div')
	root = createRoot(container)
	await act(async () =>
		root.render(
			<StrictMode>
				<LedgerProvider>
					<Probe />
				</LedgerProvider>
			</StrictMode>,
		),
	)
})
afterEach(async () => {
	await act(async () => root.unmount())
	vi.unstubAllGlobals()
})

test('discarded address responses cannot repopulate a cancelled import', async () => {
	const address = deferred<{ address: string; pubKey: string }>()
	ledger.getAddress.mockReturnValue(address.promise)
	let pending: Promise<void>
	await act(async () => {
		pending = context.handleGetAddress(7, 0)
	})
	expect(context.isExecuting).toBe(true)
	await act(async () => context.handleUnmount())
	await act(async () => {
		address.resolve({
			address: 'public-test-address',
			pubKey: 'public-test-key',
		})
		await pending
	})
	expect(context.transportResponse).toBeNull()
	expect(context.isExecuting).toBe(false)
	expect(context.getFeedbackCode().message).toBeNull()
})

test('late version results do not verify a cancelled signing task', async () => {
	const version = deferred<void>()
	ledger.getVersion.mockReturnValue(version.promise)
	let pending: Promise<void>
	await act(async () => {
		pending = context.checkRuntimeVersion()
	})
	await act(async () => context.handleUnmount())
	await act(async () => {
		version.resolve()
		await pending
	})
	expect(context.integrityChecked).toBe(false)
	expect(context.isExecuting).toBe(false)
})

test('provider disposal closes active SDK sessions', async () => {
	const previous = ledger.unmount.mock.calls.length
	await act(async () => root.unmount())
	expect(ledger.unmount.mock.calls.length).toBe(previous + 1)
})

test('resetting a pending task cancels its session and discards its late response', async () => {
	const address = deferred<{ address: string; pubKey: string }>()
	ledger.getAddress.mockReturnValue(address.promise)
	let pending: Promise<void>
	await act(async () => {
		pending = context.handleGetAddress(7, 0)
	})
	const previous = ledger.unmount.mock.calls.length
	await act(async () => context.handleResetLedgerTask())
	expect(ledger.unmount.mock.calls.length).toBe(previous + 1)
	await act(async () => {
		address.resolve({ address: 'public-address', pubKey: 'public-key' })
		await pending
	})
	expect(context.transportResponse).toBeNull()
	expect(context.getFeedbackCode().message).toBeNull()
	expect(context.isExecuting).toBe(false)
})
