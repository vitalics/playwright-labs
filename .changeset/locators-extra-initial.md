---
"@playwright-labs/locators-extra": major
---

Initial release — extra utilities for Playwright locators.

- `isLocator(value)` — runtime type guard `value is Locator` (structural check; Playwright does not export the `Locator` class)
- `selectorRealization(locator, kind?)` / `selectorRealizationAll(locator, kind?)` — realize a locator into a concrete selector for the element(s) it matches: `"css"` (unique path anchored at the nearest id), `"xpath"` (absolute), `"tag"`
- `registerRealizer(kind, realizer)` — plug in custom selector engines (react/vue/angular, `data-testid`, …); `KnownSelectorKinds` interface is open for module augmentation so engine packages contribute their kind to `SelectorKind` autocomplete
- `dnd(from, options)` — mouse-event drag and drop to a locator or absolute coordinates, with `steps`, `timeout`, `AbortSignal`, source/target positions; always releases the mouse button, even on abort mid-drag
- `LocatorExtra` aggregate with `is`, `dnd`, `register`, `realization`, `realizationAll`, `css`, `xpath`, `tag` shortcuts
