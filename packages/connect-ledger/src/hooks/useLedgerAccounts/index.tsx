/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import { useHardwareAccounts } from '@polkadot-cloud/connect'
import type {
	HardwareAccount,
	HardwareAccountSource,
} from '@polkadot-cloud/connect-core/types'
import type { UseLedgerAccountsReturn } from './types'

const source: HardwareAccountSource = 'ledger'

/**
 * Proxy hook that wraps `useHardwareAccounts` with `source='ledger'` pre-bound. All account
 * operations are scoped to the provided network.
 */
export const useLedgerAccounts = (network: string): UseLedgerAccountsReturn => {
	const {
		addHardwareAccount,
		removeHardwareAccount,
		renameHardwareAccount,
		getHardwareAccount,
		getHardwareAccounts,
		hardwareAccountExists,
	} = useHardwareAccounts()

	const getLedgerAccounts = (): HardwareAccount[] =>
		getHardwareAccounts(source, network)

	const getLedgerAccount = (address: string): HardwareAccount | null =>
		getHardwareAccount(source, network, address)

	const addLedgerAccount = (
		group: number,
		address: string,
		index: number,
		callback?: () => void,
	): HardwareAccount | null =>
		addHardwareAccount(source, network, group, address, index, callback)

	const removeLedgerAccount = (
		address: string,
		callback?: () => void,
	): void => {
		removeHardwareAccount(source, network, address, callback)
	}

	const renameLedgerAccount = (address: string, name: string): void => {
		renameHardwareAccount(source, network, address, name)
	}

	const ledgerAccountExists = (address: string): boolean =>
		hardwareAccountExists(source, network, address)

	return {
		getLedgerAccounts,
		getLedgerAccount,
		addLedgerAccount,
		removeLedgerAccount,
		renameLedgerAccount,
		ledgerAccountExists,
	}
}
