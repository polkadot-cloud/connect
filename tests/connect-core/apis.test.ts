// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	apis$,
	getApi,
	getApi$,
	getApiRefs,
	removeApi,
	resetApis,
	setApi,
} from '../../packages/connect-core/src/apis'

type Api = DedotClient<GenericSubstrateApi>

// Build a minimal stand-in for a DedotClient. The registry only stores
// references and never invokes anything on the client, so an opaque object
// suffices.
const makeApi = (label: string): Api => ({ __label: label }) as unknown as Api

describe('connect-core apis registry', () => {
	beforeEach(() => {
		resetApis()
	})

	afterEach(() => {
		resetApis()
	})

	it('returns null from getApi when nothing is registered', () => {
		expect(getApi('polkadot')).toBeNull()
		expect(getApi()).toBeNull()
	})

	it('registers and retrieves an api client by network', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)
		expect(getApi('polkadot')).toBe(api)
	})

	it('keeps the first registered client and ignores subsequent setApi instances', () => {
		const first = makeApi('first')
		const second = makeApi('second')
		setApi('polkadot', first)
		setApi('polkadot', second)
		// Single-instance contract: first writer wins; second call only ref++.
		expect(getApi('polkadot')).toBe(first)
		expect(getApiRefs('polkadot')).toBe(2)
	})

	it('removes a registered client', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)
		removeApi('polkadot')
		expect(getApi('polkadot')).toBeNull()
	})

	it('removeApi is a no-op for unknown networks', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)

		const emissions: ReadonlyMap<string, Api>[] = []
		const sub = apis$.subscribe((m) => emissions.push(m))
		const before = emissions.length

		removeApi('kusama')

		expect(emissions.length).toBe(before)
		expect(getApi('polkadot')).toBe(api)
		sub.unsubscribe()
	})

	it('resetApis clears all registered clients', () => {
		setApi('polkadot', makeApi('a'))
		setApi('kusama', makeApi('b'))
		resetApis()
		expect(getApi('polkadot')).toBeNull()
		expect(getApi('kusama')).toBeNull()
	})

	it('apis$ emits the current map and updates on changes', () => {
		const emissions: ReadonlyMap<string, Api>[] = []
		const sub = apis$.subscribe((m) => emissions.push(m))

		// Initial emission from BehaviorSubject.
		expect(emissions.length).toBe(1)
		expect(emissions[0].size).toBe(0)

		const api = makeApi('polkadot')
		setApi('polkadot', api)
		expect(emissions.length).toBe(2)
		expect(emissions[1].get('polkadot')).toBe(api)

		removeApi('polkadot')
		expect(emissions.length).toBe(3)
		expect(emissions[2].has('polkadot')).toBe(false)

		sub.unsubscribe()
	})

	it('setApi does not emit when the network already has a registered client', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)

		const emissions: ReadonlyMap<string, Api>[] = []
		const sub = apis$.subscribe((m) => emissions.push(m))
		const before = emissions.length

		setApi('polkadot', api)
		setApi('polkadot', makeApi('other'))

		expect(emissions.length).toBe(before)
		expect(getApi('polkadot')).toBe(api)
		sub.unsubscribe()
	})

	it('setApi produces an immutable snapshot (does not mutate previous map)', () => {
		const first = makeApi('first')
		setApi('polkadot', first)

		const snapshot: ReadonlyMap<string, Api> = (() => {
			let captured!: ReadonlyMap<string, Api>
			const sub = apis$.subscribe((m) => {
				captured = m
			})
			sub.unsubscribe()
			return captured
		})()

		setApi('kusama', makeApi('second'))

		expect(snapshot.has('kusama')).toBe(false)
		expect(snapshot.get('polkadot')).toBe(first)
	})

	it('getApi$ emits per-network changes and de-duplicates equal values', () => {
		const emissions: (Api | null)[] = []
		const sub = getApi$('polkadot').subscribe((v) => emissions.push(v))

		// Initial null.
		expect(emissions).toEqual([null])

		// Setting an unrelated network should not emit.
		setApi('kusama', makeApi('k'))
		expect(emissions.length).toBe(1)

		// Setting the target network emits the new client.
		const api = makeApi('polkadot')
		setApi('polkadot', api)
		expect(emissions.length).toBe(2)
		expect(emissions[1]).toBe(api)

		// Re-setting (same or different instance) should not emit — single
		// instance contract just bumps the ref count.
		setApi('polkadot', api)
		setApi('polkadot', makeApi('ignored'))
		expect(emissions.length).toBe(2)

		// First two removes only decrement; entry stays.
		removeApi('polkadot')
		removeApi('polkadot')
		expect(emissions.length).toBe(2)

		// Final remove drops the entry and emits null.
		removeApi('polkadot')
		expect(emissions.length).toBe(3)
		expect(emissions[2]).toBeNull()

		// Removing again is a no-op (no emission).
		removeApi('polkadot')
		expect(emissions.length).toBe(3)

		sub.unsubscribe()
	})

	it('keeps independent entries per network', () => {
		const polkadot = makeApi('p')
		const kusama = makeApi('k')
		setApi('polkadot', polkadot)
		setApi('kusama', kusama)

		expect(getApi('polkadot')).toBe(polkadot)
		expect(getApi('kusama')).toBe(kusama)

		removeApi('polkadot')
		expect(getApi('polkadot')).toBeNull()
		expect(getApi('kusama')).toBe(kusama)
	})

	it('ref-counts repeat setApi calls and only drops the entry on final remove', () => {
		const api = makeApi('polkadot')

		setApi('polkadot', api)
		setApi('polkadot', api)
		setApi('polkadot', api)
		expect(getApiRefs('polkadot')).toBe(3)

		// First two removes only decrement; client stays registered.
		removeApi('polkadot')
		expect(getApi('polkadot')).toBe(api)
		expect(getApiRefs('polkadot')).toBe(2)

		removeApi('polkadot')
		expect(getApi('polkadot')).toBe(api)
		expect(getApiRefs('polkadot')).toBe(1)

		// Final remove drops the entry.
		removeApi('polkadot')
		expect(getApi('polkadot')).toBeNull()
		expect(getApiRefs('polkadot')).toBe(0)
	})

	it('does not emit on intermediate ref-count changes', () => {
		const api = makeApi('polkadot')

		const emissions: ReadonlyMap<string, Api>[] = []
		const sub = apis$.subscribe((m) => emissions.push(m))
		const initial = emissions.length

		setApi('polkadot', api) // emits (new entry)
		setApi('polkadot', api) // ref++ only
		setApi('polkadot', api) // ref++ only
		expect(emissions.length).toBe(initial + 1)

		removeApi('polkadot') // ref-- only
		removeApi('polkadot') // ref-- only
		expect(emissions.length).toBe(initial + 1)

		removeApi('polkadot') // last ref → emits removal
		expect(emissions.length).toBe(initial + 2)

		sub.unsubscribe()
	})

	it('a different instance passed to setApi is ignored while one is registered', () => {
		const first = makeApi('first')
		const second = makeApi('second')

		setApi('polkadot', first)
		setApi('polkadot', second) // ignored, ref++
		setApi('polkadot', second) // ignored, ref++
		expect(getApi('polkadot')).toBe(first)
		expect(getApiRefs('polkadot')).toBe(3)

		// After all refs released, a new setApi can install a new client.
		removeApi('polkadot')
		removeApi('polkadot')
		removeApi('polkadot')
		expect(getApi('polkadot')).toBeNull()

		setApi('polkadot', second)
		expect(getApi('polkadot')).toBe(second)
		expect(getApiRefs('polkadot')).toBe(1)
	})

	it('resetApis clears ref counts', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)
		setApi('polkadot', api)
		expect(getApiRefs('polkadot')).toBe(2)

		resetApis()
		expect(getApiRefs('polkadot')).toBe(0)
		expect(getApi('polkadot')).toBeNull()
	})
})
