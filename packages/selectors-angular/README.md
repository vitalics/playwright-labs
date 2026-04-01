# Playwright Angular Selectors

A custom [Playwright selector engine](https://playwright.dev/docs/extensibility#custom-selector-engines) that queries Angular components by their properties — not by DOM structure. Ships Angular-aware `expect` matchers and a `$ng` fixture for direct component inspection.

```typescript
// Find a button component whose label is "Submit"
page.locator('angular=app-button[label="Submit"]')

// Find a user card where the nested user.role property equals "admin"
page.locator('angular=app-user-card[user.role="admin"]')

// Read @Input / signal values directly from the component
const label = await $ng('angular=app-button[label="Submit"]').input('label');
const count = await $ng('app-counter').first().signal<number>('count');
```

## Installation

```bash
npm install -D @playwright-labs/selectors-angular
# or
yarn add -D @playwright-labs/selectors-angular
# or
pnpm add -D @playwright-labs/selectors-angular
```

## Requirements

| Dependency | Version |
|---|---|
| `@playwright/test` | `^1.57.0` |
| Angular | `9+` (requires [`window.ng`](https://angular.dev/api/core/global/ng) DevTools API) |

> **Important:** `window.ng` is available only in Angular **development** builds (`ng serve` / `ng build --configuration=development`). It is **not** available in production builds by default. See [Production builds](#production-builds) for options.

## Setup

### Selector engine

Register the engine once, before any browser context is created. A module-level call in a shared setup file is the simplest approach.

```typescript
// tests/setup.ts
import { selectors } from '@playwright/test';
import { AngularEngine } from '@playwright-labs/selectors-angular';

selectors.register('angular', AngularEngine);
```

```typescript
// playwright.config.ts
import './tests/setup'; // executes once per worker
import { defineConfig } from '@playwright/test';

export default defineConfig({ /* ... */ });
```

### Custom matchers

Import the extended `expect` and use it in place of the standard one:

```typescript
import { expect } from '@playwright-labs/selectors-angular';

await expect(page.locator('app-button').first()).toBeNgComponent();
await expect(page.locator('app-counter').first()).toHaveNgSignal('count');
```

### `$ng` fixture (recommended)

Use the bundled `test` export to get `$ng` — a fixture that wraps locators in [`NgHtmlElement`](#nghtmlelement) and auto-registers the selector engine:

```typescript
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright/test';

test('reads component properties', async ({ $ng }) => {
  const label = await $ng('angular=app-button[label="Submit"]').input('label');
  expect(label).toBe('Submit');

  const count = await $ng('app-counter').first().signal<number>('count');
  expect(count).toBe(0);
});
```

No manual `selectors.register` call is required — the fixture handles it automatically via a worker-scoped setup.

---

## Selector syntax

```
angular=ComponentTag
angular=ComponentTag[property]
angular=ComponentTag[property="value"]
angular=ComponentTag[nested.property="value"]
angular=ComponentTag[property="value" i]
angular=ComponentTag[property=/regex/flags]
angular=ComponentTag[prop1="a"][prop2=true]
```

### Component tag

The component tag is the lowercase HTML tag name as declared in the `selector` metadata of the Angular component.

```typescript
@Component({ selector: 'app-user-card', ... })
export class UserCardComponent { ... }
```

```typescript
// Matches all <app-user-card> elements
page.locator('angular=app-user-card')
```

### Property values

Unquoted values are interpreted as numbers or booleans. Use quotes for strings.

| Syntax | Type | Example |
|---|---|---|
| `"value"` or `'value'` | string | `[label="Submit"]` |
| `42`, `3.14` | number | `[step=5]` |
| `true` / `false` | boolean | `[disabled=false]` |
| `/pattern/flags` | RegExp | `[label=/^sub/i]` |

### Operators

All operators follow the [CSS attribute selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors) convention.

| Operator | Meaning | Example |
|---|---|---|
| `[prop]` | Property is truthy | `[disabled]` |
| `[prop="val"]` | Exact equality | `[type="primary"]` |
| `[prop="val" i]` | Exact equality, case-insensitive | `[label="submit" i]` |
| `[prop="val" s]` | Exact equality, case-sensitive _(default)_ | `[label="Submit" s]` |
| `[prop=/re/]` | RegExp match | `[label=/^delete/i]` |
| `[prop*="sub"]` | Contains substring | `[type*="ary"]` |
| `[prop^="pre"]` | Starts with | `[type^="prim"]` |
| `[prop$="suf"]` | Ends with | `[type$="ger"]` |
| `[prop\|="val"]` | Exact or hyphen-prefixed | `[lang\|="en"]` |
| `[prop~="word"]` | Word in space-separated list | `[class~="active"]` |

### Nested property paths

Dot-notation traverses nested objects on the component instance.

```typescript
@Component({ selector: 'app-user-card', ... })
export class UserCardComponent {
  @Input() user: { name: string; role: string } = { name: '', role: '' };
}
```

```typescript
page.locator('angular=app-user-card[user.name="Alice"]')
page.locator('angular=app-user-card[user.role="admin"]')
// Both conditions must match the same element
page.locator('angular=app-user-card[user.name="Alice"][user.role="admin"]')
```

If any intermediate segment is `null` or `undefined`, the condition evaluates to `false`.

### Multiple attribute conditions

Chain `[...]` blocks — all conditions must be satisfied (logical AND).

```typescript
// Only the danger button that is currently disabled
page.locator('angular=app-button[type="danger"][disabled]')
```

---

## Examples

### Basic component queries

```typescript
import { test, expect, selectors } from '@playwright/test';
import { AngularEngine } from '@playwright-labs/selectors-angular';

selectors.register('angular', AngularEngine);

test.describe('ButtonComponent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('app-button');
  });

  test('counts all buttons', async ({ page }) => {
    await expect(page.locator('angular=app-button')).toHaveCount(3);
  });

  test('finds by label', async ({ page }) => {
    await expect(
      page.locator('angular=app-button[label="Submit"]'),
    ).toHaveCount(1);
  });

  test('finds disabled button', async ({ page }) => {
    await expect(page.locator('angular=app-button[disabled]')).toHaveCount(1);
  });
});
```

### Nested properties

```typescript
test('finds user by nested role', async ({ page }) => {
  const adminCard = page.locator('angular=app-user-card[user.role="admin"]');
  await expect(adminCard).toHaveCount(1);
  await expect(adminCard).toContainText('Alice');
});
```

### Regex matching

```typescript
test('finds buttons whose label starts with S', async ({ page }) => {
  await expect(page.locator('angular=app-button[label=/^S/]')).toHaveCount(1);
});
```

### Case-insensitive matching

```typescript
test('is case-insensitive with i flag', async ({ page }) => {
  await expect(
    page.locator('angular=app-button[label="SUBMIT" i]'),
  ).toHaveCount(1);
});
```

### String operators

```typescript
page.locator('angular=app-button[type*="ary"]')   // *=  Contains → primary, secondary
page.locator('angular=app-button[type^="prim"]')  // ^=  Starts with → primary
page.locator('angular=app-button[type$="ger"]')   // $=  Ends with → danger
page.locator('angular=app-lang-switcher[lang|="en"]') // |= Exact or hyphen-prefixed
page.locator('angular=app-tag[classes~="active"]')    // ~= Word in space-separated list
```

---

## How it works

The engine uses Angular's [DevTools API](https://angular.dev/api/core/global/ng) (`window.ng`) that Angular exposes in development mode:

1. `ng.getComponent(element)` — returns the component instance whose host element is `element`.
2. `ng.getOwningComponent(element)` — returns the component instance that rendered `element`.
3. `ng.getHostElement(component)` — returns the host DOM element for a component instance.

All public properties of the component instance are queryable — not just `@Input()` fields.

---

## Production builds

By default, `window.ng` is only present in development builds. For e2e tests that run against a production bundle you have two options:

**Option 1 — Use a development build in CI (recommended)**

```bash
ng build --configuration=development
ng serve --configuration=development
```

**Option 2 — Enable debug tools explicitly in `main.ts`**

```typescript
import { enableDebugTools } from '@angular/platform-browser';
import { ApplicationRef } from '@angular/core';

bootstrapApplication(AppComponent).then((appRef) => {
  if (!environment.production) return;
  enableDebugTools(appRef.components[0]);
});
```

> `enableDebugTools` re-attaches `window.ng` in production. Be mindful of the performance and security implications before shipping this to end users.

---

## Custom matchers

`@playwright-labs/selectors-angular` ships a set of Angular-aware `expect` matchers that go beyond the standard Playwright assertions. Import the extended `expect` from the package:

```typescript
import { expect } from '@playwright-labs/selectors-angular';
```

All matchers support `.not` negation and provide descriptive failure messages pointing to available inputs, outputs, or signals when an assertion fails.

---

### `toBeNgComponent()`

Asserts that the matched element is an Angular component host element (`window.ng.getComponent` returns non-null).

```typescript
await expect(page.locator('app-button').first()).toBeNgComponent();

// Negated: plain DOM elements are not component hosts
await expect(page.locator('h1')).not.toBeNgComponent();
```

> Requires Angular DevTools API (`window.ng`). Only available in development builds.

---

### `toHaveNgInput(name)`

Asserts that the component declares an `@Input()` property with the given name.

```typescript
await expect(page.locator('app-button').first()).toHaveNgInput('label');
await expect(page.locator('app-button').first()).toHaveNgInput('disabled');

// Fails — "clicked" is an @Output, not an @Input
await expect(page.locator('app-button').first()).not.toHaveNgInput('clicked');
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | JS property name or template alias of the `@Input()` |

---

### `toHaveNgOutput(name)`

Asserts that the component declares an `@Output()` event with the given name.

```typescript
await expect(page.locator('app-button').first()).toHaveNgOutput('clicked');

// Fails — "label" is an @Input
await expect(page.locator('app-button').first()).not.toHaveNgOutput('label');
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Property name of the `@Output()` EventEmitter |

---

### `toBeNgInput(name, value)`

Asserts that the `@Input()` property `name` has the given value. Signal-based inputs (`input()`) are called automatically. Performs deep equality for objects and arrays.

```typescript
await expect(page.locator('angular=app-button[label="Submit"]')).toBeNgInput('label', 'Submit');
await expect(page.locator('angular=app-button[disabled]')).toBeNgInput('disabled', true);
await expect(page.locator('app-counter').first()).toBeNgInput('step', 1);

// Nested object input
await expect(
  page.locator('angular=app-user-card[user.name="Alice"]')
).toBeNgInput('user', { name: 'Alice', role: 'admin' });
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | The `@Input()` property name |
| `value` | `unknown` | Expected value (deep equality) |

---

### `toBeNgOutput(name, value)`

Asserts that a `model()` signal output `name` has the given current value. Only meaningful for **model signals** — `EventEmitter` outputs have no current value.

```typescript
await expect(page.locator('app-slider').first()).toBeNgOutput('value', 50);
```

> Using `toBeNgOutput` on a plain `@Output() clicked = new EventEmitter()` produces a descriptive error directing you to use `toHaveNgOutput` instead.

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | The `@Output()` / model signal property name |
| `value` | `unknown` | Expected current value (deep equality) |

---

### `toHaveNgSignal(name)`

Asserts that the component has a `WritableSignal` property (created via `signal()`) with the given name.

```typescript
await expect(page.locator('app-counter').first()).toHaveNgSignal('count');

// Fails — step is a plain @Input() number, not a signal
await expect(page.locator('app-counter').first()).not.toHaveNgSignal('step');
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Property name to inspect |

---

### `toBeNgSignal(name, value)`

Asserts that the `WritableSignal` property `name` currently holds the given value. Performs deep equality.

```typescript
// Initial value
await expect(page.locator('app-counter').first()).toBeNgSignal('count', 0);

// After interaction
await page.locator('app-counter').first().locator('button').last().click();
await expect(page.locator('app-counter').first()).toBeNgSignal('count', 1);
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Property name of the `WritableSignal` |
| `value` | `unknown` | Expected signal value (deep equality) |

> Throws if the property exists but is not a `WritableSignal`.

---

### `toBeNgRouterOutlet()`

Asserts that the element hosts a `RouterOutlet` directive. Detected via `window.ng.getDirectives`.

```typescript
await expect(page.locator('router-outlet')).toBeNgRouterOutlet();

// Fails for regular elements
await expect(page.locator('h1')).not.toBeNgRouterOutlet();
```

> **Note:** Requires `@angular/router` to be installed and `provideRouter` (or `RouterModule`) to be present in the application.

---

### `toBeNgIf(condition?)`

Asserts that the element hosts an `NgIf` structural directive. When `condition` is provided, also asserts the current truthy value of the `ngIf` expression.

```typescript
// Presence check only
await expect(templateEl).toBeNgIf();

// Condition value check
await expect(templateEl).toBeNgIf(true);
await expect(templateEl).toBeNgIf(false);
```

| Parameter | Type | Description |
|---|---|---|
| `condition` | `boolean` _(optional)_ | Expected value of the `ngIf` expression |

> **Note:** `NgIf` is a structural directive compiled to a `<ng-template>` (comment node) by Angular. The directive instance lives on the template anchor, not on the rendered element. Target the template comment node rather than the projected content element.

---

### `toBeNgFor()`

Asserts that the element hosts an `NgForOf` (`*ngFor`) structural directive.

```typescript
await expect(templateEl).toBeNgFor();

// Fails for rendered list items (directive is on the template, not the items)
await expect(page.locator('li').first()).not.toBeNgFor();
```

> **Note:** Like `toBeNgIf`, `NgForOf` lives on the `<ng-template>` anchor. Rendered list items do not carry the directive instance.

---

## `NgHtmlElement` fixture

The `$ng` fixture wraps any Playwright locator in an `NgHtmlElement` that provides direct, typed access to the component's Angular internals.

### Setup

```typescript
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright/test';

test('component inspection', async ({ $ng }) => {
  const counter = $ng('app-counter').first();
  expect(await counter.signal<number>('count')).toBe(0);
});
```

The Angular selector engine is registered automatically — no separate `selectors.register` call required.

### Locator narrowing

`NgHtmlElement` mirrors the standard Playwright narrowing methods and returns a new `NgHtmlElement`:

```typescript
$ng('app-button').first()    // first matched element
$ng('app-button').last()     // last matched element
$ng('app-button').nth(2)     // element at index 2 (0-based)
```

### API reference

#### `isComponent(): Promise<boolean>`

Returns `true` when the element is an Angular component host. Returns `false` (without throwing) when `window.ng` is unavailable.

```typescript
expect(await $ng('app-button').first().isComponent()).toBe(true);
expect(await $ng('h1').isComponent()).toBe(false);
```

---

#### `directives(): Promise<string[]>`

Returns the constructor names of all directives applied to the element via `window.ng.getDirectives`.

```typescript
const names = await $ng('router-outlet').directives();
// e.g. ["RouterOutlet"]
```

---

#### `inputs(): Promise<string[]>`

Returns the JS property names of all `@Input()` bindings declared on the component.

```typescript
await $ng('app-button').first().inputs();
// ["label", "disabled", "type"]
```

---

#### `input<T>(name): Promise<T>`

Returns the current value of a specific `@Input()` binding. Signal-based inputs (`input()`) are automatically unwrapped.

Throws if `window.ng` is unavailable, the element is not a component host, or the property does not exist.

```typescript
const label = await $ng('angular=app-button[label="Submit"]').input<string>('label');
// "Submit"
```

---

#### `outputs(): Promise<string[]>`

Returns the JS property names of all `@Output()` bindings declared on the component.

```typescript
await $ng('app-button').first().outputs();
// ["clicked"]
```

---

#### `signals(): Promise<string[]>`

Returns the property names of all `WritableSignal`s (`signal()`) found on the component instance.

```typescript
await $ng('app-counter').first().signals();
// ["count"]
```

---

#### `signal<T>(name): Promise<T>`

Returns the current value of a `WritableSignal` by property name.

Throws if the property does not exist or is not a `WritableSignal`.

```typescript
const count = await $ng('app-counter').first().signal<number>('count');
// 0
```

---

#### `detectChanges(): Promise<void>`

Triggers Angular change detection for this component via `window.ng.applyChanges`. Useful after imperatively mutating component state in tests.

```typescript
await $ng('app-counter').first().detectChanges();
```

---

## API reference

### `AngularEngine`

```typescript
import { AngularEngine } from '@playwright-labs/selectors-angular';
```

A factory that returns a Playwright-compatible selector engine. Pass it to `selectors.register()`.

```typescript
function AngularEngine(): {
  queryAll(scope: Element | ShadowRoot | Document, selector: string): Element[];
}
```

Shadow DOM is traversed automatically — components inside shadow roots are included in results.

---

### `expect`

```typescript
import { expect } from '@playwright-labs/selectors-angular';
```

The standard Playwright `expect` extended with all Angular-aware matchers listed above.

---

### `test`

```typescript
import { test } from '@playwright-labs/selectors-angular';
```

The standard Playwright `test` extended with the `$ng` fixture. Registers the Angular selector engine automatically (worker-scoped, once per worker process).

---

### `AngularMatchers` (type)

```typescript
import type { AngularMatchers } from '@playwright-labs/selectors-angular';
```

TypeScript type describing all Angular-aware matcher method signatures. Useful when building custom `expect` wrappers.

---

### `NgHtmlElement` (class)

```typescript
import { NgHtmlElement } from '@playwright-labs/selectors-angular';
```

The class returned by `$ng(selector)`. Can also be instantiated directly from any Playwright `Locator`:

```typescript
import { NgHtmlElement } from '@playwright-labs/selectors-angular';

const el = new NgHtmlElement(page.locator('app-counter').first());
const count = await el.signal<number>('count');
```

---

### `Fixture` (type)

```typescript
import type { Fixture } from '@playwright-labs/selectors-angular';
```

TypeScript type for the `$ng` fixture. Use it when composing with `test.extend`:

```typescript
import { test as base, type Fixture } from '@playwright-labs/selectors-angular';

export const test = base.extend<Fixture & { myFixture: string }>({
  myFixture: async ({}, use) => use('hello'),
});
```

## License

MIT © [Vitali Haradkou](https://github.com/vitalics)
