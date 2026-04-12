---
"@playwright-labs/selectors-react": major
---

Initial implementation of React selector engine for Playwright.

Adds `react=ComponentName[...]` selector syntax with support for `props`, `state`, and `context` attribute sources; `$r` fixture returning `ReactHtmlElement` — a `Locator` extended with `props()`, `prop()`, `state()`, `context()`, and `componentName()` introspection methods; and custom matchers `toBeReactComponent`, `toHaveReactProp`, `toBeReactProp`, `toHaveReactState`, `toBeReactState`, `toHaveReactContext`, `toMatchReactSnapshot`.

Includes a fix for React's double-buffering: after a state update commit `__reactFiber$` may point to the stale alternate tree — the engine resolves the current fiber by walking to `FiberRootNode.current`. Compatible with React 18 StrictMode.
