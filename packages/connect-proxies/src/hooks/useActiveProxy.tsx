// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { useEffect, useState } from 'react'
import { activeProxy$, getActiveProxy } from '../state/activeProxy'
import type { ActiveProxy } from '../types'

// Subscribes to the active proxy observable and returns the current value.
export const useActiveProxy = () => {
	const [activeProxy, setActiveProxy] = useState<ActiveProxy | null>(
		getActiveProxy(),
	)

	useEffect(() => {
		const sub = activeProxy$.subscribe(setActiveProxy)
		return () => {
			sub.unsubscribe()
		}
	}, [])

	return activeProxy
}
