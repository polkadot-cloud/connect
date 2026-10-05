// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { formatAccountSs58, isValidAddress } from '@polkadot-cloud/util-dedot'
import { _extensionAccounts } from '../subjects'
import type { ExtensionAccount, ProcessExtensionAccountsResult } from '../types'

// Gets accounts to be imported and commits them to state

interface Config {
	source: string
	ss58: number
}
export const processExtensionAccounts = (
	config: Config,
	signer: unknown,
	newAccounts: ExtensionAccount[],
): ProcessExtensionAccountsResult => {
	const { source, ss58 } = config
	const current = _extensionAccounts.getValue()
	const formattedAccounts = formatExtensionAccounts(newAccounts, ss58).map(
		({ address, name }) => ({ address, name, source, signer }),
	)
	const removedAccounts = current.filter(
		(account) =>
			account.source === source &&
			!formattedAccounts.some(({ address }) => address === account.address),
	)
	const addedAccounts = formattedAccounts.filter(
		({ address }) =>
			!current.some(
				(account) => account.source === source && account.address === address,
			),
	)

	// Each wallet snapshot replaces its accounts, including names and signer instances.
	// An unchanged address must not retain a signer from an earlier connection.
	_extensionAccounts.next([
		...current.filter((account) => account.source !== source),
		...formattedAccounts,
	])

	return {
		newAccounts: addedAccounts,
		removedAccounts,
	}
}

// Formats accounts to correct ss58 and removes invalid accounts
export const formatExtensionAccounts = (
	accounts: ExtensionAccount[],
	ss58: number,
) => {
	const formatted = accounts
		// Remove accounts that do not contain correctly formatted addresses
		.filter(({ address }) => isValidAddress(address))
		// Reformat addresses to ensure default ss58 format
		.map((account) => {
			const formattedAddress = formatAccountSs58(account.address, ss58)
			if (!formattedAddress) {
				return null
			}
			return { ...account, address: formattedAddress }
		})
		// Remove null entries resulting from invalid formatted addresses
		.filter((account) => account !== null)

	return formatted
}

// Updates accounts observable based on removed and added accounts
export const updateAccounts = ({
	add,
	remove,
}: {
	add: ExtensionAccount[]
	remove: ExtensionAccount[]
}) => {
	const newAccounts = [..._extensionAccounts.getValue()]
		.concat(add)
		.filter(
			(a) =>
				remove.find((s) => s.address === a.address && s.source === a.source) ===
				undefined,
		)
	_extensionAccounts.next(newAccounts)
}
