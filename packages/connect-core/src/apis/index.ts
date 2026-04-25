// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { type Observable, distinctUntilChanged, map } from 'rxjs'
import { _apis, _refs } from './private'

// Reactive map of network -> dedot api client.
//
// NOTE: This registry only stores references to api clients constructed
// elsewhere. It does not open or close connections — whoever calls `setApi`
// is responsible for calling `removeApi` (and disconnecting the client) on
// teardown. The registry enforces a single client per network and tracks
// reference counts so multiple consumers can safely share that client; the
// entry is only dropped when the last consumer releases it.
export const apis$: Observable<
	ReadonlyMap<string, DedotClient<GenericSubstrateApi>>
> = _apis.asObservable()

// Get the current api client for a network, or null if none is registered.
export const getApi = (network = ''): DedotClient<GenericSubstrateApi> | null =>
	_apis.getValue().get(network) ?? null

// Reactive view of a single network's api client.
export const getApi$ = (
	network = '',
): Observable<DedotClient<GenericSubstrateApi> | null> =>
	apis$.pipe(
		map((apis) => apis.get(network) ?? null),
		distinctUntilChanged(),
	)

// Get the current ref count for a network's registered client (0 if none).
// Exposed primarily for diagnostics and tests.
export const getApiRefs = (network = ''): number => _refs.get(network) ?? 0

// Register an api client for a network.
//
// Single-instance contract: there is only ever one client per network. The
// first caller wins; subsequent calls for an already-registered network
// simply increment the ref count and the provided `api` is ignored. Callers
// that want the shared instance should read it via `getApi(network)` /
// `getApi$(network)` after calling `setApi`.
//
// To swap in a different client, every prior holder must release their ref
// via `removeApi(network)` first.
export const setApi = <T extends GenericSubstrateApi>(
	network: string,
	api: DedotClient<T>,
): void => {
	const current = _apis.getValue()
	if (current.has(network)) {
		_refs.set(network, (_refs.get(network) ?? 0) + 1)
		return
	}
	_refs.set(network, 1)
	const next = new Map(current)
	next.set(network, api as unknown as DedotClient<GenericSubstrateApi>)
	_apis.next(next)
}

// Release a reference to a network's registered api client.
//
// Decrements the ref count; the entry is only removed (and `apis$` only
// emits) when the count reaches zero. No-op if no client is registered.
export const removeApi = (network = ''): void => {
	const current = _apis.getValue()
	if (!current.has(network)) {
		return
	}
	const refs = (_refs.get(network) ?? 1) - 1
	if (refs > 0) {
		_refs.set(network, refs)
		return
	}
	_refs.delete(network)
	const next = new Map(current)
	next.delete(network)
	_apis.next(next)
}

// Clear the entire registry (and all ref counts).
export const resetApis = (): void => {
	_refs.clear()
	_apis.next(new Map())
}
