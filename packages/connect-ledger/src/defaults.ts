// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { LedgerDeviceModel } from './types'

export const defaultDeviceModel: LedgerDeviceModel = 'unknown'

export const defaultFeedback = {
	message: null,
	helpKey: null,
}

// Ledger error keyed by type of error
export const errorsByType = {
	timeout: [
		'Error: Timeout',
		'TimeoutError',
		'Error: SendApduTimeoutError',
		'Error: SendCommandTimeoutError',
	],
	methodNotSupported: [
		'Error: Method not supported',
		'Error: PolkadotAppCommandError: INS not supported',
	],
	nestingNotSupported: ['Error: Call nesting not supported'],
	outsideActiveChannel: ['Error: TransportError: Invalid channel'],
	deviceNotConnected: [
		'TransportOpenUserCancelled',
		'AbortError',
		'Error: NoAccessibleDeviceError',
		'Error: Ledger disconnected',
		'Error: DeviceDisconnected',
	],
	deviceBusy: [
		'Error: Ledger Device is busy',
		'InvalidStateError',
		'Error: DeviceBusyError',
		'Error: ConnectionOpeningError',
	],
	deviceLocked: [
		'Error: LockedDeviceError',
		'Error: LockedDevice',
		'Error: GlobalCommandError: Device is locked',
	],
	transactionRejected: [
		'Error: Transaction rejected',
		'Error: PolkadotAppCommandError: Rejected',
		'Error: GlobalCommandError: Action refused',
	],
	txVersionNotSupported: ['Error: Txn version not supported'],
	appNotOpen: [
		'Error: Unknown Status Code: 28161',
		'Error: Open the Polkadot app',
		'Error: PolkadotAppCommandError: CLA not supported',
		'Error: GlobalCommandError: CLA not supported',
	],
}
