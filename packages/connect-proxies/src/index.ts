// Copyright 2026 @polkadot-cloud/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// Constants
export { ActiveProxiesKey, SupportedProxies } from './consts'
// Controller (for consumers that manage lifecycle directly)
export { ProxyDiscoveryController } from './controller/ProxyDiscoveryController'
export { useActiveProxy } from './hooks/useActiveProxy'
// Hooks
export { useProxies } from './hooks/useProxies'
// Adaptor — pass createProxiesAdaptor(network) to ConnectProvider.adaptors for the
// full context + controller adaptor. ProxiesControllerProvider is the lower-level
// infrastructure provider; ProxiesProvider is the full-context provider.
export { createProxiesAdaptor, ProxiesControllerProvider } from './Provider'
// Context provider for Proxies (use with app contexts)
export {
	ProxiesContext,
	ProxiesProvider,
	useProxies as useProxiesContext,
} from './ProxiesProvider'

// Persistence helpers
export {
	getLocalActiveProxies,
	getLocalActiveProxy,
	removeLocalActiveProxy,
	setLocalActiveProxy,
} from './persistence/activeProxy'
// One-shot query
export { queryProxies } from './query/proxies'
export {
	activeProxy$,
	getActiveProxy,
	resetActiveProxy,
	setActiveProxy,
} from './state/activeProxy'
// State observables (for consumers that prefer reactive access)
export {
	addProxies,
	getProxies,
	proxies$,
	removeProxies,
	resetProxies,
} from './state/proxies'
// Chain subscription class
export { ProxiesQuery } from './subscribe/ProxiesQuery'
// Types
export type {
	ActiveProxy,
	DelegateItem,
	Delegates,
	LocalActiveProxies,
	MaybeAddress,
	ProxiedAccount,
	ProxiedAccounts,
	Proxies,
	ProxiesContextInterface,
	Proxy,
	ProxyDelegate,
	ProxyDelegateWithBalance,
	ProxyRecord,
} from './types'
// Utility predicates
export { isSupportedProxy, isSupportedProxyCall } from './utils/proxies'
