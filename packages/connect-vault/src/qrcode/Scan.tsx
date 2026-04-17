// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { Html5Qrcode } from 'html5-qrcode'
import type { CSSProperties, ReactElement } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
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
			<style>{'#html5qr-code-full-region video { margin: 0; }'}</style>
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
	const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

	const ref = useRef<HTMLDivElement | null>(null)

	const handleHtmlQrCode = async (): Promise<void> => {
		if (!ref.current || !html5QrCodeRef.current) {
			return
		}

		try {
			const devices = await Html5Qrcode.getCameras()

			if (devices?.length) {
				const cameraId = devices[0].id
				await html5QrCodeRef.current.start(
					cameraId,
					{
						fps,
					},
					(decodedText) => {
						qrCodeSuccessCallback(decodedText)
					},
					(errorMessage) => {
						qrCodeErrorCallback(errorMessage)
					},
				)
			}
		} catch (err) {
			qrCodeErrorCallback(String(err))
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: one-time setup on mount
	useEffect(() => {
		if (ref.current) {
			html5QrCodeRef.current = new Html5Qrcode(ref.current.id)
			onCleanup?.(() => {
				html5QrCodeRef.current?.stop()
			})
			handleHtmlQrCode()
		}
		return () => {
			try {
				if (html5QrCodeRef.current) {
					html5QrCodeRef.current.stop()
				}
			} catch {
				// Silently ignore error
			}
		}
	}, [])

	return <div ref={ref} id="html5qr-code-full-region" />
}
