/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

// Extension account subscription unsubs
export const unsubs: Record<string, () => void> = {}

// Add an extension id to unsub state
export const addUnsub = (id: string, unsub: () => void) => {
	unsubs[id] = unsub
}

// Unsubscribe to all unsubs
export const unsubAll = () => {
	for (const unsub of Object.values(unsubs)) {
		unsub()
	}
}
