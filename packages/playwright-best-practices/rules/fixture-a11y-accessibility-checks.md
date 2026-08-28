---
title: Run Automated Accessibility Checks with fixture-a11y
impact: MEDIUM
impactDescription: catches WCAG violations (missing labels, contrast, landmarks) in CI with one assertion per page instead of manual audits
tags: a11y, accessibility, axe-core, fixtures, wcag
---

## Run Automated Accessibility Checks with fixture-a11y

**Impact: MEDIUM (catches WCAG violations — missing labels, contrast, landmarks — in CI with one assertion per page instead of manual audits)**

Accessibility regressions ship silently: a form loses its label association, a new component breaks color contrast, a modal traps focus — and no functional test notices because clicks and fills still work. The `@playwright-labs/fixture-a11y` package wraps `axe-core` (via `@axe-core/playwright`) in Playwright fixtures — the `a11y` fixture for a scan builder, `useA11y` for extra scans or pages, and a `toBeAccessible` matcher — so every page or component can be audited against WCAG rules as a normal assertion. Its twist over a plain `AxeBuilder`: `include`/`exclude` accept **locators**, not just selector strings, realized into CSS selectors right before the scan runs.

## When to Use

- **Use the `a11y` fixture when**: A test finishes on a page or state you want to audit — call `a11y.withTags([...]).analyze()` and assert `results.violations` is empty
- **Use `toBeAccessible` when**: You want a one-liner — `await expect(page).toBeAccessible()` for a full-page scan, or `await expect(locator).toBeAccessible()` to scope the scan to a component
- **Use `useA11y(page?)` when**: One test scans several states (before/after opening a dialog) or extra pages/tabs — each call returns a fresh `A11yBuilder`
- **Pin scans to a standard when**: Running in CI — pass `tags: ["wcag2a", "wcag2aa"]` so results don't drift when axe adds or reclassifies best-practice rules
- **Consider alternatives when**: You need full user-journey audits with keyboard navigation and screen readers — axe only finds statically detectable issues (roughly 30-50% of real-world problems); pair automated scans with manual testing for compliance-critical flows
- **Required for**: Public-facing apps with WCAG/ADA obligations, design-system component tests, any page where a form or dialog ships

## Guidelines

### Do

- Scan at the end of a realistic user flow, not on an empty page — axe finds issues in the DOM as users actually see it
- Pin scans to WCAG levels with `withTags(["wcag2a", "wcag2aa"])` or `toBeAccessible({ tags: [...] })` for deterministic CI results
- Scope scans to components with a locator — `expect(page.getByRole("form")).toBeAccessible()` — when auditing design-system pieces
- Exclude genuinely third-party or legacy regions with `.exclude(locator)` or the `exclude` option, and document why each exclusion exists
- Disable a specific rule with `disableRules: ["color-contrast"]` only as a tracked, temporary measure — never disable a rule category wholesale to make a scan pass
- Merge the package's `test`/`expect` into your shared fixture file once with `mergeTests`/`mergeExpects`, then import from there everywhere

### Don't

- Don't run untagged scans in CI — default `axe.run` also enables best-practice rules (`region`, `landmark-*`), which change between axe releases and turn a dependency bump into a red build
- Don't exclude or disable broadly to get to zero — an excluded `main` landmark or a disabled `color-contrast` rule is an audit hole that looks like compliance
- Don't scan before the page settles — audit after the assertions that prove the state you care about is rendered
- Don't treat an empty `violations` array as "the page is accessible" — axe cannot verify keyboard operability, focus order, or meaningful reading order
- Don't build a new `A11yBuilder` per scan when the `a11y` fixture already gives you one for the default page — reach for `useA11y` only for extra scans or other pages

### Tool Usage Patterns

- **Install**: `npm i -D @playwright-labs/fixture-a11y` (peer dep: `@playwright/test`; powered by `@axe-core/playwright`)
- **Fixtures**: `a11y` — a fresh `A11yBuilder` for the default page (one scan per test); `useA11y(page?)` — a synchronous factory returning a fresh builder per call
- **Exports**: `test`, `expect` (with `toBeAccessible`), `A11yBuilder`, and the `Fixture` / `ToBeAccessibleOptions` types from `@playwright-labs/fixture-a11y`
- **`A11yBuilder`**: an `AxeBuilder` subclass — everything `AxeBuilder` supports (`withTags`, `withRules`, `disableRules`, `options`, …), plus locator-aware `include(locator)` / `exclude(locator)`
- **Matcher**: `expect(pageOrLocator).toBeAccessible(options?)` where options is `{ include?, exclude?, tags?, disableRules? }`; `include`/`exclude` accept a mix of locators and selector strings
- **Failure output**: the matcher message lists every violation with rule id, impact, and the first offending targets, so a red build points at the offending elements directly

## Edge Cases and Constraints

### Limitations

- Axe detects only statically analyzable issues — it cannot judge keyboard trap behavior, focus management, or whether alt text is *meaningful*, only whether it exists
- Scans add real time (axe injects and runs a rule engine in the page); at suite scale, scan once per significant page state rather than after every test
- Locator-based `include`/`exclude` are realized into CSS selectors at scan time — the elements must exist and be stable in the DOM when `analyze()` runs

### Edge Cases

1. **Include locator matching nothing**: `A11yBuilder` throws `a11y include locator matched no elements` instead of silently widening the scan to the whole page. If a region is optional, assert it is visible first, or use `toBeAccessible` on the page with an `exclude` instead.
2. **Exclude locator matching nothing**: this is a no-op by design — safe for third-party widgets that may or may not render (ads, cookie banners).
3. **Locator matching several elements**: every matched element is included/excluded — useful for auditing all cards in a grid at once.
4. **Scanning a dialog or popover**: open it first, assert it is visible, then `expect(page.getByRole("dialog")).toBeAccessible()` — the scoped scan covers the overlay without re-auditing the page behind it.
5. **Multiple pages/tabs**: `useA11y(otherPage)` returns a builder bound to that page, so a scan of a newly opened tab doesn't require a second `page` fixture.

### What Breaks If Ignored

- **Silent regressions**: a refactor removes a form's `<label>` association — every functional test still fills the field by CSS selector and passes; the violation reaches production
- **CI surprise on dependency bumps**: untagged scans pick up new best-practice rules, so `npm update` turns a green suite red on rules you never opted into
- **False confidence**: a "0 violations" badge on an untagged, broadly-excluded scan is treated as WCAG compliance by stakeholders
- **Widened scans**: a stale include selector in a hand-rolled `AxeBuilder` silently scans the whole page instead of the component, mixing unrelated violations into component tests

**Incorrect (untagged scan, string selectors, violations asserted loosely):**

```typescript
import { test, expect } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("dashboard is accessible", async ({ page }) => {
  await page.goto("/dashboard");

  // ❌ No tags — picks up whatever best-practice rules this axe version ships;
  //    results change between dependency releases
  const results = await new AxeBuilder({ page })
    // ❌ String selectors for scoping — a renamed class silently re-targets
    //    or widens the scan with no error
    .exclude(".third-party-ad")
    .analyze();

  // ❌ Soft-passing: logs violations but lets the build go green —
  //    the audit exists only until someone stops reading logs
  if (results.violations.length > 0) {
    console.log("a11y violations:", results.violations.length);
  }
});
```

**Why this fails:**
- Untagged scans are non-deterministic across axe releases — CI breaks on upgrades for rules nobody chose
- String selectors give no type checking and no failure when the target disappears
- Logging instead of asserting means violations never block a release

**Correct (pinned WCAG tags, locator-scoped scan, hard assertion):**

```typescript
import { test, expect } from "@playwright-labs/fixture-a11y";

test("dashboard is accessible", async ({ page, a11y }) => {
  await page.goto("/dashboard");
  // ✅ Scan the settled page, not a half-loaded shell
  await expect(page.getByRole("main")).toBeVisible();

  const results = await a11y
    // ✅ Pinned to a standard — same rules on every run, every axe version
    .withTags(["wcag2a", "wcag2aa"])
    // ✅ Locator-based exclusion — typed, and empty matches are a safe no-op
    .exclude(page.locator(".third-party-ad"))
    .analyze();

  // ✅ Hard failure listing rule id, impact, and offending targets
  expect(results.violations).toEqual([]);
});

test("signup form is accessible", async ({ page }) => {
  await page.goto("/signup");

  // ✅ One-liner, scoped to the component under test
  await expect(page.getByRole("form")).toBeAccessible({
    tags: ["wcag2a", "wcag2aa"],
  });
});
```

**Why this works:**
- WCAG tags make results reproducible — the suite only changes when the app or the pinned standard does
- Locators keep scoping type-safe and refactored alongside the rest of the test
- Violations fail the build with rule ids and target selectors in the message — actionable without re-running locally

## Common Mistakes

### Mistake 1: Scanning before the page has settled

```typescript
test("search results are accessible", async ({ page, a11y }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Search" }).click();

  // ❌ Results haven't rendered — axe audits the loading spinner
  const results = await a11y.withTags(["wcag2a"]).analyze();
  expect(results.violations).toEqual([]);
});
```

**Why this is wrong**: Axe audits the DOM as it exists at `analyze()` time. Scanning mid-transition audits a skeleton state and either reports violations the user never sees or misses violations in the real content.

**How to fix**:

```typescript
test("search results are accessible", async ({ page, a11y }) => {
  await page.goto("/search");
  await page.getByRole("button", { name: "Search" }).click();

  // ✅ Web-first assertion proves the real content is rendered
  await expect(page.getByRole("list")).toBeVisible();

  const results = await a11y.withTags(["wcag2a"]).analyze();
  expect(results.violations).toEqual([]);
});
```

### Mistake 2: Broad exclusions to force a green scan

```typescript
test("checkout is accessible", async ({ page }) => {
  await page.goto("/checkout");

  // ❌ Excluding main content to silence violations — the scan proves nothing
  await expect(page).toBeAccessible({
    exclude: [page.getByRole("main"), page.getByRole("form")],
    disableRules: ["color-contrast"],
  });
});
```

**Why this is wrong**: Excluding the landmarks under test and disabling a WCAG AA rule turns the assertion into theater — it always passes and documents nothing. Every exclusion should be third-party content you cannot fix, and every disabled rule should link to a tracked issue.

**How to fix**:

```typescript
test("checkout is accessible", async ({ page }) => {
  await page.goto("/checkout");

  // ✅ Scan the real page; exclude only what you genuinely don't own
  await expect(page).toBeAccessible({
    tags: ["wcag2a", "wcag2aa"],
    // Payment iframe rendered by the PSP — outside our control
    exclude: [page.frameLocator("#psp-iframe").owner()],
  });
});
```

### Mistake 3: Reusing one builder for multiple scans

```typescript
test("dialog is accessible", async ({ page, a11y }) => {
  await page.goto("/settings");
  await a11y.analyze(); // scan 1: page

  await page.getByRole("button", { name: "Edit" }).click();

  // ❌ Reusing the same builder after analyze() — queued locators and
  //    includes are already consumed; configuration leaks between scans
  await a11y.include(page.getByRole("dialog")).analyze();
});
```

**Why this is wrong**: The `a11y` fixture is documented as one scan per test — `analyze()` drains the queued locator includes/excludes, so chained state doesn't carry over predictably. A second scan needs a fresh builder.

**How to fix**:

```typescript
test("dialog is accessible", async ({ page, a11y, useA11y }) => {
  await page.goto("/settings");
  await a11y.withTags(["wcag2a", "wcag2aa"]).analyze(); // ✅ page scan

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // ✅ Fresh builder per scan via the useA11y factory
  const results = await useA11y()
    .include(page.getByRole("dialog"))
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

## Advanced Patterns

### Auditing multiple pages or tabs in one test

`useA11y(page?)` binds a builder to any page, so a flow spanning tabs stays auditable:

```typescript
import { test, expect } from "@playwright-labs/fixture-a11y";

test("help center opened in a new tab is accessible", async ({ page, useA11y, context }) => {
  await page.goto("/dashboard");

  const [helpPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Help" }).click(),
  ]);
  await helpPage.waitForLoadState();

  // ✅ Builder bound to the new tab, not the default page
  const results = await useA11y(helpPage)
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Baseline a legacy page with scoped scans

When a full-page scan on legacy code is hopeless, ratchet: scan only the components your team owns.

```typescript
test("new checkout widget is accessible", async ({ page }) => {
  await page.goto("/legacy-checkout");

  // ✅ Audit the owned component only; expand scope as legacy regions get fixed
  await expect(page.getByTestId("checkout-widget")).toBeAccessible({
    tags: ["wcag2a", "wcag2aa"],
  });
});
```

**When to use this pattern**: Scoping is a migration strategy, not an end state — keep a tracking task to widen scans toward full-page coverage, or the scoped tests calcify into permanent blind spots.

### Merging into a shared fixture file

Compose `a11y` with your other fixtures once, following the merge pattern:

```typescript
// fixtures/index.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as a11yExpect,
  test as a11yTest,
} from "@playwright-labs/fixture-a11y";

export const test = mergeTests(a11yTest);
export const expect = mergeExpects(a11yExpect);
```

Every spec then imports `test`/`expect` from `fixtures` and gets `a11y`, `useA11y`, and `toBeAccessible` alongside page objects and other custom fixtures.

## Integration with Other Best Practices

- **Prefer Role-Based Locators** (`locator-role-based`): role-based locators and axe scans verify the same accessibility tree from opposite sides — if `getByRole` can't find your button, axe will usually flag why
- **Web-First Assertions** (`assertion-web-first`): always assert the target state is rendered before calling `analyze()` — web-first assertions stabilize the DOM the scan depends on
- **Merge Tests and Expects** (`fixture-merge-tests-expects`): `fixture-a11y` is designed for `mergeTests`/`mergeExpects` — merging is the intended way to combine it with other Playwright-labs fixture packages
- **Enrich Test Reports with fixture-allure** (`fixture-allure`): attach violation JSON as an attachment on failure so a11y regressions are diagnosable from the report without re-running
- **Scale considerations**: At 100+ tests, don't scan in every test — pick one audit test per significant page/state (a dedicated `a11y.spec.ts` per feature area works well) so scan time stays linear in page count, not test count

Reference: [@playwright-labs/fixture-a11y](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-a11y)
