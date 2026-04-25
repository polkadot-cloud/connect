---
name: polkadot-cloud-connect-proxies
description: 'Use the @polkadot-cloud/connect-proxies adaptor to discover and manage Substrate pallet-proxy relationships in a @polkadot-cloud/connect dapp. Use when: showing accounts that proxy for the user (or are proxied by them), letting the user pick an active proxy, validating that a call is permitted by a proxy type (Any / Staking / etc.), persisting the active proxy per network, or driving proxy discovery from React (useProxiesLifecycle) or non-React (createProxiesLifecycle / startProxies / stopProxies). Covers the createProxiesAdaptor factory, useProxies / useActiveProxy hooks, observables (proxies$, activeProxy$), one-shot queryProxies, persistence helpers, and the SupportedProxies call whitelist.'
---

# @polkadot-cloud/connect-proxies

Adaptor for `@polkadot-cloud/connect` that discovers Substrate `pallet-proxy` relationships, exposes them via React hooks and RxJS observables, and persists the user's active proxy per network.

## When to use

Load this skill when the user asks to:
- Add proxy-account support to a Polkadot/Substrate dapp.
- Show "accounts that proxy for me" or "accounts I am a proxy of".
- Let the user select an active proxy to sign on behalf of another address.
- Validate that a given call (e.g. `Staking.Bond`) is permitted by the chosen proxy type.
- Persist / restore the active proxy across reloads.
- Drive proxy discovery from a non-React host (worker, script, Vue/Svelte).

## Install

```bash
pnpm add @polkadot-cloud/connect @polkadot-cloud/connect-proxies dedot
```

## Mount the adaptor

`createProxiesAdaptor(network)` returns a provider component. Pass it into `ConnectProvider.adaptors` and re-create it whenever `network` changes.

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { createProxiesAdaptor, useProxiesLifecycle } from '@polkadot-cloud/connect-proxies'

function App({ api, network }) {
  // React: drives discovery; stops/starts when api or network changes.
  useProxiesLifecycle(api, network)

  return (
    <ConnectProvider ss58={0} dappName="My Dapp" network={network}
      adaptors={[createProxiesAdaptor(network)]}>
      {children}
    </ConnectProvider>
  )
}
```

> Pick **one** lifecycle driver per network — the React hook **or** the non-React function. They share state.

### Non-React lifecycle

```ts
import { createProxiesLifecycle } from '@polkadot-cloud/connect-proxies'

const lifecycle = createProxiesLifecycle()
lifecycle.update(api, network) // call whenever api or network changes
lifecycle.dispose()             // call on teardown
```

For lower-level control: `startProxies(api, network)` / `stopProxies(network)`.

## React hooks

| Hook                              | Purpose                                                                                  |
|-----------------------------------|------------------------------------------------------------------------------------------|
| `useProxies()`                    | Read the proxies context mounted by `createProxiesAdaptor` (`ProxiesContextInterface`).  |
| `useActiveProxy()`                | Read-only — returns the current `ActiveProxy \| null`. To set, call `setActiveProxy(network, value)` from `state/activeProxy`. |
| `useProxiesLifecycle(api, network)` | Drive discovery; call once near the top of the React tree.                             |

`ProxiesContextInterface` (selected):
- `getDelegates(address)` → `Proxy | undefined` — proxies whose delegator is this address.
- `getProxyDelegate(delegator, delegate)` → `ProxyDelegate | null`.
- `handleDeclareDelegate(delegator)` → `Promise<ProxyDelegate[] | null>` — fetch and cache.
- `formatProxiesToDelegates()` → `Delegates` (delegate-keyed view).

## Observables (non-React)

- `proxies$` — `Record<string, ProxyRecord>` keyed by delegator address. Mutators: `getProxies(address)` → `ProxyRecord | undefined`, `addProxies(address, record)`, `removeProxies(address)`, `resetProxies()`.
- `activeProxy$` — `ActiveProxy | null`. Accessors: `getActiveProxy()`, `setActiveProxy(network: string, proxy: ActiveProxy | null)`, `resetActiveProxy()`.

## Persistence

Per-network `localStorage` helpers (key `pc_activeProxies` / `ActiveProxiesKey`):

- `getLocalActiveProxies()` → `LocalActiveProxies` (`Record<network, ActiveProxy>`).
- `getLocalActiveProxy(network)` / `setLocalActiveProxy(network, value)` / `removeLocalActiveProxy(network)`.

## One-shot query and low-level subscription

- `queryProxies(api, address)` — read once without starting a subscription.
- `ProxiesQuery` — class that subscribes to chain proxy storage; used internally by `ProxyDiscoveryController`.
- `ProxyDiscoveryController` — the controller behind the lifecycle helpers; expose only when implementing a custom orchestrator.

## Call whitelist (`SupportedProxies`)

`SupportedProxies` maps each proxy type to allowed `Pallet.Method` strings (`'*'` = all). Use the predicates instead of inspecting the map directly:

- `isSupportedProxy(proxyType)` — does this proxy type appear in the whitelist?
- `isSupportedProxyCall(proxyType, 'Pallet.Method')` — is this call permitted under that proxy type?

Currently shipped types: `Any` (all calls), `Staking` (staking + nomination-pool calls). Add new entries to `SupportedProxies` when extending support.

## Procedure: add active-proxy support to a dapp

1. Install the package and ensure a `DedotClient` is registered for the active network (see `polkadot-cloud-connect-core`).
2. Add `createProxiesAdaptor(network)` to `ConnectProvider.adaptors`; re-create on network change.
3. Call `useProxiesLifecycle(api, network)` once near the top of the React tree.
4. In an "accounts" UI, use `useProxies()` to enumerate delegators/delegates and `useActiveProxy()` to render a picker.
5. Persist the picker's choice with `setLocalActiveProxy(network, value)`; restore on mount via `getLocalActiveProxy(network)`.
6. Before submitting a transaction wrapped in `Proxy.proxy`, call `isSupportedProxyCall(activeProxy.proxyType, 'Pallet.Method')` and surface a clear error if false.

## Common pitfalls

- **Two lifecycle drivers** — combining `useProxiesLifecycle` and `createProxiesLifecycle` for the same network double-subscribes; pick one.
- **Stale adaptor on network change** — `createProxiesAdaptor(network)` captures `network`; recompute the adaptors array (or use `useMemo` keyed on `network`) so React remounts it.
- **Calling lifecycle without an api** — `useProxiesLifecycle(null, network)` is safe; it defers until the api for that network is registered via `setApi(network, …)`.
- **Whitelist drift** — don't fork `SupportedProxies` in a consumer; PR additions upstream so the predicates remain authoritative.
- **Persistence key collisions** — always use the exported helpers; do not write to `pc_activeProxies` directly.
