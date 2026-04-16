/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import type { ExtensionInjected } from './types'

declare global {
	interface Window {
		injectedWeb3?: Record<string, ExtensionInjected>
	}
}
