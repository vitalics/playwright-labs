---
"@playwright-labs/selectors-angular": minor
---

`AngularRealizer` — realize any locator into an `angular=<host-tag-name>` selector via `@playwright-labs/locators-extra`.

Importing the package registers the `"angular"` realizer (side effect) and augments `KnownSelectorKinds`, so `selectorRealization(locator, "angular")` gets autocomplete and works out of the box. The realized selector identifies the component type (its host element tag), not the instance — narrow with props or `.nth()`.

Also fixes `AngularEngine` selector queries throwing `ReferenceError: parseAttributeSelector is not defined` in the browser: the attribute-selector helpers are now inlined into the engine factory (Playwright serializes the factory via `.toString()`, so Node.js closure imports are unavailable in the page — same approach as the react/vue engines).
