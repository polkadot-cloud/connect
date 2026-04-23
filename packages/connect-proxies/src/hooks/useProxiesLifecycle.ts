// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { useEffect } from 'react'
import { useRef } from 'react'
import { startProxies, stopProxies } from '../controller/lifecycle'

// Starts proxy discovery when api is ready and automatically tears down
// previous network subscriptions when `network` or `api` changes.
export const useProxiesLifecycle = <T extends GenericSubstrateApi>(
	api: DedotClient<T> | null | undefined,
	network: string,
) => {
	const previousRef = useRef<{
		api: DedotClient<T> | null | undefined
		network: string
	} | null>(null)

	useEffect(() => {
		const previous = previousRef.current

		// If network changed but api instance is still the same, do not bind
		// subscriptions to the new network yet. Wait for the api instance to
		// refresh, while cleanup from the previous effect has already stopped
		// old-network subscriptions.
		if (
			previous &&
			previous.network !== network &&
			previous.api?.chainSpec.chainName() === api?.chainSpec.chainName()
		) {
			previousRef.current = { api, network }
			return
		}

		if (!api) {
			previousRef.current = { api, network }
			return
		}

		startProxies(api, network)
		previousRef.current = { api, network }
		return () => {
			stopProxies(network)
		}
	}, [api, network])
}
