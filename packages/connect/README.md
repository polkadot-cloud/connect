# Connect Kit

Providers and hooks for connecting to web3 wallets and interacting with accounts

## Installation

```bash
npm install @polkadot-cloud/connect
```

or

```bash
yarn add @polkadot-cloud/connect
```

or

```bash
pnpm add @polkadot-cloud/connect
```

## Usage

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'

function App() {
  return (
    <ConnectProvider ss58={0} dappName="My Dapp">
      {/* Your app content */}
    </ConnectProvider>
  )
}
```

### Adaptor Model

`ConnectProvider` supports an `adaptors` prop that accepts an array of provider components. Adaptors are dynamically nested inside `ConnectProvider`, allowing your dapp to opt in to whichever connection methods it needs without hard dependencies.

First-party adaptors:

- [`@polkadot-cloud/connect-ledger`](https://www.npmjs.com/package/@polkadot-cloud/connect-ledger) — Ledger hardware wallet support
- [`@polkadot-cloud/connect-vault`](https://www.npmjs.com/package/@polkadot-cloud/connect-vault) — Polkadot Vault (QR-based) wallet support

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { LedgerAdaptor } from '@polkadot-cloud/connect-ledger'

function App() {
  return (
    <ConnectProvider
      ss58={0}
      dappName="My Dapp"
      adaptors={[LedgerAdaptor]}
    >
      {/* Your app content */}
    </ConnectProvider>
  )
}
```

Each adaptor provides its own hooks for interacting with its connection method (e.g., `useLedger` from `@polkadot-cloud/connect-ledger`). Browser extension connectivity is built in via `useExtensions` and `useExtensionAccounts`.

## Documentation

For comprehensive documentation and examples, visit the [documentation](https://github.com/polkadot-cloud/connect).

## Keywords

`polkadot-cloud`, `polkadot`, `web3`, `react`, `hooks`, `wallet`, `connect`, `typescript`

## Repository

- **Source**: [GitHub](https://github.com/polkadot-cloud/connect)
- **Package**: [npm](https://www.npmjs.com/package/@polkadot-cloud/connect)
- **Issues**: [GitHub Issues](https://github.com/polkadot-cloud/connect/issues)

## License

This package is licensed under the GPL-3.0-only.

---

Part of the [polkadot-cloud/connect](https://github.com/polkadot-cloud/connect) - Packages for connecting to Polkadot wallets.
