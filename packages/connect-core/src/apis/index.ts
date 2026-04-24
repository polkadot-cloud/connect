// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { distinctUntilChanged, map } from 'rxjs'
import { _apis } from './private'

// Reactive map of network -> dedot api client.
//
// NOTE: This registry only stores references to api clients constructed
// elsewhere. It does not open or close connections — whoever calls `setApi`
// is responsible for calling `removeApi` (and disconnecting the client) on
// teardown.
export const apis$ = _apis.asObservable()

// Get the current api client for a network, or null if none is registered.
export const getApi = (network = ''): DedotClient<GenericSubstrateApi> | null =>
	_apis.getValue()[network] ?? null

// Reactive view of a single network's api client.
export const getApi$ = (network = '') =>
	apis$.pipe(
		map((apis) => apis[network] ?? null),
		distinctUntilChanged(),
	)

// Register an api client for a network. Replaces any previously registered
// client for that network — the caller is responsible for disconnecting the
// previous client if needed.
export const setApi = <T extends GenericSubstrateApi>(
	network: string,
	api: DedotClient<T>,
): void => {
	const next = { ..._apis.getValue() }
	next[network] = api as unknown as DedotClient<GenericSubstrateApi>
	_apis.next(next)
}

// Remove the api client registered for a network. No-op if none registered.
export const removeApi = (network = ''): void => {
	const current = _apis.getValue()
	if (!(network in current)) {
		return
	}
	const { [network]: _, ...rest } = current
	_apis.next(rest)
}

// Clear the entire registry.
export const resetApis = (): void => {
	_apis.next({})
}
