// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type {
	ExtensionAccount,
	ExtensionInterface,
} from '../../packages/connect-core/src/types'

const id = 'cloud-signer'
const account: ExtensionAccount = {
	address: `0x${'11'.repeat(32)}`,
	name: 'Public test account',
	source: id,
}
let core: typeof import('../../packages/connect-core/src/index')
let extensions: typeof import('../../packages/connect-core/src/extensions')
let accounts: typeof import('../../packages/connect-core/src/accounts')
let stored: Map<string, string>

beforeEach(async () => {
	vi.resetModules()
	stored = new Map()
	vi.stubGlobal('localStorage', {
		getItem: (key: string) => stored.get(key) ?? null,
		setItem: (key: string, value: string) => stored.set(key, value),
		removeItem: (key: string) => stored.delete(key),
	})
	core = await import('../../packages/connect-core/src/index')
	extensions = await import('../../packages/connect-core/src/extensions')
	accounts = await import('../../packages/connect-core/src/accounts')
	core.setStatus(id, 'installed')
})

afterEach(() => {
	accounts.unsubAll()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const provider = () => {
	let publish: (value: ExtensionAccount[]) => void = () => {}
	const unsubscribe = vi.fn()
	const extension: ExtensionInterface = {
		accounts: {
			get: vi.fn().mockResolvedValue([account]),
			subscribe: vi.fn((callback) => {
				publish = callback
				// Cloud Signer's bridge starts with an empty cached snapshot.
				callback([])
				return unsubscribe
			}),
		},
		signer: {},
		provider: undefined,
		metadata: undefined,
	}
	const enable = vi.fn().mockResolvedValue(extension)
	const injectedWeb3 = { [id]: { enable } }
	vi.stubGlobal('window', { injectedWeb3, parent: { injectedWeb3 } })
	return {
		extension,
		enable,
		unsubscribe,
		publish: (value: ExtensionAccount[]) => publish(value),
	}
}

const readAccounts = () => {
	let result: ExtensionAccount[] = []
	const observer = core.extensionAccounts$.subscribe((value) => {
		result = value
	})
	observer.unsubscribe()
	return result
}

test('an empty update removes only that wallet source, including shared addresses', () => {
	accounts.processExtensionAccounts({ source: id, ss58: 0 }, {}, [account])
	accounts.processExtensionAccounts({ source: 'talisman', ss58: 0 }, {}, [
		account,
	])
	const result = accounts.processExtensionAccounts(
		{ source: id, ss58: 0 },
		{},
		[],
	)
	expect(result.removedAccounts).toHaveLength(1)
	expect(readAccounts()).toEqual([
		expect.objectContaining({ source: 'talisman' }),
	])
})

test('revocation clears accounts, status and reconnect preference, and allows fresh approval', async () => {
	const wallet = provider()
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	expect(core.getStatus(id)).toBe('connected')
	expect(stored.get('pc_active_extensions')).toBe(JSON.stringify([id]))
	expect(stored.has('active_extensions')).toBe(false)
	wallet.publish([])
	expect(readAccounts()).toEqual([])
	expect(core.getStatus(id)).toBe('not_authenticated')
	expect(core.canConnect(id)).toBe(true)
	expect(core.getActiveExtensionsLocal()).toEqual([])
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	expect(wallet.enable).toHaveBeenCalledTimes(2)
	expect(wallet.unsubscribe).toHaveBeenCalledOnce()
	expect(readAccounts()).toHaveLength(1)
	accounts.unsubAll()
	accounts.unsubAll()
	expect(wallet.unsubscribe).toHaveBeenCalledTimes(2)
})

test('automatic reconnect and repeated manual Connect share one approval and subscription', async () => {
	const wallet = provider()
	let approve!: (value: ExtensionInterface) => void
	wallet.enable.mockReturnValue(
		new Promise<ExtensionInterface>((resolve) => {
			approve = resolve
		}),
	)
	core.addExtensionToLocal(id)
	const reconnect = extensions.reconnectExtensions('Cloud Apps test', 0)
	const manual = extensions.connectExtension('Cloud Apps test', 0, id)
	const repeated = extensions.connectExtension('Cloud Apps test', 0, id)
	expect(manual).toBe(repeated)
	expect(wallet.enable).toHaveBeenCalledOnce()
	expect(core.getReconnectSync()).toBe('syncing')
	expect(readAccounts()).toEqual([])
	approve(wallet.extension)
	expect(await manual).toBe(true)
	expect(await repeated).toBe(true)
	await reconnect
	expect(core.getReconnectSync()).toBe('synced')
	expect(wallet.extension.accounts.get).toHaveBeenCalledOnce()
	expect(wallet.extension.accounts.subscribe).toHaveBeenCalledOnce()
	expect(readAccounts()).toHaveLength(1)
})

test('revocation during the initial account fetch cannot restore an older snapshot', async () => {
	const wallet = provider()
	let finish!: (value: ExtensionAccount[]) => void
	wallet.extension.accounts.get = vi.fn(
		() =>
			new Promise((resolve) => {
				finish = resolve
			}),
	)
	const connecting = extensions.connectExtension('Cloud Apps test', 0, id)
	await vi.waitFor(() =>
		expect(wallet.extension.accounts.get).toHaveBeenCalledOnce(),
	)
	wallet.publish([account])
	wallet.publish([])
	finish([account])
	expect(await connecting).toBe(false)
	expect(readAccounts()).toEqual([])
	expect(core.getStatus(id)).toBe('not_authenticated')
	expect(core.getActiveExtensionsLocal()).toEqual([])
})

test.each([
	'User rejected request.',
	'Please wait 10 seconds before retrying.',
])(
	'failed approval returns false and permits a later retry: %s',
	async (message) => {
		const wallet = provider()
		core.addExtensionToLocal(id)
		wallet.enable.mockRejectedValueOnce(new Error(message))
		const reconnect = extensions.reconnectExtensions('Cloud Apps test', 0)
		expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
			false,
		)
		await reconnect
		expect(core.getActiveExtensionsLocal()).toEqual([])
		expect(readAccounts()).toEqual([])
		expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
			true,
		)
		expect(wallet.enable).toHaveBeenCalledTimes(2)
	},
)

test('account-fetch failure cleans up the subscription and partially imported accounts', async () => {
	const wallet = provider()
	wallet.extension.accounts.subscribe = vi.fn((callback) => {
		callback([account])
		return wallet.unsubscribe
	})
	wallet.extension.accounts.get = vi
		.fn()
		.mockRejectedValue(new Error('Session closed'))
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
		false,
	)
	expect(readAccounts()).toEqual([])
	expect(wallet.unsubscribe).toHaveBeenCalledOnce()
	expect(core.getStatus(id)).toBe('not_authenticated')
	expect(core.getActiveExtensionsLocal()).toEqual([])
})

test('an enabled provider without any shared accounts does not report success', async () => {
	const wallet = provider()
	wallet.extension.accounts.get = vi.fn().mockResolvedValue([])
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
		false,
	)
	expect(core.getStatus(id)).toBe('not_authenticated')
	expect(core.getActiveExtensionsLocal()).toEqual([])
})

test.each([undefined, null, { accounts: {} }])(
	'invalid enabled provider is a failed connection: %s',
	async (value) => {
		const wallet = provider()
		wallet.enable.mockResolvedValue(value)
		expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
			false,
		)
		expect(core.getStatus(id)).toBe('not_authenticated')
		expect(core.getActiveExtensionsLocal()).toEqual([])
	},
)

test.each(['connected', 'not_authenticated'] as const)(
	'discovery preserves the existing %s status',
	async (status) => {
		vi.useFakeTimers()
		const wallet = provider()
		core.setStatus(id, status)
		await extensions.getExtensions()
		await vi.advanceTimersByTimeAsync(1000)
		expect(core.getStatus(id)).toBe(status)
		expect(wallet.enable).not.toHaveBeenCalled()
	},
)
