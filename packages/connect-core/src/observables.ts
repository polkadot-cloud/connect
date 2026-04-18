// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import {
	_extensionAccounts,
	_extensionsStatus,
	_gettingExtensions,
	_hardwareAccounts,
	_initialisedExtensions,
	_reconnectSync,
} from './subjects'

// Discovered extensions along with their status
export const extensionsStatus$ = _extensionsStatus.asObservable()

// Whether extensions are being checked
export const gettingExtensions$ = _gettingExtensions.asObservable()

// Extensions that have successfully connected
export const initialisedExtensions$ = _initialisedExtensions.asObservable()

// Sync status of reconnecting to previously enabled extensions
export const reconnectSync$ = _reconnectSync.asObservable()

// Imported extension accounts
export const extensionAccounts$ = _extensionAccounts.asObservable()

// Imported hardware accounts
export const hardwareAccounts$ = _hardwareAccounts.asObservable()

// Active address
export {
	activeAddress$,
	getActiveAddress,
	setActiveAddress,
	resetActiveAddress,
} from './activeAddress'

// External accounts
export * from './externalAccounts'

// Imported accounts (extension + hardware + external)
export * from './importedAccounts'
