// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

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
export const startProxies = <T extends GenericSubstrateApi>(
	api: DedotClient<T>,
	network = '',
): void => {
	getController(network).start(api)
}

// Decrements discovery ref-count and tears down subscriptions when it reaches zero.
export const stopProxies = (network = ''): void => {
	controllers.get(network)?.stop()
}

// Returns the api client currently bound to the discovery controller for the
// given network, or null if no lifecycle has started discovery yet.
export const getProxiesApi = (
	network = '',
): DedotClient<GenericSubstrateApi> | null =>
	controllers.get(network)?.api ?? null
