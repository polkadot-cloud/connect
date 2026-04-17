// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { exec } from 'node:child_process'
import { promises as fs } from 'node:fs'
import { promisify } from 'node:util'
import { PACKAGE_OUTPUT } from '../../consts'
import {
	generatePackageJson,
	getPackageDirectory,
	removePackageOutput,
} from '../util'
import { prebuild } from './prebuild'

const execPromisify = promisify(exec)

export const simpleBuild = async (packageName: string) => {
	const libDirectory = getPackageDirectory(packageName)
	// Validate package config
	try {
		if (!(await prebuild(packageName))) {
			throw 'Prebuild failed.'
		}
		// Call respective build command and generate dist folder
		try {
			await execPromisify('pnpm build')
		} catch (e) {
			throw `Failed to generate dist. ${e}`
		}

		if (
			!(await generatePackageJson(
				libDirectory,
				`${libDirectory}/${PACKAGE_OUTPUT}`,
			))
		) {
			throw 'Failed to generate package.json file.'
		}

		// Copy README.md to dist
		try {
			await fs.copyFile(
				`${libDirectory}/README.md`,
				`${libDirectory}/${PACKAGE_OUTPUT}/README.md`,
			)
		} catch (e) {
			console.error('❌ Failed to copy README.md to dist:', e)
		}
		console.log('✅ Package successfully built.')
	} catch (err) {
		// Handle on error.
		console.error('❌ Error occurred while building the package.', err)

		// Remove package output directory
		if (!(await removePackageOutput(libDirectory, false))) {
			console.error('❌ Failed to remove package output directory.')
		}
	}
}
