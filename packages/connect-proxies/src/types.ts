// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { PalletProxyProxyDefinition } from '@dedot/chaintypes/substrate'

export type { PalletProxyProxyDefinition }

// Proxy storage query result tuple: [proxyDefinitions, deposit].
export type ProxyStateTuple = [PalletProxyProxyDefinition[], bigint]

// On-chain proxy data for a single delegator address
export type ProxyRecord = {
	proxies: {
		delegate: string
		proxyType: string
		delay: number
	}[]
	deposit: bigint
}

// Currently active proxy account
export type ActiveProxy = {
	address: string
	source: string
	proxyType: string
}

// localStorage shape: network → active proxy
export type LocalActiveProxies = Record<string, ActiveProxy>

// Proxies context types
export type MaybeAddress = string | null

export type Proxies = Proxy[]

export interface Proxy {
	address: MaybeAddress
	delegator: MaybeAddress
	delegates: ProxyDelegate[]
	reserved: bigint
}

export interface ProxyDelegate {
	delegate: string
	proxyType: string
}

export type Delegates = Record<string, DelegateItem[]>

export interface DelegateItem {
	delegator: string
	proxyType: string
}

export type ProxiedAccounts = ProxiedAccount[]

export interface ProxiedAccount {
	address: string
	name: string
	proxyType: string
}

export interface ProxyDelegateWithBalance {
	transferableBalance: bigint
	delegate: string
	proxyType: string
}

export interface ProxiesContextInterface {
	getDelegates: (a: MaybeAddress) => Proxy | undefined
	getProxyDelegate: (x: MaybeAddress, y: MaybeAddress) => ProxyDelegate | null
	handleDeclareDelegate: (delegator: string) => Promise<ProxyDelegate[] | null>
	formatProxiesToDelegates: () => Delegates
}
