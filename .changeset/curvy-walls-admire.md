---
"@playwright-labs/selectors-angular": major
---

## `@playwright-labs/selectors-angular` — initial release

A custom [Playwright selector engine](https://playwright.dev/docs/extensibility#custom-selector-engines) and Angular-aware `expect` matchers for querying and asserting Angular components by their runtime properties — not by DOM structure.

### Selector engine — `AngularEngine`

Register once and use the `angular=` prefix in any Playwright locator:

```ts
import { selectors } from '@playwright/test';
import { AngularEngine } from '@playwright-labs/selectors-angular';

selectors.register('angular', AngularEngine);

// query by component tag
page.locator('angular=app-button')
// query by property value
page.locator('angular=app-button[label="Submit"]')
// nested property path (dot-notation)
page.locator('angular=app-user-card[user.role="admin"]')
// regex match
page.locator('angular=app-button[label=/^S/i]')
// multiple conditions (logical AND)
page.locator('angular=app-button[type="danger"][disabled]')
```

**Supported operators** (CSS attribute-selector convention): `=`, `*=`, `^=`, `$=`, `|=`, `~=`, `<truthy>` (`[prop]`), regex (`/pattern/flags`), case-insensitive flag `i`.

Shadow DOM is traversed automatically.

### Angular-aware `expect` matchers

Import the extended `expect` once and all matchers are available:

```ts
import { expect } from '@playwright-labs/selectors-angular';
```

| Matcher | Description |
|---|---|
| `toBeNgComponent()` | Element is an Angular component host (`window.ng.getComponent` returns non-null) |
| `toHaveNgInput(name)` | Component declares an `@Input()` with the given property name |
| `toHaveNgOutput(name)` | Component declares an `@Output()` with the given property name |
| `toBeNgInput(name, value)` | `@Input()` (including signal-based `input()`) equals expected value |
| `toBeNgOutput(name, value)` | `model()` signal output equals expected value |
| `toHaveNgSignal(name)` | Component has a `WritableSignal` (`signal()`) with the given name |
| `toBeNgSignal(name, value)` | `WritableSignal` currently holds expected value |
| `toBeNgRouterOutlet()` | Element hosts a `RouterOutlet` directive |
| `toBeNgIf(condition?)` | Element has `NgIf` directive; optionally asserts the current condition value |
| `toBeNgFor()` | Element has `NgForOf` (`*ngFor`) directive |

All matchers support `.not` negation and provide descriptive failure messages.

### `test` fixture — `$ng`

Drop-in replacement for Playwright's `test` that adds a `$ng` fixture for Angular-aware element interaction:

```ts
import { test } from '@playwright-labs/selectors-angular';

test('reads component inputs', async ({ $ng }) => {
  const label = await $ng('app-button').first().input('label'); // "Submit"
  const step  = await $ng('app-counter').first().input('step'); // 1
});
```

The Angular selector engine is registered automatically — no manual `selectors.register` call needed.

### `NgHtmlElement` API

`$ng(selector)` returns an `NgHtmlElement` instance that wraps a Playwright `Locator` and exposes the following methods:

| Method | Returns | Description |
|---|---|---|
| `nth(index)` | `NgHtmlElement` | Narrows to the element at position `index` |
| `first()` | `NgHtmlElement` | Narrows to the first matched element |
| `last()` | `NgHtmlElement` | Narrows to the last matched element |
| `isComponent()` | `Promise<boolean>` | `true` when the element is an Angular component host |
| `directives()` | `Promise<string[]>` | Constructor names of all directives on the element |
| `inputs()` | `Promise<string[]>` | All `@Input()` property names declared on the component |
| `input<T>(name)` | `Promise<T>` | Current value of the named `@Input()` (signal inputs are unwrapped) |
| `outputs()` | `Promise<string[]>` | All `@Output()` property names declared on the component |
| `signals()` | `Promise<string[]>` | Property names of all `WritableSignal`s on the component instance |
| `signal<T>(name)` | `Promise<T>` | Current value of the named `WritableSignal` |
| `detectChanges()` | `Promise<void>` | Triggers Angular change detection via `window.ng.applyChanges` |

All methods require Angular to run in **development mode** (so `window.ng` is available), except `isComponent()` which returns `false` gracefully when `window.ng` is absent.

### Requirements

- `@playwright/test` `^1.57.0`
- Angular 9+ (requires `window.ng` DevTools API — available in development builds)
