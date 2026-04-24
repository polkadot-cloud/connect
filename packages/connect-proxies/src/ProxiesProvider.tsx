// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	activeAddress$,
	addExternalAccount as addExternalAccountBus,
	getActiveAddress,
	getApi,
	getImportedAccounts,
	importedAccounts$,
} from '@polkadot-cloud/connect-core'
import { createSafeContext, useEffectIgnoreInitial } from '@w3ux/hooks'
import { ellipsisFn } from '@w3ux/utils'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import {
	getLocalActiveProxy,
	removeLocalActiveProxy,
} from './persistence/activeProxy'
import { queryProxies } from './query/proxies'
import {
	activeProxy$,
	getActiveProxy,
	resetActiveProxy,
	setActiveProxy,
} from './state/activeProxy'
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
	const [activeProxy, setActiveProxyState] = useState<ActiveProxy | null>(
		getActiveProxy,
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
				if (delegate in newDelegates) {
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
		const config = proxies[address]
		if (!config) {
			return undefined
		}

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
	// a proxy account is being manually declared. Uses the api bound to the active discovery
	// lifecycle for this network.
	const handleDeclareDelegate = async (
		delegator: string,
	): Promise<ProxyDelegate[] | null> => {
		const api = getApi(network)
		// Return `null` (distinct from an empty array) to signal that the proxy discovery lifecycle has
		// not started / no api is bound for this network, so callers can distinguish this from a
		// successful query that returned no proxies.
		if (!api) {
			return null
		}
		const results = await queryProxies(api, delegator)

		const addDelegatorAsExternal = results.some(({ delegate }) =>
			accounts.some(({ address }) => address === delegate),
		)
		if (addDelegatorAsExternal) {
			addExternalAccountBus(network, {
				address: delegator,
				name: ellipsisFn(delegator),
				source: 'external',
				network,
				addedBy: 'system',
			})
		}
		return results
	}

	// Gets the delegate and proxy type of an account, if any
	const getProxyDelegate = (
		delegator: string | null,
		delegate: string | null,
	): ProxyDelegate | null => {
		if (!delegator || !delegate) {
			return null
		}
		const config = proxies[delegator]
		if (!config) {
			return null
		}
		const maybeDelegate = config.proxies.find((d) => d.delegate === delegate)
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
				const isActive = (proxies[activeAddress]?.proxies || []).find(
					(d) => d.delegate === address && d.proxyType === proxyType,
				)

				if (isActive && !activeProxy) {
					setActiveProxy(network, { address, source, proxyType })
				}
			} catch {
				removeLocalActiveProxy(network)
			}
		}
	}, [accounts, activeAddress, proxies, network, activeProxy])

	// Subscribe to all observables in one effect
	useEffect(() => {
		const subs = [
			proxies$.subscribe(setProxies),
			activeProxy$.subscribe(setActiveProxyState),
			importedAccounts$.subscribe((next) =>
				setAccounts(next as Array<{ address: string }>),
			),
			activeAddress$.subscribe(setActiveAddressState),
		]
		return () => {
			for (const s of subs) s.unsubscribe()
		}
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
