// Copyright 2026 @polkadot-cloud/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { MaybeString } from '@w3ux/types'
import type { ReactNode } from 'react'

export type ActiveAccount = {
	address: string
	source: string
} | null

export interface ActiveAccountContextInterface {
	activeAccount: ActiveAccount
	activeAddress: MaybeString
	setActiveAccount: (
		account: ActiveAccount,
		updateLocalStorage?: boolean,
	) => void
}

export interface ActiveAccountProviderProps {
	children: ReactNode
	network?: string
}
