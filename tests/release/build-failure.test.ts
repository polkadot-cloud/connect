// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { afterEach, expect, it, vi } from 'vitest'
import { prebuild } from '../../builder/src/builders/common/prebuild'
import { simpleBuild } from '../../builder/src/builders/common/simpleBuild'
import { removePackageOutput } from '../../builder/src/builders/util'

vi.mock('../../builder/src/builders/common/prebuild', () => ({
	prebuild: vi.fn().mockResolvedValue(false),
}))
vi.mock('../../builder/src/builders/util', () => ({
	getPackageDirectory: vi.fn().mockReturnValue('/packages/example'),
	generatePackageJson: vi.fn(),
	removePackageOutput: vi.fn().mockResolvedValue(true),
}))

afterEach(() => vi.restoreAllMocks())

it('propagates build failures to CI after cleaning the package output', async () => {
	vi.spyOn(console, 'error').mockImplementation(() => {})
	await expect(simpleBuild('example')).rejects.toBe('Prebuild failed.')
	expect(prebuild).toHaveBeenCalledWith('example')
	expect(removePackageOutput).toHaveBeenCalledWith('/packages/example', false)
})
