---
"@playwright-labs/selectors-vue": minor
---

`VueRealizer` — realize any locator into a `vue=ComponentName` selector via `@playwright-labs/locators-extra`.

Importing the package registers the `"vue"` realizer (side effect) and augments `KnownSelectorKinds`, so `selectorRealization(locator, "vue")` gets autocomplete and works out of the box. The realized selector identifies the component type, not the instance — narrow with props or `.nth()`.
