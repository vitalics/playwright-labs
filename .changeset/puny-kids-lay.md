---
"@playwright-labs/selectors-angular": minor
---

Migrated shared selector parsing logic to `@playwright-labs/selectors-core`.

The `AngularEngine` now depends on `selectors-core` for `parseAttributeSelector` and `matchesAttributePart` instead of inlining them. No breaking changes to the public API: `angular=ComponentName[...]` selector syntax, `$ng` fixture with `NgHtmlElement` (`input()`, `output()`, `signal()`, `inputs()`, `outputs()`, `directives()`, `componentName()`, `isComponent()`, `detectChanges()`), and custom matchers (`toBeNgComponent`, `toHaveNgInput`, `toBeNgInput`, `toHaveNgOutput`, `toBeNgOutput`, `toHaveNgSignal`, `toBeNgSignal`, `toBeNgRouterOutlet`, `toBeNgIf`, `toBeNgFor`) are unchanged.
