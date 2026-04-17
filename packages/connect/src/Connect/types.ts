// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ComponentType, ReactNode } from 'react'

export type Adaptor = ComponentType<{ children: ReactNode }>

export interface ConnectProviderProps {
	children: ReactNode
	ss58: number
	dappName: string
	network?: string
	adaptors?: Adaptor[]
}
