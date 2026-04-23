// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { startProxies, stopProxies } from './lifecycle'

// Drives proxy discovery start/stop based on `(api, network)` changes the same
// way the React hook does, while still mutating the shared underlying state so
// React providers and observable consumers stay in sync.
//
// Usage:
//   const lifecycle = createProxiesLifecycle()
//   lifecycle.update(api, network) // call whenever api or network changes
//   lifecycle.dispose()            // call on teardown
export interface ProxiesLifecycle<T extends GenericSubstrateApi> {
	update: (api: DedotClient<T> | null | undefined, network: string) => void
	dispose: () => void
}

export const createProxiesLifecycle = <
	T extends GenericSubstrateApi,
>(): ProxiesLifecycle<T> => {
	let previous: {
		api: DedotClient<T> | null | undefined
		network: string
	} | null = null
	// Tracks the network that currently has subscriptions started by this
	// lifecycle instance, so we can stop the right one on changes / dispose.
	let startedNetwork: string | null = null

	const stopStarted = () => {
		if (startedNetwork !== null) {
			stopProxies(startedNetwork)
			startedNetwork = null
		}
	}

	const update = (api: DedotClient<T> | null | undefined, network: string) => {
		// Tear down the previously-started subscriptions before re-evaluating,
		// mirroring how the React effect cleanup runs prior to the next effect.
		stopStarted()

		// If network changed but api instance is still bound to the old chain,
		// defer starting until the api instance refreshes for the new network.
		if (
			previous &&
			previous.network !== network &&
			previous.api?.chainSpec.chainName() === api?.chainSpec.chainName()
		) {
			previous = { api, network }
			return
		}

		if (!api) {
			previous = { api, network }
			return
		}

		startProxies(api, network)
		startedNetwork = network
		previous = { api, network }
	}

	const dispose = () => {
		stopStarted()
		previous = null
	}

	return { update, dispose }
}
