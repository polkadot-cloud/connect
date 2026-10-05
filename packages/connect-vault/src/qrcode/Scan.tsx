// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { Html5Qrcode } from 'html5-qrcode'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react'
import type { ScanProps } from './types.js'
import { createImgSize } from './util.js'

const DEFAULT_ERROR = (error: string): void => {
	throw new Error(error)
}

const QrScanInner = ({
	className = '',
	onError = DEFAULT_ERROR,
	onScan,
	size,
	onCleanup,
}: ScanProps): ReactElement<ScanProps> => {
	const containerStyle = useMemo(() => createImgSize(size), [size])
	const onErrorCallback = useCallback(
		(error: string) => onError(error),
		[onError],
	)
	const onScanCallback = useCallback(
		(data: string | null) => data && onScan(data),
		[onScan],
	)
	const innerStyle: CSSProperties = {
		display: 'inline-block',
		height: '100%',
		transform: 'matrix(-1, 0, 0, 1, 0, 0)',
		width: '100%',
	}

	return (
		<div className={className} style={containerStyle}>
			<style>{'[data-vault-qr-scanner] video { margin: 0; }'}</style>
			<div style={innerStyle}>
				<Html5QrCodePlugin
					fps={10}
					qrCodeSuccessCallback={onScanCallback}
					qrCodeErrorCallback={onErrorCallback}
					onCleanup={onCleanup}
				/>
			</div>
		</div>
	)
}

export const QrScan = memo(QrScanInner)

interface Html5QrScannerProps {
	fps: number
	qrCodeSuccessCallback: (data: string | null) => void
	qrCodeErrorCallback: (error: string) => void
	onCleanup?: (cleanup: () => void) => void
}

export const Html5QrCodePlugin = ({
	fps,
	qrCodeSuccessCallback,
	qrCodeErrorCallback,
	onCleanup,
}: Html5QrScannerProps) => {
	const ref = useRef<HTMLDivElement | null>(null)
	const scannerId = useId()
	const callbacks = useRef({
		qrCodeSuccessCallback,
		qrCodeErrorCallback,
		onCleanup,
	})
	callbacks.current = { qrCodeSuccessCallback, qrCodeErrorCallback, onCleanup }

	useEffect(() => {
		if (!ref.current) return
		let cancelled = false
		let stopping: Promise<void> | undefined
		const scanner = new Html5Qrcode(ref.current.id)

		const stop = async () => {
			if (stopping) return stopping
			if (!scanner.isScanning) return
			stopping = (async () => {
				try {
					await scanner.stop()
				} catch {
					// The camera may already be stopped.
				}
			})()
			return stopping
		}
		const cancel = () => {
			cancelled = true
			void stop()
		}
		callbacks.current.onCleanup?.(cancel)

		void (async () => {
			try {
				const devices = await Html5Qrcode.getCameras()
				if (cancelled) return
				if (!devices?.length) throw new Error('No cameras available')
				await scanner.start(
					devices[0].id,
					{ fps },
					(value) => {
						if (!cancelled) callbacks.current.qrCodeSuccessCallback(value)
					},
					(error) => {
						if (!cancelled) callbacks.current.qrCodeErrorCallback(error)
					},
				)
			} catch (error) {
				if (!cancelled) callbacks.current.qrCodeErrorCallback(String(error))
			} finally {
				// Permission or start may finish after the scanner has closed.
				if (cancelled) await stop()
			}
		})()
		return cancel
	}, [fps])

	return <div ref={ref} id={`qr-scanner-${scannerId}`} data-vault-qr-scanner />
}
