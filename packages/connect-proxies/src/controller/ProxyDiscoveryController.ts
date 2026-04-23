// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { importedAccounts$ } from '@polkadot-cloud/connect-core'
import type { ImportedAccount } from '@polkadot-cloud/connect-core/types'
import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'
import { type Subscription, pairwise, startWith } from 'rxjs'
import { resetProxies } from '../state/proxies'
import { ProxiesQuery } from '../subscribe/ProxiesQuery'

// Manages the lifecycle of per-account proxy chain subscriptions. Accepts any
// consumer-provided DedotClient at runtime (lazy — not at provider mount).
// Subscriptions start on first start() call, are ref-counted, and are torn
// down when the last consumer calls stop() or when the client changes.
export class ProxyDiscoveryController {
	#api: DedotClient<GenericSubstrateApi> | null = null
	#subscriptions: Record<string, ProxiesQuery<GenericSubstrateApi>> = {}
	#accountSub: Subscription | null = null
	#refCount = 0
	#network: string

	constructor(network = '') {
		this.#network = network
	}

	start<T extends GenericSubstrateApi>(api: DedotClient<T>): void {
		const castApi = api as unknown as DedotClient<GenericSubstrateApi>
		this.#refCount++

		if (this.#api === castApi) {
			// Same client already running — nothing to do
			return
		}

		if (this.#api !== null) {
			// Client swapped — tear down existing subscriptions before rebinding
			this.#teardown()
		}

		this.#api = castApi
		this.#subscribeAccounts()
	}

	stop(): void {
		this.#refCount = Math.max(0, this.#refCount - 1)
		if (this.#refCount === 0) {
			this.#teardown()
		}
	}

	// Force immediate teardown regardless of ref-count. Use when the controller owner is unmounting
	// or the network has changed and the controller must be replaced.
	destroy(): void {
		this.#refCount = 0
		this.#teardown()
	}

	#subscribeAccounts() {
		this.#accountSub = importedAccounts$
			.pipe(startWith([] as ImportedAccount[]), pairwise())
			.subscribe(([prev, cur]) => {
				const api = this.#api
				if (!api) return

				const prevFiltered = this.#filterAccountsByNetwork(prev)
				const curFiltered = this.#filterAccountsByNetwork(cur)

				// Extract unique addresses for this controller's active network
				const prevAddrs = new Set(prevFiltered.map((a) => a.address))
				const curAddrs = new Set(curFiltered.map((a) => a.address))

				// Unsubscribe from removed addresses
				for (const addr of prevAddrs) {
					if (!curAddrs.has(addr)) {
						this.#subscriptions[addr]?.unsubscribe()
						delete this.#subscriptions[addr]
					}
				}

				// Subscribe to newly added addresses
				for (const addr of curAddrs) {
					if (!prevAddrs.has(addr) && !this.#subscriptions[addr]) {
						this.#subscriptions[addr] = new ProxiesQuery(api, addr)
					}
				}
			})
	}

	#filterAccountsByNetwork(accounts: ImportedAccount[]): ImportedAccount[] {
		return accounts.filter((account) => {
			if ('network' in account) {
				if (!this.#network) {
					return true
				}
				return account.network === this.#network
			}
			return true
		})
	}

	#teardown() {
		this.#accountSub?.unsubscribe()
		this.#accountSub = null
		for (const query of Object.values(this.#subscriptions)) {
			query.unsubscribe()
		}
		this.#subscriptions = {}
		resetProxies()
		this.#api = null
	}
}
