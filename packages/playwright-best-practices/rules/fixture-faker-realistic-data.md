---
title: Generate Realistic Test Data with fixture-faker
impact: MEDIUM
impactDescription: eliminates hardcoded data collisions and makes every test run generate unique, locale-aware inputs
tags: faker, test-data, fixtures, data-generation
---

## Generate Realistic Test Data with fixture-faker

**Impact: MEDIUM (eliminates hardcoded data collisions and makes every test run generate unique, locale-aware inputs)**

Hardcoded emails, usernames, and IDs are a quiet source of test failure: a second run hits a unique constraint in the database, a parallel worker collides with its neighbor, or a "test user" left over from last week makes an assertion ambiguous. The `@playwright-labs/fixture-faker` package wraps `@faker-js/faker` in Playwright fixtures — `faker` for immediate use and `useFaker` for configured instances (locale, seed, randomizer) — so every test gets realistic, freshly generated data that never repeats between runs.

## When to Use

- **Use the `faker` fixture when**: Any test fills a form, creates an entity, or registers a user — emails, passwords, names, phone numbers, addresses
- **Use `useFaker` when**: You need a configured instance — a different locale (`useFaker({ locale: "fr" })`), a deterministic seed for reproducing a CI failure (`useFaker({ seed: 1234 })`), or a custom `randomizer`
- **Use generation over constants when**: The system under test enforces uniqueness (emails, usernames, SKUs) or rejects duplicates
- **Consider alternatives when**: The test asserts on a specific seeded entity (a known admin account, a fixture row inserted by a migration) — generate the *input*, not the *precondition*
- **Required for**: CRUD and registration flows, tests that run more than once against the same environment, parallel suites sharing one database

## Guidelines

### Do

- Store every generated value in a local variable and reuse that variable for both the action and the assertion
- Generate data as close to the action as possible — at the top of the test or inside the `test.step` that uses it
- Use domain-appropriate generators: `faker.internet.email()` for emails, `faker.person.fullName()` for names, `faker.string.uuid()` for opaque IDs
- Use `useFaker({ locale })` for localized forms — a French locale produces French names, addresses, and phone formats that actually pass localized validation
- Use `useFaker({ seed })` when you need byte-for-byte reproducibility — debugging a flaky run, snapshotting a generated payload
- Merge the package's `test`/`expect` into your shared fixture file once with `mergeTests`/`mergeExpects`, then import from there everywhere

### Don't

- Don't call a generator twice and expect the same value — `faker.internet.email()` returns a **different** email on every call; capture it once
- Don't hardcode `test@example.com` or `user-123` in tests that create resources — the second run against the same backend fails on uniqueness
- Don't depend on data a previous test created with hardcoded values — test-order coupling breaks under sharding and retries
- Don't assert exact equality against unseeded random data (`toBe(faker.lorem.sentence())` twice is a guaranteed mismatch) — assert shape, format, or the captured variable
- Don't generate a new faker instance per assertion — one instance per test is enough; more instances only add entropy you have to track

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-faker` (peer deps: `@playwright/test` and `@faker-js/faker`)
- **Fixtures**: `faker` (preconfigured, default locale `en_US`) and `useFaker(options?)` where `options` is `{ locale?, randomizer?, seed? }`; `locale` accepts any key of faker's `allLocales` (`"en_US"`, `"fr"`, `"de"`, `"ja"`, …)
- **Exports**: `test`, `expect`, and the `Fixture` type from `@playwright-labs/fixture-faker`
- **Matchers**: none — the exported `expect` is Playwright's base expect. It exists so it composes cleanly via `mergeExpects` with other Playwright-labs packages, not to add assertions
- **Cleanup**: both fixtures return a `Faker & Disposable` — the `faker` fixture disposes its internal reference at teardown, so instances never leak between tests

## Edge Cases and Constraints

### Limitations

- Generation is pseudo-random, not guaranteed-unique. Two calls to `faker.internet.email()` colliding is astronomically unlikely but not impossible — backends with hard uniqueness guarantees should still key off `faker.string.uuid()` or a worker-scoped prefix
- The default `faker` fixture is fixed to `en_US`. Requesting another locale requires calling `useFaker({ locale })` yourself — there is no config-level locale override
- A faker instance obtained from `useFaker` is only valid inside the current test — it is disposed with the fixture scope, so don't stash it in module-level state for reuse across tests

### Edge Cases

1. **Reproducing a failed CI run**: Regenerate the identical data by passing the seed — `useFaker({ seed: 1234 })` makes every subsequent generator call deterministic. Log generated values on failure so you can pick a seed or the raw values for local reproduction.
2. **Parallel workers on a shared database**: Randomness alone is usually enough, but for strict uniqueness combine faker output with `test.info().workerIndex` or `test.info().testId` — e.g. an email local-part containing the test ID.
3. **Localized validation**: A German postal-code field rejects a US ZIP. Generate with `useFaker({ locale: "de" })` so `faker.location.zipCode()` matches what the form validates.
4. **Seeded vs. unseeded in one suite**: `useFaker` creates a fresh instance per call, so a seeded instance for one assertion doesn't affect the unseeded `faker` fixture used elsewhere in the same test.

### What Breaks If Ignored

- **Second-run failures**: `register.spec.ts` passes on a clean database, then fails forever with "email already taken" until someone wipes the environment
- **Parallel collisions**: Two workers submit the same hardcoded username within the same second — one gets a 409, and the failure looks like a race in the app instead of the test data
- **Order coupling**: `test B` logs in with the credentials `test A` created. Run `test B` alone, on a different shard, or after a retry — it fails for a missing precondition, not an app bug
- **Stale-data ambiguity**: An assertion matches a leftover record from a previous run, so the test passes while the feature is actually broken

**Incorrect (hardcoded data, second run collides, workers conflict):**

```typescript
import { test, expect } from "@playwright/test";

test("user registration", async ({ page }) => {
  await page.goto("/signup");

  // ❌ Same values on every run — the second run hits "email already taken"
  await page.fill("#email", "john.doe@example.com");
  await page.fill("#username", "johndoe");
  await page.fill("#password", "Password123!");
  await page.click("#submit");

  // ❌ Passes if ANY previous run left this user behind — proves nothing about this run
  await expect(page.locator("#welcome")).toContainText("johndoe");
});

test("login with the registered user", async ({ page }) => {
  // ❌ Depends on the previous test's hardcoded data — breaks alone, on shards, on retry
  await page.goto("/login");
  await page.fill("#email", "john.doe@example.com");
  await page.fill("#password", "Password123!");
  await page.click("#submit");
});
```

**Why this fails:**
- Fixed emails/usernames violate uniqueness constraints on any run after the first
- Parallel workers submit identical data simultaneously — intermittent 409s misread as app races
- Cross-test dependency on a hardcoded precondition makes tests non-runnable in isolation

**Correct (generated data captured in variables, self-contained tests):**

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

test("user registration and login", async ({ page, faker }) => {
  // ✅ Fresh, realistic values on every run — no collisions, no stale matches
  const email = faker.internet.email();
  const username = faker.internet.username();
  const password = faker.internet.password({ length: 16 });

  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#submit");

  // ✅ Asserts against the values THIS run generated
  await expect(page.locator("#welcome")).toContainText(username);

  // ✅ Same test logs in with its own data — no cross-test dependency
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("#submit");
  await expect(page).toHaveURL(/\/dashboard/);
});
```

**Why this works:**
- Every run produces unique inputs, so uniqueness constraints never fire between runs
- Actions and assertions share captured variables — no mismatch, no stale hits
- The test carries its full lifecycle, so it passes alone, on any shard, in any order

## Common Mistakes

### Mistake 1: Generating the value twice — action and assertion diverge

```typescript
test("profile shows email", async ({ page, faker }) => {
  await page.goto("/settings");
  await page.fill("#email", faker.internet.email());
  await page.click("#save");

  // ❌ Second call generates a DIFFERENT email — assertion can never pass
  await expect(page.locator("#email")).toHaveValue(faker.internet.email());
});
```

**Why this is wrong**: Every generator call produces new random data. The value asserted is not the value submitted, so the test fails deterministically — or worse, passes by coincidence once in a million runs and hides the bug.

**How to fix**:

```typescript
test("profile shows email", async ({ page, faker }) => {
  const email = faker.internet.email(); // ✅ capture once

  await page.goto("/settings");
  await page.fill("#email", email);
  await page.click("#save");

  await expect(page.locator("#email")).toHaveValue(email); // ✅ same value
});
```

### Mistake 2: Shared fixed test data across parallel workers

```typescript
const SKU = "SKU-0001"; // ❌ every worker creates the same SKU

test("create product", async ({ page }) => {
  await page.goto("/products/new");
  await page.fill("#sku", SKU);
  await page.click("#create");
  // Worker B gets "duplicate SKU" whenever it overlaps with worker A
});
```

**Why this is wrong**: Module-level constants are identical in every worker process. Any backend uniqueness rule turns parallelism into a coin flip.

**How to fix**:

```typescript
test("create product", async ({ page, faker }) => {
  // ✅ Unique per test execution; testId makes collisions structurally impossible
  const sku = `SKU-${test.info().testId.slice(0, 8)}-${faker.string.alphanumeric(6)}`;

  await page.goto("/products/new");
  await page.fill("#sku", sku);
  await page.click("#create");
  await expect(page.locator("#sku-cell")).toHaveText(sku);
});
```

### Mistake 3: Asserting exact content of unseeded random text

```typescript
test("bio saves", async ({ page, faker }) => {
  await page.goto("/profile");
  await page.fill("#bio", faker.lorem.sentence());
  await page.click("#save");

  // ❌ Compares against a freshly generated sentence, not the submitted one
  await expect(page.locator("#bio-preview")).toHaveText(faker.lorem.sentence());
});
```

**Why this is wrong**: Same double-generation bug as Mistake 1, but subtler with free text — it reads like a content assertion while actually asserting nothing.

**How to fix**:

```typescript
test("bio saves", async ({ page, faker }) => {
  const bio = faker.lorem.sentence(); // ✅ capture, submit, assert — one value

  await page.goto("/profile");
  await page.fill("#bio", bio);
  await page.click("#save");
  await expect(page.locator("#bio-preview")).toHaveText(bio);
});
```

## Advanced Patterns

### Multi-locale data for internationalized forms

`useFaker` builds a fresh `Faker` instance for any locale exported by faker's `allLocales`, so one spec can cover several markets:

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

const locales = ["en_US", "fr", "de", "ja"] as const;

for (const locale of locales) {
  test(`signup works for locale ${locale}`, async ({ page, useFaker }) => {
    // ✅ Locale-aware names, addresses, phones that pass localized validation
    const faker = await useFaker({ locale });

    await page.goto(`/${locale}/signup`);
    await page.fill("#name", faker.person.fullName());
    await page.fill("#city", faker.location.city());
    await page.fill("#email", faker.internet.email());
    await page.click("#submit");
    await expect(page.locator("#welcome")).toBeVisible();
  });
}
```

### Deterministic data with a seed

When a CI failure needs exact local reproduction, trade randomness for determinism:

```typescript
test("invoice totals (seeded)", async ({ page, useFaker }) => {
  // ✅ Identical data on every run — failures replay byte-for-byte
  const faker = await useFaker({ seed: 1234 });

  const product = faker.commerce.productName();
  const price = faker.commerce.price();

  await page.goto("/invoice/new");
  await page.fill("#product", product);
  await page.fill("#price", price);
  await page.click("#save");
  await expect(page.locator("#product-cell")).toHaveText(product);
});
```

**When to use this pattern**: Seeds are for debugging and replay, not the default. Keeping the suite unseeded by default means the data itself explores the input space — occasionally surfacing edge cases (long names, apostrophes, unicode) that fixed data never would.

### Merging into a shared fixture file

Compose `faker` with your other fixtures once, following the merge pattern:

```typescript
// fixtures/index.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as fakerExpect,
  test as fakerTest,
} from "@playwright-labs/fixture-faker";

export const test = mergeTests(fakerTest);
export const expect = mergeExpects(fakerExpect);
```

Every spec then imports `test`/`expect` from `fixtures` and gets `faker` and `useFaker` alongside page objects and other custom fixtures — one import, no duplication.

## Integration with Other Best Practices

- **Merge Tests and Expects** (`fixture-merge-tests-expects`): `fixture-faker` is designed for `mergeTests`/`mergeExpects` — merging is the intended way to combine it with other Playwright-labs fixture packages
- **Parallel Test Isolation** (`parallel-test-isolation`): generated data is the data-layer half of isolation — each test owns its entities, so workers and shards never share mutable state
- **Web-First Assertions** (`assertion-web-first`): pair generated inputs with `expect(locator).toHaveValue(captured)` instead of reading input values manually — the assertion auto-waits while the captured variable stays stable
- **API Mocking** (`advanced-api-mocking`): seed mock responses with faker data at route-setup time so UI assertions can match against the same captured values
- **Scale considerations**: At 100+ tests, generated data turns "environment reset" from a nightly chore into a non-issue — but only if every test generates rather than borrows. Audit for module-level string constants; they are the residue that still collides

Reference: [@playwright-labs/fixture-faker](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-faker)
