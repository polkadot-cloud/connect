// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ExtraSignedExtension, SubmittableExtrinsic } from 'dedot'
import { MerkleizedMetadata } from 'dedot/merkleized-metadata'
import type { PayloadOptions } from 'dedot/types'
import type { HexString } from 'dedot/utils'
import { hexToU8a, u8aToHex } from 'dedot/utils'
import { Ledger } from '../device'

/**
 * Builds a Ledger-compatible signing payload for a dedot extrinsic and signs it with the selected
 * Ledger account index.
 *
 * The caller provides the chain-specific signed extension factory because those fields depend on
 * the active runtime and payload options. This helper adds the metadata hash, builds the Merkle
 * proof required by Ledger, and returns the signature plus the extension data needed to attach the
 * signature to the tx.
 */
export const signLedgerPayload = async (
	specName: string,
	from: string,
	extraSignedExtension: (
		specName: string,
		signerAddress: string,
		payloadOptions?: PayloadOptions,
	) => ExtraSignedExtension | undefined,
	tx: SubmittableExtrinsic,
	metadata: HexString,
	info: {
		decimals: number
		tokenSymbol: string
	},
	index: number,
	payloadOptions?: PayloadOptions,
) => {
	const { app } = await Ledger.initialise()

	// Ledger receives a compact proof for the extrinsic instead of full metadata. The token details
	// are included so Ledger can display the transaction context.
	const merkleizer = new MerkleizedMetadata(metadata, {
		decimals: info.decimals,
		tokenSymbol: info.tokenSymbol,
	})

	// Bind the metadata digest into the signed extension so the chain can verify the same metadata
	// was used when Ledger approved the payload.
	const extra = extraSignedExtension(specName, from, {
		...payloadOptions,
		metadataHash: u8aToHex(merkleizer.digest()),
	})
	if (!extra) {
		return
	}

	// Some signed extensions resolve additional data before they can produce the raw signing payload,
	// so initialise them before reading `toRawPayload`.
	await extra.init()

	const toSign = extra.toRawPayload(tx.callHex).data
	const proof = merkleizer.proofForExtrinsicPayload(toSign as HexString)

	// Ledger signs the raw payload bytes alongside the metadata proof. The extension data is returned
	// so the caller can attach the signature later.
	const result = await Ledger.signPayload(app, index, hexToU8a(toSign), proof)
	return { signature: u8aToHex(result.signature), data: extra.data }
}
