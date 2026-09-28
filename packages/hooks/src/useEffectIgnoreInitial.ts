// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only
// Copyright 2024 w3ux authors & contributors

import { useEffect, useRef } from 'react'

export const useEffectIgnoreInitial = <T, U>(fn: T, deps: U[]) => {
	const isInitial = useRef<boolean>(true)

	useEffect(
		() => {
			if (!isInitial.current) {
				if (typeof fn === 'function') {
					fn()
				}
			}
			isInitial.current = false
		},
		deps ? [...deps] : undefined,
	)
}
