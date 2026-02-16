# Best Practices

Patterns and anti-patterns for writing maintainable, reliable, and fast tests with decorators.

## Table of Contents

- [Test Organization](#test-organization)
- [Test Isolation](#test-isolation)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Fixtures and Resources](#fixtures-and-resources)
- [Data-Driven Tests](#data-driven-tests)
- [Assertions](#assertions)
- [Performance](#performance)
- [Naming Conventions](#naming-conventions)
- [Error Handling](#error-handling)
- [Anti-Patterns](#anti-patterns)

---

## Test Organization

### One Concern Per Test Suite

```typescript
// ✅ Good: Focused test suite
@describe('Login Form Validation')
class LoginValidationTests {
  @test('should reject empty email') async testEmptyEmail() {}
  @test('should reject invalid email') async testInvalidEmail() {}
  @test('should reject empty password') async testEmptyPassword() {}
  @test('should reject short password') async testShortPassword() {}
}

// ❌ Bad: Mixed concerns
@describe('Login Page')
class LoginPageTests {
  @test('should validate email') async testValidation() {}
  @test('should login successfully') async testLogin() {}
  @test('should show forgot password') async testForgotPassword() {}
  @test('should redirect after login') async testRedirect() {}
  @test('should show registration link') async testRegistration() {}
}
```

### Use Inheritance for Shared Setup

```typescript
// ✅ Good: Shared setup in base class
class AuthenticatedTests extends BaseTest {
  @beforeEach()
  async authenticate() {
    await this.page.goto('/login');
    await this.page.fill('#email', 'admin@test.com');
    await this.page.fill('#password', 'password');
    await this.page.click('#submit');
  }
}

@describe('Dashboard') class DashboardTests extends AuthenticatedTests {}
@describe('Settings') class SettingsTests extends AuthenticatedTests {}
@describe('Profile') class ProfileTests extends AuthenticatedTests {}
```

### Group Related Tests

```typescript
// ✅ Good: Related tests in one suite
@describe('Shopping Cart - Add Items')
class CartAddTests {
  @test('should add single item') async testSingle() {}
  @test('should add multiple items') async testMultiple() {}
  @test('should update quantity') async testQuantity() {}
}

@describe('Shopping Cart - Remove Items')
class CartRemoveTests {
  @test('should remove single item') async testSingle() {}
  @test('should clear all items') async testClearAll() {}
}
```

---

## Test Isolation

### Each Test Should Be Independent

```typescript
// ✅ Good: Tests don't depend on each other
@describe('User Tests')
class UserTests {
  @beforeEach()
  async setup() {
    this.testUser = await createTestUser();  // Fresh user per test
  }

  @test('should update name')
  async testUpdateName() {
    await updateUser(this.testUser.id, { name: 'New Name' });
    const user = await getUser(this.testUser.id);
    expect(user.name).toBe('New Name');
  }

  @test('should update email')
  async testUpdateEmail() {
    await updateUser(this.testUser.id, { email: 'new@test.com' });
    const user = await getUser(this.testUser.id);
    expect(user.email).toBe('new@test.com');
  }
}
```

### Don't Rely on Test Execution Order

```typescript
// ❌ Bad: test2 depends on test1
@describe('Bad Order Tests')
class BadOrderTests {
  static createdId: string;

  @test('should create user')
  async test1() {
    BadOrderTests.createdId = await createUser('Test');
  }

  @test('should find created user')
  async test2() {
    // Fails if test1 doesn't run first!
    const user = await getUser(BadOrderTests.createdId);
    expect(user).toBeDefined();
  }
}

// ✅ Good: Each test is self-contained
@describe('Good Tests')
class GoodTests {
  @test('should create and find user')
  async testCreateAndFind() {
    const id = await createUser('Test');
    const user = await getUser(id);
    expect(user).toBeDefined();
  }
}
```

### Use Instance Properties, Not Static

```typescript
// ❌ Bad: Shared mutable state
@describe('Shared State')
class SharedStateTests {
  static items: string[] = [];

  @test('add item')
  async test1() {
    SharedStateTests.items.push('a');
  }

  @test('check items')
  async test2() {
    expect(SharedStateTests.items).toHaveLength(0);  // May fail!
  }
}

// ✅ Good: Per-test state
@describe('Isolated State')
class IsolatedTests {
  private items: string[] = [];  // Fresh per test

  @test('add item')
  async test1() {
    this.items.push('a');
    expect(this.items).toHaveLength(1);
  }

  @test('empty by default')
  async test2() {
    expect(this.items).toHaveLength(0);  // Always passes
  }
}
```

---

## Lifecycle Hooks

### Use the Right Hook Level

```typescript
// ✅ Good: Expensive setup once, cheap setup per test
@describe('Database Tests')
class DatabaseTests {
  static pool: ConnectionPool;

  @beforeAll()
  static async createPool() {
    // Expensive: create once
    DatabaseTests.pool = await createPool();
  }

  @beforeEach()
  async resetData() {
    // Cheap: reset per test
    await DatabaseTests.pool.query('DELETE FROM test_data');
  }

  @afterAll()
  static async closePool() {
    await DatabaseTests.pool.close();
  }
}
```

### Always Clean Up

```typescript
// ✅ Good: Guaranteed cleanup
@describe('Resource Tests')
class ResourceTests {
  @test('with temp resource')
  @before(async (self) => {
    self.resource = await acquireResource();
  })
  @after(async (self) => {
    // Always runs, even on failure
    if (self.resource) {
      await self.resource.release();
    }
  })
  async test() {
    await this.resource.doWork();
  }
}
```

### Keep Hooks Focused

```typescript
// ✅ Good: Each hook has one job
@describe('Focused Hooks')
class FocusedHookTests {
  @beforeEach()
  async clearState() {
    await this.page.evaluate(() => localStorage.clear());
  }

  @beforeEach()
  async navigateToPage() {
    await this.page.goto('/app');
  }

  @afterEach()
  async screenshot() {
    const info = this.testSelf.info();
    if (info.status !== info.expectedStatus) {
      await info.attach('screenshot', {
        body: await this.page.screenshot(),
        contentType: 'image/png',
      });
    }
  }
}

// ❌ Bad: Monolithic hook
@describe('Monolithic Hook')
class MonolithicTests {
  @beforeEach()
  async doEverything() {
    await this.page.evaluate(() => localStorage.clear());
    await this.page.goto('/app');
    await this.page.waitForLoadState('networkidle');
    this.data = await fetchTestData();
    this.helper = new TestHelper(this.page);
    await this.helper.login();
    // ... too much
  }
}
```

---

## Fixtures and Resources

### Use Worker-Scoped Fixtures for Expensive Resources

```typescript
// ✅ Good: Database connection shared across tests
@use.define({ scope: 'worker' })
async database() {
  return await Database.connect();  // Created once per worker
}

// ❌ Bad: New connection per test
@beforeEach()
async connectDB() {
  this.db = await Database.connect();  // Expensive per test!
}
```

### Prefer Built-in Fixtures

```typescript
// ✅ Good: Use built-in page fixture
@test('test')
async test() {
  await this.page.goto('/');
}

// ❌ Bad: Creating your own page
@test('test')
async test() {
  const page = await this.browser.newPage();  // Unnecessary!
  await page.goto('/');
  await page.close();  // Must manage lifecycle manually
}
```

### Use @before/@after for Test-Specific Resources

```typescript
// ✅ Good: Only tests that need it get the setup
@test('with server')
@before(async (self) => {
  self.mockServer = await startMockServer();
})
@after(async (self) => {
  await self.mockServer.close();
})
async testWithServer() {
  const res = await fetch(this.mockServer.url);
  expect(res.ok).toBeTruthy();
}

// ❌ Bad: All tests pay for unused setup
@beforeEach()
async setup() {
  this.mockServer = await startMockServer();  // Not all tests need this!
}
```

---

## Data-Driven Tests

### Use @test.each for Tabular Data

```typescript
// ✅ Good: Clear, tabular data
@test.each([
  ['admin@test.com', 'admin123', '/admin'],
  ['user@test.com', 'user123', '/dashboard'],
  ['guest@test.com', 'guest123', '/home'],
], 'should redirect $0 to $2')
async testLoginRedirect(email: string, password: string, expectedUrl: string) {
  await this.loginPage.login(email, password);
  await expect(this.page).toHaveURL(expectedUrl);
}
```

### Use @test.data for Dynamic Data

```typescript
// ✅ Good: Data can be computed or shared
@test.data()
loginScenarios = [
  ['valid user', 'user@test.com', 'pass123', true],
  ['invalid password', 'user@test.com', 'wrong', false],
  ['unknown user', 'nobody@test.com', 'pass', false],
];

@test.each((self) => self.loginScenarios, '$0: login with $1')
async testLogin(scenario: string, email: string, password: string, shouldSucceed: boolean) {
  await this.loginPage.login(email, password);
  if (shouldSucceed) {
    await this.loginPage.expectLoggedIn();
  } else {
    await this.loginPage.expectError('Invalid credentials');
  }
}
```

### Keep Data Sets Small

```typescript
// ✅ Good: Representative cases
@test.each([
  ['', false],              // Empty
  ['a', false],             // Too short
  ['valid@email.com', true], // Valid
  ['no-at-sign', false],    // Missing @
], 'email "$0" validity: $1')
async testEmailValidation(email: string, valid: boolean) {}

// ❌ Bad: Exhaustive (test the function, not every input)
@test.each([
  ['a@b.com', true],
  ['b@c.com', true],
  ['c@d.com', true],
  // ... 100 more valid emails
], 'email $0 is valid')
async testEveryEmail(email: string, valid: boolean) {}
```

---

## Assertions

### Use Playwright's Built-in Assertions

```typescript
// ✅ Good: Auto-retrying Playwright assertions
@test('element is visible')
async test() {
  await expect(this.page.locator('.message')).toBeVisible();
  await expect(this.page.locator('.title')).toHaveText('Welcome');
  await expect(this.page).toHaveURL('/dashboard');
}

// ❌ Bad: Manual assertions without retry
@test('element is visible')
async test() {
  const isVisible = await this.page.locator('.message').isVisible();
  expect(isVisible).toBe(true);  // No auto-retry!
}
```

### One Logical Assertion Per Test

```typescript
// ✅ Good: Focused assertion
@test('should show welcome message')
async testWelcome() {
  await this.page.goto('/dashboard');
  await expect(this.page.locator('.welcome')).toHaveText('Welcome, Admin');
}

@test('should show user avatar')
async testAvatar() {
  await this.page.goto('/dashboard');
  await expect(this.page.locator('.avatar')).toBeVisible();
}
```

### Use Custom Assertion Messages

```typescript
// ✅ Good: Clear failure message
@test('should have items')
async test() {
  const count = await this.page.locator('.item').count();
  expect(count, 'Expected at least 1 item in the list').toBeGreaterThan(0);
}
```

---

## Performance

### Parallelize Independent Tests

```typescript
// ✅ Good: Independent tests run in parallel
@describe('Independent Tests')
class IndependentTests {
  @test('test A')
  async testA() { /* no dependencies */ }

  @test('test B')
  async testB() { /* no dependencies */ }

  @test('test C')
  async testC() { /* no dependencies */ }
}
// In playwright.config.ts: fullyParallel: true
```

### Avoid Unnecessary Navigation

```typescript
// ✅ Good: Navigate once, test multiple things
@describe('Dashboard Tests')
class DashboardTests {
  @beforeEach()
  async setup() {
    await this.page.goto('/dashboard');
  }

  @test('should show header') async testHeader() {}
  @test('should show sidebar') async testSidebar() {}
  @test('should show content') async testContent() {}
}

// ❌ Bad: Navigate in every test
@describe('Dashboard Tests')
class BadDashboardTests {
  @test('should show header')
  async testHeader() {
    await this.page.goto('/dashboard');  // Redundant!
    // ...
  }

  @test('should show sidebar')
  async testSidebar() {
    await this.page.goto('/dashboard');  // Redundant!
    // ...
  }
}
```

### Use API for Setup When Possible

```typescript
// ✅ Good: API setup is faster than UI
@beforeEach()
async setup() {
  // Create test data via API (fast)
  const response = await this.request.post('/api/users', {
    data: { name: 'Test User', email: 'test@test.com' },
  });
  this.userId = (await response.json()).id;

  // Only navigate for the actual test
  await this.page.goto(`/users/${this.userId}`);
}

// ❌ Slower: Create data through UI
@beforeEach()
async setup() {
  await this.page.goto('/admin/users/new');
  await this.page.fill('#name', 'Test User');
  await this.page.fill('#email', 'test@test.com');
  await this.page.click('#save');
  // ... wait for navigation, read ID from URL...
}
```

---

## Naming Conventions

### Test Names Should Describe Behavior

```typescript
// ✅ Good: Describes what should happen
@test('should display error when password is too short')
@test('should redirect to dashboard after successful login')
@test('should disable submit button while loading')

// ❌ Bad: Implementation details or vague
@test('test login')
@test('click button')
@test('check error')
```

### Suite Names Should Describe the Feature

```typescript
// ✅ Good: Clear feature name
@describe('User Registration')
@describe('Shopping Cart - Checkout')
@describe('API - User Endpoints')

// ❌ Bad: Vague or technical
@describe('Tests')
@describe('Page1Tests')
@describe('Misc')
```

### File Names Should Match Suites

```
tests/
├── user-registration.spec.ts    → @describe('User Registration')
├── shopping-cart.spec.ts        → @describe('Shopping Cart')
└── api-users.spec.ts            → @describe('API - User Endpoints')
```

---

## Error Handling

### Don't Catch Errors in Tests

```typescript
// ❌ Bad: Swallowing errors
@test('test')
async test() {
  try {
    await this.page.click('#submit');
  } catch (e) {
    console.log('Error:', e);  // Test passes even on error!
  }
}

// ✅ Good: Let errors propagate
@test('test')
async test() {
  await this.page.click('#submit');
  // If click fails, test fails with clear error
}
```

### Use @after for Cleanup, Not try/catch

```typescript
// ❌ Bad: Manual try/finally
@test('test')
async test() {
  const resource = await acquire();
  try {
    await doWork(resource);
  } finally {
    await resource.release();
  }
}

// ✅ Good: Decorator handles cleanup
@test('test')
@before(async (self) => { self.resource = await acquire(); })
@after(async (self) => { await self.resource.release(); })
async test() {
  await doWork(this.resource);
}
```

---

## Anti-Patterns

### Don't Use Arrow Functions for Test Methods

```typescript
// ❌ Wrong: Arrow function loses 'this' context
@test('bad')
testMethod = async () => {
  await this.page.goto('/');  // 'this' is wrong!
}

// ✅ Correct: Regular method
@test('good')
async testMethod() {
  await this.page.goto('/');
}
```

### Don't Use experimentalDecorators

```json
// ❌ Wrong
{ "experimentalDecorators": true }

// ✅ Correct
{ "experimentalDecorators": false, "target": "ES2022" }
```

### Don't Forget await

```typescript
// ❌ Bad: Missing await
@test('bad')
async test() {
  this.page.goto('/');  // Fire and forget!
  this.page.click('#btn');
}

// ✅ Good: All promises awaited
@test('good')
async test() {
  await this.page.goto('/');
  await this.page.click('#btn');
}
```

### Don't Hard-Code Timeouts

```typescript
// ❌ Bad: Fragile, slow
@test('bad')
async test() {
  await this.page.click('#submit');
  await this.page.waitForTimeout(5000);  // Arbitrary wait!
  await expect(this.page.locator('.result')).toBeVisible();
}

// ✅ Good: Wait for condition
@test('good')
async test() {
  await this.page.click('#submit');
  await expect(this.page.locator('.result')).toBeVisible();  // Auto-waits!
}
```

### Don't Put Too Many Tests in One Class

```typescript
// ❌ Bad: 50+ tests in one class
@describe('Everything Tests')
class EverythingTests {
  @test('test 1') async t1() {}
  @test('test 2') async t2() {}
  // ... 50 more tests
}

// ✅ Good: Split by concern
@describe('Auth - Login') class LoginTests { /* 5-10 tests */ }
@describe('Auth - Registration') class RegistrationTests { /* 5-10 tests */ }
@describe('Auth - Password Reset') class PasswordResetTests { /* 5-10 tests */ }
```

---

## Summary

| Category | Do | Don't |
|----------|-----|-------|
| **Organization** | One concern per suite | Mix unrelated tests |
| **Isolation** | Instance properties | Static mutable state |
| **Hooks** | Right level for the job | Monolithic setup |
| **Fixtures** | Worker scope for expensive | New connection per test |
| **Data** | Representative cases | Exhaustive datasets |
| **Assertions** | Playwright auto-retry | Manual boolean checks |
| **Performance** | API setup, parallel | UI setup, sequential |
| **Naming** | Describe behavior | Vague names |
| **Errors** | Let them propagate | try/catch in tests |

---

**Related:** [Core Concepts](./core-concepts.md) | [Edge Cases](./edge-cases.md) | [Troubleshooting](./troubleshooting.md)
