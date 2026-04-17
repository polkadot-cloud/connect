// Copyright 2026 @polkadot-cloud/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	ActiveAccountKey,
	removeLocal,
	setLocal,
} from '@polkadot-cloud/connect-core'
import { setActiveAddress } from '@polkadot-cloud/connect-core/observables'
import { createSafeContext } from '@w3ux/hooks'
import { useState } from 'react'
import type {
	ActiveAccount,
	ActiveAccountContextInterface,
	ActiveAccountProviderProps,
} from './types'

export const [ActiveAccountContext, useActiveAccount] =
	createSafeContext<ActiveAccountContextInterface>()

export const ActiveAccountProvider = ({
	children,
	network,
}: ActiveAccountProviderProps) => {
	// Store the currently active account
	const [activeAccount, setActiveAccountState] = useState<ActiveAccount>(null)

	// Setter for the active account
	const setActiveAccount = (account: ActiveAccount, updateLocal = true) => {
		if (updateLocal && network) {
			const key = `${network}_${ActiveAccountKey}`
			if (account === null) {
				removeLocal(key)
			} else {
				setLocal(key, JSON.stringify(account))
			}
		}
		// Keep observable in sync for dedot-api subscriptions
		setActiveAddress(account?.address || null)
		// Now update component state
		setActiveAccountState(account)
	}

	return (
		<ActiveAccountContext.Provider
			value={{
				activeAccount,
				activeAddress: activeAccount?.address || null,
				setActiveAccount,
			}}
		>
			{children}
		</ActiveAccountContext.Provider>
	)
}
