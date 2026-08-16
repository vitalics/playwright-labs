---
"@playwright-labs/selectors-react": minor
---

`ReactRealizer` — realize any locator into a `react=ComponentName` selector via `@playwright-labs/locators-extra`.

Importing the package registers the `"react"` realizer (side effect) and augments `KnownSelectorKinds`, so `selectorRealization(locator, "react")` gets autocomplete and works out of the box. The realized selector identifies the component type, not the instance — narrow with props or `.nth()`.
