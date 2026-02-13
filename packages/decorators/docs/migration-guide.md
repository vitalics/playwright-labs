# Migration Guide

Complete guide for migrating from traditional Playwright Test to decorator-based tests.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Quick Migration Path](#quick-migration-path)
- [Step-by-Step Migration](#step-by-step-migration)
- [Pattern Conversions](#pattern-conversions)
- [Using makeDecorators](#using-makedecorators)
- [Custom Fixtures Migration](#custom-fixtures-migration)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Incremental Migration](#incremental-migration)

---

## Why Migrate?

### Benefits of Decorator-Based Tests

✅ **Better Organization** - Class-based structure groups related tests naturally  
✅ **Code Reusability** - Share setup/teardown via inheritance  
✅ **Type Safety** - Proper `this` context with TypeScript  
✅ **Less Boilerplate** - Cleaner, more readable code  
✅ **Page Object Pattern** - Natural fit for POM architecture  
✅ **Flexible Lifecycle** - More granular control with `@before`/`@after`  
✅ **IDE Support** - Better autocomplete and refactoring  

### When to Migrate

**Good Candidates:**
- Test suites with repeated setup/teardown logic
- Projects using Page Object Model pattern
- Teams preferring OOP style
- Codebases with test inheritance needs

**Maybe Not Yet:**
- Very simple test suites (< 10 tests)
- Teams unfamiliar with decorators
- Projects that can't use ES2022

---

## Quick Migration Path

### Traditional Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('#username', 'user@example.com');
    await page.fill('#password', 'password123');
    await page.click('#login-button');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('#username', 'wrong@example.com');
    await page.fill('#password', 'wrong');
    await page.click('#login-button');
    await expect(page.locator('.error')).toBeVisible();
  });
});
```

### With Decorators

```typescript
import { describe, test, beforeEach } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('Login Tests')
class LoginTests {
  @beforeEach()
  async setup() {
    await this.page.goto('https://example.com/login');
  }

  @test('should login with valid credentials')
  async testValidLogin() {
    await this.page.fill('#username', 'user@example.com');
    await this.page.fill('#password', 'password123');
    await this.page.click('#login-button');
    await expect(this.page).toHaveURL('/dashboard');
  }

  @test('should show error with invalid credentials')
  async testInvalidLogin() {
    await this.page.fill('#username', 'wrong@example.com');
    await this.page.fill('#password', 'wrong');
    await this.page.click('#login-button');
    await expect(this.page.locator('.error')).toBeVisible();
  }
}
```

---

## Step-by-Step Migration

### Step 1: Install the Package

```bash
npm install @playwright-labs/decorators
```

### Step 2: Update TypeScript Config

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // Must be false or omitted
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

### Step 3: Convert test.describe to @describe

**Before:**
```typescript
test.describe('My Tests', () => {
  // tests...
});
```

**After:**
```typescript
@describe('My Tests')
class MyTests {
  // tests...
}
```

### Step 4: Convert test() to @test()

**Before:**
```typescript
test('my test name', async ({ page }) => {
  await page.goto('/');
});
```

**After:**
```typescript
@test('my test name')
async myTestName() {
  await this.page.goto('/');
}
```

**Key Changes:**
- Remove `{ page }` parameter - access via `this.page`
- Convert to class method
- Keep async/await

### Step 5: Convert Lifecycle Hooks

**Before:**
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

**After:**
```typescript
@beforeEach()
async setup() {
  await this.page.goto('/');
}

@afterEach()
async cleanup() {
  await this.page.context().clearCookies();
}
```

### Step 6: Run Your Tests

```bash
npx playwright test
```

---

## Pattern Conversions

### Nested Describes

**Before:**
```typescript
test.describe('User Management', () => {
  test.describe('Login', () => {
    test('valid credentials', async ({ page }) => {});
    test('invalid credentials', async ({ page }) => {});
  });
  
  test.describe('Registration', () => {
    test('new user', async ({ page }) => {});
    test('existing user', async ({ page }) => {});
  });
});
```

**After (Option 1: Separate Classes):**
```typescript
@describe('User Management - Login')
class LoginTests {
  @test('valid credentials')
  async testValid() {}
  
  @test('invalid credentials')
  async testInvalid() {}
}

@describe('User Management - Registration')
class RegistrationTests {
  @test('new user')
  async testNewUser() {}
  
  @test('existing user')
  async testExisting() {}
}
```

**After (Option 2: Single Class with Tags):**
```typescript
@describe('User Management')
class UserManagementTests {
  @test('login with valid credentials')
  @tag('login')
  async testLoginValid() {}
  
  @test('login with invalid credentials')
  @tag('login')
  async testLoginInvalid() {}
  
  @test('register new user')
  @tag('registration')
  async testRegisterNew() {}
  
  @test('register existing user')
  @tag('registration')
  async testRegisterExisting() {}
}
```

### Fixture Parameters

**Before:**
```typescript
test('with multiple fixtures', async ({ page, context, browser }) => {
  await page.goto('/');
  await context.clearCookies();
  console.log(browser.version());
});
```

**After:**
```typescript
@test('with multiple fixtures')
async testWithFixtures() {
  await this.page.goto('/');
  await this.context.clearCookies();
  console.log(this.browser.version());
}
```

All fixtures are available on `this`:
- `this.page`
- `this.context`
- `this.browser`
- `this.request`
- Any custom fixtures

### Test Annotations

**Before:**
```typescript
test('slow test', async ({ page }) => {
  test.slow();
  // test code
});

test('skip on mobile', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Not ready for Safari');
  // test code
});
```

**After:**
```typescript
@test('slow test')
@slow()
async slowTest() {
  // test code
}

@test('skip on mobile')
@skip(process.env.BROWSER === 'webkit', 'Not ready for Safari')
async skipMobile() {
  // test code
}
```

### Test Timeouts

**Before:**
```typescript
test('slow operation', async ({ page }) => {
  test.setTimeout(60000);
  await slowOperation();
});
```

**After:**
```typescript
@test('slow operation')
@timeout(60000)
async slowOperation() {
  await slowOperation();
}
```

### Data-Driven Tests

**Before:**
```typescript
const testData = [
  ['user1@test.com', 'pass1'],
  ['user2@test.com', 'pass2'],
  ['user3@test.com', 'pass3'],
];

for (const [email, password] of testData) {
  test(`login with ${email}`, async ({ page }) => {
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#login');
  });
}
```

**After:**
```typescript
@test.each([
  ['user1@test.com', 'pass1'],
  ['user2@test.com', 'pass2'],
  ['user3@test.com', 'pass3'],
], 'login with $1')
async testLogin(email: string, password: string) {
  await this.page.fill('#email', email);
  await this.page.fill('#password', password);
  await this.page.click('#login');
}
```

---

## Using makeDecorators

The `makeDecorators` function allows you to use decorators with **custom Playwright Test instances** that have custom fixtures.

### Basic Usage

```typescript
// test-base.ts
import { test as base } from '@playwright/test';
import { makeDecorators } from '@playwright-labs/decorators';

// Define custom fixtures
type MyFixtures = {
  myCustomFixture: string;
  anotherFixture: number;
};

export const test = base.extend<MyFixtures>({
  myCustomFixture: async ({}, use) => {
    await use('custom-value');
  },
  
  anotherFixture: async ({}, use) => {
    await use(42);
  },
});

// Create decorators for your custom test
export const {
  describe,
  test: testDecorator,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  step,
  tag,
  skip,
  fixme,
  slow,
  timeout,
  annotate,
  attachment,
  use: useFixture,
  before,
  after,
} = makeDecorators(test);

export { expect } from '@playwright/test';
```

### Using Custom Decorators

```typescript
// my-tests.spec.ts
import { describe, test, beforeEach, expect } from './test-base';

@describe('Tests with Custom Fixtures')
class CustomFixtureTests {
  @beforeEach()
  async setup() {
    console.log('Custom fixture value:', this.myCustomFixture);
    console.log('Another fixture value:', this.anotherFixture);
  }

  @test('should use custom fixtures')
  async testCustomFixtures() {
    expect(this.myCustomFixture).toBe('custom-value');
    expect(this.anotherFixture).toBe(42);
  }
}
```

### Advanced Example with Multiple Custom Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { makeDecorators } from '@playwright-labs/decorators';

// Define your custom fixture types
type CustomFixtures = {
  authenticatedPage: Page;
  apiClient: ApiClient;
  testData: TestData;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass');
    await page.click('#login');
    await page.waitForURL('/dashboard');
    await use(page);
  },

  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await client.authenticate();
    await use(client);
    await client.cleanup();
  },

  testData: async ({}, use) => {
    const data = await loadTestData();
    await use(data);
    await cleanupTestData(data);
  },
});

// Create decorators
export const {
  describe,
  test: testMethod,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  use: useFixture,
  before,
  after,
  timeout,
  tag,
  skip,
  slow,
} = makeDecorators(test);

export { expect } from '@playwright/test';
```

```typescript
// authenticated-tests.spec.ts
import { describe, test, beforeEach, expect } from './fixtures';

@describe('Authenticated Tests')
class AuthenticatedTests {
  @test('should access protected page')
  async testProtectedAccess() {
    // this.authenticatedPage is already logged in
    await this.authenticatedPage.goto('/protected');
    await expect(this.authenticatedPage.locator('h1')).toHaveText('Protected Area');
  }

  @test('should use API client')
  async testApiAccess() {
    const users = await this.apiClient.getUsers();
    expect(users.length).toBeGreaterThan(0);
  }

  @test('should have test data')
  async testWithData() {
    expect(this.testData.users).toBeDefined();
    expect(this.testData.products).toBeDefined();
  }
}
```

### Project-Wide Configuration

Create a reusable test instance for your entire project:

```typescript
// test.ts (project root)
import { test as base } from '@playwright/test';
import { makeDecorators } from '@playwright-labs/decorators';

// Project-wide fixtures
type ProjectFixtures = {
  userRole: 'admin' | 'user' | 'guest';
  database: Database;
  config: AppConfig;
};

export const test = base.extend<ProjectFixtures>({
  userRole: ['user', { option: true }],
  
  database: async ({}, use) => {
    const db = await Database.connect();
    await use(db);
    await db.close();
  },
  
  config: async ({}, use) => {
    await use(loadConfig());
  },
});

// Export all decorators
export const {
  describe,
  test: testDecorator,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  before,
  after,
  timeout,
  tag,
  skip,
  fixme,
  slow,
  annotate,
  use: useFixture,
} = makeDecorators(test);

export { expect } from '@playwright/test';
```

Now use everywhere in your project:

```typescript
// any-test.spec.ts
import { describe, test, expect } from './test';

@describe('Database Tests')
class DatabaseTests {
  @test('should query database')
  async testDatabase() {
    const users = await this.database.query('SELECT * FROM users');
    expect(users.length).toBeGreaterThan(0);
  }

  @test('should use config')
  async testConfig() {
    expect(this.config.apiUrl).toBeDefined();
  }
}
```

### Type Safety with Custom Fixtures

TypeScript will properly type all your custom fixtures:

```typescript
@describe('Type-Safe Tests')
class TypeSafeTests {
  @test('fixtures are typed')
  async testTypes() {
    // TypeScript knows these exist and their types
    const page: Page = this.authenticatedPage;
    const client: ApiClient = this.apiClient;
    const data: TestData = this.testData;
    
    // TypeScript will error if you try to access non-existent fixtures
    // this.nonExistent; // ❌ TypeScript error
  }
}
```

---

## Custom Fixtures Migration

### Before (Traditional Playwright)

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

type MyFixtures = {
  todoPage: TodoPage;
};

export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },
});

// test.spec.ts
import { test } from './fixtures';

test('add todo', async ({ todoPage }) => {
  await todoPage.addTodo('Buy milk');
  await todoPage.expectTodoCount(1);
});
```

### After (With Decorators)

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { makeDecorators } from '@playwright-labs/decorators';

type MyFixtures = {
  todoPage: TodoPage;
};

export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await use(todoPage);
  },
});

export const { describe, test: testDecorator, beforeEach } = makeDecorators(test);
export { expect } from '@playwright/test';

// test.spec.ts
import { describe, test, expect } from './fixtures';

@describe('Todo Tests')
class TodoTests {
  @test('add todo')
  async testAddTodo() {
    await this.todoPage.addTodo('Buy milk');
    await this.todoPage.expectTodoCount(1);
  }
}
```

---

## Common Patterns

### Pattern 1: Page Object Model

**Before:**
```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(username: string, password: string) {
    await this.page.fill('#username', username);
    await this.page.fill('#password', password);
    await this.page.click('#login');
  }
}

test.describe('Login Tests', () => {
  let loginPage: LoginPage;
  
  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await page.goto('/login');
  });
  
  test('login', async ({ page }) => {
    await loginPage.login('user', 'pass');
  });
});
```

**After:**
```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(username: string, password: string) {
    await this.page.fill('#username', username);
    await this.page.fill('#password', password);
    await this.page.click('#login');
  }
}

@describe('Login Tests')
class LoginTests {
  private loginPage: LoginPage;
  
  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.page.goto('/login');
  }
  
  @test('login')
  async testLogin() {
    await this.loginPage.login('user', 'pass');
  }
}
```

### Pattern 2: Shared Setup

**Before:**
```typescript
test.describe('API Tests', () => {
  let apiClient: ApiClient;
  
  test.beforeAll(async () => {
    apiClient = new ApiClient();
    await apiClient.authenticate();
  });
  
  test('get users', async () => {
    const users = await apiClient.getUsers();
    expect(users.length).toBeGreaterThan(0);
  });
  
  test.afterAll(async () => {
    await apiClient.cleanup();
  });
});
```

**After:**
```typescript
@describe('API Tests')
class ApiTests {
  static apiClient: ApiClient;
  
  @beforeAll()
  static async setup() {
    this.apiClient = new ApiClient();
    await this.apiClient.authenticate();
  }
  
  @test('get users')
  async testGetUsers() {
    const users = ApiTests.apiClient.getUsers();
    expect(users.length).toBeGreaterThan(0);
  }
  
  @afterAll()
  static async cleanup() {
    await this.apiClient.cleanup();
  }
}
```

### Pattern 3: Test Inheritance

**Before (Not easily possible):**
```typescript
// Have to duplicate setup in each describe block
```

**After (Easy with classes):**
```typescript
@describe('Base Tests')
class BaseTests {
  @beforeEach()
  async baseSetup() {
    await this.page.goto('/');
  }
}

@describe('Login Tests')
class LoginTests extends BaseTests {
  // Inherits baseSetup automatically
  
  @beforeEach()
  async loginSetup() {
    await this.page.goto('/login');
  }
  
  @test('login')
  async testLogin() {
    // Both baseSetup and loginSetup run
  }
}
```

---

## Troubleshooting

### Issue: "Cannot read property 'page' of undefined"

**Cause:** Using arrow function instead of method.

```typescript
// ❌ Wrong
@test('bad')
myTest = async () => {
  await this.page.goto('/');
}

// ✅ Correct
@test('good')
async myTest() {
  await this.page.goto('/');
}
```

### Issue: "experimentalDecorators" Error

**Cause:** Wrong TypeScript configuration.

**Fix:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // Must be false
    "target": "ES2022"
  }
}
```

### Issue: Fixtures Not Available

**Cause:** Not using `makeDecorators` with custom test.

**Fix:** Always create decorators from your custom test instance:
```typescript
export const { describe, test } = makeDecorators(myCustomTest);
```

### Issue: Tests Not Running

**Cause:** Class not properly imported.

**Fix:** Make sure the file is imported in your test configuration or has proper exports.

---

## Incremental Migration

You don't have to migrate everything at once! Both styles can coexist:

### Hybrid Approach

```typescript
// Old style (still works)
test.describe('Old Tests', () => {
  test('old test', async ({ page }) => {
    await page.goto('/');
  });
});

// New style (decorator-based)
@describe('New Tests')
class NewTests {
  @test('new test')
  async testNew() {
    await this.page.goto('/');
  }
}
```

### Migration Strategy

1. **Start with new tests** - Write new tests using decorators
2. **Migrate simple suites** - Convert straightforward test suites first
3. **Tackle complex ones** - Convert tests with complex setup/teardown
4. **Refactor as needed** - Take advantage of inheritance and POM
5. **Remove old tests** - Once confident, remove traditional tests

---

## Checklist

Before migrating a test file:

- [ ] TypeScript config updated (`target: "ES2022"`, `experimentalDecorators: false`)
- [ ] Package installed (`@playwright-labs/decorators`)
- [ ] Understand fixture access (via `this.page`, not parameters)
- [ ] Choose migration strategy (all at once vs incremental)
- [ ] Create custom test instance if using custom fixtures
- [ ] Use `makeDecorators` for custom fixtures
- [ ] Test file imports from correct location
- [ ] Tests run successfully

After migration:

- [ ] All tests pass
- [ ] No fixture access errors
- [ ] Lifecycle hooks work correctly
- [ ] Custom fixtures accessible
- [ ] Type safety maintained
- [ ] CI/CD pipeline works

---

## Next Steps

- **Learn:** [Core Concepts](./core-concepts.md)
- **Master:** [Lifecycle Hooks](./lifecycle-hooks.md)
- **Explore:** [Best Practices](./best-practices.md)
- **Reference:** [API Documentation](./api-reference.md)

---

**Questions?** Check our [Troubleshooting Guide](./troubleshooting.md) or [open an issue](https://github.com/anthropics/claude-code/issues).
