// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	addExternalAccount as addExternalAccountBus,
	externalAccountExists,
	externalAccounts$,
	removeExternalAccounts as forgetExternalAccountsBus,
	getExternalAccounts as getExternalAccountsStore,
} from '@polkadot-cloud/connect-core/observables'
import type {
	AccountAddedBy,
	ExternalAccount,
} from '@polkadot-cloud/connect-core/types'
import { createSafeContext } from '@w3ux/hooks'
import { formatAccountSs58 } from '@w3ux/util-dedot'
import { ellipsisFn } from '@w3ux/utils'
import { useEffect, useState } from 'react'
import { useActiveAccount } from '../ActiveAccount'
import type {
	AddExternalAccountResult,
	ExternalAccountImportType,
	ExternalAccountsContextInterface,
	ExternalAccountsProviderProps,
} from './types'

export const [ExternalAccountsContext, useExternalAccounts] =
	createSafeContext<ExternalAccountsContextInterface>()

export const ExternalAccountsProvider = ({
	children,
	network,
	ss58,
}: ExternalAccountsProviderProps) => {
	const { activeAddress, setActiveAccount } = useActiveAccount()
	const activeNetwork = network || ''

	// Store external accounts in state
	const [externalAccounts, setExternalAccounts] = useState<ExternalAccount[]>(
		() => getExternalAccountsStore(),
	)

	// Private helper: adds an external account with a given `addedBy` value
	const importExternalAccount = (
		address: string,
		addedBy: AccountAddedBy,
	): AddExternalAccountResult | null => {
		if (!activeNetwork) {
			return null
		}

		const formatted = formatAccountSs58(address, ss58)
		if (!formatted) {
			return null
		}

		let newEntry = {
			address: formatted,
			network: activeNetwork,
			name: ellipsisFn(address),
			source: 'external',
			addedBy,
		}

		const exists = externalAccountExists(activeNetwork, newEntry.address)

		// Whether the account needs to be imported as a system account
		const toSystem =
			exists && addedBy === 'system' && exists.addedBy !== 'system'

		let importType: ExternalAccountImportType = 'new'

		if (toSystem) {
			// If account is being added by `system`, but is already imported, update it to be a system
			// account. `system` accounts are not persisted to local storage
			//
			// update the entry to a system account
			newEntry = { ...newEntry, addedBy: 'system' }
			importType = 'replace'
		}

		// Add account to global bus
		if (!exists || toSystem) {
			addExternalAccountBus(
				activeNetwork,
				newEntry,
				newEntry.addedBy === 'system',
			)
		} else {
			// Account already exists and does not need to be updated
			return null
		}

		return {
			type: importType,
			account: newEntry,
		}
	}

	// Adds a system external account
	const addExternalAccount = (
		address: string,
	): AddExternalAccountResult | null => importExternalAccount(address, 'system')

	// Get any external accounts and remove from localStorage
	const forgetExternalAccounts = (forget: ExternalAccount[]) => {
		if (!activeNetwork || !forget.length) {
			return
		}

		const toForget = forget.filter((a) => a.network === activeNetwork)

		if (!toForget.length) {
			return
		}

		const toRemove = toForget.filter((i) => 'network' in i) as ExternalAccount[]
		forgetExternalAccountsBus(activeNetwork, toRemove)

		// If the currently active account is being forgotten, disconnect
		if (toForget.find((a) => a.address === activeAddress) !== undefined) {
			setActiveAccount(null)
		}
	}

	// Adds a user (read-only) external account
	const addReadOnlyAccount = (
		address: string,
	): AddExternalAccountResult | null => importExternalAccount(address, 'user')

	// Proxy: forgets only user-added external accounts
	const forgetReadOnlyAccounts = (accounts: ExternalAccount[]) => {
		const userAccounts = accounts.filter((a) => a.addedBy === 'user')
		if (userAccounts.length) {
			forgetExternalAccounts(userAccounts)
		}
	}

	// Gets all accounts for a network
	const getExternalAccounts = (network: string) =>
		externalAccounts.filter((a) => a.network === network)

	// Subscribe to global bus
	useEffect(() => {
		const sub = externalAccounts$.subscribe((result) => {
			setExternalAccounts(result)
		})
		return () => {
			sub.unsubscribe()
		}
	}, [])

	return (
		<ExternalAccountsContext.Provider
			value={{
				getExternalAccounts,
				addExternalAccount,
				forgetExternalAccounts,
				addReadOnlyAccount,
				forgetReadOnlyAccounts,
			}}
		>
			{children}
		</ExternalAccountsContext.Provider>
	)
}

export type {
	AddExternalAccountResult,
	ExternalAccountImportType,
	ExternalAccountsContextInterface,
	ExternalAccountsProviderProps,
} from './types'
