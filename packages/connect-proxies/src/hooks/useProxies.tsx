// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { useEffect, useState } from 'react'
import { proxies$ } from '../state/proxies'
import type { ProxyRecord } from '../types'

// Subscribes to the shared `proxies$` state and returns the latest snapshot.
//
// This hook is purely a state subscriber — it does not start or stop discovery.
// Discovery lifecycle is owned by `useProxiesLifecycle` (React) or
// `createProxiesLifecycle` (non-React). Mount one of those once for the
// network you care about; this hook can then be used anywhere to read state.
export const useProxies = () => {
	const [proxies, setProxies] = useState<Record<string, ProxyRecord>>({})

	useEffect(() => {
		const sub = proxies$.subscribe(setProxies)
		return () => {
			sub.unsubscribe()
		}
	}, [])

	return proxies
}
