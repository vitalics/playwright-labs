# @playwright-labs/selectors-react

## 2.1.0

### Minor Changes

- 5b2e8a6: `ReactRealizer` — realize any locator into a `react=ComponentName` selector via `@playwright-labs/locators-extra`.

  Importing the package registers the `"react"` realizer (side effect) and augments `KnownSelectorKinds`, so `selectorRealization(locator, "react")` gets autocomplete and works out of the box. The realized selector identifies the component type, not the instance — narrow with props or `.nth()`.

### Patch Changes

- Updated dependencies [5b2e8a6]
  - @playwright-labs/locators-extra@1.0.0

## 2.0.0

### Major Changes

- 8bfcdbc: Initial implementation of React selector engine for Playwright.

  Adds `react=ComponentName[...]` selector syntax with support for `props`, `state`, and `context` attribute sources; `$r` fixture returning `ReactHtmlElement` — a `Locator` extended with `props()`, `prop()`, `state()`, `context()`, and `componentName()` introspection methods; and custom matchers `toBeReactComponent`, `toHaveReactProp`, `toBeReactProp`, `toHaveReactState`, `toBeReactState`, `toHaveReactContext`, `toMatchReactSnapshot`.

  Includes a fix for React's double-buffering: after a state update commit `__reactFiber$` may point to the stale alternate tree — the engine resolves the current fiber by walking to `FiberRootNode.current`. Compatible with React 18 StrictMode.
