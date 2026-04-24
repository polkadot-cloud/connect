// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { setApi } from '@polkadot-cloud/connect-core'
import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { ProxyDiscoveryController } from './ProxyDiscoveryController'

const controllers = new Map<string, ProxyDiscoveryController>()

const getController = (network = ''): ProxyDiscoveryController => {
	const existing = controllers.get(network)
	if (existing) {
		return existing
	}
	const next = new ProxyDiscoveryController(network)
	controllers.set(network, next)
	return next
}

// Starts (or reuses) proxy discovery subscriptions for the provided api.
// Call `stopProxies(network)` when you no longer need discovery.
//
// Side effect: registers the api in the shared connect-core registry on
// start and removes it on full teardown (when the discovery ref-count hits
// zero), so consumers don't need to manage the registry themselves.
export const startProxies = <T extends GenericSubstrateApi>(
	api: DedotClient<T>,
	network = '',
): void => {
	setApi(network, api)
	getController(network).start(api)
}

// Decrements discovery ref-count and tears down subscriptions when it reaches zero.
export const stopProxies = (network = ''): void => {
	controllers.get(network)?.stop()
}
