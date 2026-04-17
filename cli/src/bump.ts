/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import fs from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const BumpLevel = z.enum(['patch', 'minor', 'major'])
type BumpLevel = z.infer<typeof BumpLevel>

const BumpInput = z.object({
	level: BumpLevel,
	packages: z
		.array(z.string().min(1))
		.min(1, 'At least one package is required'),
})

const getPackagesDirectory = () =>
	join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages')

const bumpVersion = (version: string, level: BumpLevel): string => {
	const parts = version.split('.').map(Number)
	if (parts.length !== 3 || parts.some(Number.isNaN)) {
		throw new Error(`Invalid semver version: ${version}`)
	}
	const [major, minor, patch] = parts
	switch (level) {
		case 'major':
			return `${major + 1}.0.0`
		case 'minor':
			return `${major}.${minor + 1}.0`
		case 'patch':
			return `${major}.${minor}.${patch + 1}`
	}
}

export const bump = async (level: string, packages: string[]) => {
	const input = BumpInput.safeParse({ level, packages })
	if (!input.success) {
		for (const issue of input.error.issues) {
			console.error(`❌ ${issue.path.join('.')}: ${issue.message}`)
		}
		process.exit(1)
	}

	const { level: validLevel, packages: validPackages } = input.data
	const packagesDir = getPackagesDirectory()

	for (const pkg of validPackages) {
		const pkgJsonPath = join(packagesDir, pkg, 'package.json')

		let raw: string
		try {
			raw = await fs.readFile(pkgJsonPath, 'utf8')
		} catch {
			console.error(`❌ Package "${pkg}" not found at ${pkgJsonPath}`)
			continue
		}

		const pkgJson = JSON.parse(raw)
		const oldVersion = pkgJson.version

		if (!oldVersion) {
			console.error(`❌ No version field in ${pkg}/package.json`)
			continue
		}

		const newVersion = bumpVersion(oldVersion, validLevel)
		pkgJson.version = newVersion

		await fs.writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, '\t')}\n`)
		console.log(`✅ ${pkgJson.name}: ${oldVersion} → ${newVersion}`)
	}
}
