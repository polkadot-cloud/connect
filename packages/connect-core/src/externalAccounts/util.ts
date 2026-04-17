// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { ExternalAccountsKey } from '../consts'
import type { ExternalAccount, NetworkId } from '../types'
import { localOrDefault } from '../util-local'

// Gets existing external accounts from local storage. Ensures that no system-added accounts are
// returned
export const getInitialExternalAccounts = (_?: string, network?: NetworkId) => {
	let localAccounts = localOrDefault(
		ExternalAccountsKey,
		[],
		true,
	) as ExternalAccount[]
	if (network) {
		localAccounts = localAccounts.filter(
			(l) => l.network === network && l.addedBy !== 'system',
		)
	}
	return localAccounts
}
