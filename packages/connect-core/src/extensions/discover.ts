// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { _extensionsStatus, _gettingExtensions } from '../subjects'
import { SupportedExtensionIds } from './consts'

// Gets extensions from injectedWeb3
export const getExtensions = async () => {
	_gettingExtensions.next(true)

	// Format installed extensions
	const formatInstalled = () =>
		SupportedExtensionIds.reduce(
			(acc, key) => {
				if (window?.injectedWeb3?.[key] !== undefined && !acc[key]) {
					acc[key] = 'installed'
				}
				return acc
			},
			{ ..._extensionsStatus.getValue() },
		)

	const interval = 200
	const maxChecks = 10
	const minVerifications = 2

	// Getter for the currently installed extensions
	let counter = 0
	let verifications = 0
	const injectedWeb3Interval = setInterval(() => {
		counter++
		if (counter === maxChecks) {
			clearInterval(injectedWeb3Interval)
			_gettingExtensions.next(false)
		} else {
			const injected = window?.injectedWeb3

			// Check if injected exists and all extensions have a valid enable function
			const ready =
				injected !== undefined &&
				Object.entries(injected).every(
					([, ext]) => ext && typeof ext.enable === 'function',
				)

			// Increment verifications if the extensions are ready
			if (ready) {
				verifications++
			} else {
				verifications = 0
			}

			if (counter > 2 && verifications >= minVerifications) {
				clearInterval(injectedWeb3Interval)
				_extensionsStatus.next(formatInstalled())
				_gettingExtensions.next(false)
			}
		}
	}, interval)
}
