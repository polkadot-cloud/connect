// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ProcessExtensionAccountsResult } from './types'

export const DefaultProcessExtensionResult: ProcessExtensionAccountsResult = {
	newAccounts: [],
	removedAccounts: [],
}

// Local storage keys (without prefix)
export const ActiveExtensionsKey = 'active_extensions'
export const HardwareAccountsKey = 'hardware_accounts'
export const ActiveAccountKey = 'active_account'
export const ExternalAccountsKey = 'external_accounts'
