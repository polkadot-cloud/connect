// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// Extension account subscription unsubs
export const unsubs: Record<string, () => void> = {}

// Add an extension id to unsub state
export const addUnsub = (id: string, unsub: () => void) => {
	unsubExtension(id)
	unsubs[id] = unsub
}

export const unsubExtension = (id: string) => {
	const unsub = unsubs[id]
	delete unsubs[id]
	unsub?.()
}

// Unsubscribe to all unsubs
export const unsubAll = () => {
	for (const id of Object.keys(unsubs)) {
		unsubExtension(id)
	}
}
