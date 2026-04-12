# Playwright React Selectors

A custom [Playwright selector engine](https://playwright.dev/docs/extensibility#custom-selector-engines) that queries React components by their **props**, **state**, and **context** — not by DOM structure. Ships React-aware `expect` matchers and a `$r` fixture for direct component introspection.

```typescript
// Find a button component whose label prop is "Submit"
page.locator('react=Button[props.label="Submit"]')

// Find a counter whose first useState hook value equals 5
page.locator('react=Counter[state.0=5]')

// Read props and state directly from the component
const label = await $r('react=Button').prop('label');
const count = await $r('react=Counter').first().state<{ "0": number }>();
```

## Why selectors-react over traditional selectors?

### 1. Select by intent, not by DOM accidents

CSS selectors couple your tests to implementation details — class names, element nesting, `data-testid` attributes — all of which change for reasons unrelated to the behaviour you are actually testing.

```typescript
// Traditional: breaks when the designer renames btn-primary → btn-submit
page.locator('.btn-primary[data-disabled="false"]')

// React: describes what the component IS, not how it looks
page.locator('react=SubmitButton[props.disabled=false]')
```

The component name and its prop contract are part of the public API of the component. They change together with the feature, not with a CSS refactor.

### 2. Query internal state — no DOM mapping required

Developers often add `data-*` attributes or CSS classes purely to make tests selectable. `selectors-react` removes this entirely by reaching into the component's own data:

```typescript
// Traditional: requires data-count attribute on the DOM element
page.locator('[data-count="5"]')

// React: reads the actual useState value — no extra attributes needed
page.locator('react=Counter[state.0=5]')
```

### 3. Resilience to DOM restructuring

When a component's internal markup changes — an extra wrapper `<div>`, a migration from `<button>` to a custom component — React selectors remain stable because they target the component boundary, not the rendered output.

### 4. Direct introspection without page.evaluate

Without this library, reading component internals requires manual `page.evaluate` calls that are verbose, untyped, and fragile:

```typescript
// Traditional: manual fiber traversal, no types
const label = await page.evaluate((el) => {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
  return el[key]?.return?.memoizedProps?.label;
}, await page.locator('button').elementHandle());

// React: typed, readable, no boilerplate
const label = await $r('react=Button').prop<string>('label');
```

### 5. Combine with standard Playwright API

`ReactHtmlElement` extends the standard Playwright `Locator`. Every existing Playwright method — `click`, `fill`, `waitFor`, `screenshot`, assertions — works out of the box:

```typescript
const btn = $r('react=Button[props.disabled=false]');
await btn.click();                          // ← standard Playwright Locator
await expect(btn).toBeVisible();            // ← standard Playwright expect
const label = await btn.prop('label');      // ← React-specific
```

---

## Installation

```bash
npm install -D @playwright-labs/selectors-react
# or
pnpm add -D @playwright-labs/selectors-react
```

## Requirements

| Dependency | Version |
|---|---|
| `@playwright/test` | `^1.57.0` |
| React | `16+` |

> **Important:** The selector engine reads React's internal fiber tree. Fiber metadata is available in **development builds** and in production builds where the bundler has not stripped it. See [Limitations — Production builds](#production-builds) for details.

---

## Setup

### `$r` fixture (recommended)

Import the bundled `test` export to get `$r` — a fixture that wraps locators in [`ReactHtmlElement`](#reacthtmlelement) and auto-registers the selector engine:

```typescript
// my-test.spec.ts
import { test } from '@playwright-labs/selectors-react';
import { expect } from '@playwright/test';

test('reads component props', async ({ $r }) => {
  const btn = $r('react=Button[props.label="Submit"]');
  await btn.click();
  expect(await btn.prop('label')).toBe('Submit');
});
```

### Selector engine only

Register the engine once, before any browser context is created:

```typescript
// tests/setup.ts
import { selectors } from '@playwright/test';
import { ReactEngine } from '@playwright-labs/selectors-react';

selectors.register('react', ReactEngine);
```

```typescript
// playwright.config.ts
import './tests/setup'; // executed once per worker
```

### Custom matchers

```typescript
import { expect } from '@playwright-labs/selectors-react';

await expect(page.locator('button')).toBeReactComponent();
await expect(page.locator('button')).toBeReactProp('disabled', false);
await expect(page.locator('.counter')).toBeReactState('0', 5);
```

---

## Selector syntax

```
react=ComponentName
react=ComponentName[source.path operator value]
react=ComponentName[source.path]   ← truthy check
```

| Source | Data | Example |
|---|---|---|
| `props` | `fiber.memoizedProps` (default) | `[props.disabled=false]` |
| `state` | class `this.state` or hooks by index | `[state.0=5]`, `[state.count=0]` |
| `context` | class `this.context` | `[context.theme="dark"]` |

When no source prefix is given, `props` is assumed: `[label="Submit"]` is equivalent to `[props.label="Submit"]`.

### Operators

| Operator | Meaning |
|---|---|
| `=` | Strict equality (or RegExp match) |
| `*=` | String contains |
| `^=` | String starts with |
| `$=` | String ends with |
| `~=` | Word in space-separated list |
| `\|=` | Equal or hyphen-prefixed |
| _(none)_ | Truthy |

```typescript
// RegExp match
page.locator('react=UserCard[props.email=/^admin@/]')

// Case-insensitive string match
page.locator('react=Badge[props.label="error" i]')

// Nested prop path
page.locator('react=UserCard[props.user.role="admin"]')

// Multiple attributes (AND logic)
page.locator('react=Button[props.variant="primary"][props.disabled=false]')
```

---

## `ReactHtmlElement`

`ReactHtmlElement` is a `Locator` subtype — all standard Playwright methods are available alongside the React-specific ones.

### Locator narrowing

```typescript
$r('react=Item').nth(2)
$r('react=Item').first()
$r('react=Item').last()
```

### Component introspection

```typescript
// Check if a React component fiber is present
await $r('react=Button').isComponent()          // boolean

// Get the component's display name
await $r('react=Button').componentName()        // "Button"
```

### Props

```typescript
// All props
const props = await $r('react=Button').props<{ label: string; disabled: boolean }>();

// Single prop
const label = await $r('react=Button').prop<string>('label');
```

### State

```typescript
// Class component: this.state = { count: 3 }
const state = await $r('react=Counter').state<{ count: number }>();
state.count; // 3

// Function component: const [count] = useState(0); const [name] = useState('');
const state = await $r('react=Counter').state<{ "0": number; "1": string }>();
state["0"]; // 0
state["1"]; // ''
```

### Context (class components only)

```typescript
const ctx = await $r('react=ThemedButton').context<{ theme: string }>();
ctx.theme; // "dark"
```

---

## Matchers

```typescript
import { expect } from '@playwright-labs/selectors-react';

// Is a React component
await expect(locator).toBeReactComponent()

// Has prop (with optional value assertion)
await expect(locator).toHaveReactProp('disabled')
await expect(locator).toHaveReactProp('label', 'Submit')

// Prop equals value (deep equality)
await expect(locator).toBeReactProp('label', 'Submit')

// State at path exists (with optional value assertion)
await expect(locator).toHaveReactState('0')        // function component
await expect(locator).toHaveReactState('count', 5) // class component

// State at path equals value
await expect(locator).toBeReactState('0', 5)

// Class component context key exists
await expect(locator).toHaveReactContext('theme')
await expect(locator).toHaveReactContext('theme', 'dark')

// DOM snapshot comparison
await expect(locator).toMatchReactSnapshot('<button class="btn">Submit</button>')
```

---

## Notes

### React version support

The selector engine reads `__reactFiber$<hash>` (React 16–18) and `_reactInternals` (older React) properties attached by React to DOM nodes. Both naming schemes are detected automatically.

### Function component state

React does not preserve hook variable names at runtime. State from function components is exposed as a numerically-indexed object based on hook declaration order:

```typescript
function Counter() {
  const [count, setCount] = useState(0);   // index "0"
  const [name, setName]   = useState('');  // index "1"
}

// Access:
page.locator('react=Counter[state.0=0]')
const state = await $r('react=Counter').state();
state["0"]; // 0
state["1"]; // ''
```

Only `useState` and `useReducer` hooks are counted (hooks with a `queue`). Effect, ref, memo, and context hooks are skipped.

### HOC limitation

When a Higher Order Component renders only child components without adding any own DOM nodes, the selector engine associates it with the first DOM element produced by its inner tree. In that case `props()` / `state()` / `context()` will resolve the **inner** component's fiber, not the HOC's. The selector engine itself (`react=OuterHOC[props.x=1]`) is unaffected — it correctly matches against the HOC's own props.

---

## Limitations

### Production builds

Bundlers such as webpack and Vite strip React's internal fiber properties from DOM nodes in production mode (`NODE_ENV=production`). The selector engine will find no components and return empty results. To use `selectors-react` in a CI pipeline, ensure the application is built in **development mode**, or configure your bundler to preserve fiber metadata specifically for E2E test builds.

### Function component context

Context consumed via `useContext` is stored inside the hooks linked list without a stable identifier. There is no reliable way to retrieve it from the fiber tree without React DevTools. `context()` and `toHaveReactContext` therefore only work for **class components** that receive context via `static contextType` or `contextTypes`.

### React.memo and React.forwardRef

Components wrapped with `React.memo` or `React.forwardRef` are matched by the display name of the **wrapped** component (e.g. `React.memo(Button)` is matched as `react=Button`). If a `displayName` is set explicitly on the wrapper it takes precedence.

### Concurrent features (React 18+)

Deferred rendering via `useDeferredValue`, `useTransition`, or React Server Components may produce fiber trees that differ from what is currently visible on screen. The selector engine reads the committed fiber tree, so it reflects the **painted** state, not any in-progress transitions.
