// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

const PREFIX = 'pc_'

const isBrowser = typeof localStorage !== 'undefined'

// Gets an item from local storage with the workspace prefix
export const getLocal = (key: string): string | null => {
	if (!isBrowser) {
		return null
	}

	try {
		return localStorage.getItem(`${PREFIX}${key}`)
	} catch {
		return null
	}
}

// Sets an item in local storage with the workspace prefix
export const setLocal = (key: string, value: string): void => {
	if (!isBrowser) {
		return
	}

	try {
		localStorage.setItem(`${PREFIX}${key}`, value)
	} catch {
		return
	}
}

// Removes an item from local storage with the workspace prefix
export const removeLocal = (key: string): void => {
	if (!isBrowser) {
		return
	}

	try {
		localStorage.removeItem(`${PREFIX}${key}`)
	} catch {
		return
	}
}

// Gets a local storage value with a default fallback, with the workspace prefix.
// Optionally parses the value as JSON
export const localOrDefault = <T>(
	key: string,
	fallback: T,
	parse = false,
	rethrowParseError = false,
): T => {
	const raw = getLocal(key)
	if (raw === null) {
		return fallback
	}
	if (parse) {
		try {
			return JSON.parse(raw) as T
		} catch {
			if (rethrowParseError) {
				throw new Error(`Failed to parse local storage for key: ${key}`)
			}
			return fallback
		}
	}
	return raw as unknown as T
}
