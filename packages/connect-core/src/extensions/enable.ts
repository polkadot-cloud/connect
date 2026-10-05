// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type {
	ExtensionEnableResult,
	ExtensionEnableResults,
	ExtensionInterface,
} from '../types'
import { enableInjectedWeb3Entry, hasValidEnable } from '../util'

// Get extensions and enable them
export const enableExtensions = async (ids: string[], dappName: string) => {
	const extensionIds = getExtensionsById(ids)
	const enableResults = await doEnable(extensionIds, dappName)

	return formatEnabledExtensions(extensionIds, enableResults)
}

// Gets extensions from injectedWeb3 by their ids
const getExtensionsById = (ids: string[]) => {
	return [...new Set(ids)]
}

// Calls enable for the provided extensions
const doEnable = async (
	extensionIds: string[],
	dappName: string,
): Promise<PromiseSettledResult<ExtensionInterface | undefined>[]> =>
	await Promise.allSettled(
		extensionIds.map(async (id) => {
			if (!hasValidEnable(id)) {
				throw new Error('Extension is not installed.')
			}
			const extension = await enableInjectedWeb3Entry(id, dappName)
			if (typeof extension?.accounts?.get !== 'function') {
				throw new Error('Extension account provider is unavailable.')
			}
			return extension
		}),
	)

const formatEnabledExtensions = (
	extensionIds: string[],
	enabledResults: PromiseSettledResult<ExtensionInterface | undefined>[],
): ExtensionEnableResults => {
	const extensionsState = new Map<string, ExtensionEnableResult>()

	for (let i = 0; i < enabledResults.length; i++) {
		const result = enabledResults[i]
		const id = extensionIds[i]

		if (result.status === 'fulfilled') {
			extensionsState.set(id, {
				extension: result.value ?? null,
				connected: true,
			})
		} else if (result.status === 'rejected') {
			extensionsState.set(id, {
				extension: null,
				connected: false,
				error: result.reason,
			})
		}
	}
	return extensionsState
}
