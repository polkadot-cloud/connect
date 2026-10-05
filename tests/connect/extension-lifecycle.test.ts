// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only
// @vitest-environment jsdom

import { StrictMode, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type {
	ExtensionAccount,
	ExtensionInterface,
} from '../../packages/connect-core/src/types'
import type { ExtensionAccountsContextInterface } from '../../packages/connect/src/Extensions/types'

// Exercise the React providers against the core source under review.
vi.mock(
	'../../packages/connect-core/dist/index.js',
	() => import('../../packages/connect-core/src/index'),
)
vi.mock(
	'../../packages/connect-core/dist/accounts/index.js',
	() => import('../../packages/connect-core/src/accounts'),
)
vi.mock(
	'../../packages/connect-core/dist/extensions/index.js',
	() => import('../../packages/connect-core/src/extensions'),
)

const id = 'cloud-signer'
const account: ExtensionAccount = {
	address: `0x${'11'.repeat(32)}`,
	name: 'Test account',
	source: id,
}
let core: typeof import('../../packages/connect-core/src/index')
let extensions: typeof import('../../packages/connect-core/src/extensions')
let hooks: typeof import('../../packages/connect/src/Extensions/Accounts')
let provider: typeof import('../../packages/connect/src/Extensions/Provider')
let current: ExtensionAccountsContextInterface
let container: HTMLDivElement
let root: Root
let publish: (accounts: ExtensionAccount[]) => void
let unsubscribe: ReturnType<typeof vi.fn>
let enable: ReturnType<typeof vi.fn>
let extension: ExtensionInterface

beforeEach(async () => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	vi.useFakeTimers()
	// The mocked module factories remain cached across tests, as do the shared subjects.
	core = await import('../../packages/connect-core/src/index')
	extensions = await import('../../packages/connect-core/src/extensions')
	hooks = await import('../../packages/connect/src/Extensions/Accounts')
	provider = await import('../../packages/connect/src/Extensions/Provider')
	core.removeStatus(id)
	core.resetAccounts()
	core.setReconnectSync('unsynced')
	localStorage.clear()
	unsubscribe = vi.fn()
	extension = {
		accounts: {
			get: vi.fn().mockResolvedValue([account]),
			subscribe: vi.fn((callback) => {
				publish = callback
				callback([account])
				return unsubscribe
			}),
		},
		signer: {},
		provider: undefined,
		metadata: undefined,
	}
	enable = vi.fn().mockResolvedValue(extension)
	vi.stubGlobal('injectedWeb3', { [id]: { enable } })
	core.addExtensionToLocal(id)
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const Probe = () => {
	current = hooks.useExtensionAccounts()
	return null
}

const mount = async (strict = false) => {
	const tree = createElement(
		provider.ExtensionsProvider,
		{ dappName: 'Lifecycle test', ss58: 0 },
		createElement(Probe),
	)
	await act(async () =>
		root.render(strict ? createElement(StrictMode, null, tree) : tree),
	)
	await act(async () => vi.advanceTimersByTimeAsync(1000))
}

test('Strict Mode reconnects once and keeps account revocation live', async () => {
	await mount(true)
	expect(enable).toHaveBeenCalledOnce()
	expect(extension.accounts.subscribe).toHaveBeenCalledOnce()
	expect(unsubscribe).not.toHaveBeenCalled()
	expect(current.extensionsSynced).toBe('synced')
	expect(current.getExtensionAccounts(0)).toHaveLength(1)
	await act(async () => publish([]))
	expect(current.getExtensionAccounts(0)).toEqual([])
	expect(core.getStatus(id)).toBe('not_authenticated')
})

test('rediscovery preserves the live account subscription', async () => {
	await mount()
	await act(async () => {
		await extensions.getExtensions()
	})
	await act(async () => vi.advanceTimersByTimeAsync(1000))
	expect(unsubscribe).not.toHaveBeenCalled()
	await act(async () => publish([]))
	expect(current.getExtensionAccounts(0)).toEqual([])
	expect(core.getStatus(id)).toBe('not_authenticated')
})

test('remount restores a saved wallet and resumes account updates', async () => {
	await mount()
	await act(async () => root.render(null))
	expect(unsubscribe).toHaveBeenCalledOnce()
	await mount()
	expect(enable).toHaveBeenCalledTimes(2)
	expect(current.getExtensionAccounts(0)).toHaveLength(1)
	await act(async () => publish([]))
	expect(current.getExtensionAccounts(0)).toEqual([])
})

test('unmount during approval leaves sync reset and cannot create a late subscription', async () => {
	let approve!: (value: ExtensionInterface) => void
	enable.mockReturnValue(
		new Promise<ExtensionInterface>((resolve) => {
			approve = resolve
		}),
	)
	await mount()
	expect(current.extensionsSynced).toBe('syncing')
	await act(async () => root.render(null))
	await act(async () => approve(extension))
	expect(extension.accounts.subscribe).not.toHaveBeenCalled()
	expect(core.getStatus(id)).toBe('installed')
	expect(core.getReconnectSync()).toBe('unsynced')
})

test('remount during approval starts a new reconnect that an older request cannot finish', async () => {
	let approveFirst!: (value: ExtensionInterface) => void
	let approveRetry!: (value: ExtensionInterface) => void
	enable
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
	await mount()
	await act(async () => root.render(null))
	await mount()
	expect(enable).toHaveBeenCalledTimes(2)
	await act(async () => approveFirst(extension))
	expect(current.extensionsSynced).toBe('syncing')
	expect(current.getExtensionAccounts(0)).toEqual([])
	await act(async () => approveRetry(extension))
	expect(current.extensionsSynced).toBe('synced')
	expect(current.getExtensionAccounts(0)).toHaveLength(1)
	expect(extension.accounts.subscribe).toHaveBeenCalledOnce()
})

test('finishing discovery preserves a manual connection already waiting for accounts', async () => {
	let finish!: (value: ExtensionAccount[]) => void
	extension.accounts.get = vi.fn(
		() =>
			new Promise((resolve) => {
				finish = resolve
			}),
	)
	core.setStatus(id, 'installed')
	await act(async () =>
		root.render(
			createElement(
				provider.ExtensionsProvider,
				{ dappName: 'Lifecycle test', ss58: 0 },
				createElement(Probe),
			),
		),
	)
	let manual!: Promise<boolean>
	await act(async () => {
		manual = current.connectExtension(id)
	})
	expect(extension.accounts.get).toHaveBeenCalledOnce()
	await act(async () => vi.advanceTimersByTimeAsync(1000))
	expect(unsubscribe).not.toHaveBeenCalled()
	await act(async () => finish([account]))
	expect(await manual).toBe(true)
	expect(enable).toHaveBeenCalledOnce()
	expect(current.extensionsSynced).toBe('synced')
	expect(current.getExtensionAccounts(0)).toHaveLength(1)
})
