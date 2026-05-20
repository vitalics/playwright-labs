---
title: Organize Tests with OOP Decorator Pattern for Large Scalable Test Suites
impact: MEDIUM
impactDescription: reduces boilerplate by 40-60% and enables class-based test organization for large teams
tags: decorators, OOP, class-based, describe, test, beforeAll, afterAll, scalability, large-teams, e2e
---

## Organize Tests with OOP Decorator Pattern for Large Scalable Test Suites

**Impact: MEDIUM (reduces boilerplate by 40-60% and enables class-based test organization for large teams)**

Playwright's functional `test.describe` / `test.beforeEach` style works well for small suites but becomes verbose and hard to share across a large team. The `@playwright-labs/decorators` package provides TC39 Stage 3 decorators — `@describe`, `@test`, `@beforeAll`, `@beforeEach`, `@afterEach`, `@afterAll`, `@skip`, `@tag`, `@timeout`, `@test.each` — that map directly to Playwright's test runner while enabling class inheritance, shared lifecycle methods, and Page Object Model integration.

## When to Use

- **Use decorators when**: You have 10+ tests per area, need class inheritance for shared setup, or want Page Object Model tests to feel cohesive
- **Prefer functional style when**: Writing simple one-off tests or scripts — decorators add a tsconfig requirement
- **Use @beforeAll/@afterAll (static) when**: Setting up expensive shared resources (DB connections, auth state)
- **Use @beforeEach/@afterEach (instance) when**: Resetting per-test state (navigate to page, clear cookies)
- **Required for**: Large teams where test suites span multiple files and share base class setups

## Guidelines

### Do

- Use `@describe` on class to define a test suite, `@test` on methods to define test cases
- Use `static` methods for `@beforeAll`/`@afterAll` — they run once per suite on the class, not instances
- Extend base test classes to share lifecycle hooks across related suites
- Use `@test.each(data, 'title $1')` for data-driven tests
- Use `@before(async self => {...})` and `@after(async self => {...})` for test-specific setup
- Set `"experimentalDecorators": false` and `"target": "ES2022"` in `tsconfig.json` — this uses TC39 decorators, not legacy

### Don't

- Don't mix decorator-style and functional-style tests in the same file
- Don't enable `experimentalDecorators: true` — these are TC39 Stage 3 decorators, not legacy TypeScript decorators
- Don't put expensive one-time setup in `@beforeEach` — use `@beforeAll` static methods
- Don't access `this.page` without a `@use('page')` decorator or fixture setup

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/decorators @playwright/test`
- **Decorators**: `@describe(title)`, `@test(title)`, `@test.each(data, title)`, `@beforeAll()`, `@afterAll()`, `@beforeEach()`, `@afterEach()`, `@before(fn)`, `@after(fn)`, `@skip()`, `@fixme()`, `@slow()`, `@tag(...tags)`, `@timeout(ms)`, `@annotate(type, value)`, `@use(...fixtures)`, `@use.define(fixtures)`
- **tsconfig.json**: `"target": "ES2022"`, `"experimentalDecorators": false`

## Edge Cases and Constraints

### Limitations

- Requires TypeScript 5.0+ and `"target": "ES2022"` or higher
- Does not support `experimentalDecorators: true` — uses TC39 Stage 3 syntax
- Static `@beforeAll`/`@afterAll` methods set properties on the owning class, not the subclass — access shared state via the base class
- `@test.each` data is bound at class definition time, not at runtime

### Edge Cases

1. **Inheritance and @beforeAll**: When a child class calls an inherited static `@beforeAll`, it runs on the base class. Access shared state from `BaseCass.connection`, not `ChildClass.connection`.
2. **Multiple @beforeEach in hierarchy**: Both parent and child `@beforeEach` run — parent first, then child.
3. **Test timeout override**: `@timeout(ms)` on a method overrides the class-level `@timeout` for that specific test.

### What Breaks If Ignored

- **Without @describe on class**: Tests are registered flat without suite grouping
- **Without static @beforeAll**: Database connections or auth setup re-runs before every test instead of once
- **With experimentalDecorators: true**: Runtime errors — decorator metadata API is incompatible

**Incorrect (functional style repeated across many files, no sharing):**

```typescript
import { test, expect } from '@playwright/test';

// ❌ Same setup copy-pasted in every file
test.describe('User Profile Tests', () => {
  let db: Database;

  test.beforeAll(async () => {
    db = await Database.connect(); // repeated in every suite
  });

  test.afterAll(async () => {
    await db.close(); // repeated in every suite
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/profile'); // repeated in every test
  });

  test('shows user name', async ({ page }) => {
    await expect(page.locator('.name')).toBeVisible();
  });
});
```

**Correct (OOP decorators with inheritance):**

```typescript
// tsconfig.json
// { "compilerOptions": { "experimentalDecorators": false, "target": "ES2022" } }

// base/database-test.ts — shared base class
import { describe, beforeAll, afterAll } from '@playwright-labs/decorators';
import { Database } from '../db';

@describe('Database Test Base')
export class DatabaseTest {
  static connection: Database;

  @beforeAll()
  static async connect() {
    DatabaseTest.connection = await Database.connect();
  }

  @afterAll()
  static async disconnect() {
    await DatabaseTest.connection.close();
  }
}
```

```typescript
// tests/users.spec.ts — inherit shared lifecycle
import { describe, test, beforeEach, afterEach, tag } from '@playwright-labs/decorators';
import { DatabaseTest } from '../base/database-test';
import { expect } from '@playwright/test';

@describe('User Management')
@tag('users', 'e2e')
class UserTests extends DatabaseTest {
  @beforeEach()
  async navigateToUsers() {
    await this.page.goto('/users');
  }

  @test('lists all users')
  async testListUsers() {
    await expect(this.page.locator('[data-testid="user-row"]')).toHaveCount(3);
  }

  @test('can create a user')
  async testCreateUser() {
    await this.page.click('[data-testid="create-user"]');
    await this.page.fill('[name="email"]', 'new@example.com');
    await this.page.click('[type="submit"]');
    await expect(this.page.locator('.success-toast')).toBeVisible();
  }
}
```

```typescript
// Data-driven tests with @test.each
import { describe, test } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('Login - Parameterized')
class LoginTests {
  @test.each([
    ['user@example.com', 'pass123', '/dashboard'],
    ['admin@example.com', 'admin', '/admin'],
  ], 'login as $1 redirects to $3')
  async testLogin(email: string, password: string, redirectTo: string) {
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.click('[type="submit"]');
    await expect(this.page).toHaveURL(redirectTo);
  }
}
```

```typescript
// Test-specific setup/teardown with @before and @after
import { describe, test, before, after } from '@playwright-labs/decorators';

@describe('Checkout Flow')
class CheckoutTests {
  private orderId: string;

  @test('place order and verify confirmation')
  @before(async (self) => {
    // runs before this test only
    self.orderId = await self.api.createDraftOrder();
  })
  @after(async (self) => {
    // runs after this test even if it fails
    await self.api.cancelOrder(self.orderId);
  })
  async testPlaceOrder() {
    await this.page.goto(`/checkout/${this.orderId}`);
    await this.page.click('[data-testid="place-order"]');
    await expect(this.page.locator('.confirmation-number')).toBeVisible();
  }
}
```

```typescript
// Annotations, skips, and timeouts
import { describe, test, skip, fixme, slow, timeout, annotate } from '@playwright-labs/decorators';

@describe('Performance Tests')
@timeout(60_000) // 60s for all tests in suite
class PerformanceTests {
  @test('fast path completes quickly')
  @timeout(5_000) // override for this test
  async testFastPath() { /* ... */ }

  @test('slow benchmark')
  @slow() // marks test as slow, triples timeout
  @annotate('category', 'performance')
  async testSlowBenchmark() { /* ... */ }

  @test('known broken test')
  @fixme() // fails and reports as expected failure
  async testBrokenFeature() { /* ... */ }
}
```

Reference: [@playwright-labs/decorators](https://github.com/vitalics/playwright-labs/tree/main/packages/decorators)
