#!/usr/bin/env node
/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import { Command } from 'commander'
import { bump } from './bump'

const program = new Command()
	.name('cli')
	.description('Workspace management tools for polkadot-cloud/connect')

program
	.command('bump')
	.description('Bump the version of one or more packages')
	.argument('<level>', 'semver bump level: patch | minor | major')
	.argument('<packages...>', 'package folder names (e.g. connect connect-core)')
	.action(async (level: string, packages: string[]) => {
		await bump(level, packages)
	})

program.parse()
