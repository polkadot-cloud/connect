// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { parseDecimal } from './decimal'

/**
 * Ensures a number has at least the specified number of decimal places, retaining commas in the output if they are present in the input.
 *
 * @function minDecimalPlaces
 * @param {string | number | BigInt} val - The input number, which can be a `string` with or without commas, a `number`, or a `BigInt`.
 * @param {number} minDecimals - The minimum number of decimal places to enforce.
 * @returns {string} The formatted number as a string, padded with zeros if needed to meet `minDecimals`, retaining commas if originally provided.
 *                    If `val` is invalid, returns "0".
 * @example
 * // Pads "1,234.5" to have at least 3 decimal places, with commas
 * minDecimalPlaces("1,234.5", 3); // returns "1,234.500"
 *
 * // Returns "1234.56" unchanged
 * minDecimalPlaces(1234.56, 2); // returns "1234.56"
 *
 * // Pads BigInt 1234 with 2 decimals
 * minDecimalPlaces(BigInt(1234), 2); // returns "1234.00"
 */
export const minDecimalPlaces = (
	val: string | number | bigint,
	minDecimals: number,
): string => {
	try {
		const retainCommas = typeof val === 'string' && val.includes(',')
		const { negative, whole, fraction } = parseDecimal(val)
		const formattedWhole = retainCommas
			? Intl.NumberFormat('en-US').format(whole)
			: whole.toString()
		const padded = fraction.padEnd(Math.max(0, Math.trunc(minDecimals)), '0')
		return `${negative ? '-' : ''}${formattedWhole}${padded ? `.${padded}` : ''}`
	} catch {
		return '0'
	}
}

/**
 * @name camelize
 * @summary Converts a string of text to camelCase.
 */
export const camelize = (str: string) => {
	const convertToString = (string: string) => {
		if (string) {
			if (typeof string === 'string') {
				return string
			}
			return String(string)
		}
		return ''
	}

	const toWords = (inp: string) =>
		convertToString(inp).match(
			/[A-Z\xC0-\xD6\xD8-\xDE]?[a-z\xDF-\xF6\xF8-\xFF]+|[A-Z\xC0-\xD6\xD8-\xDE]+(?![a-z\xDF-\xF6\xF8-\xFF])|\d+/g,
		)

	const simpleCamelCase = (inp: string[]) => {
		let result = ''
		for (let i = 0; i < inp?.length; i++) {
			const currString = inp[i]
			let tmpStr = currString.toLowerCase()
			if (i !== 0) {
				tmpStr =
					tmpStr.slice(0, 1).toUpperCase() + tmpStr.slice(1, tmpStr.length)
			}
			result += tmpStr
		}
		return result
	}

	const w = toWords(str)?.map((a) => a.toLowerCase())
	return simpleCamelCase(w || [])
}

/**
 * @name ellipsisFn
 * @summary Receives an address and creates ellipsis on the given string, based on parameters.
 * @param str  - The string to apply the ellipsis on
 * @param amount  - The amount of characters that the ellipsis will be
 * @param position - where the ellipsis will apply; if center the amount of character is the
 * same for beginning and end; if "start" or "end" then its only once the amount; defaults to "start"
 */
export const ellipsisFn = (
	str: string,
	amount = 6,
	position: 'start' | 'end' | 'center' = 'center',
) => {
	const half = str.length / 2

	// having an amount less than 4 is a bit extreme so we default there
	if (amount <= 4) {
		if (position === 'center') {
			return `${str.slice(0, 4)}...${str.slice(-4)}`
		}
		if (position === 'end') {
			return `${str.slice(0, 4)}...`
		}
		return `...${str.slice(-4)}`
	}
	// if the amount requested is in a "logical" amount - meaning that it can display the address
	// without repeating the same information twice - then go for it;
	if (position === 'center') {
		return amount >= (str.length - 2) / 2
			? `${str.slice(0, half - 3)}...${str.slice(-(half - 3))}`
			: `${str.slice(0, amount)}...${str.slice(-amount)}`
	}
	// else, the user has been mistaskenly extreme, so just show the maximum possible amount
	if (amount >= str.length) {
		if (position === 'end') {
			return `${str.slice(0, str.length - 3)}...`
		}
		return `...${str.slice(-(str.length - 3))}`
	}
	if (position === 'end') {
		return `${str.slice(0, amount)}...`
	}
	return `...${str.slice(amount)}`
}

/**
 * @name pageFromUri
 * @summary Use url variables to load the default components upon the first page visit.
 */
export const pageFromUri = (pathname: string, fallback: string) => {
	const lastUriItem = pathname.substring(pathname.lastIndexOf('/') + 1)
	const page = lastUriItem.trim() === '' ? fallback : lastUriItem
	return page.trim()
}

/**
 * @name rmCommas
 * @summary Removes the commas from a string.
 */
export const rmCommas = (val: string): string => val.replace(/,/g, '')

/**
 * @name rmDecimals
 * @summary Removes the decimal point and decimals from a string.
 */
export const rmDecimals = (str: string) => str.split('.')[0]

/**
 * @name shuffle
 * @summary Shuffle a set of objects.
 */
export const shuffle = <T>(array: T[]) => {
	let currentIndex = array.length
	let randomIndex: number
	while (currentIndex !== 0) {
		randomIndex = Math.floor(Math.random() * currentIndex)
		currentIndex--
		;[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		]
	}
	return array
}

const raceTimeout = <T, R>(
	ms: number,
	promise: Promise<T>,
	onTimeout: (() => void) | undefined,
	timeoutResult: () => R,
): Promise<T | R> =>
	new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			try {
				onTimeout?.()
				resolve(timeoutResult())
			} catch (error) {
				reject(error)
			}
		}, ms)
		promise.then(
			(value) => {
				clearTimeout(timer)
				resolve(value)
			},
			(error) => {
				clearTimeout(timer)
				reject(error)
			},
		)
	})

/** Resolve undefined if the promise does not settle within the timeout. */
export const withTimeout = <T>(
	ms: number,
	promise: Promise<T>,
	options?: { onTimeout?: () => void },
): Promise<T | undefined> =>
	raceTimeout(ms, promise, options?.onTimeout, () => undefined)

/** Reject with an Error if the promise does not settle within the timeout. */
export const withTimeoutThrow = <T>(
	ms: number,
	promise: Promise<T>,
	options?: { onTimeout?: () => void },
): Promise<T> =>
	raceTimeout(ms, promise, options?.onTimeout, () => {
		throw new Error('Function timeout')
	})

/**
 * @name appendOrEmpty
 * @summary Returns ` value` if a condition is truthy, or an empty string otherwise.
 */
export const appendOrEmpty = (
	condition: boolean | string | undefined,
	value: string,
) => (condition ? ` ${value}` : '')

/**
 * @name appendOr
 * @summary Returns ` value` if condition is truthy, or ` fallback` otherwise.
 */
export const appendOr = (
	condition: boolean | string | undefined,
	value: string,
	fallback: string,
) => (condition ? ` ${value}` : ` ${fallback}`)

/**
 * @name removeHexPrefix
 * @summary Takes a string str as input and returns a new string with the "0x" prefix removed if it
 * exists at the beginning of the input string.
 */
export const removeHexPrefix = (str: string): string => str.replace(/^0x/, '')

// Check if 2 sets contain the same elements.
// biome-ignore lint/suspicious/noExplicitAny: <>
export const eqSet = (xs: Set<any>, ys: Set<any>) =>
	xs.size === ys.size && [...xs].every((x) => ys.has(x))

// Check if one set contains all the elements of another set.
// biome-ignore lint/suspicious/noExplicitAny: <>
export const isSuperset = (set: Set<any>, subset: Set<any>) => {
	for (const elem of subset) {
		if (!set.has(elem)) {
			return false
		}
	}
	return true
}

/**
 * Finds the maximum value among a list of BigInt values.
 *
 * @function maxBigInt
 * @param {...bigint} values - A list of BigInt values to compare.
 * @returns {bigint} The largest BigInt value in the provided list.
 * @example
 * // Returns the maximum BigInt value
 * maxBigInt(10n, 50n, 30n, 100n, 20n); // 100n
 */
export const maxBigInt = (...values: bigint[]): bigint =>
	values.reduce((max, current) => (current > max ? current : max))

/**
 * Finds the minimum value among a list of BigInt values.
 *
 * @function minBigInt
 * @param {...bigint} values - A list of BigInt values to compare.
 * @returns {bigint} The smallest BigInt value in the provided list.
 * @example
 * // Returns the minimum BigInt value
 * minBigInt(10n, 50n, 30n, 100n, 20n); // 10n
 */
export const minBigInt = (...values: bigint[]): bigint =>
	values.reduce((min, current) => (current < min ? current : min))
