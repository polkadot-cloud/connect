// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ComponentType, ReactNode } from 'react'
import { ProxiesProvider } from './ProxiesProvider'

// Factory that returns an Adaptor compatible with ConnectProvider.adaptors.
//
// The adaptor only mounts `ProxiesProvider` (the full context). Discovery
// lifecycle is driven separately via `useProxiesLifecycle(api, network)`
// (React) or `createProxiesLifecycle()` (non-React), both of which mutate
// the same shared state this provider subscribes to.
//
// Usage:
//   <ConnectProvider adaptors={[createProxiesAdaptor('polkadot')]} ...>
export const createProxiesAdaptor = (
	network: string,
): ComponentType<{ children: ReactNode }> => {
	const ProxiesAdaptor = ({ children }: { children: ReactNode }) => (
		<ProxiesProvider network={network}>{children}</ProxiesProvider>
	)
	ProxiesAdaptor.displayName = 'ProxiesAdaptor'
	return ProxiesAdaptor
}
