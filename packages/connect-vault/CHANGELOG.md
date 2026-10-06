# Changelog

## 2.0.0 — 2026-10-06

- Coordinate the workspace major release for the Ledger Device Management Kit migration. Require Connect and Connect Core 2.0.0; see [Ledger migration notes](../connect-ledger/CHANGELOG.md).

## 1.2.5 — 2026-10-05

### Fixed

- Give each QR scanner a unique React ID and preserve camera video styling with an instance-independent selector.
- Stop camera streams when startup completes after scanner cancellation or unmount. Ignore stale results, use current callbacks without reconnecting, and contain asynchronous stop failures.
- Keep animated QR timers inside their owning effect so Strict Mode cannot duplicate scheduling. Reset frame order and delay when the payload or delay changes, and clear timers on cleanup.
- Generate QR frames synchronously and remove the unused xxhash-wasm dependency and internal frame/timer state types. Multipart framing and signing codecs are unchanged.

### Verification — 2026-10-05

- Node 24.10.0 and pinned pnpm 10.29.3: all 276 workspace tests pass with `NODE_OPTIONS=--no-experimental-webstorage pnpm test`. A plain `pnpm test` hits seven existing extension lifecycle failures because Node's native localStorage shadows jsdom's implementation.
- Vault coverage includes eight new React lifecycle tests for Strict Mode, ordered frames, rerenders, payload/delay changes, delayed camera permission/startup, simultaneous scanners, callback updates, repeated cleanup and permission failures. All 14 Vault tests pass.
- `pnpm check`, the license-header checker, `pnpm compile`, `node scripts/publish-packages.js --check` and `git diff --check` pass. All nine publishable package artifacts validate.
- The actual updated QR display renders in native Chrome using a temporary public fixture. Further native camera-preview interaction was blocked by browser-controller input errors (`noWindowsAvailable` and stale-state rejection); camera cleanup coverage uses simulations and no real camera was requested.
- Cloud Signer's existing `pnpm verify` passes. Its pinned 1.2.0 dependency and temporary patch remain until a fixed connect-vault release is published and adopted. Version 1.2.5 is prepared locally; nothing has been published.
