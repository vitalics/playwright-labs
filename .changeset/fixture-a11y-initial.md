---
"@playwright-labs/fixture-a11y": major
---

Initial release — accessibility testing fixture and matcher powered by axe-core via `@axe-core/playwright`.

- `a11y` fixture — fresh `A11yBuilder` per test; `useA11y(page?)` factory for several scans or extra pages
- `A11yBuilder` — `AxeBuilder` subclass whose `include`/`exclude` accept **locators** (realized into CSS selectors by `@playwright-labs/locators-extra` right before the scan); an `include` locator matching nothing throws instead of silently scanning the whole page
- `toBeAccessible` matcher for `Page` and `Locator` with `include`/`exclude`/`tags`/`disableRules` options and a failure message listing every violation
