# Connect Proxies

Proxy account adaptor and hooks for `@polkadot-cloud/connect`.

## Installation

```bash
npm install @polkadot-cloud/connect-proxies
```

or

```bash
yarn add @polkadot-cloud/connect-proxies
```

or

```bash
pnpm add @polkadot-cloud/connect-proxies
```

## Usage

Pass `createProxiesAdaptor(network)` into `ConnectProvider` to register the proxies context, and call `useProxiesLifecycle(api, network)` in your app component to trigger discovery.

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import {
	createProxiesAdaptor,
	useProxiesLifecycle,
} from '@polkadot-cloud/connect-proxies'
import type { DedotClient } from 'dedot'
import type { GenericSubstrateApi } from 'dedot/types'

function App({
	api,
	network,
}: {
	api: DedotClient<GenericSubstrateApi> | null
	network: string
}) {
	// Starts proxy discovery; stops and restarts when api or network changes.
	useProxiesLifecycle(api, network)

	return (
		<ConnectProvider
			ss58={0}
			dappName="My Dapp"
			adaptors={[createProxiesAdaptor(network)]}
		>
			{/* Your app content */}
		</ConnectProvider>
	)
}
```

`useProxiesLifecycle(api, network)` automatically manages the proxy discovery lifecycle. It stops old proxy subscriptions when `network` changes, then starts discovery again once the `api` instance for that network is available.

## License