// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { unsubExtension } from '../accounts/unsubs'
import { processExtensionAccounts } from '../accounts/util'
import { removeExtensionFromLocal } from '../local'
import { hasValidEnable, removeStatus, setStatus } from '../util'
import { setExtensionConnectionError } from './errors'

// Cancel this wallet before clearing its reconnect preference, so late updates cannot restore it.
export const disconnectExtension = (id: string): void => {
	unsubExtension(id)
	setExtensionConnectionError(id)
	processExtensionAccounts({ source: id, ss58: 0 }, undefined, [])
	if (hasValidEnable(id)) {
		setStatus(id, 'installed')
	} else {
		removeStatus(id)
	}
	removeExtensionFromLocal(id)
}
