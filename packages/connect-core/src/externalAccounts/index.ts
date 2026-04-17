// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { ExternalAccountsKey } from '../consts'
import type { ExternalAccount, NetworkId } from '../types'
import { removeLocal, setLocal } from '../util-local'
import { _externalAccounts } from './private'
export { getInitialExternalAccounts } from './util'

export const externalAccounts$ = _externalAccounts.asObservable()

// Gets imported external accounts from state
export const getExternalAccounts = () => _externalAccounts.getValue()

// Check whether an external account exists
export const externalAccountExists = (network: NetworkId, address: string) =>
	_externalAccounts
		.getValue()
		.find((l) => l.address === address && l.network === network)

// Adds an external account to state
export const addExternalAccount = (
	network: NetworkId,
	account: ExternalAccount,
	noLocal = false,
) => {
	const newAccounts = [..._externalAccounts.getValue()]
		.filter((a) => !(a.address === account.address && a.network === network))
		.concat(account)

	if (!noLocal) {
		setLocal(ExternalAccountsKey, JSON.stringify(newAccounts))
	}
	_externalAccounts.next(newAccounts)
}

// Removes external accounts from state
export const removeExternalAccounts = (
	network: NetworkId,
	accounts: ExternalAccount[],
) => {
	const newAccounts = [..._externalAccounts.getValue()].filter(
		(a) =>
			accounts.find((b) => b.address === a.address && b.network === network) ===
			undefined,
	)

	if (!newAccounts.length) {
		removeLocal(ExternalAccountsKey)
	} else {
		setLocal(ExternalAccountsKey, JSON.stringify(newAccounts))
	}
	_externalAccounts.next(newAccounts)
}
