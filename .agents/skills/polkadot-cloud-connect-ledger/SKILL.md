---
name: polkadot-cloud-connect-ledger
description: 'Use the @polkadot-cloud/connect-ledger adaptor to add Ledger hardware-wallet support (Nano S/X/S Plus, Flex, Stax) to a @polkadot-cloud/connect dapp. Use when: importing Ledger accounts, signing Substrate transactions over WebUSB/HID, prompting the user to confirm on device, surfacing Ledger errors and feedback, or detecting touchscreen vs nano device family. Covers the LedgerAdaptor (LedgerProvider), useLedger context, and the useLedgerAccounts / useLedgerTxPrompt / useLedgerTxSubmit hooks plus device utilities.'
---

# @polkadot-cloud/connect-ledger

Ledger hardware wallet adaptor for `@polkadot-cloud/connect`. Provides a React context, three task-focused hooks, and helpers to identify devices and translate device errors into user feedback.

## When to use

Load this skill when the user asks to:
- Add Ledger support to a Polkadot/Substrate dapp.
- Import addresses from a Ledger device or sign a transaction with one.
- Render a "confirm on device" UI driven by Ledger status codes / feedback.
- Branch UI by device model or family (`nano` vs `touchscreen`).
- Diagnose `DeviceNotConnected`, `DeviceLocked`, `AppNotOpen`, `TransactionRejected`, etc.

## Install

```bash
pnpm add @polkadot-cloud/connect @polkadot-cloud/connect-ledger
```

A WebUSB/WebHID-capable browser is required at runtime. The Ledger device must be unlocked with the chain-specific Polkadot app open.

## Mount the adaptor

`LedgerAdaptor` is a re-export of `LedgerProvider` — pass it directly to `ConnectProvider.adaptors`. Do not instantiate it.

```tsx
import { ConnectProvider } from '@polkadot-cloud/connect'
import { LedgerAdaptor } from '@polkadot-cloud/connect-ledger'

<ConnectProvider ss58={0} dappName="My Dapp" network="polkadot" adaptors={[LedgerAdaptor]}>
  {children}
</ConnectProvider>
```

After mounting, every hook below must be called inside `ConnectProvider`.

## Hooks

| Hook                       | Purpose                                                                                  | Returns                          |
|----------------------------|------------------------------------------------------------------------------------------|----------------------------------|
| `useLedger()`              | Low-level access to the full `LedgerContextInterface` (status codes, feedback, fetch).   | `LedgerContextInterface`         |
| `useLedgerAccounts(network)` | Manage imported Ledger accounts (add/remove, persist) — **scoped per network**.        | `UseLedgerAccountsReturn`        |
| `useLedgerTxPrompt()`      | Drive a "confirm on device" prompt for a pending signing flow.                           | `UseLedgerTxPromptReturn`        |
| `useLedgerTxSubmit(props)` | Build, sign on device, and submit a Substrate transaction.                               | `UseLedgerTxSubmitReturn` (takes `UseLedgerTxSubmitProps`) |

### `useLedger` highlights

`LedgerContextInterface` exposes:
- Device introspection: `getDeviceModel()`.
- Execution flag: `isExecuting`, `setIsExecuting(v)`.
- Integrity: `integrityChecked`, `setIntegrityChecked(v)`.
- Transport: `transportResponse` (raw last response).
- Status: `statusCode` (`LedgerResponse | null`), `setStatusCode({ ack, statusCode })`, `resetStatusCode()`.
- Feedback: `getFeedbackCode()`, `setFeedbackCode(message, helpKey?, params?)`, `resetFeedback()`.
- Address fetch: `handleGetAddress(accountIndex, ss58Prefix)` (writes to state), `fetchLedgerAddress(accountIndex, ss58Prefix)` (returns `LedgerDeviceAddress | null`).
- Errors: `handleErrors(err)` — normalises raw transport errors into a `LedgerStatusCode`.
- Lifecycle: `handleUnmount()`, `handleResetLedgerTask()`, `checkRuntimeVersion()`.

Also re-exported alongside `useLedger`: `LedgerContext` (raw context object) and `LedgerProvider` (alias of `LedgerAdaptor`).

`LedgerStatusCode` is a fixed union — surface it directly to localised feedback strings.

## Utilities

Imported from the package root:

- `Ledger` — the singleton device wrapper (`device/ledger`).
- `getLedgerDeviceModel(productName)` — `'nano_s' | 'nano_x' | 'nano_s_plus' | 'flex' | 'stax' | 'unknown'`.
- `getLedgerDeviceFamily(model)` — `'nano' | 'touchscreen' | 'unknown'`.
- `getLedgerDeviceName(model)` — display name.
- `getLedgerErrorType(err)` — classify a thrown transport error.
- `isTouchscreenDevice(model)` — boolean.
- `defaultDeviceModel`, `defaultFeedback`, `errorsByType` — defaults used by the provider; reuse for resets.

## Procedure: add Ledger import + sign

1. Mount `LedgerAdaptor` inside `ConnectProvider` (see above).
2. Build an "Import from Ledger" screen that calls `useLedgerAccounts(network)` to add and persist addresses retrieved via `useLedger().fetchLedgerAddress(index, ss58)` (or `handleGetAddress` to write into context state).
3. Render `feedback` and `statusCode` from `useLedger()` to guide the user (e.g. "Open the Polkadot app", "Confirm on device").
4. For signing, call `useLedgerTxSubmit({ ... })` with the transaction details; drive the on-screen prompt via `useLedgerTxPrompt()`.
5. On unmount or cancel, call `handleUnmount()` / `handleResetLedgerTask()` and `resetFeedback()` to release the transport and clear UI state.

## Common pitfalls

- **Adaptor not mounted** — `useLedger` and friends throw if `LedgerAdaptor` is missing from `ConnectProvider.adaptors`.
- **Wrong `ss58Prefix`** — addresses come back unreadable. Use the same prefix you pass to `ConnectProvider.ss58`.
- **App not open on device** — surfaces as `AppNotOpen` / `AppNotOpenContinue`; prompt the user instead of retrying silently.
- **Concurrent tasks** — only one Ledger task can run at a time; gate UI by `isExecuting` to prevent overlapping `get_address` / `sign_tx` calls.
- **Touchscreen vs Nano flows** — confirmation copy differs; branch on `getLedgerDeviceFamily(getDeviceModel())`.
- **Browser support** — WebUSB/WebHID is unavailable in non-secure contexts and most mobile browsers; detect and degrade gracefully.
