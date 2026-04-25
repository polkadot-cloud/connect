// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	apis$,
	getApi,
	getApi$,
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

	it('replaces a previously registered client for the same network', () => {
		const first = makeApi('first')
		const second = makeApi('second')
		setApi('polkadot', first)
		setApi('polkadot', second)
		expect(getApi('polkadot')).toBe(second)
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

	it('setApi does not emit when registering the same instance for the same network', () => {
		const api = makeApi('polkadot')
		setApi('polkadot', api)

		const emissions: ReadonlyMap<string, Api>[] = []
		const sub = apis$.subscribe((m) => emissions.push(m))
		const before = emissions.length

		setApi('polkadot', api)

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

		// Re-setting the same instance should not emit (no-op + distinct).
		setApi('polkadot', api)
		expect(emissions.length).toBe(2)

		// Replacing with a new client emits.
		const next = makeApi('next')
		setApi('polkadot', next)
		expect(emissions.length).toBe(3)
		expect(emissions[2]).toBe(next)

		// Removing emits null.
		removeApi('polkadot')
		expect(emissions.length).toBe(4)
		expect(emissions[3]).toBeNull()

		// Removing again is a no-op (no emission).
		removeApi('polkadot')
		expect(emissions.length).toBe(4)

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
})
