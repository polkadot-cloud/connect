/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/index.ts'],
	splitting: false,
	sourcemap: false,
	clean: true,
	dts: true,
	format: 'esm',
	external: ['commander'],
})
