// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	loadPackages,
	planPublications,
	publishPackages,
	sortPackages,
} from '../../scripts/publish-packages.js'

const pkg = (name: string, dependencies = {}, peerDependencies = {}) => ({
	name: `@polkadot-cloud/${name}`,
	version: '1.2.0',
	dist: `/packages/${name}/dist`,
	manifest: { dependencies, peerDependencies },
})

const response = (versions: string[], latest = versions.at(-1)) =>
	new Response(
		JSON.stringify({
			versions: Object.fromEntries(versions.map((version) => [version, {}])),
			'dist-tags': { latest },
		}),
	)

const roots: string[] = []
const fixture = async (overrides = {}) => {
	const root = await mkdtemp(join(tmpdir(), 'connect-release-'))
	roots.push(root)
	const directory = join(root, 'packages', 'example')
	await mkdir(join(directory, 'dist'), { recursive: true })
	const source = { name: '@polkadot-cloud/example', version: '1.2.0' }
	await writeFile(join(directory, 'package.json'), JSON.stringify(source))
	await writeFile(
		join(directory, 'dist', 'package.json'),
		JSON.stringify({
			...source,
			exports: { '.': { import: './index.js' } },
			...overrides,
		}),
	)
	await writeFile(join(directory, 'dist', 'index.js'), 'export {}')
	return root
}

afterEach(async () => {
	await Promise.all(
		roots.splice(0).map((root) => rm(root, { recursive: true })),
	)
	vi.restoreAllMocks()
})

describe('release artifacts', () => {
	it('loads only public packages with complete builds', async () => {
		const root = await fixture()
		const privateDir = join(root, 'packages', 'internal')
		await mkdir(privateDir)
		await writeFile(
			join(privateDir, 'package.json'),
			JSON.stringify({ name: 'internal', private: true }),
		)
		expect((await loadPackages(root)).map(({ name }) => name)).toEqual([
			'@polkadot-cloud/example',
		])
	})

	it('rejects a stale build before looking up registry versions', async () => {
		await expect(
			loadPackages(await fixture({ version: '1.1.0' })),
		).rejects.toThrow('Invalid or stale build')
	})

	it('rejects unresolved workspace dependencies', async () => {
		const root = await fixture({
			dependencies: { '@polkadot-cloud/hooks': 'workspace:^' },
		})
		await expect(loadPackages(root)).rejects.toThrow('Unresolved dependency')
	})

	it('rejects missing declared export files', async () => {
		const root = await fixture({ exports: { '.': './missing.js' } })
		await expect(loadPackages(root)).rejects.toThrow('ENOENT')
	})

	it('rejects export paths outside the dist directory', async () => {
		const root = await fixture({ exports: { '.': '../src/index.js' } })
		await expect(loadPackages(root)).rejects.toThrow('Invalid export')
	})
})

describe('release ordering and selection', () => {
	it('publishes dependencies and peers before their consumers', () => {
		const core = pkg('core')
		const hooks = pkg('hooks')
		const connect = pkg('connect', { [core.name]: '^1.2.0' })
		const ledger = pkg(
			'ledger',
			{ [hooks.name]: '^1.2.0' },
			{ [connect.name]: '1.2.0' },
		)
		expect(sortPackages([ledger, connect, core, hooks])).toEqual([
			hooks,
			core,
			connect,
			ledger,
		])
	})

	it('rejects dependency cycles', () => {
		const first = pkg('first', { '@polkadot-cloud/second': '^1.2.0' })
		const second = pkg('second', {}, { [first.name]: '^1.2.0' })
		expect(() => sortPackages([first, second])).toThrow(
			'Circular package dependency',
		)
	})

	it('skips already published versions when retrying a partial release', async () => {
		const packages = [pkg('hooks'), pkg('connect')]
		const fetchRegistry = vi
			.fn()
			.mockResolvedValueOnce(response(['1.1.0', '1.2.0']))
			.mockResolvedValueOnce(response(['1.1.0']))
		expect(await planPublications(packages, fetchRegistry)).toEqual([
			packages[1],
		])
	})

	it('includes packages that have never been published', async () => {
		const packages = [pkg('new-package')]
		const fetchRegistry = vi
			.fn()
			.mockResolvedValue(new Response(null, { status: 404 }))
		expect(await planPublications(packages, fetchRegistry)).toEqual(packages)
	})

	it.each([401, 403, 429, 500])(
		'fails on registry HTTP %s instead of treating it as a new package',
		async (status) => {
			const fetchRegistry = vi
				.fn()
				.mockResolvedValue(new Response(null, { status }))
			await expect(
				planPublications([pkg('hooks')], fetchRegistry),
			).rejects.toThrow(`HTTP ${status}`)
		},
	)

	it('rejects invalid metadata and network errors', async () => {
		await expect(
			planPublications(
				[pkg('hooks')],
				vi.fn().mockResolvedValue(new Response('{}')),
			),
		).rejects.toThrow('Invalid npm metadata')
		await expect(
			planPublications(
				[pkg('hooks')],
				vi.fn().mockRejectedValue(new Error('timeout')),
			),
		).rejects.toThrow('timeout')
	})

	it('does not move latest backward when an older workflow runs late', async () => {
		const fetchRegistry = vi.fn().mockResolvedValue(response(['1.3.0']))
		await expect(
			planPublications([pkg('hooks')], fetchRegistry),
		).rejects.toThrow('Refusing to replace')
	})
})

describe('publishing', () => {
	it('defaults to dry run and never uploads', async () => {
		const run = vi.fn()
		await publishPackages([pkg('hooks')], {
			run,
			fetchRegistry: vi.fn().mockResolvedValue(response(['1.1.0'])),
		})
		expect(run).toHaveBeenCalledTimes(1)
		expect(run.mock.calls[0][0]).toContain('--dry-run')
	})

	it('checks all packages before uploading anything', async () => {
		const run = vi.fn()
		const packages = [pkg('hooks'), pkg('connect')]
		await publishPackages(packages, {
			publish: true,
			run,
			fetchRegistry: vi
				.fn()
				.mockImplementation(async () => response(['1.1.0'])),
		})
		expect(run.mock.calls.map(([args]) => args.includes('--dry-run'))).toEqual([
			true,
			true,
			false,
			false,
		])
		expect(run.mock.calls[2][0]).toContain('--provenance')
	})

	it('does not upload if any dry run fails', async () => {
		const run = vi
			.fn()
			.mockImplementationOnce(() => {})
			.mockImplementationOnce(() => {
				throw new Error('invalid tarball')
			})
		await expect(
			publishPackages([pkg('hooks'), pkg('connect')], {
				publish: true,
				run,
				fetchRegistry: vi
					.fn()
					.mockImplementation(async () => response(['1.1.0'])),
			}),
		).rejects.toThrow('invalid tarball')
		expect(run.mock.calls.every(([args]) => args.includes('--dry-run'))).toBe(
			true,
		)
	})

	it('stops before publishing consumers if a dependency publish fails', async () => {
		const hooks = pkg('hooks')
		const connect = pkg('connect', { [hooks.name]: '^1.2.0' })
		const run = vi.fn().mockImplementation((args) => {
			if (!args.includes('--dry-run')) throw new Error('publish failed')
		})
		await expect(
			publishPackages([connect, hooks], {
				publish: true,
				run,
				fetchRegistry: vi
					.fn()
					.mockImplementation(async () => response(['1.1.0'])),
			}),
		).rejects.toThrow('publish failed')
		expect(run).toHaveBeenCalledTimes(3)
		expect(run.mock.calls[2][1]).toBe(hooks.dist)
	})
})
