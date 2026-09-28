# Hooks

Shared React hooks and safe context helpers used by the Polkadot Cloud packages.

```bash
pnpm add @polkadot-cloud/hooks react
```

## `createSafeContext`

Creates a React context and a hook that reads it. The hook throws if the context
value is `null` or `undefined`, including when its provider is missing.

```tsx
import { createSafeContext } from '@polkadot-cloud/hooks'

const [NameContext, useName] = createSafeContext<string>()

function Greeting() {
  const name = useName()
  return <p>Hello, {name}</p>
}

function App() {
  return (
    <NameContext.Provider value="Alice">
      <Greeting />
    </NameContext.Provider>
  )
}
```

## `useEffectIgnoreInitial`

Skips the first effect execution and calls the callback on subsequent dependency changes. Callback
return values are ignored, and React Strict Mode's development effect replay can invoke the callback
during mounting.

```tsx
import { useEffectIgnoreInitial } from '@polkadot-cloud/hooks'

function SearchResults({ query }: { query: string }) {
  useEffectIgnoreInitial(() => {
    console.log('Search query changed:', query)
  }, [query])

  return <p>Results for {query}</p>
}
```

## License

This package is licensed under the GPL-3.0-only.

---

Part of the [polkadot-cloud/connect](https://github.com/polkadot-cloud/connect) - Packages for connecting to Polkadot wallets.
