---
name: polkadot-cloud-connect-vault
description: 'Use the @polkadot-cloud/connect-vault package to add Polkadot Vault (formerly Parity Signer / QR-based air-gapped) wallet support to a dapp. Use when: importing accounts from Polkadot Vault by scanning a QR code, displaying a transaction payload as multipart QR for an offline device to sign, scanning back the signed signature, building a dedot-compatible signer (VaultSigner), or deriving prompt button state for a Vault sign UI. Covers QrDisplay, QrDisplayPayload, QrScan, QrScanSignature, useVaultAccounts, VaultSigner, and deriveVaultButtonState.'
---

# @polkadot-cloud/connect-vault

Polkadot Vault (QR-based, air-gapped) wallet adaptor for `@polkadot-cloud/connect`. Provides the QR display/scan React components, an account-import hook, and a `dedot`-compatible signer that drives a UI prompt to obtain a signature from the offline device.

## When to use

Load this skill when the user asks to:
- Import accounts from Polkadot Vault / Parity Signer via QR scan.
- Render a transaction payload as a (possibly multi-frame) QR code for an offline device.
- Scan back the signature returned by the device and feed it into a dedot transaction.
- Build or wire `VaultSigner` into a dedot signing flow.
- Drive a "Sign with Vault" button's text / disabled / pulse state from prompt status.

## Install

```bash
pnpm add @polkadot-cloud/connect @polkadot-cloud/connect-vault
```

Camera access (`getUserMedia`) is required at runtime for the scan components; they only work in secure contexts (HTTPS or `localhost`).

The package exposes three entrypoints in its `exports` map: `.` (everything), `./hooks` (just `useVaultAccounts`), and `./qrcode` (just the QR components and their types). Prefer the subpaths when tree-shaking matters.

## Surface area

### Hooks

- `useVaultAccounts(network: string)` → `UseVaultAccountsReturn` — manage Vault-imported accounts (add/remove, persist) **scoped per network**.

> Unlike `connect-ledger` and `connect-proxies`, this package does **not** expose a Provider/Adaptor for `ConnectProvider.adaptors` — the components and hook can be used directly anywhere inside `ConnectProvider`.

### QR components

| Component         | Purpose                                                        | Key props (see `qrcode/types.ts`)                                |
|-------------------|----------------------------------------------------------------|------------------------------------------------------------------|
| `QrDisplay`       | Render an arbitrary `Uint8Array` as a (multi-frame) QR.        | `value`, `size?`, `timerDelay?`, `skipEncoding?`, `style?`       |
| `QrDisplayPayload`| Render a Substrate sign payload with `address`/`cmd`/`genesisHash`. | `address`, `cmd`, `genesisHash`, `payload`, `size?`, `timerDelay?` |
| `QrScan`          | Generic QR scanner; emits raw scanned strings.                 | `onScan(data)`, `onError?`, `delay?`, `onCleanup?`               |
| `QrScanSignature` | Scanner specialised for Vault signature payloads.              | `onScan({ signature })`, `onError?`, `onCleanup?`                |

`onCleanup(cb)` lets the parent register a teardown function for the camera stream — call the cb on unmount or when the user cancels.

### Signer

- `VaultSigner` — implements the dedot signer interface; forwards each signing request to a UI prompt.
- `VaultPromptHandlers` — the contract the host UI must implement:
  - `openPrompt(onComplete, toSign)` — open the QR display+scan modal.
  - `closePrompt()`.
  - `setSubmitting(boolean)`.
- Result types: `VaultSignStatus = 'complete' | 'cancelled'`, `VaultSignatureResult = HexString | null`.

### UI helper

- `deriveVaultButtonState(input: DeriveVaultButtonStateInput)` → `{ buttonText, buttonDisabled, buttonPulse }`. Centralises button copy/state logic across `submitted`, `valid`, `submitText`, `signText`, `promptStatus`, `disabled`.

## Procedure: import accounts from Vault

1. Mount `<QrScan onScan={...}>` (or a wrapper) in your import screen.
2. Parse the scanned address payload and pass it to `useVaultAccounts(network).addVaultAccount(...)` (see hook return type).
3. Imported accounts flow into the unified `useImportedAccounts()` list provided by `@polkadot-cloud/connect`.

## Procedure: sign a transaction with Vault

1. Construct the unsigned payload via dedot.
2. Provide a `VaultPromptHandlers` implementation that opens a modal containing:
   - `<QrDisplayPayload address cmd genesisHash payload />` for the device to scan.
   - `<QrScanSignature onScan={({ signature }) => onComplete('complete', signature)} />` for the response.
   - A cancel button that calls `onComplete('cancelled', null)`.
3. Instantiate `new VaultSigner(handlers)` and pass it to dedot's signer slot.
4. Drive the modal's submit button copy with `deriveVaultButtonState({ ... })`.

## Common pitfalls

- **Insecure context** — camera APIs silently fail outside HTTPS/localhost. Always check `navigator.mediaDevices` and surface an error.
- **Forgotten cleanup** — failing to call the `onCleanup` callback leaves the camera/torch on. Always wire it through component unmount.
- **Wrong `cmd` byte** — `QrDisplayPayload.cmd` selects the message type (immortal vs mortal vs raw); match it to the dedot payload you produced.
- **Genesis-hash mismatch** — Vault refuses payloads whose `genesisHash` doesn't match the imported account's network. Re-derive from the active network rather than hard-coding.
- **Frame timing** — large payloads animate across multiple QR frames; do not lower `timerDelay` so far that the offline device cannot keep up (default is tuned).
- **Single signing flow** — only one prompt at a time. Gate via `setSubmitting(true)` and refuse new requests until the previous resolves or cancels.
