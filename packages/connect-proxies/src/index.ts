// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// Constants
export { ActiveProxiesKey, SupportedProxies } from './consts'
// Controller (for consumers that manage lifecycle directly)
export { ProxyDiscoveryController } from './controller/ProxyDiscoveryController'
export {
	createProxiesLifecycle,
	type ProxiesLifecycle,
} from './controller/ProxiesLifecycle'
export { startProxies, stopProxies } from './controller/lifecycle'
export { useActiveProxy } from './hooks/useActiveProxy'
// Hooks
export { useProxiesLifecycle } from './hooks/useProxiesLifecycle'
// Adaptor — pass createProxiesAdaptor(network) to ConnectProvider.adaptors to
// mount the proxies context. Discovery is driven via useProxiesLifecycle (React)
// or createProxiesLifecycle (non-React).
export { createProxiesAdaptor } from './Provider'
// Hook for reading the proxies context mounted by the adaptor
export { useProxies } from './ProxiesProvider'
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
