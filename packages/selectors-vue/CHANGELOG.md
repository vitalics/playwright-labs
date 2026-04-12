# @playwright-labs/selectors-vue

## 2.0.0

### Major Changes

- 8bfcdbc: Initial implementation of Vue 3 selector engine for Playwright.

  Adds `vue=ComponentName[...]` selector syntax with support for `props` (default), `setup` (Composition API, refs auto-unwrapped), and `data` (Options API) attribute sources; `$v` fixture returning `VueHtmlElement` — a `Locator` extended with `props()`, `prop()`, `setup()`, `data()`, and `componentName()` introspection methods; and custom matchers `toBeVueComponent`, `toHaveVueProp`, `toBeVueProp`, `toHaveVueSetup`, `toBeVueSetup`, `toHaveVueData`, `toBeVueData`, `toMatchVueSnapshot`.

  The engine resolves components by walking `app._instance.subTree` from the Vue app root (`__vue_app__`). Supports both `<script setup>` components and Options API components. Injected values available via `inject()` inside `<script setup>` are accessible through the `setup` source.
