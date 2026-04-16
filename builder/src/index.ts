#!/usr/bin/env node
/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import minimist from 'minimist'
import { simpleBuild } from './builders/common/simpleBuild'
import { build as buildDirectory } from './builders/directory'
import { build as buildPackageReadmes } from './builders/package-readme'

const args = minimist(process.argv.slice(2))

const { t: task } = args

switch (task) {
	case 'directory':
		await buildDirectory()
		break

	case 'package-readmes':
		await buildPackageReadmes()
		break

	case 'connect-ledger':
		await simpleBuild('connect-ledger')
		break

	case 'connect-core':
		await simpleBuild('connect-core')
		break

	case 'connect':
		await simpleBuild('connect')
		break

	case 'connect-vault':
		await simpleBuild('connect-vault')
		break

	default:
		console.log('❌ No task provided.')
}
