// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { CSSProperties, ReactElement } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { qrcode } from './qrcode'
import type { DisplayProps } from './types.js'
import { createFrames, createImgSize } from './util.js'

const DEFAULT_FRAME_DELAY = 2750
const TIMER_INC = 500

const getDataUrl = (value: Uint8Array): string => {
	const qr = qrcode(0, 'M')

	// HACK See our qrcode stringToBytes override as used internally. This
	// will only work for the case where we actually pass `Bytes` in here
	qr.addData(value as unknown as string, 'Byte')
	qr.make()

	return qr.createDataURL(16, 0)
}

const Display = ({
	className = '',
	size,
	timerDelay = DEFAULT_FRAME_DELAY,
	value,
	style,
}: DisplayProps): ReactElement<DisplayProps> | null => {
	const [image, setImage] = useState<string | null>(null)
	const containerStyle = useMemo(() => createImgSize(size), [size])

	useEffect(() => {
		const frames = createFrames(value)
		let frameIdx = 0
		let delay = timerDelay
		let timerId: ReturnType<typeof setTimeout> | undefined

		// Each effect owns its timer; state updates have no scheduling side effects.
		const showFrame = () => {
			setImage(getDataUrl(frames[frameIdx]))
			if (frames.length > 1) {
				timerId = setTimeout(() => {
					frameIdx = (frameIdx + 1) % frames.length
					if (frameIdx === 0) delay += TIMER_INC
					showFrame()
				}, delay)
			}
		}

		if (frames.length) showFrame()
		else setImage(null)
		return () => clearTimeout(timerId)
	}, [value, timerDelay])

	const imgStyle: CSSProperties = {
		background: 'white',
		height: 'auto',
		maxHeight: '100%',
		maxWidth: '100%',
		width: 'auto',
	}

	return !image ? null : (
		<div className={className} style={containerStyle}>
			<div style={{ height: '100%', width: '100%', ...style }}>
				<img src={image} alt="QR Code" style={imgStyle} />
			</div>
		</div>
	)
}

export const QrDisplay = memo(Display)
