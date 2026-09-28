// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only
// @vitest-environment jsdom

import { type ReactElement, act, createElement } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Odometer } from '../../packages/ui/src/odometer'
import { Polkicon } from '../../packages/ui/src/polkicon'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	vi.useFakeTimers()
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const render = async (element: ReactElement) => {
	await act(async () => root.render(element))
}

const finishTransition = async () => {
	await act(async () => vi.advanceTimersByTime(1_000))
}

describe('UI prop updates', () => {
	it('updates Polkicon colors when inactive changes without changing the address', async () => {
		const address = `0x${'01'.repeat(32)}`
		const colors = () =>
			Array.from(container.querySelectorAll('circle'))
				.slice(1)
				.map((circle) => circle.getAttribute('fill'))

		await render(createElement(Polkicon, { address }))
		const activeColors = colors()
		expect(activeColors).toHaveLength(19)
		expect(activeColors).not.toContain('var(--bg-invert)')

		await render(createElement(Polkicon, { address, inactive: true }))
		expect(colors()).toEqual(Array(19).fill('var(--bg-invert)'))

		await render(createElement(Polkicon, { address, inactive: false }))
		expect(colors()).toEqual(activeColors)
	})

	it.each([
		{
			prop: 'zeroDecimals',
			value: '123.4',
			formatting: { zeroDecimals: 3 },
			expected: '123.400',
		},
		{
			prop: 'stripTrailingZeroes',
			value: '9007199254740993.1200',
			formatting: { stripTrailingZeroes: true },
			expected: '9007199254740993.12',
		},
	])(
		'updates Odometer when only $prop changes',
		async ({ value, formatting, expected }) => {
			const digits = () =>
				container.querySelector('.odometer-inner')?.textContent
			await render(createElement(Odometer, { value }))
			expect(digits()).toBe(value)

			await render(createElement(Odometer, { value, ...formatting }))
			await finishTransition()
			expect(digits()).toBe(expected)

			await render(createElement(Odometer, { value }))
			await finishTransition()
			expect(digits()).toBe(value)
		},
	)
})
