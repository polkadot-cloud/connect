// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import type { ExtensionInjected } from './types'

declare global {
	interface Window {
		injectedWeb3?: Record<string, ExtensionInjected>
	}
}
