# @playwright-labs/decorators

> TypeScript decorators for Playwright Test - Write elegant, object-oriented tests with class-based syntax

[![npm version](https://img.shields.io/npm/v/@playwright-labs/decorators.svg)](https://www.npmjs.com/package/@playwright-labs/decorators)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Core Decorators](#core-decorators)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Documentation](#documentation)
- [Examples](#examples)
- [TypeScript Configuration](#typescript-configuration)
- [License](#license)

## Quick Start

```typescript
import { describe, test, beforeEach, afterEach } from '@playwright-labs/decorators';

@describe('Login Tests')
class LoginTests {
  @beforeEach()
  async setup() {
    await this.page.goto('https://example.com/login');
  }

  @test('should login successfully')
  async testLogin() {
    await this.page.fill('#username', 'user@example.com');
    await this.page.fill('#password', 'password123');
    await this.page.click('#login-button');
    await expect(this.page).toHaveURL('/dashboard');
  }

  @afterEach()
  async cleanup() {
    await this.page.context().clearCookies();
  }
}
```

## Features

✨ **Class-Based Tests** - Organize tests using OOP principles  
🎯 **Lifecycle Decorators** - `@beforeAll`, `@beforeEach`, `@afterEach`, `@afterAll`  
⏱️ **Timeout Control** - `@timeout()` for classes, methods, and fixtures  
🔧 **Test-Specific Hooks** - `@before()` and `@after()` for individual tests  
📝 **Rich Annotations** - `@tag()`, `@skip()`, `@fixme()`, `@slow()`, `@annotate()`  
🎭 **Page Object Support** - Perfect for Page Object Model pattern  
📊 **Data-Driven Tests** - `@test.each()` with template strings  
🔌 **Fixture Support** - `@use()` and `@use.define()` for custom fixtures  
📎 **Attachments** - `@attachment()` for test artifacts  
🔍 **Full Type Safety** - Complete TypeScript support  
✅ **CI/CD Ready** - Comprehensive runtime validations

## Installation

```bash
npm install @playwright-labs/decorators @playwright/test
```

## Basic Usage

### Simple Test Class

```typescript
import { describe, test } from '@playwright-labs/decorators';

@describe('Calculator Tests')
class CalculatorTests {
  @test('should add numbers')
  async testAddition() {
    const result = 2 + 2;
    expect(result).toBe(4);
  }

  @test('should multiply numbers')
  async testMultiplication() {
    const result = 3 * 4;
    expect(result).toBe(12);
  }
}
```

### With Lifecycle Hooks

```typescript
import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from '@playwright-labs/decorators';

@describe('API Tests')
class ApiTests {
  static apiUrl: string;

  @beforeAll()
  static async setupAll() {
    this.apiUrl = 'https://api.example.com';
  }

  @beforeEach()
  async setupEach() {
    console.log('Running test...');
  }

  @test('should fetch users')
  async testFetchUsers() {
    // Test implementation
  }

  @afterEach()
  async cleanupEach() {
    console.log('Test completed');
  }

  @afterAll()
  static async cleanupAll() {
    // Global cleanup
  }
}
```

## Core Decorators

### Test Decorators

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@describe()` | Define test suite | `@describe('User Tests')` |
| `@test()` | Define test case | `@test('should login')` |
| `@test.each()` | Data-driven tests | `@test.each([...], 'test $1')` |
| `@skip()` | Skip test | `@skip()` |
| `@fixme()` | Mark test as broken | `@fixme()` |
| `@slow()` | Mark test as slow | `@slow()` |

### Lifecycle Decorators

| Decorator | Scope | Runs | Example |
|-----------|-------|------|---------|
| `@beforeAll()` | Suite | Once before all tests | Setup database |
| `@beforeEach()` | Test | Before each test | Reset state |
| `@before()` | Test | Before specific test | Test-specific setup |
| `@after()` | Test | After specific test | Test-specific cleanup |
| `@afterEach()` | Test | After each test | Clear cookies |
| `@afterAll()` | Suite | Once after all tests | Close connections |

### Utility Decorators

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@timeout()` | Set timeout | `@timeout(5000)` |
| `@tag()` | Add test tags | `@tag('smoke', 'critical')` |
| `@annotate()` | Add annotations | `@annotate('type', 'description')` |
| `@attachment()` | Add attachments | `@attachment('screenshot.png', ...)` |
| `@use()` | Use fixtures | `@use('page', 'context')` |

## Lifecycle Hooks

### Complete Lifecycle Order

```
@describe
  ↓
@beforeAll (static, once per suite)
  ↓
┌─ FOR EACH TEST ────────────┐
│ @beforeEach (per test)     │
│   ↓                         │
│ @before (test-specific)    │
│   ↓                         │
│ @test method               │
│   ↓                         │
│ @after (test-specific)     │ ← Always runs, even on failure
│   ↓                         │
│ @afterEach (per test)      │
└─────────────────────────────┘
  ↓
@afterAll (static, once per suite)
```

### Example with All Hooks

```typescript
@describe('Full Lifecycle Example')
@timeout(30000)
class FullLifecycleTests {
  @beforeAll()
  static async setupSuite() {
    // Runs once before all tests
  }

  @beforeEach()
  async setupTest() {
    // Runs before each test
  }

  @test('with individual hooks')
  @timeout(5000)
  @before(async (self) => {
    // Runs before this specific test
    self.testData = await loadTestData();
  })
  @after(async (self) => {
    // Runs after this specific test (even if test fails)
    await self.cleanup();
  })
  async myTest() {
    // Test implementation
  }

  @afterEach()
  async cleanupTest() {
    // Runs after each test
  }

  @afterAll()
  static async cleanupSuite() {
    // Runs once after all tests
  }
}
```

## Documentation

### 📚 Full Documentation

- [**Getting Started Guide**](./docs/getting-started.md) - Installation and first test ✅
- [**Migration Guide**](./docs/migration-guide.md) - From traditional Playwright tests ✅
- [**API Reference**](./docs/api-reference.md) - Complete API documentation ✅
- [**Edge Cases**](./docs/edge-cases.md) - Handling complex scenarios ✅
- [**Core Concepts**](./docs/core-concepts.md) - Understanding decorators and lifecycle ✅
- [**Lifecycle Hooks Guide**](./docs/lifecycle-hooks.md) - Master test lifecycle ✅
- [**Timeout Configuration**](./docs/timeout-configuration.md) - Managing test timeouts ✅
- [**Data-Driven Tests**](./docs/data-driven-tests.md) - Using @test.each() ✅
- [**Page Object Model**](./docs/page-object-model.md) - POM pattern with decorators ✅
- [**Fixtures Guide**](./docs/fixtures.md) - Custom fixtures with @use and @use.define ✅
- [**Best Practices**](./docs/best-practices.md) - Patterns and anti-patterns ✅
- [**Troubleshooting**](./docs/troubleshooting.md) - Common issues and solutions ✅
- [**CI/CD Integration**](./docs/cicd-integration.md) - Running in CI/CD pipelines ✅

### 🔧 Additional Resources

- [**Validation Guide**](./docs/validation-guide.md) - Runtime validation details
- [**Examples Directory**](./tests/examples/) - Real-world code examples

## Examples

### Data-Driven Tests

```typescript
@describe('Login - Data Driven')
class LoginDataDrivenTests {
  @test.each([
    ['user@example.com', 'password123'],
    ['admin@example.com', 'admin456'],
    ['test@example.com', 'test789'],
  ], 'should login with $1')
  async testLogin(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login');
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### Page Object Model

```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login');
  }
}

@describe('Login with Page Objects')
class LoginPOMTests {
  private loginPage: LoginPage;

  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.page.goto('/login');
  }

  @test('should login successfully')
  async testLogin() {
    await this.loginPage.login('user@example.com', 'password123');
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### Timeout Configuration

```typescript
@describe('Performance Tests')
@timeout(60000) // 60 seconds for all tests
class PerformanceTests {
  @test('fast test')
  @timeout(5000) // Override: 5 seconds
  async testFast() {
    // Quick test
  }

  @test('slow test')
  @timeout(120000) // Override: 2 minutes
  async testSlow() {
    // Long-running test
  }
}
```

### Resource Cleanup

```typescript
@describe('Database Tests')
class DatabaseTests {
  @test('should handle transaction')
  @before(async (self) => {
    self.transaction = await db.beginTransaction();
  })
  @after(async (self) => {
    // Always runs, even if test fails
    if (self.transaction.isActive()) {
      await self.transaction.rollback();
    }
  })
  async testTransaction() {
    await this.transaction.insert({ name: 'test' });
    // Test logic
  }
}
```

### Tags and Annotations

```typescript
@describe('E2E Tests')
@tag('e2e', 'critical')
class E2ETests {
  @test('checkout flow')
  @tag('smoke')
  @annotate('type', 'user-journey')
  @timeout(120000)
  async testCheckout() {
    // Complete checkout flow
  }

  @test('slow operation')
  @slow()
  @annotate('performance', 'requires-optimization')
  async testSlowOperation() {
    // Slow test
  }
}
```

## TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

> **Note:** This library uses TC39 Stage 3 decorators (NOT legacy `experimentalDecorators`).

## Why Use Decorators?

### Before (Traditional Playwright)

```typescript
test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should login', async ({ page }) => {
    await page.fill('#email', 'user@example.com');
    await page.click('#login');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

### After (With Decorators)

```typescript
@describe('Login Tests')
class LoginTests {
  @beforeEach()
  async setup() {
    await this.page.goto('/login');
  }

  @test('should login')
  async testLogin() {
    await this.page.fill('#email', 'user@example.com');
    await this.page.click('#login');
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### Benefits

- ✅ **Better Organization** - Class-based structure groups related tests
- ✅ **Reusability** - Share setup/teardown logic via class inheritance
- ✅ **Type Safety** - Full TypeScript support with proper `this` context
- ✅ **Page Object Pattern** - Natural fit for POM architecture
- ✅ **Less Boilerplate** - Cleaner, more readable test code
- ✅ **Flexible Lifecycle** - More granular control with @before/@after
- ✅ **IDE Support** - Better autocomplete and refactoring

## License

MIT

## Contributing

Contributions are welcome!

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/vitalics/playwright-labs/issues)
- 💬 [Discussions](https://github.com/vitalics/playwright-labs/discussions)

---

Made with ❤️ by the Playwright community
