/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import {
	canConnect,
	extensionsStatus$,
	getStatus,
	gettingExtensions$,
	removeStatus,
	setStatus,
} from '@polkadot-cloud/connect-core'
import { getExtensions } from '@polkadot-cloud/connect-core/extensions'
import type {
	ExtensionStatus,
	ExtensionsStatus,
} from '@polkadot-cloud/connect-core/types'
import { createSafeContext } from '@w3ux/hooks'
import { type ReactNode, useEffect, useState } from 'react'
import { combineLatest } from 'rxjs'
import type { ExtensionsConnectContextInterface } from './types'

export const [ExtensionsConnectContext, useExtensions] =
	createSafeContext<ExtensionsConnectContextInterface>()

export const ExtensionsConnectProvider = ({
	children,
}: {
	children: ReactNode
}) => {
	// Store whether extensions are being fetched
	const [gettingExtensions, setGettingExtensions] = useState<boolean>(true)

	// Store discovered extensions along with their status
	const [extensionsStatus, setExtensionsStatus] = useState<ExtensionsStatus>({})

	// Setter for an extension status
	const setExtensionStatus = (id: string, status: ExtensionStatus) => {
		setStatus(id, status)
	}

	// Removes an extension status
	const removeExtensionStatus = (id: string) => {
		removeStatus(id)
	}

	// Checks if an extension has been installed
	const extensionInstalled = (id: string): boolean =>
		getStatus(id) !== undefined

	// Checks whether an extension can be connected to
	const extensionCanConnect = (id: string): boolean => canConnect(id)

	// Init extensions discovery
	const discoverExtensions = async () => {
		// Fetch extensions from `injectedWeb3`
		getExtensions()
	}

	// Subscribes to observables and updates state
	// biome-ignore lint/correctness/useExhaustiveDependencies: one-time subscription on mount
	useEffect(() => {
		discoverExtensions()
		const sub = combineLatest([
			gettingExtensions$,
			extensionsStatus$,
		]).subscribe(([getting, status]) => {
			setGettingExtensions(getting)
			setExtensionsStatus(status)
		})
		return () => {
			sub.unsubscribe()
		}
	}, [])

	return (
		<ExtensionsConnectContext.Provider
			value={{
				extensionsStatus,
				gettingExtensions,
				setExtensionStatus,
				removeExtensionStatus,
				extensionInstalled,
				extensionCanConnect,
			}}
		>
			{children}
		</ExtensionsConnectContext.Provider>
	)
}
