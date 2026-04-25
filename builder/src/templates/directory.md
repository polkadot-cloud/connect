# Polkadot Cloud Connect

> Agent-ready, AI-native wallet connectivity for Polkadot apps — browser extensions, Ledger, Polkadot Vault, and proxy accounts in one toolkit.

{{DIRECTORY_ITEMS}}

## Getting Started

Install the React package with the core state layer and [Dedot API](https://dedot.dev), which Cloud Connect utilises for chain access:

```bash
pnpm add @polkadot-cloud/connect @polkadot-cloud/connect-core dedot
```

Register a Dedot client for each network your dapp uses, then mount `ConnectProvider` near the root of your React tree:

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { removeApi, setApi } from '@polkadot-cloud/connect-core'
import { DedotClient, WsProvider } from 'dedot'

const network = 'polkadot'
const api = await DedotClient.new(new WsProvider('wss://rpc.polkadot.io'))

setApi(network, api)

export function App() {
	return (
		<ConnectProvider ss58={0} dappName="My Dapp" network={network}>
			<Dapp />
		</ConnectProvider>
	)
}

// On teardown:
removeApi(network)
await api.disconnect()
```

Inside the provider, use `useExtensions()` to connect browser wallets, `useExtensionAccounts()` or `useImportedAccounts()` to read accounts, and `useActiveAccount()` to track the selected account. Add optional first-party adaptors through the `adaptors` prop when your app needs Ledger, Polkadot Vault, or proxy account support.

For agent-facing usage context and integration procedures, see the skill files in [`.agents/skills`](./.agents/skills/README.md).
