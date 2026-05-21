---
title: Compose Fixtures with mergeTests and mergeExpects for Modular Test Suites
impact: MEDIUM
impactDescription: enables scalable fixture composition across large teams without conflicts
tags: fixtures, mergeTests, mergeExpects, modular, composition, scalability
---

## Compose Fixtures with mergeTests and mergeExpects for Modular Test Suites

**Impact: MEDIUM (enables scalable fixture composition across large teams without conflicts)**

Playwright's `mergeTests` and `mergeExpects` utilities let you combine multiple fixture sets and custom matchers from separate packages or team modules into a single unified `test` and `expect`. This is the standard pattern for third-party fixture libraries and for splitting large fixture suites across feature teams without naming collisions.

## When to Use

- **Use mergeTests/mergeExpects when**: Combining fixtures from multiple `test.extend()` sources, using third-party fixture packages like `@playwright-labs/*`, or splitting fixtures across domains (auth, database, API)
- **Prefer over manual extend-chaining when**: You have 3+ independent fixture modules, need to compose external packages, or want to isolate fixture ownership by team
- **Required for**: Monorepos, large teams, any project using `@playwright-labs/fixture-*` packages

## Guidelines

### Do

- Create a single `fixtures.ts` (or `test.ts`) entry point that merges everything and re-exports
- Merge both `test` and `expect` objects — `mergeTests` handles fixtures, `mergeExpects` handles matchers
- Type each module's fixtures independently before merging
- Use `mergeTests` at project level in playwright.config.ts-adjacent files, not inside test files

### Don't

- Don't call `mergeTests` inside individual test files — create a shared file
- Don't chain `.extend()` when composing unrelated modules — use `mergeTests` instead
- Don't forget to re-export from the merged file — all tests should import from one place
- Don't mix merged and non-merged imports in the same project

### Tool Usage Patterns

- **Primary tools**: `mergeTests()`, `mergeExpects()` from `@playwright/test`
- **Third-party fixtures**: All `@playwright-labs/fixture-*` packages export a `test` and `expect` that are merge-compatible
- **Pattern**: one `fixtures/index.ts` that merges and re-exports; all spec files import from it

## Edge Cases and Constraints

### Limitations

- Fixture names must be unique across all merged modules — duplicate names cause a runtime error
- `mergeExpects` only merges custom matchers; TypeScript types may need manual declaration merging via `declare module "@playwright/test"`
- Order of merge arguments does not affect fixture resolution but does affect error messages

### Edge Cases

1. **Duplicate fixture names**: If two modules both define `apiClient`, `mergeTests` throws. Solution: namespace fixtures (`authApiClient`, `adminApiClient`) before merging.
2. **Matcher type conflicts**: Two packages extending `Matchers<R>` with the same method name silently override. Solution: check package changelogs before updating.
3. **Circular fixture dependencies across modules**: Module A's fixture depends on Module B's fixture. Works fine with `mergeTests` — Playwright resolves across the merged graph.

### What Breaks If Ignored

- **Without merging**: Deep `.extend().extend().extend()` chains become unreadable and impossible to split across files
- **Without re-exporting from one file**: Tests import inconsistently, some getting older fixture versions
- **Without mergeExpects**: Custom matchers from different packages are silently dropped

**Incorrect (chaining extends for unrelated modules):**

```typescript
// ❌ Hard to maintain, mixes unrelated concerns
import { test as base } from '@playwright/test';
import { authFixtures } from './auth';
import { dbFixtures } from './database';
import { apiFixtures } from './api';

export const test = base
  .extend(authFixtures)
  .extend(dbFixtures)
  .extend(apiFixtures);
// Matchers from each module are lost — no mergeExpects
```

**Correct (using mergeTests and mergeExpects):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';

// Third-party playwright-labs packages
import {
  test as timersTest,
  expect as timersExpect,
} from '@playwright-labs/fixture-timers';
import {
  test as abortTest,
  expect as abortExpect,
} from '@playwright-labs/fixture-abort';
import {
  test as ajvTest,
  expect as ajvExpect,
} from '@playwright-labs/fixture-ajv-ts';
import {
  test as envTest,
  expect as envExpect,
} from '@playwright-labs/fixture-env';

// Internal project fixtures
import { test as authTest, expect as authExpect } from './auth.fixture';
import { test as dbTest } from './database.fixture';

// ✅ Merge all fixtures into one test object
export const test = mergeTests(
  timersTest,
  abortTest,
  ajvTest,
  envTest,
  authTest,
  dbTest,
);

// ✅ Merge all custom matchers into one expect object
export const expect = mergeExpects(
  timersExpect,
  abortExpect,
  ajvExpect,
  envExpect,
  authExpect,
);
```

```typescript
// tests/api.spec.ts — all tests import from one place
import { test, expect } from '../fixtures';

test('POST /users validates schema', async ({ request, schema }) => {
  // schema fixture from @playwright-labs/fixture-ajv-ts
  const UserSchema = schema.object({ id: schema.number(), email: schema.string() });

  const res = await request.post('/api/users', { data: { email: 'test@example.com' } });
  expect(await res.json()).toMatchSchema(UserSchema); // toMatchSchema from ajvExpect
});

test('cancel slow request', async ({ abortController, signal }) => {
  // abortController/signal fixtures from @playwright-labs/fixture-abort
  const fetch = globalThis.fetch('/api/slow', { signal });
  abortController.abort('timeout');
  await expect(fetch).rejects.toThrow();
});
```

```typescript
// Splitting fixtures by team ownership — each team owns a module
// team-auth/fixtures.ts
import { test as base } from '@playwright/test';
export const test = base.extend<{ authToken: string }>({
  authToken: async ({}, use) => {
    const token = await fetchToken();
    await use(token);
  },
});

// team-payments/fixtures.ts
import { test as base } from '@playwright/test';
export const test = base.extend<{ paymentApi: PaymentClient }>({
  paymentApi: async ({}, use) => {
    await use(new PaymentClient());
  },
});

// fixtures/index.ts — platform team composes everything
import { mergeTests } from '@playwright/test';
import { test as authTest } from '../team-auth/fixtures';
import { test as paymentsTest } from '../team-payments/fixtures';

export const test = mergeTests(authTest, paymentsTest);
export { expect } from '@playwright/test';
```

Reference: [Playwright mergeTests](https://playwright.dev/docs/api/class-test#test-merge-tests)
