import { describe, expect, it, vi } from 'vitest'
import { queryProxies } from '../../packages/connect-proxies/src/query/proxies'
import {
	isSupportedProxy,
	isSupportedProxyCall,
} from '../../packages/connect-proxies/src/utils/proxies'

type QueryProxiesApi = Parameters<typeof queryProxies>[0]

type MockProxyApi = {
	query: {
		proxy: {
			proxies: (address: string) => Promise<[unknown[], unknown]>
		}
	}
	consts: {
		system: {
			ss58Prefix: number
		}
	}
}

const toDedotClient = (mockApi: MockProxyApi): QueryProxiesApi =>
	mockApi as unknown as QueryProxiesApi

describe('connect-proxies utils', () => {
	it('validates supported proxy types', () => {
		expect(isSupportedProxy('Any')).toBe(true)
		expect(isSupportedProxy('Staking')).toBe(true)
		expect(isSupportedProxy('Unknown')).toBe(false)
	})

	it('validates supported proxy calls', () => {
		expect(isSupportedProxyCall('Any', 'Balances', 'Transfer')).toBe(true)
		expect(isSupportedProxyCall('Staking', 'Staking', 'Bond')).toBe(true)
		expect(isSupportedProxyCall('Staking', 'Balances', 'Transfer')).toBe(false)
		expect(isSupportedProxyCall('Staking', '', 'Transfer')).toBe(false)
	})
})

describe('connect-proxies queryProxies', () => {
	it('maps delegate records into a normalized shape', async () => {
		const proxies = [
			{
				delegate: {
					address: (prefix: number) => `delegate-${prefix}`,
				},
				proxyType: 'Staking',
			},
		]

		const mockApi: MockProxyApi = {
			query: {
				proxy: {
					proxies: vi.fn().mockResolvedValue([proxies, 0]),
				},
			},
			consts: {
				system: {
					ss58Prefix: 42,
				},
			},
		}

		await expect(queryProxies(toDedotClient(mockApi), '5abc')).resolves.toEqual(
			[
				{
					delegate: 'delegate-42',
					proxyType: 'Staking',
				},
			],
		)
		expect(mockApi.query.proxy.proxies).toHaveBeenCalledWith('5abc')
	})

	it('returns an empty array when query fails', async () => {
		const mockApi: MockProxyApi = {
			query: {
				proxy: {
					proxies: vi.fn().mockRejectedValue(new Error('missing pallet')),
				},
			},
			consts: {
				system: {
					ss58Prefix: 0,
				},
			},
		}

		await expect(queryProxies(toDedotClient(mockApi), '5abc')).resolves.toEqual(
			[],
		)
	})
})
