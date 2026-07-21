---
title: Query Components with Framework-Aware Selectors (angular=, react=, vue=)
impact: LOW-MEDIUM
impactDescription: decouples component tests from DOM structure — CSS refactors and wrapper changes stop breaking selectors
tags: selectors, angular, react, vue, component, locators
---

## Query Components with Framework-Aware Selectors (angular=, react=, vue=)

**Impact: LOW-MEDIUM (decouples component tests from DOM structure — CSS refactors and wrapper changes stop breaking selectors)**

CSS and XPath selectors that drill into a component's rendered markup couple your tests to implementation details: class names, wrapper divs, attribute placement. All of these change for reasons unrelated to the behavior under test. The `@playwright-labs/selectors-angular`, `@playwright-labs/selectors-react`, and `@playwright-labs/selectors-vue` packages register custom Playwright selector engines (`angular=`, `react=`, `vue=`) that query components by their public contract — tag/name, props/inputs, state — instead of their DOM output. Each package also ships a fixture (`$ng`, `$r`, `$v`) for typed runtime inspection of component internals and a set of framework-aware `expect` matchers.

## When to Use

- **Use framework-aware selectors when**: Tests target Angular, React, or Vue components and currently break on CSS renames, added wrapper elements, or `data-testid` churn
- **Use the `$ng` / `$r` / `$v` fixtures when**: A test needs to read component internals at runtime — Angular inputs/outputs/signals, React props/state/context, Vue props/setup state/Options API data — without writing `page.evaluate` boilerplate
- **Consider alternatives when**: The app is server-rendered without a client framework, the test runs against a production build (all three engines require development builds), or the target is plain static markup — use role-based locators there
- **Required for**: Component-heavy suites where selectors should describe what the component *is*, not how it happens to render today

## Guidelines

### Do

- Register the engine once per worker — or import the bundled `test` from the package and let the fixture auto-register it
- Query by the component's public contract: tag name and `@Input()` in Angular, component name and props in React, component name and props in Vue
- Use nested property paths (`[user.role="admin"]`) instead of flattening data into `data-*` attributes just to make it selectable
- Import the extended `expect` from the package to get framework-aware matchers with descriptive failure messages
- Narrow with `.first()` / `.last()` / `.nth(n)` exactly as with standard locators — the fixture wrappers mirror the Playwright API
- Keep using standard Playwright locators (`getByRole`, `getByText`) for user-visible behavior; use framework selectors where the component boundary is the thing under test

### Don't

- Don't write XPath into component internals (`.//div[contains(@class,'btn')]`) — it breaks on every styling pass
- Don't add `data-testid` or `data-*` attributes solely to expose state the framework already holds — query the component instead
- Don't run these engines against production builds — Angular strips `window.ng`, bundlers strip React fiber metadata, Vue strips `_instance`/`subTree`; selectors return empty results
- Don't assert a plain `@Output() EventEmitter` value with `toBeNgOutput` — it only reads `model()` signals; use `toHaveNgOutput` for existence
- Don't reference hook state by variable name in React function components — names are not preserved at runtime; use the numeric hook index (`state.0`)

### Tool Usage Patterns

- **Install**: `npm install -D @playwright-labs/selectors-angular` / `selectors-react` / `selectors-vue` (requires `@playwright/test ^1.57.0`; Angular 9+, React 16+, Vue 3)
- **Engines**: `AngularEngine`, `ReactEngine`, `VueEngine` — pass to `selectors.register('angular' | 'react' | 'vue', Engine)`
- **Fixtures**: `import { test } from '@playwright-labs/selectors-*'` gives `$ng` / `$r` / `$v` and auto-registers the engine per worker
- **Matchers (Angular)**: `toBeNgComponent()`, `toHaveNgInput(name)`, `toHaveNgOutput(name)`, `toBeNgInput(name, value)`, `toBeNgOutput(name, value)`, `toHaveNgSignal(name)`, `toBeNgSignal(name, value)`, `toBeNgRouterOutlet()`, `toBeNgIf(condition?)`, `toBeNgFor()`
- **Matchers (React)**: `toBeReactComponent()`, `toHaveReactProp(name, value?)`, `toBeReactProp(name, value)`, `toHaveReactState(path, value?)`, `toBeReactState(path, value)`, `toHaveReactContext(name, value?)`, `toMatchReactSnapshot(html)`
- **Matchers (Vue)**: `toBeVueComponent()`, `toHaveVueProp(name, value?)`, `toBeVueProp(name, value)`, `toHaveVueSetup(path, value?)`, `toBeVueSetup(path, value)`, `toHaveVueData(path, value?)`, `toBeVueData(path, value)`, `toMatchVueSnapshot(html)`

## Selector Syntax by Framework

All three engines share the CSS attribute-selector convention: `=` exact, `*=` contains, `^=` starts with, `$=` ends with, `|=` exact-or-hyphen-prefixed, `~=` word in list, `/regex/flags`, `i` flag for case-insensitive, bare `[prop]` for truthy, chained `[a][b]` blocks for logical AND.

```typescript
// Angular — component tag is the lowercase tag from @Component({ selector: 'app-button' })
// Matches @Input() values and any public property; nested paths traverse the instance
page.locator('angular=app-button[label="Submit"]');
page.locator('angular=app-user-card[user.role="admin"]');
page.locator('angular=app-button[type="danger"][disabled]');

// React — component display name; sources: props (default), state, context
page.locator('react=Button[props.label="Submit"]');
page.locator('react=Button[label="Submit"]');          // same — props is the default source
page.locator('react=Counter[state.0=5]');              // first useState hook
page.locator('react=ThemedButton[context.theme="dark"]'); // class component context

// Vue — component name; sources: props (default), setup (Composition API), data (Options API)
page.locator('vue=Button[variant="danger"][disabled=true]');
page.locator('vue=Counter[setup.count=0]');            // refs auto-unwrapped
page.locator('vue=OptionsCounter[data.count=5]');
```

## Edge Cases and Constraints

### Limitations

- **Development builds only.** Angular requires the `window.ng` DevTools API (present in `ng serve` / dev builds, or re-attach via `enableDebugTools` in `main.ts`). React requires fiber metadata (`__reactFiber$<hash>` / `_reactInternals`) that webpack/Vite strip under `NODE_ENV=production`. Vue requires `__vue_app__`, `app._instance`, and `subTree`, which production builds remove. Build your e2e target in development mode.
- **Vue 3 only** for `selectors-vue` (tested on 3.4+); Vue 2 is not supported.
- React `context()` and `toHaveReactContext` work only for **class components** (`static contextType` / `contextTypes`) — `useContext` values have no stable identifier in the fiber tree.
- React function-component state is exposed as a numerically indexed object by hook declaration order; only `useState` and `useReducer` hooks are counted (effect, ref, memo, and context hooks are skipped).

### Edge Cases

1. **HOCs without own DOM nodes (React/Vue)**: a Higher-Order Component that renders only children maps to the first DOM element of its inner tree, so `$r(...).props()` may resolve the inner component's fiber. The `react=OuterHOC[props.x=1]` selector itself is unaffected — it matches against the HOC's own props.
2. **`React.memo` / `forwardRef`**: matched by the wrapped component's display name (`React.memo(Button)` is `react=Button`); an explicit `displayName` on the wrapper takes precedence.
3. **Angular model vs. emitter outputs**: `toBeNgOutput(name, value)` reads the current value of a `model()` signal only. On a plain `EventEmitter` output it fails with a descriptive error pointing to `toHaveNgOutput`.
4. **Structural directives (Angular)**: `NgIf`/`NgForOf` live on the `<ng-template>` anchor, not on rendered content — target the template element with `toBeNgIf()` / `toBeNgFor()`, not the projected `li`.
5. **Vue Composition API `inject()`**: values injected inside `<script setup>` are visible as setup state (`setup.themeName`); Options API `inject` is not separately exposed.
6. **React 18 concurrent features**: the engine reads the committed fiber tree — it reflects painted state, not in-progress `useTransition`/`useDeferredValue` renders.

### What Breaks If Ignored

- **Against production builds**: every `angular=`/`react=`/`vue=` query returns zero elements — tests fail with opaque "locator resolved to 0 elements" timeouts instead of a clear configuration error
- **With CSS-into-internals selectors**: a designer renaming `btn-primary` or a developer adding a wrapper `<div>` breaks tests that have nothing to do with the changed styling
- **With `data-testid` inflation**: components accumulate test-only attributes that ship to users and drift out of sync with the real state they mirror

**Incorrect (CSS/XPath through component internals + manual fiber digging):**

```typescript
import { test, expect } from '@playwright/test';

test('submit button state', async ({ page }) => {
  // ❌ Breaks when btn-primary is renamed, a wrapper is added, or the
  //    <button> migrates into a child component
  await page.locator('.user-form > div.actions button.btn-primary:not([disabled])').click();

  // ❌ XPath into rendered markup — no connection to the component contract
  await page.locator('//app-user-card//span[contains(@class,"role") and text()="admin"]').click();

  // ❌ Manual fiber traversal: verbose, untyped, hash-suffixed key changes per build
  const label = await page.evaluate((el) => {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    return (el as any)[key]?.return?.memoizedProps?.label;
  }, await page.locator('button').elementHandle());

  // ❌ State mirrored into the DOM purely so tests can see it
  await expect(page.locator('[data-count="5"]')).toBeVisible();
});
```

**Why this fails:**
- Class names and nesting are implementation details — they change on styling refactors that do not touch behavior, producing red tests with zero signal
- `page.evaluate` fiber digging is untyped and depends on React's internal key naming, which is not a public API guarantee
- `data-count`-style attributes duplicate component state into the DOM; when the two drift apart the test asserts a lie

**Correct (framework-aware engines + runtime inspection fixtures):**

```typescript
// Angular — import the bundled test to get $ng (engine auto-registers per worker)
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright-labs/selectors-angular';

test('submit button state', async ({ $ng }) => {
  // ✅ Targets the component contract: tag + @Input — survives CSS refactors
  const button = $ng('angular=app-button[label="Submit"][disabled=false]');
  await button.click();

  // ✅ Reads inputs and signals directly from the component instance
  expect(await $ng('app-counter').first().signal<number>('count')).toBe(5);
  await expect($ng('app-button').first()).toBeNgComponent();
  await expect($ng('angular=app-button[label="Submit"]')).toBeNgInput('label', 'Submit');
});
```

```typescript
// React
import { test } from '@playwright-labs/selectors-react';
import { expect } from '@playwright-labs/selectors-react';

test('counter increments', async ({ $r }) => {
  // ✅ Queries the first useState hook value — no data-count attribute needed
  const counter = $r('react=Counter[state.0=5]');
  await counter.locator('button').last().click(); // ReactHtmlElement extends Locator

  // ✅ Typed introspection replaces page.evaluate fiber digging
  expect(await $r('react=Button').prop<string>('label')).toBe('Submit');
  await expect(counter).toBeReactState('0', 6);
  await expect($r('react=UserCard[props.user.role="admin"]')).toBeReactProp('user', {
    name: 'Alice',
    role: 'admin',
  });
});
```

```typescript
// Vue
import { test } from '@playwright-labs/selectors-vue';
import { expect } from '@playwright-labs/selectors-vue';

test('counter increments', async ({ $v }) => {
  // ✅ Composition API setup state, refs auto-unwrapped
  const counter = $v('vue=Counter[setup.count=0]');
  await counter.locator('button').last().click();

  await expect($v('vue=Counter').first()).toBeVueSetup('count', 1);
  await expect($v('vue=Button').first()).toHaveVueProp('variant', 'danger');
  // ✅ Options API data via the data. source
  await expect($v('vue=OptionsCounter')).toHaveVueData('count', 0);
});
```

**Why this works:**
- The component name and its prop/input contract change together with the feature — a CSS refactor or a new wrapper element does not touch the selector
- Fixtures return typed values (`input<T>`, `prop<T>`, `state<T>`, `setup<T>`) instead of `any` from `page.evaluate`
- No test-only attributes are added to production markup
- Matchers fail with messages listing available inputs/outputs/signals or props, so debugging starts from the component's actual shape

## Common Mistakes

### Mistake 1: Registering the engine in every spec file

```typescript
// ❌ Repeated in each spec — noise, and easy to forget in the newest file
import { selectors } from '@playwright/test';
import { ReactEngine } from '@playwright-labs/selectors-react';
selectors.register('react', ReactEngine);
```

**Why this is wrong**: `selectors.register` must run once per worker before any browser context is created. Scattering it across specs is redundant and silently missing from any file that forgets it.

**How to fix**:

```typescript
// ✅ Import the bundled test — the fixture auto-registers the engine per worker
import { test } from '@playwright-labs/selectors-react';

// ✅ Or register once in a shared setup file imported by playwright.config.ts
// tests/setup.ts
import { selectors } from '@playwright/test';
import { ReactEngine } from '@playwright-labs/selectors-react';
selectors.register('react', ReactEngine);
```

### Mistake 2: Running framework selectors against a production build

```typescript
// playwright.config.ts — ❌ webServer builds the app for production
export default defineConfig({
  webServer: {
    command: 'npm run build && npm run start', // NODE_ENV=production strips fiber metadata
    url: 'http://localhost:3000',
  },
});
```

**Why this is wrong**: all three engines read framework internals (`window.ng`, `__reactFiber$`, `__vue_app__`) that production builds strip. Every query returns empty and the failure looks like a missing element, not a misconfiguration.

**How to fix**: serve a development build to the e2e suite (`ng serve --configuration=development`, `npm run dev`), or for Angular explicitly re-attach debug tools:

```typescript
// main.ts (Angular) — only if a production bundle must be tested
import { enableDebugTools } from '@angular/platform-browser';

bootstrapApplication(AppComponent).then((appRef) => {
  if (environment.production) enableDebugTools(appRef.components[0]);
});
```

### Mistake 3: Asserting function-component state by variable name (React)

```typescript
// ❌ 'count' is a source-level name — it does not exist at runtime
await expect($r('react=Counter').first()).toBeReactState('count', 5);
```

**Why this is wrong**: React does not preserve hook variable names. Function-component state is indexed by hook declaration order.

**How to fix**:

```typescript
// const [count] = useState(0);  → index "0"
// const [name]  = useState(''); → index "1"
await expect($r('react=Counter').first()).toBeReactState('0', 5);
page.locator('react=Counter[state.0=5]');
```

## Advanced Patterns

### Imperative state mutation + change detection (Angular)

```typescript
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright/test';

test('reflects imperative mutation', async ({ $ng }) => {
  const counter = $ng('app-counter').first();
  // After mutating component state imperatively, re-run change detection
  await counter.detectChanges();
  await expect(counter).toContainText('0');

  // Discover the component's actual shape before writing assertions
  const inputs = await $ng('app-button').first().inputs();   // ['label', 'disabled', 'type']
  const outputs = await $ng('app-button').first().outputs(); // ['clicked']
  const signals = await counter.signals();                   // ['count']
  expect(inputs).toContain('label');
});
```

### Combining frameworks on one page

The engines coexist — register each one (or merge the bundled tests) and mix freely with standard locators:

```typescript
import { mergeTests } from '@playwright/test';
import { test as angularTest } from '@playwright-labs/selectors-angular';
import { test as reactTest } from '@playwright-labs/selectors-react';

export const test = mergeTests(angularTest, reactTest);

test('hybrid micro-frontend page', async ({ page, $ng, $r }) => {
  await $r('react=SearchBar[props.placeholder="Search"]').fill('shoes');
  await expect(page.getByRole('list')).toBeVisible(); // ✅ standard locator for behavior
  await expect($ng('angular=app-product-card').first()).toBeNgComponent();
});
```

**When to use this pattern**: micro-frontend shells, incremental framework migrations, and pages embedding a widget built on another stack.

## When CSS and Role Locators Are Still the Right Tool

Framework selectors are a complement, not a replacement. Keep standard locators for:

- **User-visible behavior**: `getByRole('button', { name: 'Submit' })` asserts what the user perceives — accessible name and role — which component queries cannot express
- **Static, non-component markup**: headings, footers, prose, layout containers — there is no component boundary to query
- **Production-smoke suites**: anything running against a production bundle, where all three engines are blind by design
- **Cross-framework pages**: role/text locators are framework-agnostic and keep working through a rewrite from one stack to another

A sound default: role-based locators for flows, framework selectors for component contract and state assertions.

## Integration with Other Best Practices

- **locator-role-based**: role locators verify the accessibility contract; `angular=`/`react=`/`vue=` verify the component contract — use both, each where it is strongest
- **stable-auto-waiting**: framework-engine locators are standard Playwright locators — auto-waiting, retry-ability, and web-first assertions apply unchanged
- **fixture-merge-tests-expects**: `mergeTests` / `mergeExpects` combine the bundled `test`/`expect` exports of several selector packages (plus other fixture packages) into one shared fixture module
- **Scale considerations**: in a 100+ test suite, prefer one shared `tests/setup.ts` registration (or the auto-registering fixtures) over per-file `selectors.register` calls; keep framework selectors out of page objects shared with production-smoke tests, since those run where the engines cannot

Reference: [@playwright-labs/selectors-angular](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-angular) · [@playwright-labs/selectors-react](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-react) · [@playwright-labs/selectors-vue](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-vue)
