// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { getActiveExtensionsLocal } from '../local'
import { setReconnectSync } from '../util'
import { connectExtension } from './connect'

export const reconnectExtensions = async (dappName: string, ss58: number) => {
	setReconnectSync('syncing')
	try {
		await Promise.all(
			getActiveExtensionsLocal().map((id) =>
				connectExtension(dappName, ss58, id),
			),
		)
	} finally {
		setReconnectSync('synced')
	}
}
