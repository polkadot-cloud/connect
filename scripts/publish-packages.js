// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { execFileSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const registry = 'https://registry.npmjs.org'
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const dependencies = (manifest) => ({
	...manifest.dependencies,
	...manifest.optionalDependencies,
	...manifest.peerDependencies,
})
const exportPaths = (value) =>
	typeof value === 'string'
		? [value]
		: Object.values(value).flatMap(exportPaths)

const versionParts = (version) => {
	if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
		throw new Error(`Only stable x.y.z versions can be published: ${version}`)
	}
	return version.split('.').map(Number)
}

const isNewer = (version, previous) => {
	const next = versionParts(version)
	const last = versionParts(previous)
	const index = next.findIndex((part, i) => part !== last[i])
	return index !== -1 && next[index] > last[index]
}

export const sortPackages = (packages) => {
	const byName = new Map(packages.map((pkg) => [pkg.name, pkg]))
	const visiting = new Set()
	const visited = new Set()
	const ordered = []
	const visit = (pkg) => {
		if (visited.has(pkg.name)) return
		if (visiting.has(pkg.name)) {
			throw new Error(`Circular package dependency: ${pkg.name}`)
		}
		visiting.add(pkg.name)
		for (const name of Object.keys(dependencies(pkg.manifest))) {
			if (byName.has(name)) visit(byName.get(name))
		}
		visiting.delete(pkg.name)
		visited.add(pkg.name)
		ordered.push(pkg)
	}
	for (const pkg of packages) visit(pkg)
	return ordered
}

export const loadPackages = async (root = workspaceRoot) => {
	const directory = join(root, 'packages')
	const folders = await readdir(directory, { withFileTypes: true })
	const packages = []
	for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
		if (!folder.isDirectory()) continue
		const source = await readJson(join(directory, folder.name, 'package.json'))
		if (
			source.private ||
			!/^@polkadot-cloud\/connect(?:-.+)?$/.test(source.name)
		) {
			continue
		}
		versionParts(source.version)
		const dist = join(directory, folder.name, 'dist')
		const manifest = await readJson(join(dist, 'package.json'))
		if (
			manifest.name !== source.name ||
			manifest.version !== source.version ||
			manifest.private
		) {
			throw new Error(`Invalid or stale build for ${source.name}`)
		}
		for (const [name, range] of Object.entries(dependencies(manifest))) {
			if (/^(workspace|file|link):/.test(range)) {
				throw new Error(`Unresolved dependency in ${source.name}: ${name}`)
			}
		}
		const exports = exportPaths(manifest.exports ?? {})
		if (!exports.length) throw new Error(`No exports for ${source.name}`)
		for (const path of exports) {
			if (!path.startsWith('./') || path.includes('..')) {
				throw new Error(`Invalid export for ${source.name}: ${path}`)
			}
			if (!(await stat(join(dist, path))).isFile()) {
				throw new Error(`Missing export for ${source.name}: ${path}`)
			}
		}
		packages.push({
			name: manifest.name,
			version: manifest.version,
			dist,
			manifest,
		})
	}
	if (!packages.length) throw new Error('No publishable packages found')
	return sortPackages(packages)
}

export const planPublications = async (packages, fetchRegistry = fetch) => {
	const pending = []
	for (const pkg of packages) {
		const response = await fetchRegistry(
			`${registry}/${encodeURIComponent(pkg.name)}`,
			{ signal: AbortSignal.timeout(30_000) },
		)
		if (response.status === 404) {
			pending.push(pkg)
			continue
		}
		if (!response.ok) {
			throw new Error(
				`npm lookup failed for ${pkg.name}: HTTP ${response.status}`,
			)
		}
		const metadata = await response.json()
		if (!metadata.versions || typeof metadata.versions !== 'object') {
			throw new Error(`Invalid npm metadata for ${pkg.name}`)
		}
		if (Object.hasOwn(metadata.versions, pkg.version)) continue
		const latest = metadata['dist-tags']?.latest
		if (latest && !isNewer(pkg.version, latest)) {
			throw new Error(
				`Refusing to replace ${pkg.name}@${latest} with ${pkg.version}`,
			)
		}
		pending.push(pkg)
	}
	return pending
}

const runNpm = (args, cwd) => {
	execFileSync('npm', args, { cwd, stdio: 'inherit' })
}

export const publishPackages = async (
	packages,
	{ publish = false, fetchRegistry = fetch, run = runNpm } = {},
) => {
	// Check every package and dry-run every tarball before publishing anything.
	const pending = await planPublications(sortPackages(packages), fetchRegistry)
	const args = [
		'publish',
		'--access',
		'public',
		'--tag',
		'latest',
		'--registry',
		registry,
		'--ignore-scripts',
	]
	for (const pkg of pending) {
		console.log(`Checking ${pkg.name}@${pkg.version}`)
		run([...args, '--dry-run'], pkg.dist)
	}
	if (publish) {
		for (const pkg of pending) {
			console.log(`Publishing ${pkg.name}@${pkg.version}`)
			run([...args, '--provenance'], pkg.dist)
		}
	}
	console.log(
		`${pending.length} package version(s) ${publish ? 'published' : 'ready'}`,
	)
	return pending
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	try {
		const [mode = '--dry-run', ...extra] = process.argv.slice(2)
		if (!['--check', '--dry-run', '--publish'].includes(mode) || extra.length) {
			throw new Error(
				'Usage: node scripts/publish-packages.js [--check|--dry-run|--publish]',
			)
		}
		const packages = await loadPackages()
		if (mode === '--check') {
			console.log(`Validated ${packages.length} publishable packages`)
		} else {
			await publishPackages(packages, { publish: mode === '--publish' })
		}
	} catch (error) {
		console.error(error)
		process.exitCode = 1
	}
}
