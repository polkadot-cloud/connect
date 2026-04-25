// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { beforeEach, describe, expect, it, vi } from 'vitest'

class MemoryStorage {
	private values = new Map<string, string>()

	getItem(key: string) {
		return this.values.has(key) ? this.values.get(key) : null
	}

	setItem(key: string, value: string) {
		this.values.set(key, value)
	}

	removeItem(key: string) {
		this.values.delete(key)
	}
}

describe('connect-core util-local', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllGlobals()
	})

	it('returns null/no-op when localStorage is unavailable', async () => {
		const { getLocal, localOrDefault, removeLocal, setLocal } = await import(
			'../../packages/connect-core/src/util-local'
		)

		expect(getLocal('x')).toBeNull()
		expect(localOrDefault('x', 'fallback')).toBe('fallback')
		expect(() => setLocal('x', 'y')).not.toThrow()
		expect(() => removeLocal('x')).not.toThrow()
	})

	it('reads and writes prefixed values when localStorage is available', async () => {
		const storage = new MemoryStorage()
		vi.stubGlobal('localStorage', storage)

		const { getLocal, removeLocal, setLocal } = await import(
			'../../packages/connect-core/src/util-local'
		)

		setLocal('account', 'alice')
		expect(storage.getItem('pc_account')).toBe('alice')
		expect(getLocal('account')).toBe('alice')

		removeLocal('account')
		expect(storage.getItem('pc_account')).toBeNull()
	})

	it('parses JSON and supports fallback/rethrow behavior', async () => {
		const storage = new MemoryStorage()
		vi.stubGlobal('localStorage', storage)

		const { localOrDefault, setLocal } = await import(
			'../../packages/connect-core/src/util-local'
		)

		setLocal('json', JSON.stringify({ ok: true }))
		expect(localOrDefault('json', { ok: false }, true)).toEqual({ ok: true })

		setLocal('bad-json', '{bad')
		expect(localOrDefault('bad-json', { ok: false }, true)).toEqual({
			ok: false,
		})
		expect(() => localOrDefault('bad-json', { ok: false }, true, true)).toThrow(
			'Failed to parse local storage for key: bad-json',
		)
	})
})
