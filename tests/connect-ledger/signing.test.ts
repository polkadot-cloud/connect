// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ExtraSignedExtension, SubmittableExtrinsic } from 'dedot'
import { encodeAddress, u8aToHex } from 'dedot/utils'
import { beforeEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	getAddress: vi.fn(),
	initialise: vi.fn(),
	signPayload: vi.fn(),
	unmount: vi.fn(),
	proof: vi.fn(),
}))
vi.mock('../../packages/connect-ledger/src/device/ledger', () => ({
	Ledger: mocks,
	ledgerAccountPath: (index: number) => `m/44'/354'/${index}'/0'/0'`,
}))
vi.mock('dedot/merkleized-metadata', () => ({
	MerkleizedMetadata: class {
		digest() {
			return new Uint8Array(32).fill(8)
		}
		proofForExtrinsicPayload(payload: string) {
			return mocks.proof(payload)
		}
	},
}))

import { signLedgerPayload } from '../../packages/connect-ledger/src/signing'

const key = new Uint8Array(32).fill(42)
const from = encodeAddress(key, 42)
const typedSignature = new Uint8Array([0, ...new Uint8Array(64).fill(7)])
const proof = new Uint8Array([4, 5, 6])
const app = { getAddress: mocks.getAddress }
const tx = { callHex: '0x0000' } as unknown as SubmittableExtrinsic

beforeEach(() => {
	vi.resetAllMocks()
	mocks.initialise.mockResolvedValue({ app })
	mocks.getAddress.mockResolvedValue({
		address: encodeAddress(key, 0),
		pubKey: u8aToHex(key),
	})
	mocks.signPayload.mockResolvedValue({ signature: typedSignature })
	mocks.proof.mockReturnValue(proof)
})

function fixture() {
	const init = vi.fn().mockResolvedValue(undefined)
	const raw = vi.fn(() => ({ data: '0x010203' }))
	const data = { public: 'extension-data' }
	const extra = {
		init,
		toRawPayload: raw,
		data,
	} as unknown as ExtraSignedExtension
	const factory = vi.fn(() => extra)
	const sign = () =>
		signLedgerPayload(
			'statemint',
			from,
			factory,
			tx,
			'0x00',
			{ decimals: 10, tokenSymbol: 'DOT' },
			7,
			{ tip: 1n },
		)
	return { sign, init, raw, factory, data }
}

test('binds the Dedot metadata digest and preserves the raw payload, proof, typed signature and extension data', async () => {
	const { sign, init, raw, factory, data } = fixture()
	expect(await sign()).toEqual({ signature: u8aToHex(typedSignature), data })
	expect(factory).toHaveBeenCalledWith('statemint', from, {
		tip: 1n,
		metadataHash: u8aToHex(new Uint8Array(32).fill(8)),
	})
	expect(init.mock.invocationCallOrder[0]).toBeLessThan(
		raw.mock.invocationCallOrder[0],
	)
	expect(mocks.proof).toHaveBeenCalledWith('0x010203')
	expect(mocks.getAddress).toHaveBeenCalledWith("m/44'/354'/7'/0'/0'", 0, false)
	expect(mocks.signPayload).toHaveBeenCalledWith(
		app,
		7,
		new Uint8Array([1, 2, 3]),
		proof,
	)
	expect(mocks.unmount).toHaveBeenCalledWith(app)
})

test('rejects another device identity before requesting a signature', async () => {
	mocks.getAddress.mockResolvedValue({
		address: encodeAddress(new Uint8Array(32).fill(9), 0),
	})
	await expect(fixture().sign()).rejects.toThrow(
		'does not contain this account',
	)
	expect(mocks.signPayload).not.toHaveBeenCalled()
	expect(mocks.unmount).toHaveBeenCalledWith(app)
})

test('closes the owned connection when a signed extension is unavailable', async () => {
	expect(
		await signLedgerPayload(
			'statemint',
			from,
			() => undefined,
			tx,
			'0x00',
			{ decimals: 10, tokenSymbol: 'DOT' },
			7,
		),
	).toBeUndefined()
	expect(mocks.signPayload).not.toHaveBeenCalled()
	expect(mocks.unmount).toHaveBeenCalledWith(app)
})

for (const failure of ['initialisation', 'proof', 'rejection']) {
	test(`closes only its owned connection after ${failure} fails`, async () => {
		const { sign, init } = fixture()
		if (failure === 'initialisation')
			init.mockRejectedValue(new Error('Extension init failed'))
		if (failure === 'proof')
			mocks.proof.mockImplementation(() => {
				throw new Error('Proof failed')
			})
		if (failure === 'rejection')
			mocks.signPayload.mockRejectedValue(new Error('Rejected by device'))
		await expect(sign()).rejects.toThrow()
		expect(mocks.unmount).toHaveBeenCalledExactlyOnceWith(app)
	})
}
