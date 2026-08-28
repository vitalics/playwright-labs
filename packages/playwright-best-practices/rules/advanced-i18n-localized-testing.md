---
title: Test Internationalization with Locale Projects, test.use, and Locale-Agnostic Locators
impact: LOW
impactDescription: catches locale-specific rendering bugs and prevents tests from breaking on translated text
tags: i18n, localization, locale, timezone, projects, test.use, getByRole, testid, intl, l10n
---

## Test Internationalization with Locale Projects, test.use, and Locale-Agnostic Locators

**Impact: LOW (catches locale-specific rendering bugs and prevents tests from breaking on translated text)**

Apps served in multiple languages fail in locale-specific ways: truncated German button labels, RTL layout breakage, wrong decimal separators (`1.234,56` vs `1,234.56`), or localized routes like `/fr/produits`. Playwright emulates locale and timezone per project or per test via the `locale` and `timezoneId` options — no third-party tooling required. The strategy: run the same suite across locale projects, navigate to localized routes explicitly, and never depend on translated visible text in locators — use roles, labels, and `data-testid` attributes that stay stable across translations.

## When to Use

- **Use locale projects when**: Your app ships in 2+ languages and you want the full suite (or a smoke subset) running per locale in CI
- **Use `test.use({ locale })` when**: Only a handful of tests exercise locale-sensitive behavior (formatting, RTL, translations) — cheaper than duplicating the whole suite
- **Use `timezoneId` when**: The app renders dates/times in the user's timezone (booking, calendars, schedulers) and you must verify both formatting and timezone correctness
- **Consider alternatives when**: You only need to verify that the right language files load — a single API-level check of the translation bundle may be enough without browser tests per locale
- **Required for**: E-commerce, SaaS, and content platforms with localized routes, pricing, or legal content per region

## Guidelines

### Do

- Define one Playwright **project per locale** in `playwright.config.ts` with `use: { locale, timezoneId, baseURL }` so the same specs run against each language
- Use **role-based locators and `getByTestId()`** for anything with translated text — `getByRole('button', { name: 'Submit' })` breaks in French (`Envoyer`); `getByTestId('submit-order')` does not
- Navigate to **localized routes explicitly** (`/fr/checkout`, `/de/kasse`) and assert the URL, not the page language attribute alone
- Assert number/date/currency output against **`Intl.NumberFormat` / `Intl.DateTimeFormat`** computed with the same locale — never hardcode `'1,234.56'`
- Test **both LTR and RTL** locales (e.g., `ar-EG`, `he-IL`) if your app supports them — layout bugs only appear in RTL
- Run a **smoke subset** (`grep` tag like `@i18n`) across all locales in CI instead of the full suite to keep pipeline time bounded

### Don't

- Don't use `getByText('Add to cart')` or `getByRole('button', { name: 'Add to cart' })` in tests that run across locales — visible text changes with every translation update
- Don't hardcode formatted values like `'$1,234.56'` or `'12/31/2026'` — separators, digit grouping, and date order differ per locale
- Don't set locale by clicking the app's language switcher inside every test — it's slow and tests the switcher, not your page; set `locale` in config instead
- Don't assume `locale` changes your app's content — Playwright's `locale` option only sets `Accept-Language` headers and `Intl` behavior in the browser; your app must actually respond to it
- Don't run every test in every locale by default — execution time multiplies by the number of locales

### Tool Usage Patterns

- **Locale emulation**: `use: { locale: 'fr-FR' }` in config or `test.use({ locale: 'fr-FR' })` in a spec — sets `Accept-Language` and JS `Intl` defaults
- **Timezone emulation**: `use: { timezoneId: 'Europe/Paris' }` — controls `Date` and `Intl.DateTimeFormat` output
- **Per-locale projects**: `projects: [{ name: 'fr', use: { locale: 'fr-FR', baseURL: 'https://example.com/fr' } }]`
- **Locale-agnostic locators**: `getByTestId()`, `getByRole()` without `name`, `getByLabel()` only if labels are not translated (rare — prefer testids)
- **Formatting assertions**: Node's built-in `Intl.NumberFormat(locale, { style: 'currency', currency })` and `Intl.DateTimeFormat(locale, options)` to compute expected strings

## Edge Cases and Constraints

### Limitations

- The `locale` option does not translate your app — it only changes browser-level signals (`Accept-Language`, `navigator.language`, `Intl` defaults). If locale selection is cookie/account-based, you must set that state instead (or in addition)
- `timezoneId` accepts only IANA names (`'America/New_York'`, not `'EST'`)
- Multiplying the full suite by N locales multiplies CI time by N — budget for it or scope to a smoke subset
- Fonts for CJK/Arabic scripts must exist on CI runners or text rendering assertions (screenshots) will differ from local runs

### Edge Cases

1. **Route-based vs. header-based localization**: If the app picks language from the URL (`/fr/...`), set `baseURL` per project. If it uses `Accept-Language`, `locale` alone is enough. If it uses cookies/localStorage, seed them in a `storageState` or fixture — `locale` won't do it.
2. **RTL locales**: `ar-*` and `he-*` flip layout direction. Assert on testids, not coordinates or pixel positions, and include at least one RTL project if supported.
3. **Pseudo-localization**: Some teams test with a pseudo-locale (`en-XA`) that pads strings to catch truncation before real translations exist — treat it as just another project.
4. **Ambiguous date formats**: `01/02/2026` means Jan 2 in `en-US` but Feb 1 in `en-GB`. Always derive expectations via `Intl.DateTimeFormat` with the project's locale instead of picking one convention.

### What Breaks If Ignored

- **Hardcoded translated text in locators**: Every translation update breaks N tests at once; adding a new locale requires rewriting locators instead of adding a project
- **Hardcoded formatted values**: Tests pass in `en-US` CI and fail for `de-DE` (`1.234,56 €`), producing false failures that mask real i18n bugs
- **No per-locale runs**: Locale-only regressions (truncated labels, broken plural rules, untranslated keys shown as `checkout.title`) ship to production unnoticed

**Incorrect (hardcoded English text and formatted values in a test meant to run per-locale):**

```typescript
import { test, expect } from '@playwright/test';

// ❌ This spec silently runs only in the runner's default locale
test('checkout shows total', async ({ page }) => {
  await page.goto('/checkout');

  // ❌ Breaks in every non-English locale: 'Envoyer la commande', 'Bestellung absenden', ...
  await page.getByRole('button', { name: 'Place order' }).click();

  // ❌ Breaks for de-DE ('1.234,56 €') and fr-FR ('1 234,56 €')
  await expect(page.getByText('$1,234.56')).toBeVisible();

  // ❌ Ambiguous format — fails or misreads in en-GB ('31/12/2026')
  await expect(page.getByText('Delivery by 12/31/2026')).toBeVisible();
});
```

**Why this fails:**
- Locators keyed to English visible text make the test impossible to reuse across locales
- Hardcoded currency/date strings only match one locale's `Intl` formatting
- Nothing actually sets a locale — the test doesn't verify i18n at all

**Correct (locale projects + testids + Intl-derived expectations):**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'en-US',
      use: {
        locale: 'en-US',
        timezoneId: 'America/New_York',
        baseURL: 'https://example.com/en',
      },
    },
    {
      name: 'de-DE',
      use: {
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin',
        baseURL: 'https://example.com/de',
      },
    },
    {
      name: 'ar-EG',
      use: {
        locale: 'ar-EG',
        timezoneId: 'Africa/Cairo',
        baseURL: 'https://example.com/ar',
      },
    },
  ],
});
```

```typescript
// tests/checkout.spec.ts — same spec runs in every locale project
import { test, expect } from '@playwright/test';

test('checkout shows localized total', async ({ page }, testInfo) => {
  await page.goto('/checkout');

  // ✅ testid is identical in every translation
  await page.getByTestId('place-order').click();

  // ✅ Compute the expected string with the project's own locale
  const locale = testInfo.project.use.locale ?? 'en-US';
  const expected = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(1234.56);

  await expect(page.getByTestId('order-total')).toHaveText(expected);
});
```

**Why this works:**
- One spec, N locales: adding a language is a 6-line project entry, not a rewritten suite
- `getByTestId` and URL assertions never break when translations change
- Expected currency/date strings come from the same `Intl` engine the browser uses, so they match in every locale

## Common Mistakes

### Mistake 1: Switching language via the UI in every test

```typescript
// ❌ Slow, tests the language switcher instead of your page
test('german checkout', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('language-switcher').click();
  await page.getByText('Deutsch').click();
  await page.goto('/checkout');
});
```

**Why this is wrong**: Adds UI round-trips per test, couples every test to the switcher's markup, and doesn't set `Accept-Language` — server-rendered content may still come back in English.

**How to fix**:

```typescript
// ✅ Emulate locale at the browser level; navigate straight to the page under test
test.use({ locale: 'de-DE' });

test('german checkout', async ({ page }) => {
  await page.goto('/de/checkout');
});
```

### Mistake 2: Asserting untranslated keys count as "localized"

```typescript
// ❌ Passes even if the whole page shows raw i18n keys
test('page is localized', async ({ page }) => {
  await page.goto('/fr');
  await expect(page).toHaveURL(/\/fr/);
});
```

**Why this is wrong**: The URL says nothing about content — missing translation keys render as `checkout.title` or fallback English.

**How to fix**:

```typescript
// ✅ Assert a stable element exists AND contains no untranslated key pattern
test('page is localized', async ({ page }) => {
  await page.goto('/fr');
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(main).not.toContainText(/\b[a-z]+\.[a-z.]+(\.\w+)+\b/); // e.g. "checkout.title"
});
```

### Mistake 3: Duplicating specs per locale

```typescript
// ❌ checkout.en.spec.ts, checkout.de.spec.ts, checkout.fr.spec.ts — drift guaranteed
test('french total', async ({ page }) => { /* copy of english test with french strings */ });
```

**Why this is wrong**: N copies of the same logic diverge with every change; adding a locale means copy-pasting a whole file.

**How to fix**: Use locale **projects** (config example above) so one spec file runs in every locale. For the rare truly locale-specific assertion, gate it on `testInfo.project.name` or put it in a `test.describe` with its own `test.use`.

## Advanced Patterns

Parametrize a smoke subset across locales without touching the main suite by combining projects with `grep`:

```typescript
// playwright.config.ts — run only @i18n-tagged tests in every locale
export default defineConfig({
  projects: [
    { name: 'en-US', grep: /@i18n/, use: { locale: 'en-US', timezoneId: 'America/New_York' } },
    { name: 'fr-FR', grep: /@i18n/, use: { locale: 'fr-FR', timezoneId: 'Europe/Paris' } },
    { name: 'ja-JP', grep: /@i18n/, use: { locale: 'ja-JP', timezoneId: 'Asia/Tokyo' } },
    { name: 'regression', use: { locale: 'en-US' } }, // full suite, default locale
  ],
});
```

```typescript
// tests/i18n.spec.ts
import { test, expect } from '@playwright/test';

test('dates render in the project timezone @i18n', async ({ page }, testInfo) => {
  await page.goto('/orders');

  const locale = testInfo.project.use.locale ?? 'en-US';
  const timeZone = testInfo.project.use.timezoneId ?? 'UTC';
  const expected = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone,
  }).format(new Date('2026-08-28T12:00:00Z'));

  await expect(page.getByTestId('order-date').first()).toHaveText(expected);
});
```

**When to use this pattern**: Large suites where the full run per locale is too expensive — tag the ~10% of tests that touch formatting, routing, or translated content and run only those across locales.

## Integration with Other Best Practices

- **Role-based locators (3.1)**: Role/testid locators are a prerequisite — text-based locators cannot survive localization
- **Page Object Model (2.1)**: Centralize testids in page objects so a locale project never touches locator internals
- **Sharding (5.2)**: Locale projects multiply test count — shard per-locale projects across CI machines to keep wall time flat
- **test.step (7.1)**: Wrap locale-specific assertions in `test.step(locale)` so failures clearly identify the failing language

Reference: [Playwright Locale and Timezone Emulation](https://playwright.dev/docs/emulation#locale--timezone)
