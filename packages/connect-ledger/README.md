# Connect Ledger

Ledger hardware wallet adaptor for @polkadot-cloud/connect

## Installation

```bash
npm install @polkadot-cloud/connect-ledger
```

or

```bash
yarn add @polkadot-cloud/connect-ledger
```

or

```bash
pnpm add @polkadot-cloud/connect-ledger
```

## Usage

Use `LedgerAdaptor`, `useLedger` and `signLedgerPayload` for Connect account import and transaction flows. The implementation uses Ledger's Device Management Kit, WebHID Transport Kit and Polkadot Device Signer Kit. It no longer depends on LedgerJS or Zondax JavaScript transports. It requires Dedot 1.4 or newer.

For a standalone UI-owned session:

```typescript
import { createLedgerAdapter, ledgerAccountPath } from '@polkadot-cloud/connect-ledger/device'

const ledger = createLedgerAdapter()
const controller = new AbortController()
const { app } = await ledger.initialise({ signal: controller.signal })
try {
  const account = await app.getAddress(ledgerAccountPath(0), 0, true)
  // Read the public address, or call ledger.signPayload(app, index, payload, proof).
} finally {
  await ledger.unmount(app)
}
```

Start connection from a user gesture. Extension clients that grant USB permission in a separate tab should pass `requestDevice: false`. Calling `controller.abort()` cancels the action; always close the owned session in `finally`. Open the generic Polkadot app manually. Automatic app opening and background session polling are disabled, so these flows require no Ledger manager API or secure-channel network calls. No logger is registered.

The adapter converts the existing `m/44'/354'/{index}'/0'/0'` path to the kit's string format. It validates public-key/address consistency, retains the 65-byte ed25519 signature, and exposes `deviceModel` and `isPaired`. Direct legacy `transport`, `ensureOpen` and `ensureClosed` access is removed. `getVersion` verifies the running Polkadot app. `getVersion`, `getAddress` and `signPayload` close their session before returning. Direct `app.getAddress` callers close their session themselves. Use `unmount(app)` to avoid a stale owner closing a newer session.

The Dedot helper binds the metadata digest, initializes the supplied signed extension, creates the exact payload/proof and checks the connected account identity before requesting a signature. Its connection closes on success, missing extensions, preparation failure, cancellation or rejection. The workspace retains the Dedot V16 extension-selection and merkleized-metadata patches pending an upstream release containing both fixes.

## Local consumer workspaces

Cloud Signer and Cloud Apps temporarily override `connect-ledger` with a link to this package. Run `pnpm install` and `pnpm build` here before installing/building either consumer, using Node 24 and each workspace's pinned pnpm version. Rebuild after adapter edits. After physical-device tests and release, replace the overrides and old version ranges with the published release and regenerate consumer lockfiles. No publication is performed by this migration.

Ledger's SDK dependencies are distributed under Apache-2.0; their upstream source is [LedgerHQ/device-sdk-ts](https://github.com/LedgerHQ/device-sdk-ts). The browser SDK is bundled into both ESM and CJS exports because the WebHID kit only publishes an import export.

## Documentation

For comprehensive documentation and examples, visit the [documentation](https://github.com/polkadot-cloud/connect).

## Keywords

`polkadot-cloud`, `polkadot`, `substrate`, `wallet`, `connect`, `ledger`, `hardware`, `react`, `typescript`

## Repository

- **Source**: [GitHub](https://github.com/polkadot-cloud/connect)
- **Package**: [npm](https://www.npmjs.com/package/@polkadot-cloud/connect-ledger)
- **Issues**: [GitHub Issues](https://github.com/polkadot-cloud/connect/issues)

## License

This package is licensed under the GPL-3.0-only.

---

Part of the [polkadot-cloud/connect](https://github.com/polkadot-cloud/connect) - Packages for connecting to Polkadot wallets.
