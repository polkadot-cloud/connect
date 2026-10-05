// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { addUnsub, unsubExtension } from '../accounts/unsubs'
import { processExtensionAccounts } from '../accounts/util'
import { addExtensionToLocal, removeExtensionFromLocal } from '../local'
import { _extensionAccounts } from '../subjects'
import type { ExtensionAccount, ExtensionInterface } from '../types'
import {
	canConnect,
	getStatus,
	hasValidEnable,
	removeStatus,
	setStatus,
} from '../util'
import { initExtensionsIfActive } from './init'

const pendingConnections = new Map<string, Promise<boolean>>()

// Handles accounts from a single extension
const handleAccounts = (
	ss58: number,
	id: string,
	extension: ExtensionInterface,
	accounts: ExtensionAccount[],
) => {
	processExtensionAccounts(
		{
			source: id,
			ss58,
		},
		extension.signer,
		accounts,
	)
	if (_extensionAccounts.getValue().some((account) => account.source === id)) {
		setStatus(id, 'connected')
		addExtensionToLocal(id)
	} else {
		setStatus(id, 'not_authenticated')
		removeExtensionFromLocal(id)
	}
}

// Connects to a single extension and processes its accounts
export const connectExtension = (
	dappName: string,
	ss58: number,
	id: string,
): Promise<boolean> => {
	if (!pendingConnections.has(id) && !canConnect(id)) {
		return Promise.resolve(false)
	}
	return connectExtensionAccounts(dappName, ss58, id)
}

// Reconnect must also restore saved wallets before discovery or after account cleanup.
// Keep this shared implementation private to the extensions entrypoint.
export const connectExtensionAccounts = (
	dappName: string,
	ss58: number,
	id: string,
): Promise<boolean> => {
	const pending = pendingConnections.get(id)
	if (pending) {
		return pending
	}
	const connection = doConnectExtension(dappName, ss58, id).finally(() => {
		if (pendingConnections.get(id) === connection) {
			pendingConnections.delete(id)
		}
	})
	pendingConnections.set(id, connection)
	return connection
}

const doConnectExtension = async (
	dappName: string,
	ss58: number,
	id: string,
): Promise<boolean> => {
	let active = true
	let unsubscribe: (() => void) | undefined
	try {
		// Register cleanup before approval so teardown also cancels pending requests.
		addUnsub(id, () => {
			active = false
			pendingConnections.delete(id)
			unsubscribe?.()
		})
		const { connected } = await initExtensionsIfActive(
			dappName,
			[id],
			() => active,
		)
		if (!active) {
			return false
		}
		if (connected.size === 0) {
			throw new Error('Extension access was not approved.')
		}
		const result = connected.get(id)
		const extension = result?.extension
		const canSubscribe =
			!!extension && typeof extension.accounts.subscribe === 'function'

		if (!extension) {
			throw new Error('Extension account provider is unavailable.')
		}
		// Subscribe before fetching so changes during the initial request are not lost.
		let revision = 0
		if (canSubscribe) {
			unsubscribe = extension.accounts.subscribe((accounts) => {
				if (active) {
					revision++
					handleAccounts(ss58, id, extension, accounts)
				}
			})
			if (!active) {
				unsubscribe()
				return false
			}
		}
		const initialRevision = revision
		const accounts = await extension.accounts.get()
		if (!active) {
			return false
		}
		if (revision === initialRevision) {
			handleAccounts(ss58, id, extension, accounts)
		}
		return getStatus(id) === 'connected'
	} catch {
		if (!active) {
			return false
		}
		unsubExtension(id)
		processExtensionAccounts({ source: id, ss58 }, undefined, [])
		if (hasValidEnable(id)) {
			setStatus(id, 'not_authenticated')
		} else {
			removeStatus(id)
		}
		removeExtensionFromLocal(id)
		return false
	}
}
