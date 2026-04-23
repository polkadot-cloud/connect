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

Pass `createProxiesAdaptor(network)` into `ConnectProvider` to register the proxies context, then drive proxy discovery using **either** the React hook **or** the framework-agnostic lifecycle function — choose one based on your environment. They share the same underlying state, so they should not be combined.

### Option A — React hook (`useProxiesLifecycle`)

Use in React apps. Call `useProxiesLifecycle(api, network)` once in your app component to trigger discovery.

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

### Option B — Non-React lifecycle (`createProxiesLifecycle`)

Use in non-React environments (workers, scripts, other frameworks). It drives the same underlying state as the hook, so any React providers or observable consumers wired up elsewhere stay in sync.

```ts
import { createProxiesLifecycle } from '@polkadot-cloud/connect-proxies'

const lifecycle = createProxiesLifecycle()

// Call whenever `api` or `network` changes:
lifecycle.update(api, network)

// Call on teardown to stop active subscriptions:
lifecycle.dispose()
```

It applies the same diffing logic as the React hook: if `network` changes but the `api` instance is still bound to the old chain, it defers starting discovery until the `api` instance refreshes for the new network.

> Pick one of the two options above — do not use both for the same network. For even lower-level control, `startProxies(api, network)` and `stopProxies(network)` are also exported.

## License