# Lifecycle Hooks Guide

Master the test lifecycle with decorators. This guide covers every hook, its execution order, and patterns for effective test setup and teardown.

## Table of Contents

- [Overview](#overview)
- [Complete Lifecycle Order](#complete-lifecycle-order)
- [Suite-Level Hooks](#suite-level-hooks)
- [Test-Level Hooks](#test-level-hooks)
- [Test-Specific Hooks](#test-specific-hooks)
- [Hook Execution Guarantees](#hook-execution-guarantees)
- [Inheritance and Hooks](#inheritance-and-hooks)
- [Common Patterns](#common-patterns)
- [Advanced Patterns](#advanced-patterns)
- [Gotchas and Pitfalls](#gotchas-and-pitfalls)

---

## Overview

The decorator system provides six lifecycle hooks at three levels:

| Level | Before | After |
|-------|--------|-------|
| **Suite** (once) | `@beforeAll()` | `@afterAll()` |
| **Test** (each) | `@beforeEach()` | `@afterEach()` |
| **Specific** (per-test) | `@before(fn)` | `@after(fn)` |

Each level serves a different purpose and has different characteristics regarding instance access, fixture availability, and execution guarantees.

---

## Complete Lifecycle Order

```
@describe('Suite')
│
├── @beforeAll()                    ← Once, static method
│
├── Test 1:
│   ├── new TestClass()             ← Fresh instance created
│   ├── Fixtures injected           ← this.page, this.context, etc.
│   ├── @beforeEach()               ← Instance method
│   ├── @before(fn)                 ← Test-specific hook(s)
│   ├── @test method body           ← The actual test
│   ├── @after(fn)                  ← Test-specific cleanup (always runs)
│   └── @afterEach()                ← Instance cleanup (always runs)
│
├── Test 2:
│   ├── new TestClass()             ← New fresh instance
│   ├── Fixtures injected
│   ├── @beforeEach()
│   ├── @test method body
│   └── @afterEach()
│
└── @afterAll()                     ← Once, static method (always runs)
```

---

## Suite-Level Hooks

### @beforeAll()

Runs **once** before any test in the suite. Typically used for expensive, shared setup.

```typescript
@describe('Database Tests')
class DatabaseTests {
  static connection: DBConnection;
  static testData: any[];

  @beforeAll()
  static async setupDatabase() {
    DatabaseTests.connection = await Database.connect();
    DatabaseTests.testData = await DatabaseTests.connection.seed();
  }

  @test('query users')
  async testQuery() {
    const users = await DatabaseTests.connection.query('SELECT * FROM users');
    expect(users.length).toBeGreaterThan(0);
  }

  @test('insert record')
  async testInsert() {
    await DatabaseTests.connection.insert('users', { name: 'Test' });
  }
}
```

**Key characteristics:**
- Use `static` methods (recommended for clarity)
- Instance methods are also allowed but discouraged
- No Playwright fixtures available (`this.page` is not set)
- Set up shared resources (connections, servers, data)
- Use explicit class name for `this` references: `DatabaseTests.connection`

### @afterAll()

Runs **once** after all tests complete. Always runs, even if tests fail.

```typescript
@describe('Server Tests')
class ServerTests {
  static server: TestServer;

  @beforeAll()
  static async startServer() {
    ServerTests.server = await TestServer.start(3000);
  }

  @afterAll()
  static async stopServer() {
    if (ServerTests.server) {
      await ServerTests.server.close();
    }
  }

  @test('health check')
  async testHealth() {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
  }
}
```

**Key characteristics:**
- Guaranteed execution even on failure
- Use for releasing expensive resources
- Clean up anything `@beforeAll` set up
- No Playwright fixtures available

---

## Test-Level Hooks

### @beforeEach()

Runs before **each** test on the test's fresh instance. Playwright fixtures are available.

```typescript
@describe('Login Tests')
class LoginTests {
  private loginPage: LoginPage;

  @beforeEach()
  async navigateToLogin() {
    await this.page.goto('/login');
    this.loginPage = new LoginPage(this.page);
  }

  @test('valid login')
  async testValidLogin() {
    await this.loginPage.login('user@test.com', 'password');
    await expect(this.page).toHaveURL('/dashboard');
  }

  @test('invalid login')
  async testInvalidLogin() {
    await this.loginPage.login('bad@test.com', 'wrong');
    await expect(this.page.locator('.error')).toBeVisible();
  }
}
```

**Key characteristics:**
- Instance method (NOT static)
- Runs on each fresh test instance
- Full access to Playwright fixtures (`this.page`, `this.context`, etc.)
- Perfect for navigation, state reset, page object creation
- Multiple `@beforeEach` hooks run in declaration order

### @afterEach()

Runs after **each** test. Always runs, even if the test fails.

```typescript
@describe('File Upload Tests')
class FileUploadTests {
  private uploadedFiles: string[] = [];

  @beforeEach()
  async setup() {
    await this.page.goto('/upload');
  }

  @test('upload document')
  async testUpload() {
    await this.page.setInputFiles('#file-input', 'test.pdf');
    this.uploadedFiles.push('test.pdf');
    await expect(this.page.locator('.success')).toBeVisible();
  }

  @afterEach()
  async cleanup() {
    // Always runs, cleans up even if test failed
    for (const file of this.uploadedFiles) {
      await deleteUploadedFile(file);
    }
    await this.page.context().clearCookies();
  }
}
```

**Key characteristics:**
- Instance method (NOT static)
- Guaranteed execution even on test failure
- Full access to Playwright fixtures
- Use for cleanup: cookies, storage, temporary files
- Multiple `@afterEach` hooks run in declaration order

### Multiple Hooks

You can have multiple hooks of the same type:

```typescript
@describe('Multi-Hook Tests')
class MultiHookTests {
  @beforeEach()
  async clearStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  @beforeEach()
  async navigateToHome() {
    await this.page.goto('/');
  }

  @beforeEach()
  async waitForReady() {
    await this.page.waitForLoadState('networkidle');
  }

  @test('page is ready')
  async test() {
    // All three @beforeEach hooks ran in order
    await expect(this.page.locator('#app')).toBeVisible();
  }
}
```

---

## Test-Specific Hooks

### @before(fn)

Runs before a **specific** test method. Applied as a decorator on the test method itself.

```typescript
@describe('Transaction Tests')
class TransactionTests {
  private transaction: any;

  @test('insert with rollback')
  @before(async (self) => {
    self.transaction = await db.beginTransaction();
  })
  @after(async (self) => {
    await self.transaction.rollback();
  })
  async testInsert() {
    await this.transaction.insert('users', { name: 'Test' });
    const count = await this.transaction.count('users');
    expect(count).toBeGreaterThan(0);
  }

  @test('simple read')
  async testRead() {
    // No transaction setup needed for this test
    // @before/@after from above DON'T run here
    const users = await db.query('SELECT * FROM users');
    expect(users).toBeDefined();
  }
}
```

**Key characteristics:**
- Receives the test instance via `self` parameter
- Runs AFTER `@beforeEach`, BEFORE the test
- Only runs for the specific test it decorates
- Can be async
- Multiple `@before` hooks run in top-to-bottom order (reversed from application order)

### @after(fn)

Runs after a **specific** test. Always runs, even if the test fails.

```typescript
@describe('Resource Tests')
class ResourceTests {
  private tempDir: string;
  private screenshot: Buffer;

  @test('create temp files')
  @before(async (self) => {
    self.tempDir = await fs.mkdtemp('/tmp/test-');
  })
  @after(async (self) => {
    // Always clean up, even on failure
    if (self.tempDir) {
      await fs.rm(self.tempDir, { recursive: true });
    }
  })
  async testTempFiles() {
    await fs.writeFile(`${this.tempDir}/data.txt`, 'hello');
    const content = await fs.readFile(`${this.tempDir}/data.txt`, 'utf-8');
    expect(content).toBe('hello');
  }

  @test('capture on failure')
  @after(async (self) => {
    // Capture screenshot for debugging
    self.screenshot = await self.page.screenshot();
  })
  async testWithCapture() {
    await this.page.goto('/');
    await expect(this.page.locator('#nonexistent')).toBeVisible();
  }
}
```

**Key characteristics:**
- Guaranteed execution (runs in `finally` block)
- Receives test instance via `self`
- Runs AFTER the test, BEFORE `@afterEach`
- Perfect for test-specific cleanup
- Multiple `@after` hooks run in top-to-bottom order

### Multiple @before/@after Hooks

When stacking multiple hooks, they execute in **reading order** (top to bottom):

```typescript
@test('complex setup')
@before(async (self) => {
  console.log('1. Open connection');
  self.connection = await openConnection();
})
@before(async (self) => {
  console.log('2. Start transaction');
  self.tx = await self.connection.beginTransaction();
})
@after(async (self) => {
  console.log('3. Rollback transaction');
  await self.tx.rollback();
})
@after(async (self) => {
  console.log('4. Close connection');
  await self.connection.close();
})
async test() {
  console.log('Test body');
}

// Output:
// 1. Open connection
// 2. Start transaction
// Test body
// 3. Rollback transaction
// 4. Close connection
```

---

## Hook Execution Guarantees

### What Always Runs

| Hook | Runs on test failure? | Runs on hook failure? |
|------|----------------------|----------------------|
| `@beforeAll` | N/A | N/A |
| `@beforeEach` | N/A | N/A |
| `@before` | N/A | N/A |
| `@after` | **Yes** | Depends on which hook fails |
| `@afterEach` | **Yes** | **Yes** (runs even if `@after` fails) |
| `@afterAll` | **Yes** | **Yes** |

### Failure Scenarios

```typescript
@describe('Failure Handling')
class FailureTests {
  @beforeEach()
  async setup() {
    console.log('beforeEach');  // Runs
  }

  @test('failing test')
  @before(async () => console.log('before'))     // Runs
  @after(async () => console.log('after'))        // Runs (even on failure)
  async test() {
    throw new Error('Test failed!');              // Fails here
  }

  @afterEach()
  async cleanup() {
    console.log('afterEach');  // Runs (even after failure)
  }
}

// Output:
// beforeEach
// before
// [Error: Test failed!]
// after        ← Still runs
// afterEach    ← Still runs
```

---

## Inheritance and Hooks

### Parent Hooks Run First

```typescript
class BaseTests {
  @beforeEach()
  async baseSetup() {
    console.log('1. Base setup');
    await this.page.goto('/');
  }

  @afterEach()
  async baseCleanup() {
    console.log('4. Base cleanup');
    await this.page.context().clearCookies();
  }
}

@describe('Child Tests')
class ChildTests extends BaseTests {
  @beforeEach()
  async childSetup() {
    console.log('2. Child setup');
    await this.page.waitForLoadState();
  }

  @test('test')
  async test() {
    console.log('3. Test body');
  }

  @afterEach()
  async childCleanup() {
    console.log('5. Child cleanup');  // Note: not reverse order
  }
}

// Output:
// 1. Base setup       ← Parent beforeEach
// 2. Child setup      ← Child beforeEach
// 3. Test body
// 4. Base cleanup     ← Parent afterEach
// 5. Child cleanup    ← Child afterEach
```

### Multi-Level Inheritance

```typescript
class Level1 {
  @beforeEach()
  async setup1() { console.log('Level 1 setup'); }
}

class Level2 extends Level1 {
  @beforeEach()
  async setup2() { console.log('Level 2 setup'); }
}

@describe('Level 3')
class Level3 extends Level2 {
  @beforeEach()
  async setup3() { console.log('Level 3 setup'); }

  @test('test')
  async test() { console.log('Test'); }
}

// Output:
// Level 1 setup
// Level 2 setup
// Level 3 setup
// Test
```

---

## Common Patterns

### Authentication Setup

```typescript
class AuthenticatedTests extends BaseTest {
  @beforeEach()
  async login() {
    await this.page.goto('/login');
    await this.page.fill('#email', 'admin@test.com');
    await this.page.fill('#password', 'password');
    await this.page.click('#submit');
    await this.page.waitForURL('/dashboard');
  }
}

@describe('Admin Panel')
class AdminTests extends AuthenticatedTests {
  @test('should see admin menu')
  async testAdminMenu() {
    await expect(this.page.locator('#admin-menu')).toBeVisible();
  }
}
```

### Database Transaction Wrapper

```typescript
@describe('Data Tests')
class DataTests {
  static pool: ConnectionPool;

  @beforeAll()
  static async connect() {
    DataTests.pool = await createPool();
  }

  @test('create user')
  @before(async (self) => {
    self.tx = await DataTests.pool.beginTransaction();
  })
  @after(async (self) => {
    await self.tx.rollback();  // Always rollback - test isolation
  })
  async testCreateUser() {
    await this.tx.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
    const result = await this.tx.query('SELECT * FROM users WHERE name = $1', ['Test']);
    expect(result.rows).toHaveLength(1);
  }

  @afterAll()
  static async disconnect() {
    await DataTests.pool.close();
  }
}
```

### Screenshot on Failure

```typescript
@describe('Visual Tests')
class VisualTests {
  @afterEach()
  async captureOnFailure() {
    const testInfo = this.testSelf.info();
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  }

  @test('should render correctly')
  async testRender() {
    await this.page.goto('/');
    await expect(this.page.locator('.hero')).toBeVisible();
  }
}
```

### Timed Operations

```typescript
@describe('Performance Tests')
class PerformanceTests {
  private startTime: number;

  @beforeEach()
  async startTimer() {
    this.startTime = Date.now();
  }

  @afterEach()
  async logDuration() {
    const duration = Date.now() - this.startTime;
    console.log(`Test took ${duration}ms`);
  }

  @test('should load quickly')
  async testLoad() {
    await this.page.goto('/');
    const duration = Date.now() - this.startTime;
    expect(duration).toBeLessThan(3000);
  }
}
```

---

## Advanced Patterns

### Conditional Hooks via @before

```typescript
@describe('Cross-Browser Tests')
class CrossBrowserTests {
  @test('mobile layout')
  @before(async (self) => {
    if (self.browserName === 'webkit') {
      await self.page.setViewportSize({ width: 375, height: 812 });
    }
  })
  async testMobileLayout() {
    await this.page.goto('/');
    await expect(this.page.locator('.mobile-nav')).toBeVisible();
  }
}
```

### Hook Composition

Build reusable hook functions:

```typescript
// Reusable hook functions
const withAuth = async (self: any) => {
  await self.page.goto('/login');
  await self.page.fill('#email', 'user@test.com');
  await self.page.fill('#password', 'pass');
  await self.page.click('#submit');
  await self.page.waitForURL('/dashboard');
};

const withCleanDB = async (self: any) => {
  await self.db.query('DELETE FROM test_data');
};

@describe('Composable Tests')
class ComposableTests {
  @test('authenticated test with clean db')
  @before(withAuth)
  @before(withCleanDB)
  async test() {
    // Both hooks ran
  }

  @test('only authenticated')
  @before(withAuth)
  async testAuthOnly() {
    // Only auth hook ran
  }
}
```

---

## Gotchas and Pitfalls

### Don't Access Fixtures in Static Hooks

```typescript
// ❌ Wrong: No fixtures in @beforeAll
@beforeAll()
static async setup() {
  await this.page.goto('/');  // Error! No page in static method
}

// ✅ Correct: Use @beforeEach for fixture access
@beforeEach()
async setup() {
  await this.page.goto('/');  // Works!
}
```

### Don't Use Static for @beforeEach/@afterEach

```typescript
// ❌ Wrong: @beforeEach must be instance method
@beforeEach()
static async setup() {}   // Throws error

// ✅ Correct
@beforeEach()
async setup() {}
```

### Don't Share Mutable State

```typescript
// ❌ Dangerous: Shared mutable state
@describe('Bad Tests')
class BadTests {
  static items: string[] = [];

  @test('test 1')
  async test1() {
    BadTests.items.push('a');  // Pollutes other tests!
  }

  @test('test 2')
  async test2() {
    expect(BadTests.items).toHaveLength(0);  // May fail!
  }
}

// ✅ Safe: Per-instance state
@describe('Good Tests')
class GoodTests {
  private items: string[] = [];

  @test('test 1')
  async test1() {
    this.items.push('a');  // Fresh per test
    expect(this.items).toHaveLength(1);
  }

  @test('test 2')
  async test2() {
    expect(this.items).toHaveLength(0);  // Always passes
  }
}
```

### @before/@after Without self Parameter

```typescript
// ⚠️ Warning: Hook without self parameter
@before(() => {
  console.log('No access to instance');  // Works but limited
})

// ✅ Better: Use self parameter
@before(async (self) => {
  await self.page.goto('/');  // Full instance access
})
```

---

## Quick Reference

| Hook | Scope | Method Type | Fixtures? | Always Runs? |
|------|-------|-------------|-----------|-------------|
| `@beforeAll()` | Suite | Static | No | N/A |
| `@beforeEach()` | Test | Instance | Yes | N/A |
| `@before(fn)` | Specific test | N/A (callback) | Via self | N/A |
| `@after(fn)` | Specific test | N/A (callback) | Via self | Yes |
| `@afterEach()` | Test | Instance | Yes | Yes |
| `@afterAll()` | Suite | Static | No | Yes |

---

**Related:** [Core Concepts](./core-concepts.md) | [API Reference](./api-reference.md) | [Edge Cases](./edge-cases.md)
