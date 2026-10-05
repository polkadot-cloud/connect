// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { unsubAll } from '../../packages/connect-core/src/accounts'
import {
	connectExtension,
	getExtensions,
} from '../../packages/connect-core/src/extensions'
import {
	canConnect,
	extensionAccounts$,
	getStatus,
	removeStatus,
	resetAccounts,
} from '../../packages/connect-core/src/index'

const ids = ['cloud-signer', 'polkadot-js', 'subwallet-js', 'talisman']

beforeEach(() => {
	vi.useFakeTimers()
	for (const id of ids) removeStatus(id)
	resetAccounts()
})

afterEach(() => {
	unsubAll()
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const inject = (injectedWeb3: Record<string, unknown>) => {
	const parent = { injectedWeb3 }
	vi.stubGlobal('window', { ...parent, parent })
}

test.each([false, true])(
	'discovers Cloud Signer with other wallets installed: %s',
	async (otherWallets) => {
		const enable = vi.fn()
		inject({
			'cloud-signer': { enable, version: '0.1.0' },
			...(otherWallets
				? Object.fromEntries(ids.slice(1).map((id) => [id, { enable }]))
				: {}),
		})

		await getExtensions()
		await vi.advanceTimersByTimeAsync(1000)

		expect(getStatus('cloud-signer')).toBe('installed')
		expect(canConnect('cloud-signer')).toBe(true)
		expect(enable).not.toHaveBeenCalled()
		if (otherWallets) {
			for (const id of ids.slice(1)) expect(getStatus(id)).toBe('installed')
		}
	},
)

test('does not report Cloud Signer installed when it is absent', async () => {
	inject({ 'polkadot-js': { enable: vi.fn() } })
	await getExtensions()
	await vi.advanceTimersByTimeAsync(1000)

	expect(getStatus('cloud-signer')).toBeUndefined()
	expect(canConnect('cloud-signer')).toBe(false)
})

test('connects a discovered Cloud Signer and imports subscribed accounts with its signer', async () => {
	const account = {
		address: `0x${'11'.repeat(32)}`,
		name: 'Cloud Signer test account',
	}
	const signer = { signPayload: vi.fn(), signRaw: vi.fn() }
	const unsubscribe = vi.fn()
	const subscribe = vi.fn(
		(callback: (accounts: (typeof account)[]) => void) => {
			callback([account])
			return unsubscribe
		},
	)
	const enable = vi.fn().mockResolvedValue({
		accounts: { get: vi.fn().mockResolvedValue([account]), subscribe },
		signer,
	})
	inject({ 'cloud-signer': { enable, version: '0.1.0' } })
	await getExtensions()
	await vi.advanceTimersByTimeAsync(1000)

	expect(await connectExtension('Cloud Apps test', 0, 'cloud-signer')).toBe(
		true,
	)
	expect(enable).toHaveBeenCalledWith('Cloud Apps test')
	expect(getStatus('cloud-signer')).toBe('connected')
	expect(subscribe).toHaveBeenCalledOnce()
	const observer = vi.fn()
	const subscription = extensionAccounts$.subscribe(observer)
	expect(observer).toHaveBeenLastCalledWith([
		expect.objectContaining({
			name: account.name,
			source: 'cloud-signer',
			signer,
		}),
	])
	subscription.unsubscribe()
})
