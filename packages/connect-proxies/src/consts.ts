// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

// localStorage key for persisting active proxy per network
//
// NOTE: Could move to connect-core to share with core's local storage utils, but left here for now
// since it's only used by the proxies package
export const ActiveProxiesKey = 'pc_activeProxies'

// Proxy type call whitelist. Each key is a proxy type; the value is a list of
// allowed pallet.method calls ('*' means all calls are allowed for that type).
export const SupportedProxies: Record<string, string[]> = {
	Any: ['*'],
	Staking: [
		'Staking.Bond',
		'Staking.BondExtra',
		'Staking.Chill',
		'Staking.Nominate',
		'Staking.Rebond',
		'Staking.SetController',
		'Staking.SetPayee',
		'Staking.Unbond',
		'Staking.WithdrawUnbonded',
		'NominationPools.Create',
		'NominationPools.Nominate',
		'NominationPools.BondExtra',
		'NominationPools.Chill',
		'NominationPools.ClaimPayout',
		'NominationPools.Join',
		'NominationPools.SetClaimPermission',
		'NominationPools.ClaimCommission',
		'NominationPools.SetCommission',
		'NominationPools.SetCommissionMax',
		'NominationPools.SetCommissionChangeRate',
		'NominationPools.Unbond',
		'NominationPools.SetMetadata',
		'NominationPools.SetState',
		'NominationPools.WithdrawUnbonded',
	],
}
