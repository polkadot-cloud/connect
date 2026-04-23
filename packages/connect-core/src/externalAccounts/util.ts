// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { ExternalAccountsKey } from '../consts'
import type { ExternalAccount, NetworkId } from '../types'
import { localOrDefault } from '../util-local'

// Gets existing external accounts from local storage. Ensures that no system-added accounts are
// returned
export const getInitialExternalAccounts = (_?: string, network?: NetworkId) => {
	const localAccounts = (
		localOrDefault(ExternalAccountsKey, [], true) as ExternalAccount[]
	).filter((l) => l.addedBy !== 'system' && (!network || l.network === network))
	return localAccounts
}
