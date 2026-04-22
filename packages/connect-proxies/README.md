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

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { createProxiesAdaptor } from '@polkadot-cloud/connect-proxies'

function App() {
	return (
		<ConnectProvider
			ss58={0}
			dappName="My Dapp"
			adaptors={[createProxiesAdaptor('polkadot')]}
		>
			{/* Your app content */}
		</ConnectProvider>
	)
}
```

## License

GPL-3.0-only