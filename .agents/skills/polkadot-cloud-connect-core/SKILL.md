---
name: polkadot-cloud-connect-core
description: 'Use the @polkadot-cloud/connect-core package for framework-agnostic Polkadot wallet/account state via RxJS observables. Use when: subscribing to extension status, extension/hardware/external/imported accounts, the active address, or the shared dedot api registry from non-React code (workers, vanilla JS, Vue, Svelte) — or when implementing custom adaptors. Covers observables (extensionsStatus$, extensionAccounts$, hardwareAccounts$, importedAccounts$, activeAddress$, apis$), imperative setters, the dedot api registry (setApi/getApi/removeApi), and shared types.'
---

# @polkadot-cloud/connect-core

Framework-agnostic core for `@polkadot-cloud/connect`. Exposes RxJS observables and imperative setters for extensions, accounts, the active address, and a shared `dedot` api client registry.

## When to use

Load this skill when the user needs to:
- Read connect state outside React (Node scripts, workers, Vue/Svelte/Solid, vanilla JS).
- Implement a custom adaptor or wallet integration that pushes accounts into the shared state.
- Register/dispose a `DedotClient` so the React layer and adaptors can read it.
- Persist or restore connection state via the local-storage helpers.
- Share `ImportedAccount`, `ActiveAccount`, `MaybeAddress`, etc. types between packages.

If the task is purely React UI consumption, prefer the `polkadot-cloud-connect` skill — its hooks wrap these observables.

## Install

```bash
pnpm add @polkadot-cloud/connect-core dedot
```

`dedot` is the only peer dependency. `rxjs` ships transitively as part of the package's own runtime.

## Surface area

The package ships several entrypoints (see its `exports` map):

| Subpath | Contents |
|---------|----------|
| `.` (default) | `consts`, `local`, `util-local`, `observables` (re-exports `externalAccounts`, `importedAccounts`, `apis`, `activeAddress`), and `util`. |
| `./types` | All shared types — `ImportedAccount`, `ExtensionAccount`, `HardwareAccount`, `ActiveAccount`, `ExternalAccount`, `ExtensionsStatus`, `MaybeAddress`, `MaybeString`, `Sync`, `NetworkId`, etc. **Not re-exported from the root.** |
| `./extensions` | `getExtensions`, `enableExtensions`, `initExtensions`, `connectExtension`, `reconnectExtensions`. |
| `./accounts` | `getAccountsFromExtensions`, `processExtensionAccounts`, `formatExtensionAccounts`, `updateAccounts`, unsub helpers. |
| `./observables` | The same observables exposed at the root — for tree-shaking when only the streams are needed. |

### Observables (read)

All are hot `BehaviorSubject`-backed streams; subscribers receive the current value immediately.

| Observable                | Emits                                                             |
|---------------------------|-------------------------------------------------------------------|
| `extensionsStatus$`       | `ExtensionsStatus` — `Record<extensionId, 'installed' \| 'not_authenticated' \| 'connected'>` |
| `gettingExtensions$`      | `boolean` — discovery in flight                                   |
| `initialisedExtensions$`  | Set of extension ids that have successfully connected             |
| `reconnectSync$`          | `Sync` — `'unsynced' \| 'syncing' \| 'synced'` for auto-reconnect |
| `extensionAccounts$`      | `ExtensionAccount[]`                                              |
| `hardwareAccounts$`       | `HardwareAccount[]`                                               |
| `activeAddress$`          | `MaybeString` — single global active address (not per-network)    |
| `importedAccounts$`       | Unified `ImportedAccount[]` (extension + hardware + external)     |
| `externalAccounts$`       | Read-only / watched accounts (see `externalAccounts` module)      |
| `apis$`                   | `ReadonlyMap<network, DedotClient>`                               |

### Imperative API (write)

- Active address: `getActiveAddress()`, `setActiveAddress(address: MaybeString)`, `resetActiveAddress()` — all single-state, no `network` argument.
- External accounts: `addExternalAccount(network, account: ExternalAccount, noLocal?)`, `removeExternalAccounts(network, accounts: ExternalAccount[])`, `externalAccountExists(network, address)`, `getExternalAccounts()`, `getInitialExternalAccounts()`. Both add/remove take full `ExternalAccount` objects (`{ address, name, source, network, addedBy }`), not bare addresses; pass `noLocal=true` to skip the localStorage write.
- Hardware accounts: `getHardwareAccounts()`, `setHardwareAccounts(accounts)` (from `util`).
- Imported accounts: aggregated, no direct setter — push into the relevant extension/hardware/external state.
- Reconnect sync: `getReconnectSync()`, `setReconnectSync(sync)`.
- Extension status: `getStatus(id)`, `setStatus(id, status)`, `removeStatus(id)`, `canConnect(id)`, `resetAccounts()`, `hasValidEnable(id)`, `enableInjectedWeb3Entry(id, dappName)`.
- API registry: `getApi(network)`, `getApi$(network)`, `setApi(network, client)`, `removeApi(network)`, `resetApis()`.

## API registry contract

The registry only stores references; it does **not** open or close connections.

```ts
import { setApi, removeApi, getApi$ } from '@polkadot-cloud/connect-core'
import { DedotClient, WsProvider } from 'dedot'

const network = 'polkadot'
const client = await DedotClient.new(new WsProvider('wss://rpc.polkadot.io'))
setApi(network, client)

// later, on teardown / network change:
removeApi(network)
await client.disconnect()
```

Whoever calls `setApi` owns the lifecycle of that client. The registry allows only one client per network: once a client is registered for a given `network`, subsequent `setApi(network, ...)` calls do **not** replace it and only increase the internal reference count. If you need to swap clients for the same network, first call `removeApi(network)` for the currently registered client, then call `setApi(network, newClient)`. `removeApi` still does **not** disconnect the old client for you, so the caller that created it must disconnect it explicitly when appropriate.

To react to api changes:

```ts
import { getApi$ } from '@polkadot-cloud/connect-core'

const sub = getApi$('polkadot').subscribe((api) => {
  if (!api) return
  // run queries against api
})
// sub.unsubscribe() on teardown
```

## Procedure: build a custom adaptor

1. Install `@polkadot-cloud/connect-core` and (if React) `@polkadot-cloud/connect`.
2. Discover/connect to your wallet source.
3. Convert results into `ExtensionAccount` or `HardwareAccount` shape (see `types.ts`).
4. Push into the relevant subject (extension or hardware) — observables and the React layer update automatically.
5. On disconnect, remove the entries you added (do not clobber accounts owned by other adaptors).
6. If the adaptor needs chain reads, use `getApi$(network)` rather than constructing its own client.

## Local persistence

`local.ts` / `util-local.ts` provide typed `localStorage` helpers for selected extensions, active address, and external accounts. Use them so that user state survives reloads consistently with the rest of the suite. Avoid hand-rolling new keys.

## Common pitfalls

- **Forgetting to dispose** — `setApi` followed by no `removeApi` leaks websocket connections.
- **Mutating observable values** — values emitted are shared references; never mutate arrays/maps in place.
- **`activeAddress$` is global** — there is one shared active address across the app, not one per network. Per-network active accounts are managed by the React `ActiveAccountProvider` in `@polkadot-cloud/connect`.
- **Mixing networks** — every per-network helper (`setApi`, external accounts, etc.) keys by an opaque `network: string`; reuse the exact same id everywhere (case-sensitive).
- **Importing types from the root** — types live at `@polkadot-cloud/connect-core/types`; importing from the root package will not resolve them.
- **Subscribing without unsubscribing** — these are long-lived subjects; always tear down subscriptions in long-running hosts.
