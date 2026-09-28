// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	makeCancelable,
	mergeDeep,
	minDecimalPlaces,
	planckToUnit,
	unitToPlanck,
	withTimeout,
	withTimeoutThrow,
} from '../../packages/utils/src'

afterEach(() => {
	vi.clearAllTimers()
	vi.useRealTimers()
})

describe('promise lifecycle', () => {
	it('rejects when the throwing timeout expires', async () => {
		vi.useFakeTimers()
		const onTimeout = vi.fn()
		const result = withTimeoutThrow(10, new Promise(() => {}), { onTimeout })
		const assertion = expect(result).rejects.toThrow('Function timeout')
		await vi.advanceTimersByTimeAsync(10)
		await assertion
		expect(onTimeout).toHaveBeenCalledOnce()
	})

	it('resolves undefined for a non-throwing timeout', async () => {
		vi.useFakeTimers()
		const result = withTimeout(10, new Promise(() => {}))
		await vi.advanceTimersByTimeAsync(10)
		await expect(result).resolves.toBeUndefined()
	})

	it.each([withTimeout, withTimeoutThrow])(
		'cleans up a timeout after success',
		async (timeout) => {
			vi.useFakeTimers()
			const onTimeout = vi.fn()
			await expect(
				timeout(10, Promise.resolve(42), { onTimeout }),
			).resolves.toBe(42)
			expect(vi.getTimerCount()).toBe(0)
			await vi.advanceTimersByTimeAsync(10)
			expect(onTimeout).not.toHaveBeenCalled()
		},
	)

	it.each([withTimeout, withTimeoutThrow])(
		'cleans up a timeout after rejection',
		async (timeout) => {
			vi.useFakeTimers()
			const error = new Error('failed')
			await expect(timeout(10, Promise.reject(error))).rejects.toBe(error)
			expect(vi.getTimerCount()).toBe(0)
		},
	)

	it.each([withTimeout, withTimeoutThrow])(
		'rejects if the timeout callback throws',
		async (timeout) => {
			vi.useFakeTimers()
			const result = timeout(10, new Promise(() => {}), {
				onTimeout: () => {
					throw new Error('callback failed')
				},
			})
			const assertion = expect(result).rejects.toThrow('callback failed')
			await vi.advanceTimersByTimeAsync(10)
			await assertion
		},
	)

	it('forwards a rejected cancelable promise without an unhandled branch', async () => {
		const error = new Error('upstream failed')
		await expect(makeCancelable(Promise.reject(error)).promise).rejects.toBe(
			error,
		)
	})

	it('reports cancellation when the underlying operation rejects', async () => {
		const operation = makeCancelable(
			Promise.reject(new Error('upstream failed')),
		)
		operation.cancel()
		await expect(operation.promise).rejects.toThrow('Cancelled')
	})
})

describe('signed and fractional balances', () => {
	it.each([
		[-1500n, 3, '-1.500'],
		[-1n, 3, '-0.001'],
		[-1500n, 0, '-1500'],
	])('formats %s planck with %s decimals', (value, decimals, expected) => {
		expect(planckToUnit(value, decimals)).toBe(expected)
	})

	it.each([
		['-1.5', 3, -1500n],
		['-0.5', 3, -500n],
		['-.5', 3, -500n],
		['1.5', 0, 1n],
		['-1.5', 0, -1n],
		['9007199254740993.12', 2, 900719925474099312n],
		[1e-7, 10, 1000n],
	])('converts %s units with %s decimals', (value, decimals, expected) => {
		expect(unitToPlanck(value, decimals)).toBe(expected)
	})

	it.each(['1.2.3', '1.2oops'])(
		'rejects malformed decimal input %s',
		(value) => {
			expect(unitToPlanck(value, 1)).toBe(0n)
		},
	)
})

describe('decimal formatting', () => {
	it.each([
		['42', 0, '42'],
		['-0.5', 2, '-0.50'],
		[1e-7, 8, '0.00000010'],
		['1.2.3', 2, '0'],
		['1.oops', 2, '0'],
	])('formats %s with at least %s decimals', (value, decimals, expected) => {
		expect(minDecimalPlaces(value, decimals)).toBe(expected)
	})
})

describe('deep merging', () => {
	it('does not write through __proto__', () => {
		try {
			const result = mergeDeep(
				{},
				JSON.parse('{"__proto__":{"utilsReviewPolluted":true},"safe":1}'),
			)
			expect(
				({} as Record<string, unknown>).utilsReviewPolluted,
			).toBeUndefined()
			expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
			expect(result.safe).toBe(1)
		} finally {
			Reflect.deleteProperty(Object.prototype, 'utilsReviewPolluted')
		}
	})

	it('replaces scalar and array values with nested objects', () => {
		expect(
			mergeDeep({ a: 1, b: [] }, { a: { value: 2 }, b: { value: 3 } }),
		).toEqual({
			a: { value: 2 },
			b: { value: 3 },
		})
	})

	it('merges own properties without mutating inherited objects', () => {
		const prototype = { nested: { original: true } }
		const target = Object.create(prototype)
		const source = Object.assign(Object.create({ inherited: 1 }), {
			nested: { added: true },
		})
		mergeDeep(target, source)
		expect(prototype.nested).toEqual({ original: true })
		expect(target.nested).toEqual({ added: true })
		expect(Object.hasOwn(target, 'inherited')).toBe(false)
	})

	it('merges successive sources into the target', () => {
		const target = { nested: { a: 1 } }
		expect(mergeDeep(target, { nested: { b: 2 } }, { nested: { a: 3 } })).toBe(
			target,
		)
		expect(target).toEqual({ nested: { a: 3, b: 2 } })
	})
})
