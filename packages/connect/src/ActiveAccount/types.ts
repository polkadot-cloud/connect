// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ActiveAccount } from '@polkadot-cloud/connect-core/types'
import type { MaybeString } from '@w3ux/types'
import type { ReactNode } from 'react'

export type { ActiveAccount }

export interface ActiveAccountContextInterface {
	activeAccount: ActiveAccount
	activeAddress: MaybeString
	setActiveAccount: (account: ActiveAccount, updateLocal?: boolean) => void
}

export interface ActiveAccountProviderProps {
	children: ReactNode
	network?: string
}
