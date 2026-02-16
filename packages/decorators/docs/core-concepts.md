# Core Concepts

Understanding the fundamental concepts behind the decorator system and how it integrates with Playwright.

## Table of Contents

- [What Are TC39 Decorators](#what-are-tc39-decorators)
- [How Decorators Work](#how-decorators-work)
- [The Decorator System Architecture](#the-decorator-system-architecture)
- [Test Suite Lifecycle](#test-suite-lifecycle)
- [Instance Isolation](#instance-isolation)
- [Metadata Flow](#metadata-flow)
- [Fixture Injection](#fixture-injection)
- [Class Inheritance](#class-inheritance)
- [Decorator Composition](#decorator-composition)
- [Key Differences from Traditional Playwright](#key-differences-from-traditional-playwright)

---

## What Are TC39 Decorators

This library uses **TC39 Stage 3 decorators** (the modern standard), NOT the legacy `experimentalDecorators` from TypeScript.

### TC39 vs Legacy Decorators

| Feature | TC39 (This Library) | Legacy (`experimentalDecorators`) |
|---------|---------------------|-----------------------------------|
| Standard | Stage 3 proposal | TypeScript-specific |
| Metadata | `context.metadata` | `Reflect.metadata` |
| tsconfig | `"experimentalDecorators": false` | `"experimentalDecorators": true` |
| Target | ES2022+ | Any |
| Future-proof | Yes | Deprecated |

### Required Configuration

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

> **Important:** If `experimentalDecorators` is set to `true`, decorators will silently fail or produce unexpected behavior. Always ensure it's `false` or omitted.

---

## How Decorators Work

Decorators are functions that modify or annotate class elements (classes, methods, fields). They execute at class definition time, not at test runtime.

### Decorator Types Used

| Decorator Type | Applied To | Example |
|----------------|-----------|---------|
| Class decorator | Class | `@describe('Suite')` |
| Method decorator | Methods | `@test('name')`, `@beforeEach()` |
| Field decorator | Properties | `@param('name')`, `@test.data()` |

### Execution Order

Decorators apply **bottom-to-top** within a class, but class decorators execute last:

```typescript
@describe('Suite')          // 5th: Class decorator (orchestrates everything)
class MyTests {
  @param('user')            // 1st: Field decorator
  username = 'Alice';

  @test('my test')          // 2nd: Method decorator
  @tag('smoke')             // 3rd: Method decorator (applied before @test)
  @before(async (self) => {})  // 4th: Method decorator
  async myTest() {}
}
```

The execution order matters because each decorator stores metadata that later decorators (especially `@describe`) consume.

---

## The Decorator System Architecture

The system has three layers:

### Layer 1: Metadata Collection

Method and field decorators run first. They store information in `context.metadata`:

```typescript
@test('should login')      // Stores: { methodName: 'login', testName: 'should login' }
@tag('smoke')              // Stores: { tags: { login: ['smoke'] } }
@timeout(5000)             // Stores: { methodTimeouts: { login: 5000 } }
async login() {}
```

### Layer 2: Orchestration

The `@describe` class decorator runs last. It reads all collected metadata and registers tests with Playwright:

```
@describe reads context.metadata
  ├── tests[]          → Registers test cases via pwTest()
  ├── beforeEach[]     → Registers beforeEach hooks
  ├── beforeAll[]      → Registers beforeAll hooks
  ├── afterEach[]      → Registers afterEach hooks
  ├── afterAll[]       → Registers afterAll hooks
  ├── tags{}           → Applies test tags
  ├── skipped{}        → Marks tests as skipped
  ├── fixme{}          → Marks tests as fixme
  ├── slow{}           → Marks tests as slow
  ├── annotations{}    → Adds annotations
  ├── attachments{}    → Adds attachments
  ├── methodTimeouts{} → Sets method-level timeouts
  └── classTimeout     → Sets suite-level timeout
```

### Layer 3: Test Execution

At runtime, for each test:
1. A fresh instance is created via `new TestClass()`
2. Playwright fixtures are injected onto the instance
3. Lifecycle hooks run in order
4. The test method executes
5. Cleanup hooks run (even on failure)

---

## Test Suite Lifecycle

Every test suite follows this lifecycle:

```
Class Definition Time (decorator application):
  Field decorators execute (bottom-to-top)
  Method decorators execute (bottom-to-top)
  Class decorator (@describe) executes — registers everything with Playwright

Test Runtime:
  @beforeAll() — once per suite
    |
    ├── @beforeEach() — per test
    │     |
    │     ├── @before() — test-specific setup
    │     │     |
    │     │     └── @test method body
    │     │           |
    │     │     @after() — test-specific cleanup (always runs)
    │     |
    │     @afterEach() — per test (always runs)
    |
  @afterAll() — once per suite (always runs)
```

### Key Guarantees

- **`@afterEach`** always runs, even if the test or `@after` fails
- **`@after`** always runs, even if the test fails
- **`@afterAll`** always runs, even if tests fail
- Each test gets a **fresh instance** — no state leaks between tests

---

## Instance Isolation

Every test runs on a **fresh class instance**. This is fundamental to the system:

```typescript
@describe('Isolation Example')
class IsolationTests {
  counter = 0;

  @test('first test')
  async test1() {
    this.counter++;
    expect(this.counter).toBe(1);  // Fresh instance: counter starts at 0
  }

  @test('second test')
  async test2() {
    this.counter++;
    expect(this.counter).toBe(1);  // Fresh instance: counter starts at 0 again
  }
}
```

### What This Means

- **No shared state between tests** — each test starts clean
- **No test ordering dependencies** — tests can run in any order
- **`@beforeEach` runs on each fresh instance** — setup is repeated properly
- **Static properties ARE shared** — use for `@beforeAll`/`@afterAll` resources

```typescript
@describe('Static vs Instance')
class SharedStateTests {
  static dbConnection: any;  // Shared across all tests (via @beforeAll)
  private testData: any;     // Fresh per test

  @beforeAll()
  static async connectDB() {
    this.dbConnection = await connect();  // Set once
  }

  @beforeEach()
  async setupData() {
    this.testData = await loadFixture();  // Fresh per test
  }

  @test('test')
  async test() {
    // this.testData — unique to this test
    // SharedStateTests.dbConnection — shared
  }
}
```

---

## Metadata Flow

Metadata flows through three stages:

### Stage 1: Decorators Store Metadata

```typescript
// Each decorator writes to context.metadata
@test('my test')  →  metadata.tests.push({ methodName, testName })
@tag('smoke')     →  metadata.tags[methodName].push('smoke')
@skip()           →  metadata.skipped[methodName] = { skip: true }
@param('user')    →  metadata.params['user'] = { name, originalName, formatter }
```

### Stage 2: @describe Reads Metadata

The class decorator receives all metadata collected by method/field decorators:

```typescript
@describe('Suite')
class Tests {
  // Inside @describe, context.metadata contains EVERYTHING:
  // - All tests, hooks, tags, skips, timeouts, params, etc.
}
```

### Stage 3: Playwright Registration

`@describe` translates metadata into Playwright API calls:

```typescript
// What @describe generates internally:
pwTest.describe('Suite', () => {
  pwTest.beforeAll(async () => { /* ... */ });
  pwTest.beforeEach(async () => { /* ... */ });

  pwTest('test name', async ({ page, context }) => {
    const instance = new TestClass();
    instance.page = page;
    // ... run hooks and test
  });

  // ... more tests
});
```

### Inheritance and Metadata

Metadata from parent classes is collected by walking the prototype chain:

```typescript
class BaseTests {
  @beforeEach()
  async baseSetup() {}  // Stored in BaseTests metadata
}

@describe('Child')
class ChildTests extends BaseTests {
  @test('test')
  async test() {}
}

// @describe collects:
// 1. ChildTests own metadata (from context.metadata)
// 2. BaseTests metadata (from Symbol.metadata on parent constructor)
```

---

## Fixture Injection

Playwright fixtures are automatically injected into test instances.

### How It Works

1. `@describe` creates a test function that destructures Playwright fixtures
2. Before each test, a fresh instance is created
3. Fixtures are assigned to the instance as properties
4. Your test methods access them via `this`

```typescript
@describe('Fixture Example')
class FixtureTests {
  // These are injected automatically:
  // this.page        — Playwright Page
  // this.context     — BrowserContext
  // this.browser     — Browser
  // this.request     — API request context
  // this.browserName — 'chromium' | 'firefox' | 'webkit'

  @test('using fixtures')
  async test() {
    await this.page.goto('/');           // Page fixture
    const cookies = await this.context.cookies();  // Context fixture
  }
}
```

### BaseTest for Type Safety

Extend `BaseTest` to get TypeScript type hints:

```typescript
import { BaseTest, describe, test } from '@playwright-labs/decorators';

@describe('Typed Tests')
class TypedTests extends BaseTest {
  @test('with types')
  async test() {
    // this.page is typed as Page
    // this.context is typed as BrowserContext
    // Full autocomplete support
    await this.page.goto('/');
  }
}
```

### Custom Fixtures

Use `makeDecorators` to add custom fixture types:

```typescript
import { makeDecorators } from '@playwright-labs/decorators';
import { test as base } from '@playwright/test';

const myTest = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({}, use) => {
    const client = new ApiClient();
    await use(client);
    await client.dispose();
  },
});

const { describe, test, beforeEach } = makeDecorators(myTest);

@describe('Custom Fixtures')
class CustomTests {
  @test('with api client')
  async test() {
    await this.apiClient.get('/users');  // Custom fixture available
  }
}
```

---

## Class Inheritance

The decorator system fully supports class inheritance for sharing setup, utilities, and configuration.

### Base Class Pattern

```typescript
class BaseE2ETests extends BaseTest {
  @param('baseUrl')
  baseUrl = 'https://example.com';

  @beforeEach()
  async navigate() {
    await this.page.goto(this.baseUrl);
  }

  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login');
  }
}

@describe('Dashboard Tests')
class DashboardTests extends BaseE2ETests {
  @beforeEach()
  async loginFirst() {
    await this.login('admin@test.com', 'password');
  }

  @test('should show dashboard')
  async testDashboard() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### Lifecycle Hook Inheritance

Hooks from parent classes execute before child hooks:

```
BaseE2ETests.navigate()      ← Parent @beforeEach (runs first)
DashboardTests.loginFirst()  ← Child @beforeEach (runs second)
DashboardTests.testDashboard() ← Test
```

### Static Method Inheritance

When inheriting static lifecycle methods (e.g., `@beforeAll`), they are called on the **class where they are defined**, not the child class. This ensures `this` refers to the correct class:

```typescript
class BaseTests {
  static connection: any;

  @beforeAll()
  static async connect() {
    BaseTests.connection = await openDB();  // Use explicit class name
  }
}

@describe('Child')
class ChildTests extends BaseTests {
  @test('test')
  async test() {
    expect(BaseTests.connection).toBeTruthy();  // Works correctly
  }
}
```

---

## Decorator Composition

Multiple decorators can be combined on a single target. They compose naturally:

### Method Decorators

```typescript
@test('complex test')
@timeout(30000)
@tag('smoke', 'critical')
@slow()
@annotate('jira', 'PROJ-123')
@before(async (self) => { /* setup */ })
@after(async (self) => { /* cleanup */ })
async complexTest() {}
```

### Class Decorators

```typescript
@describe('Suite')
@timeout(60000)
@use({ viewport: { width: 1920, height: 1080 } })
class MyTests {}
```

### Composition Rules

| Combination | Valid | Notes |
|------------|-------|-------|
| `@test` + `@timeout` | Yes | Method timeout overrides class |
| `@test` + `@tag` | Yes | Tags added to test |
| `@test` + `@skip` | Yes | Test is skipped |
| `@test` + `@before` + `@after` | Yes | Test-specific hooks |
| `@beforeEach` + `@timeout` | Yes | Hook has its own timeout |
| `@describe` + `@timeout` | Yes | Suite-level timeout |
| `@describe` + `@use` | Yes | `@describe` must come first |
| `@test` on field | No | `@test` is method-only |
| `@beforeAll` on instance method | No | Must be static for `@beforeAll` |
| `@beforeEach` on static method | No | Must be instance for `@beforeEach` |

---

## Key Differences from Traditional Playwright

### Structure

| Traditional | Decorators |
|------------|-----------|
| `test.describe('name', () => {})` | `@describe('name') class {}` |
| `test('name', async ({ page }) => {})` | `@test('name') async method() {}` |
| `test.beforeEach(async ({ page }) => {})` | `@beforeEach() async setup() {}` |
| Destructured fixtures | `this.page`, `this.context` |
| Nested callbacks | Flat class structure |

### Conceptual Differences

1. **Fixture access**: Via `this` instead of function parameters
2. **Test isolation**: Fresh instance per test (automatic)
3. **State sharing**: Instance properties (per-test) vs static (per-suite)
4. **Test discovery**: `@test` decorator, not function name convention
5. **Lifecycle**: Method decorators, not nested function calls
6. **Reusability**: Class inheritance, not helper functions

### When to Use Each

**Use decorators when:**
- You want OOP-style test organization
- Tests share significant setup/utility code
- You're using the Page Object Model pattern
- You prefer class-based structure

**Use traditional Playwright when:**
- Tests are simple and standalone
- You prefer functional style
- You need fine-grained fixture control
- Team is not familiar with decorators

---

## Summary

The decorator system provides:

1. **Declarative test definition** — decorators describe what, not how
2. **Automatic orchestration** — `@describe` handles all Playwright registration
3. **Type safety** — full TypeScript support via `BaseTest`
4. **Instance isolation** — fresh state per test, no leaks
5. **Composable hooks** — mix lifecycle, test-specific, and suite-level hooks
6. **Inheritance** — share setup and utilities across test suites
7. **Metadata-driven** — decorators collect metadata, `@describe` consumes it

---

**Next:** [Lifecycle Hooks Guide](./lifecycle-hooks.md) | [API Reference](./api-reference.md)
