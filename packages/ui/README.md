# UI

React components for Polkadot identicons and animated numbers.

```sh
pnpm add @polkadot-cloud/ui react dedot
```

Requires React 19.1 or later in the React 19 series and dedot 1.x.
Import each component from its own subpath.

## Polkicon

```tsx
import { Polkicon, type PolkiconProps } from '@polkadot-cloud/ui/polkicon'

export function AccountIcon({ address }: Pick<PolkiconProps, 'address'>) {
  return <Polkicon address={address} fontSize="2rem" />
}
```

`address` is required. Optional props are `background`, `inactive`, `fontSize`,
and `transform` (`grow-1` through `grow-10` or `shrink-1` through `shrink-10`).
The background defaults to `var(--bg-body)`; invalid or inactive addresses use
`var(--bg-invert)` for the inner circles. Define these CSS variables in your app.

## Odometer

```tsx
import { Odometer, type OdometerProps } from '@polkadot-cloud/ui/odometer'
import '@polkadot-cloud/ui/odometer/index.css'

export function Balance({ value }: Pick<OdometerProps, 'value'>) {
  return <Odometer value={value} zeroDecimals={2} />
}
```

Import the stylesheet once in your app. `Odometer` is also available as the
default export of `@polkadot-cloud/ui/odometer`.

`value` accepts a number or string. Use strings to preserve precision for large
balances. Optional props are `wholeColor`, `decimalColor`, `spaceBefore`,
`spaceAfter`, `zeroDecimals`, and `stripTrailingZeroes`.
The default colors use `var(--text-primary)` and `var(--text-secondary)`.
Define these CSS variables or pass explicit colors.

## License

This package is licensed under the GPL-3.0-only.

---

Part of the [polkadot-cloud/connect](https://github.com/polkadot-cloud/connect) - Packages for connecting to Polkadot wallets.
