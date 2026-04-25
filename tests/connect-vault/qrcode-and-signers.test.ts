// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { describe, expect, it } from 'vitest'
import {
	createFrames,
	createImgSize,
	encodeNumber,
	encodeString,
} from '../../packages/connect-vault/src/qrcode/util'
import { deriveVaultButtonState } from '../../packages/connect-vault/src/signers'

describe('connect-vault qrcode utils', () => {
	it('encodes numbers and strings to u8a', () => {
		expect(Array.from(encodeNumber(513))).toEqual([2, 1])
		expect(Array.from(encodeString('AB'))).toEqual([65, 66])
	})

	it('creates multipart frames with headers', () => {
		const input = new Uint8Array([1, 2, 3])
		const [frame] = createFrames(input)

		expect(Array.from(frame)).toEqual([0, 0, 1, 0, 0, 1, 2, 3])
	})

	it('splits payloads larger than a frame', () => {
		const input = new Uint8Array(1025).fill(7)
		const frames = createFrames(input)

		expect(frames).toHaveLength(2)
		expect(Array.from(frames[0].subarray(0, 5))).toEqual([0, 0, 2, 0, 0])
		expect(Array.from(frames[1].subarray(0, 5))).toEqual([0, 0, 2, 0, 1])
	})

	it('creates consistent image size style objects', () => {
		expect(createImgSize(240)).toEqual({ width: '240px', height: 'auto' })
		expect(createImgSize('40')).toEqual({ width: '40px', height: 'auto' })
		expect(createImgSize()).toEqual({ width: 'auto', height: 'auto' })
	})
})

describe('connect-vault signers', () => {
	it('derives state for submitted flow', () => {
		expect(
			deriveVaultButtonState({
				submitted: true,
				valid: true,
				submitText: 'Submitted',
				signText: 'Sign',
				promptStatus: 0,
				disabled: false,
			}),
		).toEqual({
			buttonText: 'Submitted',
			buttonDisabled: false,
			buttonPulse: true,
		})
	})

	it('derives state for pre-submit flow and disables when prompt is active', () => {
		expect(
			deriveVaultButtonState({
				submitted: false,
				valid: false,
				submitText: 'Submitted',
				signText: 'Sign',
				promptStatus: 1,
				disabled: false,
			}),
		).toEqual({
			buttonText: 'Sign',
			buttonDisabled: true,
			buttonPulse: true,
		})
	})
})
