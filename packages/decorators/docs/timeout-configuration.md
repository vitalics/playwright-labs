# Timeout Configuration

Control test timeouts at every level: suite, test, hook, and fixture. This guide covers all timeout strategies and their interactions.

## Table of Contents

- [Overview](#overview)
- [Timeout Levels](#timeout-levels)
- [Class-Level Timeout](#class-level-timeout)
- [Method-Level Timeout](#method-level-timeout)
- [Hook Timeouts](#hook-timeouts)
- [Fixture Timeouts](#fixture-timeouts)
- [Timeout Precedence](#timeout-precedence)
- [The @slow Decorator](#the-slow-decorator)
- [Validation Rules](#validation-rules)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Overview

The `@timeout(ms)` decorator sets the maximum time a test, hook, or fixture is allowed to run. It works at multiple levels with clear precedence rules.

```typescript
import { describe, test, timeout, beforeEach } from '@playwright-labs/decorators';

@describe('Timeout Example')
@timeout(30000)  // 30s for all tests
class TimeoutTests {
  @test('fast test')
  @timeout(5000)  // Override: 5s for this test
  async testFast() {
    await this.page.goto('/');
  }

  @test('slow test')
  async testSlow() {
    // Uses class timeout: 30s
    await this.page.waitForSelector('.lazy-content');
  }
}
```

---

## Timeout Levels

| Level | Applies To | Example | Scope |
|-------|-----------|---------|-------|
| **Global** | All tests | `playwright.config.ts` | Entire project |
| **Class** | All tests in suite | `@timeout(30000)` on class | Test suite |
| **Method** | Single test | `@timeout(5000)` on method | One test |
| **Hook** | Lifecycle hook | `@timeout(10000)` on `@beforeEach` | One hook |
| **Fixture** | Fixture setup | `@timeout(15000)` on `@use.define` | One fixture |

---

## Class-Level Timeout

Apply `@timeout` to the class (alongside `@describe`) to set a default timeout for all tests in the suite.

```typescript
@describe('API Tests')
@timeout(60000)  // 60 seconds for all tests
class ApiTests {
  @test('list users')
  async testListUsers() {
    // Has 60s timeout
    const response = await this.request.get('/api/users');
    expect(response.ok()).toBeTruthy();
  }

  @test('list products')
  async testListProducts() {
    // Also has 60s timeout
    const response = await this.request.get('/api/products');
    expect(response.ok()).toBeTruthy();
  }
}
```

> **Note:** `@describe` must be placed above `@timeout` on the class:
> ```typescript
> @describe('Tests')  // First
> @timeout(30000)     // Second
> class MyTests {}
> ```

---

## Method-Level Timeout

Override the class timeout for individual tests:

```typescript
@describe('Mixed Timeout Tests')
@timeout(30000)
class MixedTests {
  @test('quick validation')
  @timeout(2000)  // Override: 2 seconds
  async testQuick() {
    expect(1 + 1).toBe(2);
  }

  @test('page load')
  async testPageLoad() {
    // Uses class timeout: 30 seconds
    await this.page.goto('/');
  }

  @test('full page render with lazy content')
  @timeout(120000)  // Override: 2 minutes
  async testFullRender() {
    await this.page.goto('/dashboard');
    await this.page.waitForSelector('.lazy-chart', { timeout: 60000 });
    await this.page.waitForSelector('.lazy-table', { timeout: 60000 });
  }
}
```

---

## Hook Timeouts

Lifecycle hooks can have their own timeouts:

```typescript
@describe('Hook Timeout Tests')
@timeout(30000)
class HookTimeoutTests {
  @beforeAll()
  @timeout(60000)  // Database setup might be slow
  static async setupDatabase() {
    await Database.migrate();
    await Database.seed();
  }

  @beforeEach()
  @timeout(5000)  // Navigation should be quick
  async navigateToPage() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  @test('test')
  async test() {
    await expect(this.page.locator('h1')).toBeVisible();
  }

  @afterEach()
  @timeout(10000)  // Cleanup with retries
  async cleanup() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}
```

---

## Fixture Timeouts

Custom fixtures defined with `@use.define` can have timeouts:

```typescript
@describe('Fixture Timeout Tests')
class FixtureTimeoutTests {
  @use.define({ scope: 'worker' })
  @timeout(30000)  // Database connection may be slow
  async database() {
    return await Database.connect();
  }

  @use.define()
  @timeout(5000)  // API client should be fast
  apiClient = new ApiClient();

  @test('use fixtures')
  async test() {
    const users = await this.database.query('SELECT * FROM users');
    expect(users).toBeDefined();
  }
}
```

---

## Timeout Precedence

When multiple timeouts are defined, they follow this precedence (highest to lowest):

```
Method @timeout     →  Highest priority
  ↓
Class @timeout      →  Medium priority
  ↓
Global config       →  Lowest priority (playwright.config.ts)
```

### Example

```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000,  // Global: 60s
});

@describe('Precedence Tests')
@timeout(30000)  // Class: 30s (overrides global)
class PrecedenceTests {
  @test('uses class timeout')
  async test1() {
    // Timeout: 30s (class overrides global)
  }

  @test('uses method timeout')
  @timeout(5000)  // Method: 5s (overrides class)
  async test2() {
    // Timeout: 5s (method overrides class)
  }

  @test('inherits class timeout')
  async test3() {
    // Timeout: 30s (no method override, uses class)
  }
}
```

---

## The @slow Decorator

The `@slow()` decorator marks a test as slow and **triples its timeout**.

```typescript
@describe('Performance Tests')
@timeout(30000)
class PerformanceTests {
  @test('normal test')
  async testNormal() {
    // Timeout: 30s
  }

  @test('slow test')
  @slow()
  async testSlow() {
    // Timeout: 90s (30s * 3)
  }

  @test('slow with reason')
  @slow('Processes large dataset')
  async testSlowWithReason() {
    // Timeout: 90s, reason appears in reports
  }
}
```

### Conditional @slow

Mark tests as slow only under certain conditions:

```typescript
@describe('Conditional Slow')
class ConditionalSlowTests {
  @test('browser-dependent performance')
  @slow(
    (self) => self.browserName === 'webkit',
    'WebKit renders this page slower'
  )
  async testBrowserPerf() {
    await this.page.goto('/heavy-page');
    await expect(this.page.locator('.loaded')).toBeVisible();
  }
}
```

### @slow vs @timeout

| Feature | `@slow()` | `@timeout(ms)` |
|---------|-----------|-----------------|
| Sets absolute value | No | Yes |
| Multiplies existing | Yes (3x) | No |
| Shows in reports | "slow" annotation | No |
| Conditional support | Yes | No |
| Best for | Legitimately slow tests | Precise control |

---

## Validation Rules

The `@timeout` decorator validates its input strictly:

### Errors (Throws)

| Input | Error |
|-------|-------|
| `@timeout()` | Missing milliseconds value |
| `@timeout('5000')` | Must be a number |
| `@timeout(NaN)` | Cannot be NaN |
| `@timeout(Infinity)` | Cannot be Infinity |
| `@timeout(-1)` | Must be positive |
| `@timeout(0)` | Must be greater than 0 |

### Warnings (Console)

| Input | Warning |
|-------|---------|
| `@timeout(50)` | Very small timeout (< 100ms) |
| `@timeout(700000)` | Very large timeout (> 10 minutes) |
| Duplicate `@timeout` on same target | Multiple timeouts with different values |

### Examples

```typescript
// ❌ These all throw errors
@timeout()           // Missing value
@timeout('5000')     // Not a number
@timeout(NaN)        // NaN
@timeout(Infinity)   // Infinity
@timeout(-100)       // Negative
@timeout(0)          // Zero

// ⚠️ These produce warnings
@timeout(10)         // Very small
@timeout(900000)     // Very large (15 minutes)

// ✅ Valid values
@timeout(100)        // Minimum recommended
@timeout(5000)       // 5 seconds
@timeout(30000)      // 30 seconds
@timeout(60000)      // 1 minute
@timeout(300000)     // 5 minutes
```

---

## Common Patterns

### Environment-Based Timeouts

```typescript
const TIMEOUT = process.env.CI ? 60000 : 30000;

@describe('CI-Aware Tests')
@timeout(TIMEOUT)
class CIAwareTests {
  @test('may be slower in CI')
  async test() {
    await this.page.goto('/');
  }
}
```

### Tiered Timeout Strategy

```typescript
// Base timeouts by test type
const TIMEOUTS = {
  unit: 5000,
  integration: 30000,
  e2e: 120000,
} as const;

@describe('Unit Tests')
@timeout(TIMEOUTS.unit)
class UnitTests {
  @test('fast calculation')
  async test() {
    expect(2 + 2).toBe(4);
  }
}

@describe('E2E Tests')
@timeout(TIMEOUTS.e2e)
class E2ETests {
  @test('complete user flow')
  async test() {
    await this.page.goto('/');
    // ... long flow
  }
}
```

### Timeout with Retry

```typescript
@describe('Flaky Tests')
@timeout(30000)
class FlakyTests {
  @test('may need retry')
  @timeout(10000)  // Short timeout per attempt
  async test() {
    // With retries configured in playwright.config.ts,
    // each attempt gets 10s
    await this.page.goto('/');
    await expect(this.page.locator('.dynamic')).toBeVisible();
  }
}
```

---

## Troubleshooting

### Test Timing Out Unexpectedly

**Symptom:** Test fails with "Test timeout of X ms exceeded"

**Solutions:**
1. Increase timeout: `@timeout(60000)`
2. Check for missing `await`:
   ```typescript
   // ❌ Missing await causes timeout
   this.page.goto('/');
   // ✅ Fix
   await this.page.goto('/');
   ```
3. Check for infinite loops or unresolved promises
4. Use `@slow()` if the test legitimately takes long

### Hook Timeout vs Test Timeout

**Issue:** Hook times out but the test timeout is high enough.

**Explanation:** Hooks have their own timeout. If not specified, they inherit from the test/class timeout.

```typescript
@describe('Tests')
@timeout(60000)  // 60s for tests
class Tests {
  @beforeEach()
  @timeout(5000)  // Only 5s for setup - may timeout!
  async setup() {
    await this.page.goto('/slow-page');  // Takes > 5s
  }
}
```

**Fix:** Set appropriate hook timeout or remove it to inherit.

### Multiple @timeout Decorators

```typescript
// ⚠️ Warning: Multiple timeouts
@timeout(5000)
@timeout(10000)  // Last one wins
async test() {}

// ✅ Use a single @timeout
@timeout(10000)
async test() {}
```

---

**Related:** [API Reference](./api-reference.md) | [Best Practices](./best-practices.md) | [Edge Cases](./edge-cases.md)
