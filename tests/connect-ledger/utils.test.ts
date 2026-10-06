// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from 'vitest'
import {
	getLedgerDeviceFamily,
	getLedgerDeviceModel,
	getLedgerDeviceName,
	getLedgerErrorType,
	isTouchscreenDevice,
} from '../../packages/connect-ledger/src/utils'

describe('connect-ledger utils', () => {
	it('detects known Ledger models from product names', () => {
		expect(getLedgerDeviceModel('Ledger Nano S Plus')).toBe('nano_s_plus')
		expect(getLedgerDeviceModel('Ledger Nano X')).toBe('nano_x')
		expect(getLedgerDeviceModel('Ledger Nano S')).toBe('nano_s')
		expect(getLedgerDeviceModel('Ledger Flex')).toBe('flex')
		expect(getLedgerDeviceModel('Ledger Stax')).toBe('stax')
		expect(getLedgerDeviceModel('Unknown Device')).toBe('unknown')
		expect(getLedgerDeviceModel('')).toBe('unknown')
	})

	it('maps model to family and display names', () => {
		expect(getLedgerDeviceFamily('nano_s')).toBe('nano')
		expect(getLedgerDeviceFamily('flex')).toBe('touchscreen')
		expect(getLedgerDeviceFamily('unknown')).toBe('unknown')
		expect(getLedgerDeviceName('nano_x')).toBe('Ledger Nano X')
		expect(getLedgerDeviceName('unknown')).toBe('Ledger')
	})

	it('detects touchscreen devices', () => {
		expect(isTouchscreenDevice('flex')).toBe(true)
		expect(isTouchscreenDevice('stax')).toBe(true)
		expect(isTouchscreenDevice('nano_s')).toBe(false)
	})

	it('categorizes known Ledger errors and falls back to misc', () => {
		expect(getLedgerErrorType('Error: Timeout while waiting')).toBe('timeout')
		expect(getLedgerErrorType('TransportOpenUserCancelled')).toBe(
			'deviceNotConnected',
		)
		expect(getLedgerErrorType('InvalidStateError: operation denied')).toBe(
			'deviceBusy',
		)
		expect(getLedgerErrorType('Completely unknown failure')).toBe('misc')
	})
})

for (const [error, expected] of [
	['Error: NoAccessibleDeviceError:', 'deviceNotConnected'],
	['Error: ConnectionOpeningError:', 'deviceBusy'],
	['Error: SendApduTimeoutError:', 'timeout'],
	['Error: SendCommandTimeoutError:', 'timeout'],
	['Error: GlobalCommandError: Device is locked. 5515', 'deviceLocked'],
	[
		'Error: GlobalCommandError: Action refused on device. 5501',
		'transactionRejected',
	],
	[
		'Error: PolkadotAppCommandError: Rejected by the user, or device not ready (locked or busy) 6986',
		'transactionRejected',
	],
	['Error: PolkadotAppCommandError: CLA not supported 6e00', 'appNotOpen'],
	[
		'Error: PolkadotAppCommandError: INS not supported 6d00',
		'methodNotSupported',
	],
	[
		'Error: PolkadotAppCommandError: Data is invalid: Call nesting not supported 6984',
		'nestingNotSupported',
	],
]) {
	it(`maps signer-kit feedback: ${expected}`, () => {
		expect(getLedgerErrorType(error)).toBe(expected)
	})
}
