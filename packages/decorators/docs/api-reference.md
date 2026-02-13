# API Reference

Complete reference for all decorators and their options.

## Table of Contents

- [Test Decorators](#test-decorators)
- [Lifecycle Decorators](#lifecycle-decorators)
- [Configuration Decorators](#configuration-decorators)
- [Annotation Decorators](#annotation-decorators)
- [Fixture Decorators](#fixture-decorators)
- [Utility Functions](#utility-functions)

---

## Test Decorators

### `@describe(name?: string)`

Marks a class as a test suite.

**Parameters:**
- `name` (optional): Suite name. If omitted, uses class name.

**Example:**
```typescript
@describe('User Authentication')
class AuthTests {
  // tests...
}

@describe() // Uses class name
class LoginTests {
  // tests...
}
```

---

### `@test(name: string)`

Marks a method as a test case.

**Parameters:**
- `name`: Test name (required)

**Example:**
```typescript
@test('should login with valid credentials')
async testLogin() {
  // test implementation
}
```

---

### `@test.each(data, template)`

Creates data-driven tests.

**Parameters:**
- `data`: Array of test data arrays
- `template`: Template string with `$1`, `$2`, etc. placeholders

**Example:**
```typescript
@test.each([
  ['user1@test.com', 'pass123'],
  ['user2@test.com', 'pass456'],
], 'should login with $1')
async testLogin(email: string, password: string) {
  // test implementation
}
```

**See:** [Data-Driven Tests Guide](./data-driven-tests.md)

---

## Lifecycle Decorators

### `@beforeAll()`

Runs once before all tests in the suite.

**Usage:** Static method only  
**Context:** No test fixtures available  
**Best for:** Expensive setup (database connections, file loading)

**Example:**
```typescript
@beforeAll()
static async setupSuite() {
  this.database = await connectToDatabase();
}
```

---

### `@beforeEach()`

Runs before each test.

**Usage:** Instance method  
**Context:** Test fixtures available (`this.page`, etc.)  
**Best for:** Test-specific setup, navigation, state reset

**Example:**
```typescript
@beforeEach()
async setupTest() {
  await this.page.goto('/');
  await this.page.evaluate(() => localStorage.clear());
}
```

---

### `@before(fn)`

Runs before a specific test.

**Parameters:**
- `fn`: Hook function `(self: TestClass) => void | Promise<void>`

**Usage:** Applied to test methods  
**Context:** Access test instance via `self` parameter  
**Best for:** Test-specific resource acquisition

**Example:**
```typescript
@test('with database transaction')
@before(async (self) => {
  self.transaction = await db.beginTransaction();
})
async testWithTransaction() {
  await this.transaction.insert({ name: 'test' });
}
```

**See:** [Lifecycle Hooks Guide](./lifecycle-hooks.md)

---

### `@after(fn)`

Runs after a specific test (always runs, even if test fails).

**Parameters:**
- `fn`: Hook function `(self: TestClass) => void | Promise<void>`

**Usage:** Applied to test methods  
**Execution:** Always runs in finally block  
**Best for:** Test-specific cleanup, resource release

**Example:**
```typescript
@test('with temporary file')
@after(async (self) => {
  if (self.tempFile) {
    await fs.unlink(self.tempFile);
  }
})
async testWithFile() {
  this.tempFile = await createTempFile();
}
```

---

### `@afterEach()`

Runs after each test.

**Usage:** Instance method  
**Context:** Test fixtures available  
**Best for:** Cleanup, cookie clearing, state reset

**Example:**
```typescript
@afterEach()
async cleanupTest() {
  await this.page.context().clearCookies();
  await this.page.close();
}
```

---

### `@afterAll()`

Runs once after all tests in the suite.

**Usage:** Static method only  
**Context:** No test fixtures available  
**Best for:** Global cleanup, closing connections

**Example:**
```typescript
@afterAll()
static async cleanupSuite() {
  await this.database.close();
}
```

---

## Configuration Decorators

### `@timeout(milliseconds: number)`

Sets timeout for tests or fixtures.

**Parameters:**
- `milliseconds`: Timeout in milliseconds (must be > 0)

**Usage:** Classes, methods, or fields  
**Priority:** Method > Class > Global

**Examples:**
```typescript
// Class-level (applies to all tests)
@describe('Slow Tests')
@timeout(60000)
class SlowTests {
  @test('test 1') async test1() {}
  @test('test 2') async test2() {}
}

// Method-level (overrides class timeout)
@test('fast test')
@timeout(5000)
async fastTest() {}

// Lifecycle hook timeout
@beforeAll()
@timeout(30000)
static async setup() {}

// Fixture timeout
@use.define()
@timeout(15000)
database = createDatabase();
```

**Validations:**
- ❌ Throws error for: undefined, null, non-number, NaN, Infinity, negative, zero
- ⚠️  Warns for: > 10 minutes (600000ms), < 100ms

**See:** [Timeout Configuration Guide](./timeout-configuration.md)

---

### `@slow()`

Marks test as slow (triples timeout).

**Usage:** Test methods only

**Example:**
```typescript
@test('slow integration test')
@slow()
async testSlowOperation() {
  // Long-running test
}
```

---

## Annotation Decorators

### `@tag(...tags: string[])`

Adds tags to tests.

**Parameters:**
- `tags`: One or more tag strings

**Usage:** Classes or methods

**Examples:**
```typescript
// Class-level tags
@describe('API Tests')
@tag('api', 'integration')
class ApiTests {}

// Method-level tags
@test('critical flow')
@tag('smoke', 'critical')
async testCriticalFlow() {}

// Multiple tags
@tag('e2e', 'slow', 'flaky')
```

**Running tagged tests:**
```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert @flaky
```

---

### `@skip(condition?: boolean | string)`

Skips test or suite.

**Parameters:**
- `condition` (optional): Boolean or condition description

**Examples:**
```typescript
// Always skip
@test('not implemented yet')
@skip()
async testNotReady() {}

// Conditional skip
@test('Windows only')
@skip(process.platform !== 'win32')
async testWindows() {}

// With reason
@test('broken test')
@skip('Waiting for API fix')
async testBroken() {}
```

---

### `@fixme(condition?: boolean | string)`

Marks test as broken (like skip but shows differently in reports).

**Parameters:**
- `condition` (optional): Boolean or reason

**Examples:**
```typescript
@test('needs fixing')
@fixme()
async testBroken() {}

@test('intermittent failure')
@fixme('Flaky due to timing issue')
async testFlaky() {}
```

---

### `@annotate(type: string, description?: string)`

Adds custom annotations to tests.

**Parameters:**
- `type`: Annotation type
- `description` (optional): Annotation description

**Examples:**
```typescript
@test('user journey')
@annotate('type', 'e2e')
@annotate('priority', 'high')
@annotate('jira', 'PROJ-1234')
async testUserJourney() {}
```

---

### `@attachment(name, options)`

Adds attachments to tests.

**Parameters:**
- `name`: Attachment name
- `options`: `{ path?: string, body?: string | Buffer, contentType?: string }`

**Examples:**
```typescript
@test('with screenshot')
@attachment('screenshot', { path: './screenshot.png', contentType: 'image/png' })
async testWithScreenshot() {}

@test('with logs')
@attachment('logs', { body: 'test logs...', contentType: 'text/plain' })
async testWithLogs() {}
```

---

## Fixture Decorators

### `@use(...fixtures: string[])`

Explicitly declares fixture usage.

**Parameters:**
- `fixtures`: Names of fixtures to use

**Example:**
```typescript
@describe('Custom Fixture Tests')
@use('myCustomFixture', 'anotherFixture')
class FixtureTests {
  @test('using custom fixture')
  async testWithFixture() {
    const data = this.myCustomFixture.getData();
  }
}
```

---

### `@use.define(options?)`

Declares custom fixtures using class members.

**Parameters:**
- `options` (optional):
  - `auto?: boolean` - Auto-use fixture (default: true for fields/getters, false for methods)
  - `scope?: 'test' | 'worker'` - Fixture scope (default: 'test')
  - `box?: boolean | 'self'` - Hide from test reports (default: false)
  - `title?: string` - Custom title in reports

**Examples:**
```typescript
// Field fixture
@use.define()
testData = { user: 'test', pass: '123' };

// Getter fixture
@use.define({ box: true })
get authToken() {
  return generateToken(this.testData.user);
}

// Method fixture
@use.define({ scope: 'worker' })
async database() {
  return await connectToDatabase();
}

// With cleanup using @after
@use.define()
@after(async (self) => {
  await self.connection.close();
})
async setupConnection() {
  this.connection = await createConnection();
}
```

**See:** [Fixtures Guide](./fixtures.md)

---

## Utility Functions

### `expect`

Re-exported from `@playwright/test` for convenience.

```typescript
import { expect } from '@playwright-labs/decorators';

await expect(page).toHaveTitle(/Example/);
expect(result).toBe(42);
```

---

### `BaseTest`

Base class for test classes (optional, provides type hints).

```typescript
import { BaseTest, describe, test } from '@playwright-labs/decorators';

@describe('My Tests')
class MyTests extends BaseTest {
  @test('has correct types')
  async testTypes() {
    // this.page, this.context, etc. are properly typed
    await this.page.goto('/');
  }
}
```

---

## Type Definitions

### `UseDefineOptions`

Options for `@use.define` decorator.

```typescript
interface UseDefineOptions {
  auto?: boolean;
  scope?: 'test' | 'worker';
  box?: boolean | 'self';
  title?: string;
}
```

---

## Decorator Combinations

### Valid Combinations

```typescript
// Multiple decorators on same target
@test('complex test')
@timeout(10000)
@tag('slow', 'integration')
@annotate('priority', 'high')
@skip(condition)
async myTest() {}

// Hooks with timeout
@beforeEach()
@timeout(5000)
async setup() {}

// Test-specific hooks with timeout
@test('with hooks')
@timeout(30000)
@before(async (self) => {})
@after(async (self) => {})
async testWithHooks() {}
```

### Invalid Combinations

```typescript
// ❌ Can't use @test on non-methods
@test('invalid')
testData = { };  // Error!

// ❌ Can't use @before without @test
@before(async (self) => {})
async helper() {}  // Error!

// ❌ Can't use @beforeAll on instance methods
@beforeAll()  // Error!
async setup() {}  // Must be static

// ❌ Can't use @beforeEach on static methods
@beforeEach()  // Error!
static async setup() {}  // Must be instance method
```

---

## Migration from Traditional Playwright

### Traditional Playwright
```typescript
test.describe('Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('my test', async ({ page }) => {
    await page.click('button');
  });
});
```

### With Decorators
```typescript
@describe('Tests')
class Tests {
  @beforeEach()
  async setup() {
    await this.page.goto('/');
  }

  @test('my test')
  async myTest() {
    await this.page.click('button');
  }
}
```

**See:** [Migration Guide](./migration-guide.md)

---

## Quick Reference

| Decorator | Target | Purpose | Example |
|-----------|--------|---------|---------|
| `@describe()` | Class | Test suite | `@describe('Suite')` |
| `@test()` | Method | Test case | `@test('test name')` |
| `@test.each()` | Method | Data-driven test | `@test.each([...], 'test $1')` |
| `@beforeAll()` | Static method | Suite setup | `@beforeAll()` |
| `@beforeEach()` | Instance method | Test setup | `@beforeEach()` |
| `@before()` | Method | Test-specific setup | `@before((self) => {})` |
| `@after()` | Method | Test-specific cleanup | `@after((self) => {})` |
| `@afterEach()` | Instance method | Test cleanup | `@afterEach()` |
| `@afterAll()` | Static method | Suite cleanup | `@afterAll()` |
| `@timeout()` | Class/Method/Field | Set timeout | `@timeout(5000)` |
| `@slow()` | Method | Mark slow test | `@slow()` |
| `@skip()` | Class/Method | Skip test | `@skip()` |
| `@fixme()` | Class/Method | Mark broken | `@fixme()` |
| `@tag()` | Class/Method | Add tags | `@tag('smoke')` |
| `@annotate()` | Method | Add metadata | `@annotate('type', 'desc')` |
| `@attachment()` | Method | Add file | `@attachment('name', {...})` |
| `@use()` | Class | Use fixtures | `@use('fixture')` |
| `@use.define()` | Field/Getter/Method | Define fixture | `@use.define()` |

---

**Related:** [Core Concepts](./core-concepts.md) | [Best Practices](./best-practices.md) | [Examples](../tests/examples/)
