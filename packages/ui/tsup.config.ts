// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		'src/polkicon/index.tsx',
		'src/odometer/index.tsx',
		'src/odometer/index.css',
	],
	target: 'esnext',
	sourcemap: true,
	clean: true,
	dts: true,
	format: ['esm', 'cjs'],
	external: ['react', 'dedot', '@polkadot-cloud/util-dedot'],
})
