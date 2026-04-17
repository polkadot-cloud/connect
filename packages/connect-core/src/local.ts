// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { formatAccountSs58 } from '@w3ux/util-dedot'
import {
	ActiveAccountKey,
	ActiveExtensionsKey,
	HardwareAccountsKey,
} from './consts'
import type { ActiveAccount, HardwareAccount } from './types'
import { localOrDefault, removeLocal, setLocal } from './util-local'

// Gets all active extensions from local storage
export const getActiveExtensionsLocal = (): string[] => {
	const current = localOrDefault<string[]>(ActiveExtensionsKey, [], true)
	return Array.isArray(current) ? current : []
}

// Check if an extension exists in local storage
export const isExtensionLocal = (id: string): boolean =>
	getActiveExtensionsLocal().includes(id)

// Adds an extension to local storage
export const addExtensionToLocal = (id: string): void => {
	const current = getActiveExtensionsLocal()
	if (!current.includes(id)) {
		setLocal(ActiveExtensionsKey, JSON.stringify([...current, id]))
	}
}

// Removes extension from local storage
export const removeExtensionFromLocal = (id: string): void => {
	const current = getActiveExtensionsLocal()
	setLocal(
		ActiveExtensionsKey,
		JSON.stringify(current.filter((localId) => localId !== id)),
	)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const asHardwareAccount = (value: unknown): HardwareAccount | null => {
	if (!isRecord(value)) {
		return null
	}

	const { address, name, source, network, index, group } = value

	if (
		typeof address !== 'string' ||
		typeof name !== 'string' ||
		typeof source !== 'string' ||
		typeof network !== 'string' ||
		typeof index !== 'number' ||
		!Number.isFinite(index)
	) {
		return null
	}

	// NOTE: Feb 14, 2026 - `group` is a recently added property, so we allow it to be optional for
	// backward compatibility for the time being
	if (group === undefined) {
		return {
			...value,
			address,
			name,
			source,
			network,
			index,
			group: 1,
		} as HardwareAccount
	}

	if (typeof group !== 'number' || !Number.isFinite(group)) {
		return null
	}

	return {
		...value,
		address,
		name,
		source,
		network,
		index,
		group,
	} as HardwareAccount
}

// Gets imported hardware accounts from local storage
export const getHardwareAccountsLocal = (): HardwareAccount[] => {
	const stored = localOrDefault(HardwareAccountsKey, [], true)
	if (!Array.isArray(stored)) {
		return []
	}

	return stored
		.map((account) => asHardwareAccount(account))
		.filter((account): account is HardwareAccount => account !== null)
}

// Gets an active account from local storage for a network
export const getActiveAccountLocal = (
	network: string,
	ss58: number,
): ActiveAccount => {
	try {
		const account = localOrDefault<ActiveAccount>(
			`${network}_${ActiveAccountKey}`,
			null,
			true,
		)

		if (account) {
			const formatted = formatAccountSs58(account.address, ss58)
			if (formatted) {
				account.address = formatted
				return account
			}
		}
		return null
	} catch {
		removeLocal(`${network}_${ActiveAccountKey}`)
		return null
	}
}
