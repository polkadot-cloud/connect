# Util Dedot

Dedot utilities for formatting and validating Substrate addresses.

```bash
pnpm add @polkadot-cloud/util-dedot dedot
```

## Usage

```ts
import { formatAccountSs58, isValidAddress } from '@polkadot-cloud/util-dedot'

const publicKey =
  '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d'

const address = formatAccountSs58(publicKey, 0)

if (address !== null) {
  console.log(isValidAddress(address)) // true
}
```

### `formatAccountSs58(address: string, ss58: number): string | null`

Formats an address or hex public key with the supplied SS58 prefix. Returns `null`
if Dedot cannot encode the input.

### `isValidAddress(address: string): boolean`

Returns whether Dedot can decode the address or hex public key. Returns `false`
when decoding fails.

## License

GPL-3.0-only. Migrated from the w3ux util-dedot library with its original attribution.
