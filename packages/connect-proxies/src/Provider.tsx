// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	type ComponentType,
	type ReactNode,
	createContext,
	useContext,
	useRef,
} from 'react'
import { ProxiesProvider } from './ProxiesProvider'
import { ProxyDiscoveryController } from './controller/ProxyDiscoveryController'

interface ProxiesContextValue {
	controller: ProxyDiscoveryController
}

const ProxiesContext = createContext<ProxiesContextValue | null>(null)

export const useProxiesControllerContext = () => {
	const ctx = useContext(ProxiesContext)
	if (!ctx) {
		throw new Error(
			'useProxiesControllerContext must be used within ProxiesControllerProvider',
		)
	}
	return ctx
}

// Passive adaptor provider — creates a shared ProxyDiscoveryController and
// makes it available via context. No subscriptions are started here; they
// begin lazily when a consumer calls useProxies() with a valid API client.
export const ProxiesControllerProvider = ({
	children,
	network,
}: {
	children: ReactNode
	network: string
}) => {
	const controllerRef = useRef(new ProxyDiscoveryController(network))

	return (
		<ProxiesContext.Provider value={{ controller: controllerRef.current }}>
			{children}
		</ProxiesContext.Provider>
	)
}

// Factory that returns an Adaptor compatible with ConnectProvider.adaptors.
// The returned component mounts both ProxiesControllerProvider (controller) and
// ProxiesProvider (full context) so that proxy discovery and the
// proxies context are available to all descendants.
//
// Usage:
//   <ConnectProvider adaptors={[createProxiesAdaptor('polkadot')]} ...>
export const createProxiesAdaptor = (
	network: string,
): ComponentType<{ children: ReactNode }> => {
	const ProxiesAdaptor = ({ children }: { children: ReactNode }) => (
		<ProxiesControllerProvider network={network}>
			<ProxiesProvider network={network}>{children}</ProxiesProvider>
		</ProxiesControllerProvider>
	)
	ProxiesAdaptor.displayName = 'ProxiesAdaptor'
	return ProxiesAdaptor
}
