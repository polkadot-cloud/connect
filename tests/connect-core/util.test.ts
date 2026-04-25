// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	canConnect,
	enableInjectedWeb3Entry,
	getStatus,
	hasValidEnable,
	removeStatus,
	setStatus,
} from '../../packages/connect-core/src/util'

describe('connect-core util', () => {
	beforeEach(() => {
		removeStatus('polkadot-js')
		vi.unstubAllGlobals()
	})

	it('sets, gets and removes extension status', () => {
		expect(getStatus('polkadot-js')).toBeUndefined()

		setStatus('polkadot-js', 'installed')
		expect(getStatus('polkadot-js')).toBe('installed')

		removeStatus('polkadot-js')
		expect(getStatus('polkadot-js')).toBeUndefined()
	})

	it('returns connection capability based on status', () => {
		expect(canConnect('polkadot-js')).toBe(false)

		setStatus('polkadot-js', 'installed')
		expect(canConnect('polkadot-js')).toBe(true)

		setStatus('polkadot-js', 'connected')
		expect(canConnect('polkadot-js')).toBe(false)
	})

	it('checks and enables injected web3 entries with a mocked window object', () => {
		const enable = vi.fn().mockReturnValue({ signer: 'ok' })
		vi.stubGlobal('window', {
			parent: {
				injectedWeb3: {
					'polkadot-js': { enable },
				},
			},
		})

		expect(hasValidEnable('polkadot-js')).toBe(true)
		expect(enableInjectedWeb3Entry('polkadot-js', 'connect-tests')).toEqual({
			signer: 'ok',
		})
		expect(enable).toHaveBeenCalledWith('connect-tests')
	})

	it('fails safely when enable is absent or invalid', () => {
		vi.stubGlobal('window', {
			parent: {
				injectedWeb3: {
					'polkadot-js': { enable: 'nope' },
				},
			},
		})

		expect(hasValidEnable('polkadot-js')).toBe(false)
		expect(hasValidEnable('missing')).toBe(false)
	})
})
