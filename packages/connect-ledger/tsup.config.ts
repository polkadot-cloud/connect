// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { defineConfig } from 'tsup'

export default defineConfig({
	entry: [
		'src/index.ts',
		'src/device/index.ts',
		'src/hooks/index.ts',
		'src/signing/index.ts',
	],
	target: 'esnext',
	platform: 'browser',
	sourcemap: true,
	minify: true,
	clean: true,
	dts: true,
	format: ['esm', 'cjs'],
	// The WebHID kit only publishes an import export; bundle SDK modules for CJS too.
	noExternal: [/^@ledgerhq\//],
	external: ['react', 'react-dom', 'dedot', '@polkadot-cloud/connect'],
})
