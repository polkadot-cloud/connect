// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { HardwareAccount } from '@polkadot-cloud/connect-core/types'

export interface UseVaultAccountsReturn {
	getVaultAccounts: () => HardwareAccount[]
	getVaultAccount: (address: string) => HardwareAccount | null
	addVaultAccount: (
		group: number,
		address: string,
		index: number,
		callback?: () => void,
	) => HardwareAccount | null
	removeVaultAccount: (address: string, callback?: () => void) => void
	renameVaultAccount: (address: string, name: string) => void
	vaultAccountExists: (address: string) => boolean
}
