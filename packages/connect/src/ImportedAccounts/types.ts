// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type {
	ActiveAccount,
	ImportedAccount,
	MaybeAddress,
} from '@polkadot-cloud/connect-core/types'
import type { ReactNode } from 'react'

export type { ImportedAccount, MaybeAddress }

export interface ImportedAccountsProviderProps {
	children: ReactNode
	network?: string
	ss58: number
}

export interface ImportedAccountsContextInterface {
	accounts: ImportedAccount[]
	getAccount: (activeAccount: ActiveAccount) => ImportedAccount | null
	isReadOnlyAccount: (address: MaybeAddress) => boolean
	accountHasSigner: (activeAccount: ActiveAccount) => boolean
	requiresManualSign: (activeAccount: ActiveAccount) => boolean
	stringifiedAccountsKey: string
	accountsInitialised: boolean
}
