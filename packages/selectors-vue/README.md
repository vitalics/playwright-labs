# @playwright-labs/selectors-vue

A Playwright custom selector engine for **Vue 3** components.

Query, inspect and assert Vue components directly in your e2e tests — by component name, props, Composition API setup state, or Options API data — without relying on fragile CSS selectors or test IDs.

---

## Why Vue selectors?

CSS selectors break when markup changes. Component selectors describe *intent*:

```ts
// Fragile — tied to the current DOM structure
await page.locator('button.btn-danger[disabled]').click();

// Resilient — describes what the component IS
await page.locator('vue=Button[variant="danger"][disabled=true]').click();
```

---

## Installation

```bash
npm install --save-dev @playwright-labs/selectors-vue @playwright/test
```

### Register the selector engine

**Option A — global setup** (registers once for the whole test suite):

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({ /* … */ });

// tests/setup.ts
import { selectors } from '@playwright/test';
import { VueEngine } from '@playwright-labs/selectors-vue';
selectors.register('vue', VueEngine);
```

**Option B — per-test fixture** (recommended; auto-registers on first use):

```ts
// Import the extended `test` from the package instead of @playwright/test
import { test } from '@playwright-labs/selectors-vue';
```

---

## Selector syntax

```
vue=ComponentName
vue=ComponentName[propName="value"]
vue=ComponentName[props.propName="value"]   // explicit props prefix
vue=ComponentName[setup.stateName=0]        // Composition API state
vue=ComponentName[data.stateName=0]         // Options API data
```

### Attribute sources

| Prefix | Data source | Example |
|--------|-------------|---------|
| *(none)* / `props.` | Component props | `vue=Button[label="OK"]` |
| `setup.` | `setup()` / `<script setup>` state (refs unwrapped) | `vue=Counter[setup.count=0]` |
| `data.` | Options API `data()` | `vue=OptionsCounter[data.count=5]` |

### Supported operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Exact match | `[label="Submit"]` |
| `*=` | Contains | `[variant*="ary"]` |
| `^=` | Starts with | `[variant^="pri"]` |
| `$=` | Ends with | `[variant$="ger"]` |
| `\|=` | Exact or hyphen-prefixed | `[lang\|="en"]` |
| `~=` | Word in space-separated list | `[tags~="featured"]` |
| *(none)* | Truthy check | `[disabled]` |
| `=/regex/` | Regular expression | `[label=/^Submit/i]` |

Append `i` for case-insensitive comparison: `[label="submit" i]`.

### Nested property paths

Use dot notation to access nested objects:

```ts
page.locator('vue=UserCard[user.name="Alice"]')
page.locator('vue=Counter[setup.user.firstName="Alice"]')
```

---

## `$v` fixture

The `$v` fixture returns a `VueHtmlElement` — a Playwright `Locator` extended with Vue-specific introspection methods.

```ts
import { test } from '@playwright-labs/selectors-vue';

test('inspect a Counter', async ({ $v }) => {
  const counter = $v('vue=Counter');
  await counter.click();                        // standard Locator method
  const state = await counter.setup<{ count: number }>();
  console.log(state.count);                    // 1
});
```

### VueHtmlElement API

#### Locator narrowing

```ts
$v('vue=Button').first()       // first matched element
$v('vue=Button').last()        // last matched element
$v('vue=Button').nth(2)        // element at index 2 (0-based)
```

#### Component introspection

```ts
// Component display name
const name = await $v('vue=Button').first().componentName();
// → "Button"

// All props
const props = await $v('vue=Button').first().props<{ label: string }>();
// → { label: "Submit", variant: "primary", disabled: false }

// Single prop
const label = await $v('vue=Button').first().prop('label');
// → "Submit"

// Composition API setup state (refs auto-unwrapped)
const state = await $v('vue=Counter').first().setup<{ count: number }>();
// → { count: 0 }

// Options API data
const data = await $v('vue=OptionsCounter').data<{ count: number }>();
// → { count: 0 }
```

---

## Custom matchers

Import the extended `expect` to access Vue-specific matchers:

```ts
import { expect } from '@playwright-labs/selectors-vue';
```

### `toBeVueComponent()`

Asserts the element is associated with a Vue component.

```ts
await expect(page.locator('vue=Button').first()).toBeVueComponent();
await expect(page.locator('#static-div')).not.toBeVueComponent();
```

### `toHaveVueProp(name, value?)`

Asserts the component has a prop. Optionally asserts its value.

```ts
await expect(page.locator('vue=Button').first()).toHaveVueProp('label');
await expect(page.locator('vue=Button').first()).toHaveVueProp('label', 'Submit');
```

### `toBeVueProp(name, value)`

Asserts the prop equals the expected value (strict deep equality).

```ts
await expect(page.locator('vue=Button').last()).toBeVueProp('disabled', true);
await expect(page.locator('vue=UserCard').first()).toBeVueProp('user', {
  name: 'Alice',
  role: 'admin',
});
```

### `toHaveVueSetup(path, value?)`

Asserts Composition API setup state at a dot-notated path exists. Optionally asserts its value.

```ts
await expect(page.locator('vue=Counter').first()).toHaveVueSetup('count');
await expect(page.locator('vue=Counter').first()).toHaveVueSetup('count', 0);
```

### `toBeVueSetup(path, value)`

Asserts Composition API setup state equals the expected value.

```ts
await counter.locator('button').last().click();
await expect(page.locator('vue=Counter').first()).toBeVueSetup('count', 1);
```

### `toHaveVueData(path, value?)`

Asserts Options API data at path exists. Optionally asserts its value.

```ts
await expect(page.locator('vue=OptionsCounter')).toHaveVueData('count', 0);
```

### `toBeVueData(path, value)`

Asserts Options API data equals the expected value.

```ts
await expect(page.locator('vue=OptionsCounter')).toBeVueData('count', 5);
```

### `toMatchVueSnapshot(html)`

Asserts the component's DOM matches a normalised HTML snapshot.

```ts
const html = await page.locator('vue=UserCard').first().evaluate(el => el.outerHTML);
await expect(page.locator('vue=UserCard').first()).toMatchVueSnapshot(html);
```

---

## How it works

Vue 3 exposes the application instance on the mount element via `__vue_app__`. The selector engine:

1. Walks up the DOM to find `__vue_app__`.
2. Starting from `app._instance` (the root component), recursively walks `instance.subTree` — the virtual DOM tree rendered by each component.
3. For every component vnode (`vnode.component`), extracts name, props, setup state and data.
4. Filters components by the parsed selector.

For setup state, Vue `ref` objects are automatically unwrapped (`.value` is returned). Vue-internal properties (prefixed `__v_` or `__VUE`) are excluded.

---

## Limitations

- **Development builds required** — Vue strips internal properties (e.g. `_instance`, `subTree`) in production builds. The selector engine only works with `vue` or `vue.esm-bundler` dev-mode builds.
- **Composition API `inject`** — values injected via `inject()` inside `<script setup>` are visible in setup state (`setup.themeName`). Options API `inject` is not separately exposed.
- **HOC limitation** — when a Higher Order Component renders only child components (no own DOM nodes), both the wrapper and the inner component map to the same first DOM element. The outermost component instance is returned.
- **Vue 2 not supported** — only Vue 3 is supported.

---

## Vue version support

Tested with Vue **3.4+**. Requires Vue 3's internal component tree (`app._instance`, `subTree`, `setupState`, `data`) which has been stable since Vue 3.0.
