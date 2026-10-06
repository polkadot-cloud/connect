# Changelog

## Unreleased

* Replace LedgerJS WebHID and Zondax with Ledger Device Management Kit 1.10.0, WebHID Transport Kit 1.2.4 and Polkadot Device Signer Kit 0.2.0. Preserve account derivation, network prefixes, confirmed address reads, exact Dedot payload/proof bytes and typed ed25519 signatures.
* Add cancellable sessions, explicit transport disposal and awaited HID close, late-connection cleanup and ownership-scoped unmount. Suppress cancelled provider responses and stop device actions when the provider task is reset. Verify account identity before signing and release connections after every payload-preparation outcome.
* Bundle browser SDK code for ESM/CJS exports. Require Dedot 1.4 and retain its V16 compatibility patches for local consumer integration.

### Verification — 2026-10-06

* With Node 24: `pnpm check`, all 296 tests, all workspace builds and all nine release-package compilations pass. Regressions cover raw payload/proof binding, prefix-normalized identity checks, preparation errors and cancelled provider results under Strict Mode. Cloud Signer's compiled ESM/CJS tests exercise the actual SDK and WebHID framing, cancellation, unplugging, timeout, late chooser/open cleanup, failed-open cleanup, signature validation, disposal before returning a result and stale owners. Native Chrome verifies Cloud Signer import/signing under its extension CSP and Cloud Apps imports at indices 0 and 1 through local links. Physical-device tests remain pending.
