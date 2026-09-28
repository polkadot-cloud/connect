# Utils

Reusable utilities for strings, collections, balances, browser APIs, and React refs.

```sh
pnpm add @polkadot-cloud/utils
```

All utilities are exported from the package root. ESM, CommonJS, and TypeScript
declarations are included.

```ts
import {
  camelize,
  minDecimalPlaces,
  planckToUnit,
  u8aConcat,
  unitToPlanck,
} from '@polkadot-cloud/utils'

camelize('hello world') // 'helloWorld'
minDecimalPlaces('1,234.5', 3) // '1,234.500'
planckToUnit(1500000000000n, 12) // '1.500000000000'
unitToPlanck('1.5', 12) // 1500000000000n
u8aConcat(new Uint8Array([1, 2]), new Uint8Array([3])) // Uint8Array [1, 2, 3]
```

## Exports

| Group | Utilities |
| --- | --- |
| Strings and formatting | `minDecimalPlaces`, `camelize`, `ellipsisFn`, `pageFromUri`, `rmCommas`, `rmDecimals`, `appendOrEmpty`, `appendOr`, `removeHexPrefix`, `capitalizeFirstLetter`, `snakeToCamel`, `unescape` |
| Collections and objects | `shuffle`, `eqSet`, `isSuperset`, `sortWithNull`, `addedTo`, `removedFrom`, `matchedProperties`, `mergeDeep` |
| Numbers and balances | `maxBigInt`, `minBigInt`, `planckToUnit`, `unitToPlanck` |
| Bytes | `u8aConcat` |
| Promises | `withTimeout`, `withTimeoutThrow`, `makeCancelable` |
| Browser helpers | `remToUnit`, `localStorageOrDefault`, `extractUrlValue`, `varToUrlHash`, `removeVarFromUrlHash`, `applyWidthAsPadding`, `inChrome`, `isValidHttpUrl` |
| React refs | `mergeRefs`, `setStateWithRef` |
| Miscellaneous | `unimplemented` |

Use strings or bigints for balances that exceed JavaScript's safe integer range.
Helpers that access the DOM, storage, or the current location require a browser
when called. `extractUrlValue` also accepts an explicit URL for use outside a
browser; `isValidHttpUrl` only needs the standard `URL` API.

React is used only for ref types; the JavaScript build has no React runtime
dependency. React type definitions (`@types/react`) are installed with the package for TypeScript consumers.

## Promise helpers

`withTimeout` resolves to `undefined` on timeout; `withTimeoutThrow` rejects with
an `Error('Function timeout')`. Both clear their timers when the input promise
settles and call `onTimeout` only if the timeout expires. A throwing `onTimeout`
callback rejects the returned promise. Neither helper aborts the underlying work.

`makeCancelable` preserves the input promise's result type. Calling `cancel()`
causes the wrapper to reject with `Error('Cancelled')` when the underlying promise
settles; it does not abort that operation.

## Numeric and object helpers

Balance conversion preserves negative signs and truncates excess fractional digits
toward zero. `minDecimalPlaces` preserves negative fractional values and omits the
decimal point when no decimal places are present or required.

`mergeDeep` mutates and returns its target, merges only own enumerable source
properties, and ignores `__proto__`, `constructor`, and `prototype` keys.
