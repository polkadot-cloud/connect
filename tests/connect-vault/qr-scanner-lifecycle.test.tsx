// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// @vitest-environment jsdom

import { StrictMode, act } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { QrScan } from '../../packages/connect-vault/src/qrcode/Scan'

const camera = vi.hoisted(() => {
	const instances: Array<{
		id: string
		isScanning: boolean
		start: ReturnType<typeof vi.fn>
		stop: ReturnType<typeof vi.fn>
		onScan?: (value: string) => void
		onError?: (value: string) => void
	}> = []
	const getCameras = vi.fn()
	const start = vi.fn()
	const stop = vi.fn()
	return { instances, getCameras, start, stop }
})

vi.mock('../../packages/connect-vault/node_modules/html5-qrcode', () => ({
	Html5Qrcode: class {
		static getCameras = camera.getCameras
		isScanning = false
		onScan?: (value: string) => void
		onError?: (value: string) => void
		constructor(public id: string) {
			camera.instances.push(this)
		}
		start = vi.fn(
			async (
				_id: string,
				_config: unknown,
				onScan: (value: string) => void,
				onError: (value: string) => void,
			) => {
				this.onScan = onScan
				this.onError = onError
				await camera.start()
				this.isScanning = true
			},
		)
		stop = vi.fn(async () => {
			this.isScanning = false
			await camera.stop()
		})
	},
}))

let container: HTMLDivElement
let root: Root
let onScan: ReturnType<typeof vi.fn>
let onError: ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
	camera.instances.length = 0
	camera.getCameras.mockReset().mockResolvedValue([{ id: 'public-camera' }])
	camera.start.mockReset().mockResolvedValue(undefined)
	camera.stop.mockReset().mockResolvedValue(undefined)
	onScan = vi.fn()
	onError = vi.fn()
	container = document.createElement('div')
	document.body.append(container)
	root = createRoot(container)
})

afterEach(async () => {
	await act(async () => root.unmount())
	container.remove()
	vi.unstubAllGlobals()
})

const deferred = <T,>() => {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((finish) => {
		resolve = finish
	})
	return { promise, resolve }
}

const mount = async () => {
	await act(async () =>
		root.render(<QrScan onScan={onScan} onError={onError} />),
	)
}

test('closing while camera permission is pending prevents late startup', async () => {
	const permission = deferred<Array<{ id: string }>>()
	camera.getCameras.mockReturnValue(permission.promise)
	await mount()
	await act(async () => root.render(null))
	await act(async () => permission.resolve([{ id: 'public-camera' }]))
	expect(camera.instances[0].start).not.toHaveBeenCalled()
	expect(onScan).not.toHaveBeenCalled()
	expect(onError).not.toHaveBeenCalled()
})

test('closing during startup stops the late camera and ignores stale callbacks', async () => {
	const startup = deferred<void>()
	camera.start.mockReturnValue(startup.promise)
	await mount()
	const scanner = camera.instances[0]
	expect(scanner.start).toHaveBeenCalledOnce()
	await act(async () => root.render(null))
	await act(async () => {
		startup.resolve()
		scanner.onScan?.('late public QR')
		scanner.onError?.('late error')
	})
	expect(scanner.stop).toHaveBeenCalledOnce()
	expect(scanner.isScanning).toBe(false)
	expect(onScan).not.toHaveBeenCalled()
	expect(onError).not.toHaveBeenCalled()
})

test('Strict Mode starts only its active scanner; simultaneous scanners have unique containers', async () => {
	await act(async () =>
		root.render(
			<StrictMode>
				<QrScan onScan={onScan} onError={onError} />
				<QrScan onScan={onScan} onError={onError} />
			</StrictMode>,
		),
	)
	const active = camera.instances.filter((scanner) => scanner.isScanning)
	expect(active).toHaveLength(2)
	expect(new Set(active.map((scanner) => scanner.id)).size).toBe(2)
	for (const scanner of active)
		expect(document.getElementById(scanner.id)).not.toBeNull()
	await act(async () => root.render(null))
	for (const scanner of active) expect(scanner.stop).toHaveBeenCalledOnce()
	expect(camera.instances.every((scanner) => !scanner.isScanning)).toBe(true)
})

test('callback changes take effect without restarting the camera', async () => {
	await mount()
	const scanner = camera.instances[0]
	const updated = vi.fn()
	await act(async () =>
		root.render(<QrScan onScan={updated} onError={onError} />),
	)
	scanner.onScan?.('public QR')
	expect(updated).toHaveBeenCalledWith('public QR')
	expect(onScan).not.toHaveBeenCalled()
	expect(scanner.start).toHaveBeenCalledOnce()
	expect(scanner.stop).not.toHaveBeenCalled()
})

test('explicit cleanup is idempotent and contains asynchronous stop failures', async () => {
	camera.stop.mockRejectedValue(new Error('Camera already stopped'))
	let cleanup!: () => void
	await act(async () =>
		root.render(
			<QrScan
				onScan={onScan}
				onError={onError}
				onCleanup={(cancel) => {
					cleanup = cancel
				}}
			/>,
		),
	)
	await act(async () => {
		cleanup()
		cleanup()
	})
	await act(async () => root.render(null))
	expect(camera.instances[0].stop).toHaveBeenCalledOnce()
	expect(onError).not.toHaveBeenCalled()
})

test('unavailable cameras and permission rejection report recoverable errors', async () => {
	camera.getCameras.mockResolvedValue([])
	await mount()
	expect(onError).toHaveBeenCalledWith('Error: No cameras available')
	await act(async () => root.render(null))
	onError.mockClear()
	camera.getCameras.mockRejectedValue(new Error('Permission denied'))
	await mount()
	expect(onError).toHaveBeenCalledWith('Error: Permission denied')
})
