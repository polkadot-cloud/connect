// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { getActiveExtensionsLocal } from '../local'
import { getReconnectSync, setReconnectSync } from '../util'
import { connectExtensionAccounts } from './connect'

let pendingReconnect: Promise<void> | undefined

export const reconnectExtensions = (dappName: string, ss58: number) => {
	if (pendingReconnect && getReconnectSync() === 'syncing') {
		return pendingReconnect
	}
	setReconnectSync('syncing')
	const reconnect = Promise.all(
		getActiveExtensionsLocal().map((id) =>
			connectExtensionAccounts(dappName, ss58, id),
		),
	)
		.then(() => undefined)
		.finally(() => {
			if (pendingReconnect === reconnect) {
				pendingReconnect = undefined
				if (getReconnectSync() === 'syncing') {
					setReconnectSync('synced')
				}
			}
		})
	pendingReconnect = reconnect
	return reconnect
}
