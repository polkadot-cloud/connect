// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { getActiveAccountLocal } from '@polkadot-cloud/connect-core'
import type {
	ActiveAccount,
	ExternalAccount,
	HardwareAccountSource,
	ImportedAccount,
	MaybeAddress,
} from '@polkadot-cloud/connect-core/types'
import { createSafeContext, useEffectIgnoreInitial } from '@w3ux/hooks'
import { useCallback, useState } from 'react'
import { useActiveAccount } from '../ActiveAccount'
import { useExtensionAccounts } from '../Extensions'
import { useExternalAccounts } from '../ExternalAccounts'
import { useHardwareAccounts } from '../Hardware'
import type {
	ImportedAccountsContextInterface,
	ImportedAccountsProviderProps,
} from './types'

export const [ImportedAccountsContext, useImportedAccounts] =
	createSafeContext<ImportedAccountsContextInterface>()

export const ImportedAccountsProvider = ({
	children,
	network,
	ss58,
}: ImportedAccountsProviderProps) => {
	const activeNetwork = network || ''
	const { getExternalAccounts } = useExternalAccounts()
	const { getHardwareAccounts } = useHardwareAccounts()
	const { setActiveAccount, activeAccount } = useActiveAccount()
	const { getExtensionAccounts, extensionsSynced } = useExtensionAccounts()

	const manualSigners: HardwareAccountSource[] = [
		'ledger',
		'vault',
		'wallet_connect',
	]

	// Whether active account import checks have been completed
	const [accountsInitialised, setAccountsInitialised] = useState<boolean>(false)

	// Get the imported extension accounts formatted with the current network's ss58 prefix
	const extensionAccounts = getExtensionAccounts(ss58)

	// Get the imported hardware accounts for the current network
	const hardwareAccounts = getHardwareAccounts('ledger', activeNetwork)
		.concat(getHardwareAccounts('vault', activeNetwork))
		.concat(getHardwareAccounts('wallet_connect', activeNetwork))

	// Get the imported external accounts for the current network
	const externalAccounts: ExternalAccount[] = getExternalAccounts(activeNetwork)

	// Combine all imported accounts
	const allAccounts: ImportedAccount[] = extensionAccounts
		.concat(hardwareAccounts)
		.concat(externalAccounts)

	// Build a stable key from fields that affect downstream logic and memoized callbacks.
	const shallowAccountStringify = (accounts: ImportedAccount[]) => {
		const sorted = [...accounts].sort((a, b) => {
			if (a.address < b.address) {
				return -1
			}
			if (a.address > b.address) {
				return 1
			}
			if (a.source < b.source) {
				return -1
			}
			if (a.source > b.source) {
				return 1
			}
			return 0
		})
		return JSON.stringify(
			sorted.map((account) => [
				activeNetwork,
				account.address,
				account.source,
				account.name,
				'network' in account ? account.network : null,
				'addedBy' in account ? account.addedBy : null,
			]),
		)
	}

	const stringifiedAccountsKey = shallowAccountStringify(allAccounts)

	// Gets an account from `allAccounts`. Requires activeAccount (with address and source) to get the
	// specific account-source combination
	//
	// Caches the function when imported accounts update
	const getAccount = useCallback(
		(activeAccount: ActiveAccount) => {
			if (!activeAccount) {
				return null
			}
			return (
				allAccounts.find(
					({ address, source }) =>
						address === activeAccount.address &&
						source === activeAccount.source,
				) || null
			)
		},
		[stringifiedAccountsKey],
	)

	// Checks if an address is a read-only account
	//
	// Caches the function when imported accounts update
	const isReadOnlyAccount = useCallback(
		(who: MaybeAddress) => {
			const account = allAccounts.find(({ address }) => address === who) || {}
			if (Object.hasOwn(account, 'addedBy')) {
				const { addedBy } = account as ExternalAccount
				return addedBy === 'user'
			}
			return false
		},
		[stringifiedAccountsKey],
	)

	// Checks whether an account can sign transactions. Requires activeAccount (with address and
	// source) to check the specific account-source combination
	//
	// Caches the function when imported accounts update
	const accountHasSigner = useCallback(
		(activeAccount: ActiveAccount) => {
			if (!activeAccount) {
				return false
			}
			const account = allAccounts.find(
				(acc) =>
					acc.address === activeAccount.address &&
					acc.source === activeAccount.source &&
					acc.source !== 'external',
			)
			return account !== undefined
		},
		[stringifiedAccountsKey],
	)

	// Checks whether an account needs manual signing. Requires activeAccount (with address and
	// source) to check the specific account-source combination
	//
	// Caches the function when imported accounts update
	const requiresManualSign = useCallback(
		(activeAccount: ActiveAccount) => {
			if (!activeAccount) {
				return false
			}
			const account = allAccounts.find(
				(acc) =>
					acc.address === activeAccount.address &&
					acc.source === activeAccount.source &&
					manualSigners.includes(acc.source as HardwareAccountSource),
			)
			return account !== undefined
		},
		[stringifiedAccountsKey],
	)

	// Re-sync the active account on network change.
	useEffectIgnoreInitial(() => {
		const localActiveAccount = getActiveAccountLocal(activeNetwork, ss58)
		if (localActiveAccount && getAccount(localActiveAccount) !== null) {
			setActiveAccount(localActiveAccount, false)
		} else {
			setActiveAccount(null, false)
		}
	}, [activeNetwork, stringifiedAccountsKey])

	// Once extensions are fully initialised, fetch accounts from other sources and re-sync active account.
	useEffectIgnoreInitial(() => {
		if (extensionsSynced === 'synced' && !accountsInitialised) {
			setAccountsInitialised(true)

			if (!activeAccount) {
				const localActiveAccount = getActiveAccountLocal(activeNetwork, ss58)

				if (localActiveAccount && getAccount(localActiveAccount) !== null) {
					setActiveAccount(localActiveAccount, false)
				}
			}
		}
	}, [extensionsSynced])

	return (
		<ImportedAccountsContext.Provider
			value={{
				accounts: allAccounts,
				getAccount,
				isReadOnlyAccount,
				accountHasSigner,
				requiresManualSign,
				stringifiedAccountsKey,
				accountsInitialised,
			}}
		>
			{children}
		</ImportedAccountsContext.Provider>
	)
}

export type {
	ImportedAccountsContextInterface,
	ImportedAccountsProviderProps,
	MaybeAddress,
} from './types'
