// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { useEffect, useRef } from 'react'
import {
	type ProxiesLifecycle,
	createProxiesLifecycle,
} from '../controller/ProxiesLifecycle'

// Starts proxy discovery when api is ready and automatically tears down
// previous network subscriptions when `network` or `api` changes.
export const useProxiesLifecycle = <T extends GenericSubstrateApi>(
	api: DedotClient<T> | null | undefined,
	network: string,
) => {
	const lifecycleRef = useRef<ProxiesLifecycle<T> | null>(null)
	if (lifecycleRef.current === null) {
		lifecycleRef.current = createProxiesLifecycle<T>()
	}

	useEffect(() => {
		const lifecycle = lifecycleRef.current
		lifecycle?.update(api, network)
	}, [api, network])

	useEffect(
		() => () => {
			lifecycleRef.current?.dispose()
			lifecycleRef.current = null
		},
		[],
	)
}
