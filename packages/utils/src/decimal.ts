// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// Parse decimal inputs without converting their significant digits to Number.
export const parseDecimal = (value: string | number | bigint) => {
	let text =
		typeof value === 'string' ? value.replace(/,/g, '').trim() : String(value)

	// Number.toString() uses exponential notation for very small and large numbers.
	if (typeof value === 'number' && text.includes('e')) {
		const negative = text.startsWith('-')
		const [coefficient, exponent] = text.replace(/^-/, '').split('e')
		const [whole, fraction = ''] = coefficient.split('.')
		const digits = whole + fraction
		const point = whole.length + Number(exponent)
		text =
			point <= 0
				? `0.${'0'.repeat(-point)}${digits}`
				: point >= digits.length
					? digits.padEnd(point, '0')
					: `${digits.slice(0, point)}.${digits.slice(point)}`
		if (negative) text = `-${text}`
	}

	const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text)
	if (!match || (!match[2] && !match[3]))
		throw new Error('Invalid decimal value')
	return {
		negative: match[1] === '-',
		whole: BigInt(match[2] || '0'),
		fraction: match[3] || '',
	}
}
