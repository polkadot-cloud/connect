/* @license Copyright 2024 polkadot-cloud authors & contributors
SPDX-License-Identifier: GPL-3.0-only */

import fs from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PACKAGE_OUTPUT, TEMP_BUILD_OUTPUT } from '../consts'

// Gets workspace directory from the current directory
export const getWorkspaceDirectory = () =>
	join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// Gets builder source directory, relative to  the builder's dist directory
export const getBuilderDirectory = () =>
	join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

// Gets packages directory, relative to the current directory
export const getLibraryDirectory = () =>
	join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages')

// Gets a package directory, relative to the current directory
export const getPackageDirectory = (path: string) =>
	join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', path)

// Checks that all given files are present in all the provided directory
export const checkFilesExistInPackages = async (
	dir: string,
	files: string[],
) => {
	let valid = true

	await Promise.all(
		files.map(async (file: string) => {
			try {
				await fs.stat(`${dir}/${file}`)
			} catch (err) {
				console.error(`❌ ${file} not found in ${dir}`)
				valid = false
			}
		}),
	)
	return valid
}

// Gets a package.json file in the given directory
export const getPackageJson = async (dir: string) => {
	try {
		const file = await fs.readFile(`${dir}/package.json`, 'utf-8')
		return JSON.parse(file.toString())
	} catch (err) {
		console.error(`❌ package.json file not found in ${dir}`)
		return undefined
	}
}

// Remove package output directory if it exists
export const removePackageOutput = async (
	libDirectory: string,
	building: boolean,
): Promise<boolean> => {
	try {
		await fs.rm(
			`${libDirectory}/${building ? TEMP_BUILD_OUTPUT : PACKAGE_OUTPUT}`,
			{
				recursive: true,
			},
		)
		return true
	} catch (err) {
		if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
			return false
		}
		return true
	}
}

// Get a source template file for the directory
export const getTemplate = async (name: string) => {
	const file = await fs.readFile(
		`${getBuilderDirectory()}/templates/${name}.md`,
		'utf-8',
	)
	return file.toString()
}

// Resolve workspace: protocol versions to actual semver ranges
const resolveWorkspaceDeps = async (
	deps: Record<string, string> | undefined,
): Promise<Record<string, string> | undefined> => {
	if (!deps) {
		return deps
	}
	const resolved: Record<string, string> = {}
	const libraryDir = getLibraryDirectory()

	for (const [name, version] of Object.entries(deps)) {
		if (!version.startsWith('workspace:')) {
			resolved[name] = version
			continue
		}
		// Find the local package and read its version
		const range = version.replace('workspace:', '')
		const entries = await fs.readdir(libraryDir, { withFileTypes: true })
		let actualVersion: string | undefined
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue
			}
			try {
				const pkgJson = JSON.parse(
					await fs.readFile(
						join(libraryDir, entry.name, 'package.json'),
						'utf8',
					),
				)
				if (pkgJson.name === name && pkgJson.version) {
					actualVersion = pkgJson.version
					break
				}
			} catch {
				// Skip directories without a valid package.json
			}
		}
		if (!actualVersion) {
			console.error(
				`❌ Could not resolve workspace dependency "${name}" — using range as-is.`,
			)
			resolved[name] = range || '*'
		} else {
			// Reconstruct the range prefix with the resolved version
			const prefix =
				range === '*' || range === '' ? '' : range.replace(/[0-9].*/, '')
			resolved[name] = `${prefix}${actualVersion}`
		}
	}
	return resolved
}

// Generate package package.json file from source package.json
export const generatePackageJson = async (
	inputDir: string,
	outputDir: string,
): Promise<boolean> => {
	try {
		// Read the original package.json.
		const parsedPackageJson = JSON.parse(
			await fs.readFile(join(inputDir, 'package.json'), 'utf8'),
		)

		// Extract only the specified fields.
		const {
			name,
			version,
			license,
			dependencies,
			peerDependencies,
			description,
			keywords,
			homepage,
			repository,
			bugs,
		} = parsedPackageJson
		const packageName = name.replace(/-source$/, '') // Remove '-source' suffix.

		// Attempt to get exports and bundler info
		let pkgConfig: Record<string, unknown> | undefined
		try {
			pkgConfig = JSON.parse(
				await fs.readFile(join(inputDir, 'pkg.config.json'), 'utf8'),
			)
		} catch (e) {
			// Silently fail getting exports
		}

		// Construct the minimal package.json object
		// biome-ignore lint/suspicious/noExplicitAny: <>
		const minimalPackageJson: any = {
			name: packageName,
			version,
			license,
			type: 'module',
		}

		// Add optional metadata fields if they exist
		if (description) {
			minimalPackageJson.description = description
		}
		if (keywords) {
			minimalPackageJson.keywords = keywords
		}
		if (homepage) {
			minimalPackageJson.homepage = homepage
		}
		if (repository) {
			minimalPackageJson.repository = repository
		}
		if (bugs) {
			minimalPackageJson.bugs = bugs
		}

		// Include package exports if provided
		if (pkgConfig?.exports) {
			minimalPackageJson.exports = pkgConfig.exports
		}

		if (dependencies) {
			minimalPackageJson.dependencies = await resolveWorkspaceDeps(dependencies)
		}
		if (peerDependencies) {
			minimalPackageJson.peerDependencies =
				await resolveWorkspaceDeps(peerDependencies)
		}

		if (pkgConfig?.peerDependencies) {
			minimalPackageJson.peerDependencies = {
				...minimalPackageJson.peerDependencies,
				...pkgConfig.peerDependencies,
			}
		}

		// Write the minimal package.json to the output directory.
		const outputPath = join(outputDir, 'package.json')
		await fs.writeFile(outputPath, JSON.stringify(minimalPackageJson, null, 2))

		return true
	} catch (error) {
		console.error('❌ Error generating minimal package.json:', error)
		return false
	}
}
