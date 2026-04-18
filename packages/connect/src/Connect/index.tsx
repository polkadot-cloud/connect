// Copyright 2026 @polkadot-cloud/connect authors & contributors
// SPDX-License-Identifier: GPL-3.0-only

import { ActiveAccountProvider } from '../ActiveAccount'
import { ExtensionsProvider } from '../Extensions/Provider'
import { ExternalAccountsProvider } from '../ExternalAccounts'
import { HardwareAccountsProvider } from '../Hardware'
import { ImportedAccountsProvider } from '../ImportedAccounts'
import type { ConnectProviderProps } from './types'

export const ConnectProvider = ({
	children,
	ss58,
	dappName,
	network,
	adaptors = [],
}: ConnectProviderProps) => {
	// Compose adaptor providers around children, innermost first
	const wrapped = adaptors.reduceRight(
		// biome-ignore lint/suspicious/noArrayIndexKey: adaptors are stable by position
		(acc, Adaptor, i) => <Adaptor key={i}>{acc}</Adaptor>,
		children,
	)

	return (
		<ExtensionsProvider ss58={ss58} dappName={dappName}>
			<HardwareAccountsProvider>
				<ActiveAccountProvider network={network}>
					<ExternalAccountsProvider network={network} ss58={ss58}>
						<ImportedAccountsProvider network={network} ss58={ss58}>
							{wrapped}
						</ImportedAccountsProvider>
					</ExternalAccountsProvider>
				</ActiveAccountProvider>
			</HardwareAccountsProvider>
		</ExtensionsProvider>
	)
}
