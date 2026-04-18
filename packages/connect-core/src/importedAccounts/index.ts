// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { combineLatest, map } from 'rxjs'
import { _externalAccounts } from '../externalAccounts/private'
import { _extensionAccounts, _hardwareAccounts } from '../subjects'
import type { ImportedAccount } from '../types'

export const importedAccounts$ = combineLatest([
	_extensionAccounts.asObservable(),
	_hardwareAccounts.asObservable(),
	_externalAccounts.asObservable(),
]).pipe(
	map(
		([extensionAccounts, hardwareAccounts, externalAccounts]) =>
			[
				...extensionAccounts,
				...hardwareAccounts,
				...externalAccounts,
			] as ImportedAccount[],
	),
)

export const getImportedAccounts = (): ImportedAccount[] => [
	..._extensionAccounts.getValue(),
	..._hardwareAccounts.getValue(),
	..._externalAccounts.getValue(),
]
