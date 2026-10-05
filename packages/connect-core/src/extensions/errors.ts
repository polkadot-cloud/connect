// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

const connectionErrors = new Map<string, unknown>()

// Preserve provider diagnostics without changing the boolean connection API.
export const getExtensionConnectionError = (id: string): unknown =>
	connectionErrors.get(id)

export const setExtensionConnectionError = (id: string, error?: unknown) => {
	if (error === undefined) connectionErrors.delete(id)
	else connectionErrors.set(id, error)
}
