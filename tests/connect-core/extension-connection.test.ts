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
			new Promise<ExtensionAccount[]>((resolve) => {
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

test.each(['undiscovered', 'connected'] as const)(
	'reconnect restores saved accounts with a %s status',
	async (status) => {
		const wallet = provider()
		core.addExtensionToLocal(id)
		if (status === 'undiscovered') {
			core.removeStatus(id)
		} else {
			core.setStatus(id, 'connected')
		}
		await extensions.reconnectExtensions('Cloud Apps test', 0)
		expect(wallet.enable).toHaveBeenCalledOnce()
		expect(readAccounts()).toHaveLength(1)
		expect(core.getStatus(id)).toBe('connected')
		expect(core.getReconnectSync()).toBe('synced')
	},
)

test('reconnect removes a saved wallet that is no longer installed', async () => {
	provider()
	core.addExtensionToLocal('missing-wallet')
	await extensions.reconnectExtensions('Cloud Apps test', 0)
	let initialised: string[] = []
	const observer = core.initialisedExtensions$.subscribe((ids) => {
		initialised = ids
	})
	observer.unsubscribe()
	expect(core.getActiveExtensionsLocal()).toEqual([])
	expect(initialised).toContain('missing-wallet')
	expect(core.getStatus('missing-wallet')).toBeUndefined()
})

test('overlapping reconnects stay syncing until the original account fetch completes', async () => {
	const wallet = provider()
	let finish!: (value: ExtensionAccount[]) => void
	wallet.extension.accounts.get = vi.fn(
		() =>
			new Promise<ExtensionAccount[]>((resolve) => {
				finish = resolve
			}),
	)
	core.addExtensionToLocal(id)
	const first = extensions.reconnectExtensions('Cloud Apps test', 0)
	await vi.waitFor(() =>
		expect(wallet.extension.accounts.get).toHaveBeenCalledOnce(),
	)
	// The initial empty subscription snapshot temporarily removes the saved id.
	const second = extensions.reconnectExtensions('Cloud Apps test', 0)
	await Promise.resolve()
	expect(core.getReconnectSync()).toBe('syncing')
	finish([account])
	await Promise.all([first, second])
	expect(wallet.enable).toHaveBeenCalledOnce()
	expect(core.getReconnectSync()).toBe('synced')
	expect(readAccounts()).toHaveLength(1)
})

test('unsubscribing during an account fetch prevents late results and callbacks from restoring accounts', async () => {
	const wallet = provider()
	let finish!: (value: ExtensionAccount[]) => void
	wallet.extension.accounts.get = vi.fn(
		() =>
			new Promise<ExtensionAccount[]>((resolve) => {
				finish = resolve
			}),
	)
	const connecting = extensions.connectExtension('Cloud Apps test', 0, id)
	await vi.waitFor(() =>
		expect(wallet.extension.accounts.get).toHaveBeenCalledOnce(),
	)
	accounts.unsubAll()
	core.resetAccounts()
	finish([account])
	expect(await connecting).toBe(false)
	wallet.publish([account])
	expect(readAccounts()).toEqual([])
	expect(wallet.unsubscribe).toHaveBeenCalledOnce()
})

test('a get-only provider still connects and restores its signer and address format', async () => {
	const wallet = provider()
	Reflect.deleteProperty(wallet.extension.accounts, 'subscribe')
	expect(await extensions.connectExtension('Cloud Apps test', 2, id)).toBe(true)
	expect(readAccounts()).toEqual([
		expect.objectContaining({ source: id, signer: wallet.extension.signer }),
	])
	expect(readAccounts()[0].address).not.toBe(account.address)
	expect(wallet.extension.accounts.get).toHaveBeenCalledOnce()
})

test('reconnect isolates a failed wallet while preserving another wallet with the same address', async () => {
	const wallet = provider()
	const other = {
		...wallet.extension,
		accounts: {
			get: vi.fn().mockResolvedValue([account]),
			subscribe: vi.fn(() => vi.fn()),
		},
	}
	const injectedWeb3 = {
		[id]: { enable: wallet.enable.mockRejectedValue(new Error('Rejected')) },
		talisman: { enable: vi.fn().mockResolvedValue(other) },
	}
	vi.stubGlobal('window', { injectedWeb3, parent: { injectedWeb3 } })
	core.setStatus('talisman', 'installed')
	core.addExtensionToLocal(id)
	core.addExtensionToLocal('talisman')
	accounts.processExtensionAccounts({ source: id, ss58: 0 }, {}, [account])
	await extensions.reconnectExtensions('Cloud Apps test', 0)
	expect(readAccounts()).toEqual([
		expect.objectContaining({ source: 'talisman', signer: other.signer }),
	])
	expect(core.getActiveExtensionsLocal()).toEqual(['talisman'])
	expect(core.getStatus(id)).toBe('not_authenticated')
	expect(core.getStatus('talisman')).toBe('connected')
})

test('cancelled approval cannot overwrite a newer connection or remove its pending request', async () => {
	const wallet = provider()
	let approveFirst!: (value: ExtensionInterface) => void
	let approveRetry!: (value: ExtensionInterface) => void
	wallet.enable
		.mockReturnValueOnce(
			new Promise<ExtensionInterface>((resolve) => {
				approveFirst = resolve
			}),
		)
		.mockReturnValueOnce(
			new Promise<ExtensionInterface>((resolve) => {
				approveRetry = resolve
			}),
		)
	const first = extensions.connectExtension('Cloud Apps test', 0, id)
	accounts.unsubAll()
	const retry = extensions.connectExtension('Cloud Apps test', 0, id)
	approveFirst(wallet.extension)
	expect(await first).toBe(false)
	expect(core.getStatus(id)).toBe('installed')
	expect(core.getActiveExtensionsLocal()).toEqual([])
	expect(wallet.extension.accounts.subscribe).not.toHaveBeenCalled()
	expect(extensions.connectExtension('Cloud Apps test', 0, id)).toBe(retry)
	approveRetry(wallet.extension)
	expect(await retry).toBe(true)
	expect(wallet.enable).toHaveBeenCalledTimes(2)
	expect(wallet.extension.accounts.subscribe).toHaveBeenCalledOnce()
})

test('a cancelled fetch failure cannot clear a replacement subscription and its accounts', async () => {
	const wallet = provider()
	let fail!: (error: Error) => void
	wallet.extension.accounts.get = vi
		.fn()
		.mockReturnValueOnce(
			new Promise<ExtensionAccount[]>((_, reject) => {
				fail = reject
			}),
		)
		.mockResolvedValue([account])
	const first = extensions.connectExtension('Cloud Apps test', 0, id)
	await vi.waitFor(() =>
		expect(wallet.extension.accounts.get).toHaveBeenCalledOnce(),
	)
	accounts.unsubAll()
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	fail(new Error('Old session closed'))
	expect(await first).toBe(false)
	expect(readAccounts()).toHaveLength(1)
	expect(core.getStatus(id)).toBe('connected')
	expect(wallet.unsubscribe).toHaveBeenCalledOnce()
	wallet.publish([])
	expect(readAccounts()).toEqual([])
})

test('manual connection still requires discovery and does not re-enable a connected wallet', async () => {
	const wallet = provider()
	core.removeStatus(id)
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(
		false,
	)
	expect(wallet.enable).not.toHaveBeenCalled()
	core.setStatus(id, 'installed')
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	expect(wallet.enable).toHaveBeenCalledOnce()
})

test('subscription updates add and remove accounts without disturbing a different wallet', async () => {
	const wallet = provider()
	const second = {
		...account,
		address: `0x${'22'.repeat(32)}`,
		name: 'Second account',
	}
	accounts.processExtensionAccounts({ source: 'talisman', ss58: 0 }, {}, [
		account,
	])
	expect(await extensions.connectExtension('Cloud Apps test', 0, id)).toBe(true)
	wallet.publish([account, second])
	expect(readAccounts()).toHaveLength(3)
	wallet.publish([second])
	expect(readAccounts()).toEqual([
		expect.objectContaining({ source: 'talisman', name: account.name }),
		expect.objectContaining({
			source: id,
			name: second.name,
			signer: wallet.extension.signer,
		}),
	])
})

test.each(['enable', 'accounts'])(
	'connection diagnostics preserve the provider error from %s and clear on retry',
	async (stage) => {
		const wallet = provider()
		const error = Object.assign(
			new Error('Extension unavailable. Reload the page.'),
			{
				code: 'CLOUD_SIGNER_RELOAD_REQUIRED',
			},
		)
		if (stage === 'enable') wallet.enable.mockRejectedValueOnce(error)
		else
			wallet.extension.accounts.get = vi
				.fn()
				.mockRejectedValueOnce(error)
				.mockResolvedValue([account])
		expect(await extensions.connectExtension('Test', 0, id)).toBe(false)
		expect(extensions.getExtensionConnectionError(id)).toBe(error)
		expect(readAccounts()).toEqual([])
		expect(core.getActiveExtensionsLocal()).toEqual([])
		const retry = extensions.connectExtension('Test', 0, id)
		expect(extensions.getExtensionConnectionError(id)).toBeUndefined()
		expect(await retry).toBe(true)
		expect(extensions.getExtensionConnectionError(id)).toBeUndefined()
	},
)

test('automatic reconnect records a reload diagnostic without rejecting, and disconnect clears it', async () => {
	const wallet = provider()
	const error = Object.assign(new Error('Reload required'), {
		code: 'CLOUD_SIGNER_RELOAD_REQUIRED',
	})
	wallet.enable.mockRejectedValue(error)
	core.addExtensionToLocal(id)
	await expect(
		extensions.reconnectExtensions('Test', 0),
	).resolves.toBeUndefined()
	expect(extensions.getExtensionConnectionError(id)).toBe(error)
	extensions.disconnectExtension(id)
	expect(extensions.getExtensionConnectionError(id)).toBeUndefined()
})

test('a cancelled failure cannot replace the diagnostics of a newer connection', async () => {
	const wallet = provider()
	const pending = Promise.withResolvers<ExtensionInterface>()
	wallet.enable.mockReturnValueOnce(pending.promise)
	const old = extensions.connectExtension('Test', 0, id)
	accounts.unsubAll()
	expect(await extensions.connectExtension('Test', 0, id)).toBe(true)
	pending.reject(
		Object.assign(new Error('Reload required'), {
			code: 'CLOUD_SIGNER_RELOAD_REQUIRED',
		}),
	)
	expect(await old).toBe(false)
	expect(extensions.getExtensionConnectionError(id)).toBeUndefined()
})
