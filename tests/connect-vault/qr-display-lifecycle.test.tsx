// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// @vitest-environment jsdom

import { StrictMode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { QrDisplay } from '../../packages/connect-vault/src/qrcode/Display'

// Preserve the actual multipart bytes while replacing only image rasterization.
vi.mock('../../packages/connect-vault/src/qrcode/qrcode', () => ({
	qrcode: () => {
		let bytes: Uint8Array
		return {
			addData(value: Uint8Array) {
				bytes = value
			},
			make() {},
			createDataURL: () =>
				`data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`,
		}
	},
}))

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
	vi.clearAllTimers()
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

const render = async (value: Uint8Array, timerDelay = 1000, className = '') => {
	await act(async () =>
		root.render(
			<StrictMode>
				<QrDisplay
					value={value}
					timerDelay={timerDelay}
					className={className}
				/>
			</StrictMode>,
		),
	)
}

const frame = () => {
	const src = container.querySelector('img')?.getAttribute('src')
	expect(src).toBeTruthy()
	return Uint8Array.from(atob(src?.split(',')[1] ?? ''), (char) =>
		char.charCodeAt(0),
	)
}

const advance = async (ms: number) => {
	await act(async () => vi.advanceTimersByTimeAsync(ms))
}

test('Strict Mode cycles every frame once, preserves rerenders and releases its only timer', async () => {
	const payload = new Uint8Array(2050).fill(7)
	await render(payload)
	expect(Array.from(frame().subarray(0, 5))).toEqual([0, 0, 3, 0, 0])
	expect(vi.getTimerCount()).toBe(1)
	await advance(1000)
	expect(frame()[4]).toBe(1)
	await render(payload, 1000, 'rerender')
	expect(frame()[4]).toBe(1)
	expect(vi.getTimerCount()).toBe(1)
	await advance(1000)
	expect(frame()[4]).toBe(2)
	await advance(1000)
	expect(frame()[4]).toBe(0)
	await advance(1499)
	expect(frame()[4]).toBe(0)
	await advance(1)
	expect(frame()[4]).toBe(1)
	await act(async () => root.render(null))
	expect(vi.getTimerCount()).toBe(0)
})

test('a static QR can become animated and payload or delay changes restart at frame zero', async () => {
	await render(new Uint8Array([42]))
	expect(Array.from(frame())).toEqual([0, 0, 1, 0, 0, 42])
	expect(vi.getTimerCount()).toBe(0)
	const payload = new Uint8Array(1025).fill(8)
	await render(payload)
	await advance(1000)
	expect(frame()[4]).toBe(1)
	await render(payload, 250)
	expect(frame()[4]).toBe(0)
	expect(vi.getTimerCount()).toBe(1)
	await advance(250)
	expect(frame()[4]).toBe(1)
	await render(new Uint8Array(1025).fill(9), 250)
	expect(frame()[4]).toBe(0)
	expect(frame()[5]).toBe(9)
	await render(new Uint8Array())
	expect(container.querySelector('img')).toBeNull()
	expect(vi.getTimerCount()).toBe(0)
})
