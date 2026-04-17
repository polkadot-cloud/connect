// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ExternalAccount } from '@polkadot-cloud/connect-core/types'
import type { ReactNode } from 'react'

export interface ExternalAccountsProviderProps {
	children: ReactNode
	network?: string
	ss58: number
}

export interface ExternalAccountsContextInterface {
	getExternalAccounts: (network: string) => ExternalAccount[]
	addExternalAccount: (address: string) => AddExternalAccountResult | null
	forgetExternalAccounts: (accounts: ExternalAccount[]) => void
	addReadOnlyAccount: (address: string) => AddExternalAccountResult | null
	forgetReadOnlyAccounts: (accounts: ExternalAccount[]) => void
}

export interface AddExternalAccountResult {
	account: ExternalAccount
	type: ExternalAccountImportType
}

export type ExternalAccountImportType = 'new' | 'replace'
