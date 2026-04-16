/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import type { HardwareAccount } from '@polkadot-cloud/connect-core/types'

export interface UseLedgerAccountsReturn {
	getLedgerAccounts: () => HardwareAccount[]
	getLedgerAccount: (address: string) => HardwareAccount | null
	addLedgerAccount: (
		group: number,
		address: string,
		index: number,
		callback?: () => void,
	) => HardwareAccount | null
	removeLedgerAccount: (address: string, callback?: () => void) => void
	renameLedgerAccount: (address: string, name: string) => void
	ledgerAccountExists: (address: string) => boolean
}
