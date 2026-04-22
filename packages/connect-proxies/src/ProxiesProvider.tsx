// Copyright 2026 @polkadot-cloud/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	activeAddress$,
	addExternalAccount as addExternalAccountBus,
	getActiveAddress,
	getImportedAccounts,
	importedAccounts$,
} from '@polkadot-cloud/connect-core'
import { createSafeContext, useEffectIgnoreInitial } from '@w3ux/hooks'
import { ellipsisFn } from '@w3ux/utils'
import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
	getLocalActiveProxy,
	removeLocalActiveProxy,
} from './persistence/activeProxy'
import { queryProxies } from './query/proxies'
import {
	activeProxy$,
	resetActiveProxy,
	setActiveProxy,
} from './state/activeProxy'
import { _activeProxy } from './state/activeProxy.private'
import { proxies$, resetProxies } from './state/proxies'
import type {
	ActiveProxy,
	DelegateItem,
	Delegates,
	ProxiesContextInterface,
	ProxyDelegate,
	Proxy as ProxyItem,
	ProxyRecord,
} from './types'

export const [ProxiesContext, useProxies] =
	createSafeContext<ProxiesContextInterface>()

interface ProxiesProviderProps {
	children: ReactNode
	network: string
}

export const ProxiesProvider = ({
	children,
	network,
}: ProxiesProviderProps) => {
	// Store the proxy accounts of each imported account
	const [proxies, setProxies] = useState<Record<string, ProxyRecord>>({})

	// Subscribe to active proxy state
	const [activeProxy, setActiveProxyState] = useState<ActiveProxy | null>(() =>
		_activeProxy.getValue(),
	)

	// Subscribe to imported accounts
	const [accounts, setAccounts] =
		useState<Array<{ address: string }>>(getImportedAccounts)

	// Subscribe to active address
	const [activeAddress, setActiveAddressState] = useState<string | null>(
		getActiveAddress,
	)

	// Reformats proxies into a list of delegates
	const formatProxiesToDelegates = (): Delegates => {
		// Reformat proxies into a list of delegates
		const newDelegates: Delegates = {}
		for (const [delegator, record] of Object.entries(proxies)) {
			// get each delegate of this proxy record
			for (const { delegate, proxyType } of record.proxies) {
				const item: DelegateItem = {
					delegator,
					proxyType,
				}

				// check if this delegate exists in `newDelegates`
				if (Object.keys(newDelegates).includes(delegate)) {
					// append delegator to the existing delegate record if it exists
					newDelegates[delegate].push(item)
				} else {
					// create a new delegate record if it does not yet exist in `newDelegates`
					newDelegates[delegate] = [item]
				}
			}
		}
		return newDelegates
	}

	// Gets the delegates of the given account
	const getDelegates = (address: string | null): ProxyItem | undefined => {
		if (!address) {
			return undefined
		}
		const results = Object.entries(proxies).find(
			([delegator]: [string, ProxyRecord]) => delegator === address,
		)
		if (!results) {
			return undefined
		}
		const config = results[1]

		return {
			address,
			delegator: address,
			delegates: Object.values(config.proxies).map(
				({ delegate, proxyType }) => ({
					delegate,
					proxyType,
				}),
			),
			reserved: config.deposit,
		}
	}

	// Queries the chain to check if the given delegator & delegate pair is a valid proxy. Used when
	// a proxy account is being manually declared.
	const handleDeclareDelegate = async <T extends GenericSubstrateApi>(
		delegator: string,
		api: DedotClient<T>,
	): Promise<ProxyDelegate[]> => {
		const results = await queryProxies(api, delegator)

		let addDelegatorAsExternal = false
		for (const delegate of results) {
			if (accounts.find(({ address }) => address === delegate)) {
				addDelegatorAsExternal = true
			}
		}
		if (addDelegatorAsExternal) {
			addExternalAccountBus(network, {
				address: delegator,
				name: ellipsisFn(delegator),
				source: 'external',
				network,
				addedBy: 'system',
			})
		}
		return []
	}

	// Gets the delegate and proxy type of an account, if any
	const getProxyDelegate = (
		delegator: string | null,
		delegate: string | null,
	): ProxyDelegate | null => {
		if (!delegator || !delegate) {
			return null
		}
		const results = Object.entries(proxies).find(
			([key]: [string, ProxyRecord]) => key === delegator,
		)
		if (!results) {
			return null
		}
		const config = results[1]
		const maybeDelegate = Object.values(config.proxies).find(
			(d) => d.delegate === delegate,
		)
		if (!maybeDelegate) {
			return null
		}
		return {
			delegate: maybeDelegate.delegate,
			proxyType: maybeDelegate.proxyType,
		}
	}

	// If active proxy has not yet been set, check local storage `activeProxy` & set it as active
	// proxy if it is the delegate of `activeAccount`
	//
	// NOTE: this ideally should be on the dedot api side, but better account abstraction is needed
	// prior to this migration, and adding external accounts + other account duplicate needs to be
	// resolved
	useEffectIgnoreInitial(() => {
		const localActiveProxy = getLocalActiveProxy(network)
		if (Object.keys(proxies).length && localActiveProxy && activeAddress) {
			try {
				const { address, source, proxyType } = localActiveProxy
				// Add proxy address as external account if not imported
				if (!accounts.find((a) => a.address === address)) {
					addExternalAccountBus(network, {
						address,
						name: ellipsisFn(address),
						source: 'external',
						network,
						addedBy: 'system',
					})
				}
				const isActive = (
					Object.entries(proxies).find(
						([key]: [string, ProxyRecord]) => key === activeAddress,
					)?.[1].proxies || []
				).find((d) => d.delegate === address && d.proxyType === proxyType)

				if (isActive && !activeProxy) {
					setActiveProxy(network, { address, source, proxyType })
				}
			} catch {
				removeLocalActiveProxy(network)
			}
		}
	}, [accounts, activeAddress, proxies, network, activeProxy])

	// Subscribe to global bus proxies
	useEffect(() => {
		const subProxies = proxies$.subscribe(
			(result: Record<string, ProxyRecord>) => {
				setProxies(result)
			},
		)
		return () => {
			subProxies.unsubscribe()
		}
	}, [])

	// Subscribe to active proxy state
	useEffect(() => {
		const sub = activeProxy$.subscribe(setActiveProxyState)
		return () => sub.unsubscribe()
	}, [])

	// Subscribe to imported accounts
	useEffect(() => {
		const sub = importedAccounts$.subscribe((next) =>
			setAccounts(next as Array<{ address: string }>),
		)
		return () => sub.unsubscribe()
	}, [])

	// Subscribe to active address
	useEffect(() => {
		const sub = activeAddress$.subscribe(setActiveAddressState)
		return () => sub.unsubscribe()
	}, [])

	// Clear all proxy state when the network changes so stale data from the
	// previous network is never visible. The ProxyDiscoveryController will
	// re-subscribe to the new network's chain once a new api is provided.
	useEffect(
		() => () => {
			resetProxies()
			resetActiveProxy()
		},
		[network],
	)

	return (
		<ProxiesContext.Provider
			value={{
				handleDeclareDelegate,
				getDelegates,
				getProxyDelegate,
				formatProxiesToDelegates,
			}}
		>
			{children}
		</ProxiesContext.Provider>
	)
}
