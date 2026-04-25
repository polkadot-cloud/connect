---
name: polkadot-cloud-connect
description: 'Use the @polkadot-cloud/connect React package to wire wallet connectivity into a dapp. Use when: integrating Polkadot/Substrate wallets, mounting ConnectProvider, reading extension/hardware/external/imported accounts, tracking the active account, or composing first-party adaptors (Ledger, Vault, Proxies). Covers the React provider tree, hooks (useExtensions, useExtensionAccounts, useHardwareAccounts, useExternalAccounts, useImportedAccounts, useActiveAccount), the Adaptor model, and required peer setup.'
---

# @polkadot-cloud/connect

React providers and hooks for connecting a dapp to Polkadot / Substrate wallets and managing accounts (extension, hardware, external).

## When to use

Load this skill when the user asks to:
- Add wallet connectivity to a React dapp on Polkadot/Substrate.
- Mount `ConnectProvider` or any of its child providers.
- Read or set the active account, list imported accounts, or enumerate browser extensions.
- Wire first-party adaptors (`@polkadot-cloud/connect-ledger`, `@polkadot-cloud/connect-vault`, `@polkadot-cloud/connect-proxies`).
- Debug "no extensions detected", "accounts not appearing", or hook-outside-provider errors.

If the task is non-React or only consumes the underlying observables, prefer the `polkadot-cloud-connect-core` skill instead.

## Install

```bash
pnpm add @polkadot-cloud/connect @polkadot-cloud/connect-core
# Peer deps (consumer-supplied):
pnpm add react react-dom dedot
```

`react` >=18 is required. `dedot` is the Substrate API client used by the underlying core registry.

## Mental model

`ConnectProvider` composes a fixed inner provider stack and dynamically nests any `adaptors` you pass in:

```
ExtensionsProvider             // extension discovery + accounts
  HardwareAccountsProvider     // ledger / vault / wallet-connect accounts
    ActiveAccountProvider      // currently-selected address per network
      ExternalAccountsProvider // read-only / watched addresses
        ImportedAccountsProvider // unified list (extension + hardware + external)
          <Adaptor[0]>...<Adaptor[N]> // your opt-in adaptors
            {children}
```

Every hook in this package must be called inside `ConnectProvider`.

## Required setup

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'

export function App() {
  return (
    <ConnectProvider ss58={0} dappName="My Dapp" network="polkadot">
      <Dapp />
    </ConnectProvider>
  )
}
```

`ConnectProviderProps`:

| Prop       | Type        | Required | Notes                                                                 |
|------------|-------------|----------|-----------------------------------------------------------------------|
| `ss58`     | `number`    | yes      | SS58 prefix used to format addresses (e.g. `0` Polkadot, `2` Kusama). |
| `dappName` | `string`    | yes      | Identifier presented to wallets when requesting access.               |
| `network`  | `string`    | no       | Network id used to scope active/external accounts and api lookup.     |
| `adaptors` | `Adaptor[]` | no       | Opt-in providers (see Adaptors).                                      |

## Hooks

All hooks throw if used outside `ConnectProvider`.

| Hook                   | Source folder         | Returns (high level)                                                                 |
|------------------------|-----------------------|--------------------------------------------------------------------------------------|
| `useExtensions`        | `Extensions/Connect`  | Extension discovery + connect/disconnect actions (wraps extension status observables).|
| `useExtensionAccounts` | `Extensions/Accounts` | Accounts exposed by connected extensions.                                            |
| `useHardwareAccounts`  | `Hardware`            | Imported hardware accounts (`ledger`, `vault`, `wallet_connect`).                    |
| `useExternalAccounts`  | `ExternalAccounts`    | Read-only / watched addresses + add/remove helpers (`'new' \| 'replace'` import).    |
| `useImportedAccounts`  | `ImportedAccounts`    | Unified list across extension + hardware + external.                                 |
| `useActiveAccount`     | `ActiveAccount`       | Currently selected `ActiveAccount` (scoped by `network`) + setter.                   |

Account/type primitives (`ImportedAccount`, `ActiveAccount`, `MaybeAddress`, etc.) are exported from the `@polkadot-cloud/connect-core/types` subpath (not the package root). Import them from there in shared code:

```ts
import type { ImportedAccount, ActiveAccount, MaybeAddress } from '@polkadot-cloud/connect-core/types'
```

## Adaptor model

`adaptors` is an array of React components of shape `ComponentType<{ children: ReactNode }>`. They are nested innermost-first inside `ConnectProvider`, so a hook from an adaptor (e.g. `useLedger`) only works when that adaptor is mounted.

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { LedgerAdaptor } from '@polkadot-cloud/connect-ledger'
import { createProxiesAdaptor } from '@polkadot-cloud/connect-proxies'

<ConnectProvider
  ss58={0}
  dappName="My Dapp"
  network="polkadot"
  adaptors={[LedgerAdaptor, createProxiesAdaptor('polkadot')]}
>
  {children}
</ConnectProvider>
```

Notes:
- `LedgerAdaptor` is a re-export of `LedgerProvider` — pass it directly, do not instantiate.
- `createProxiesAdaptor(network)` is a factory; the returned component must be re-created when `network` changes.

## API client registration (dedot)

Hooks that depend on a chain (active account, proxies, etc.) read the dedot client from the core registry. The consumer is responsible for calling `setApi(network, client)` from `@polkadot-cloud/connect-core` when a `DedotClient` becomes ready, and `removeApi(network)` on teardown. See the `polkadot-cloud-connect-core` skill.

## Procedure for new integrations

1. Install `@polkadot-cloud/connect`, `@polkadot-cloud/connect-core`, and any adaptor packages.
2. Create a single `DedotClient` per network and register it with `setApi(network, client)` (see core skill).
3. Mount `<ConnectProvider ss58 dappName network adaptors>` at the top of the React tree.
4. Inside, call `useExtensions()` to render an extension picker; on user click invoke its connect action so accounts begin to flow.
5. Use `useImportedAccounts()` to render the unified account list and `useActiveAccount()` to track/select the signing account.
6. For hardware/proxies, mount the matching adaptor and use its dedicated hooks (`useLedger`, `useVaultAccounts`, `useProxies`, …).

## Common pitfalls

- **Hook outside provider** — every hook (including adaptor hooks) needs `ConnectProvider` above it. Do not destructure `useExtensions` etc. at module load time.
- **Wrong `ss58`** — addresses appear in unexpected formats. Match `ss58` to the chain you target (Polkadot `0`, Kusama `2`, generic Substrate `42`).
- **Stable `dappName`** — extensions key per-dapp authorization on this string; changing it forces re-authentication.
- **`network` mismatch with api registry** — `ActiveAccountProvider`/`ExternalAccountsProvider` are scoped by `network`; the same string must be used when calling `setApi(network, …)`.
- **Adaptor ordering** — `adaptors` are nested innermost-first. Adaptors that depend on others (e.g. proxies relying on imported accounts) should appear later in the array.
- **DTS collisions** — when adding modules in this repo, keep one barrel per folder (`index.ts` *or* `index.tsx`, never both); `tsup` DTS emits `TS5056` on collision.
