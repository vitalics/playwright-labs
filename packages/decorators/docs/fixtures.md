# Fixtures Guide

Fixtures provide test-scoped resources that are automatically set up and torn down. This guide covers how to use built-in Playwright fixtures and create custom ones with decorators.

## Table of Contents

- [What Are Fixtures](#what-are-fixtures)
- [Built-in Fixtures](#built-in-fixtures)
- [Accessing Fixtures](#accessing-fixtures)
- [BaseTest Class](#basetest-class)
- [Custom Fixtures with makeDecorators](#custom-fixtures-with-makedecorators)
- [Defining Fixtures with @use.define](#defining-fixtures-with-usedefine)
- [Configuring Fixtures with @use](#configuring-fixtures-with-use)
- [Fixture Scopes](#fixture-scopes)
- [Fixture Cleanup](#fixture-cleanup)
- [Advanced Patterns](#advanced-patterns)
- [Gotchas](#gotchas)

---

## What Are Fixtures

Fixtures are resources that Playwright creates fresh for each test. They handle setup and teardown automatically, ensuring test isolation.

In the decorator system, fixtures are injected onto `this`:

```typescript
@describe('Fixture Example')
class FixtureTests {
  @test('using page fixture')
  async testPage() {
    // this.page is a fresh Page instance for this test
    await this.page.goto('https://example.com');
    await expect(this.page).toHaveTitle(/Example/);
  }
}
```

---

## Built-in Fixtures

The following Playwright fixtures are automatically available:

### Test-Scoped Fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `this.page` | `Page` | Isolated page per test |
| `this.context` | `BrowserContext` | Isolated browser context |
| `this.request` | `APIRequestContext` | API testing context |

### Worker-Scoped Fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `this.browser` | `Browser` | Shared browser instance |
| `this.browserName` | `string` | `'chromium'`, `'firefox'`, or `'webkit'` |

### Configuration Fixtures

| Fixture | Type | Description |
|---------|------|-------------|
| `this.viewport` | `object \| null` | Viewport size |
| `this.baseURL` | `string` | Base URL for navigation |
| `this.userAgent` | `string` | Custom user agent |
| `this.locale` | `string` | Browser locale |
| `this.timezoneId` | `string` | Timezone override |
| `this.storageState` | `string \| object` | Storage state for auth |
| `this.geolocation` | `object` | Geolocation override |
| `this.permissions` | `string[]` | Browser permissions |
| `this.extraHTTPHeaders` | `object` | Extra HTTP headers |
| `this.actionTimeout` | `number` | Action timeout |
| `this.navigationTimeout` | `number` | Navigation timeout |

---

## Accessing Fixtures

### Direct Access via this

All fixtures are injected as properties:

```typescript
@describe('Fixture Access')
class FixtureAccessTests {
  @test('access page fixtures')
  async testPage() {
    await this.page.goto('/');
    const cookies = await this.context.cookies();
    const browserType = this.browserName;
  }

  @test('access configuration')
  async testConfig() {
    console.log('Base URL:', this.baseURL);
    console.log('Viewport:', this.viewport);
    console.log('Browser:', this.browserName);
  }
}
```

### Via pwSelf

The `pwSelf` property provides an object with commonly used fixtures:

```typescript
@describe('pwSelf Example')
class PwSelfTests extends BaseTest {
  @test('using pwSelf')
  async test() {
    const page = this.pwSelf.page;
    const context = this.pwSelf.context;
    const baseURL = this.pwSelf.baseURL;
  }
}
```

### Via testSelf

Access `test.info()` and `test.use()` at runtime:

```typescript
@describe('testSelf Example')
class TestSelfTests extends BaseTest {
  @test('access test info')
  async test() {
    const info = this.testSelf.info();
    console.log('Test title:', info.title);
    console.log('Test status:', info.status);

    // Add runtime annotations
    info.annotations.push({ type: 'note', description: 'Custom note' });
  }
}
```

---

## BaseTest Class

Extend `BaseTest` for full TypeScript support:

```typescript
import { BaseTest, describe, test } from '@playwright-labs/decorators';

@describe('Typed Tests')
class TypedTests extends BaseTest {
  @test('fully typed')
  async test() {
    // Full autocomplete for:
    await this.page.goto('/');           // Page methods
    await this.context.clearCookies();   // BrowserContext methods
    const name = this.browserName;       // 'chromium' | 'firefox' | 'webkit'
  }
}
```

`BaseTest` provides types for:
- All Playwright test fixtures
- All Playwright worker fixtures
- All configuration options
- `pwSelf` accessor object
- `testSelf` accessor for test info

---

## Custom Fixtures with makeDecorators

For custom Playwright fixtures, use `makeDecorators` to create a typed decorator set:

### Step 1: Define Custom Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

export type MyFixtures = {
  apiClient: ApiClient;
  testUser: { email: string; password: string };
};

export const test = base.extend<MyFixtures>({
  apiClient: async ({}, use) => {
    const client = new ApiClient('https://api.example.com');
    await use(client);
    await client.dispose();
  },

  testUser: async ({}, use) => {
    const user = await createTestUser();
    await use(user);
    await deleteTestUser(user.email);
  },
});
```

### Step 2: Create Decorators

```typescript
// decorators.ts
import { makeDecorators } from '@playwright-labs/decorators';
import { test } from './fixtures';

export const {
  describe,
  test: testDecorator,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  step,
  param,
  tag,
  skip,
  fixme,
  slow,
  annotate,
  attachment,
  use,
  BaseTest,
} = makeDecorators(test);
```

### Step 3: Use in Tests

```typescript
// tests/api.spec.ts
import { describe, testDecorator as test, beforeEach, BaseTest } from '../decorators';
import { expect } from '@playwright/test';

@describe('API Tests')
class ApiTests extends BaseTest {
  @beforeEach()
  async setup() {
    // this.apiClient is typed and available
    await this.apiClient.authenticate(this.testUser);
  }

  @test('should fetch users')
  async testFetchUsers() {
    const users = await this.apiClient.get('/users');
    expect(users.length).toBeGreaterThan(0);
  }
}
```

### Selective Fixture Extraction

By default, all Playwright fixtures are injected. Use the second parameter of `makeDecorators` to select specific fixtures:

```typescript
export const { describe, test } = makeDecorators(
  myTest,
  (fixtures) => ({
    page: fixtures.page,
    apiClient: fixtures.apiClient,
    testUser: fixtures.testUser,
  })
);
```

This improves performance by only destructuring needed fixtures.

---

## Defining Fixtures with @use.define

Define fixtures directly in test classes using `@use.define`:

### Field Fixtures

```typescript
@describe('Field Fixtures')
class FieldFixtureTests {
  @use.define()
  testConfig = {
    apiUrl: 'https://api.example.com',
    timeout: 5000,
  };

  @test('use field fixture')
  async test() {
    expect(this.testConfig.apiUrl).toBe('https://api.example.com');
  }
}
```

### Getter Fixtures

```typescript
@describe('Getter Fixtures')
class GetterFixtureTests {
  @use.define()
  get timestamp() {
    return Date.now();  // Computed on every access
  }

  @test('use getter fixture')
  async test() {
    const t = this.timestamp;
    expect(t).toBeGreaterThan(0);
  }
}
```

### Method Fixtures

```typescript
@describe('Method Fixtures')
class MethodFixtureTests {
  @use.define({ scope: 'worker' })
  async database() {
    const conn = await Database.connect();
    return conn;
  }

  @test('use method fixture')
  async test() {
    const users = await this.database.query('SELECT * FROM users');
    expect(users).toBeDefined();
  }
}
```

### @use.define Options

```typescript
interface UseDefineOptions {
  auto?: boolean;           // Auto-use fixture (default: true for fields/getters)
  scope?: 'test' | 'worker'; // Fixture scope (default: 'test')
  box?: boolean | 'self';    // Hide from reports (default: false)
  title?: string;            // Custom report title
}
```

| Option | Default (field/getter) | Default (method) | Description |
|--------|----------------------|-------------------|-------------|
| `auto` | `true` | `false` | Whether fixture is auto-initialized |
| `scope` | `'test'` | `'test'` | Lifetime of the fixture |
| `box` | `false` | `false` | Hide from Playwright reports |
| `title` | field name | method name | Custom display name |

---

## Configuring Fixtures with @use

The `@use` decorator configures Playwright fixture options:

### Class-Level Configuration

```typescript
@describe('Mobile Tests')
@use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
})
class MobileTests {
  @test('should show mobile layout')
  async test() {
    await this.page.goto('/');
    await expect(this.page.locator('.mobile-nav')).toBeVisible();
  }
}
```

### Method-Level Configuration

```typescript
@describe('Multi-Config Tests')
class MultiConfigTests {
  @test('desktop view')
  @use({ viewport: { width: 1920, height: 1080 } })
  async testDesktop() {
    await this.page.goto('/');
    await expect(this.page.locator('.desktop-sidebar')).toBeVisible();
  }

  @test('tablet view')
  @use({ viewport: { width: 768, height: 1024 } })
  async testTablet() {
    await this.page.goto('/');
    await expect(this.page.locator('.tablet-nav')).toBeVisible();
  }
}
```

### Common @use Configurations

```typescript
// Geolocation
@use({
  geolocation: { longitude: -122.4194, latitude: 37.7749 },
  permissions: ['geolocation'],
})

// Custom locale
@use({
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
})

// HTTP credentials
@use({
  httpCredentials: {
    username: 'user',
    password: 'pass',
  },
})

// Storage state (for auth)
@use({
  storageState: './auth-state.json',
})

// Base URL
@use({
  baseURL: 'https://staging.example.com',
})
```

> **Important:** When combining `@describe` and `@use`, `@describe` must come first:
> ```typescript
> @describe('Tests')  // First
> @use({ ... })       // Second
> class MyTests {}
> ```

---

## Fixture Scopes

### Test Scope (Default)

Created fresh for each test:

```typescript
@use.define({ scope: 'test' })
testData = generateData();  // New data per test
```

### Worker Scope

Shared across all tests in a worker:

```typescript
@use.define({ scope: 'worker' })
async database() {
  // Created once per worker, shared across tests
  return await Database.connect();
}
```

### When to Use Each Scope

| Scope | Use For | Example |
|-------|---------|---------|
| `test` | Cheap, test-specific resources | Test data, page objects |
| `worker` | Expensive, shared resources | Database connections, servers |

---

## Fixture Cleanup

### Using @after for Cleanup

```typescript
@describe('Cleanup Tests')
class CleanupTests {
  private tempFile: string;

  @test('with temp file')
  @before(async (self) => {
    self.tempFile = await createTempFile();
  })
  @after(async (self) => {
    await deleteTempFile(self.tempFile);
  })
  async test() {
    const content = await readFile(this.tempFile);
    expect(content).toBeDefined();
  }
}
```

### Cleanup in makeDecorators Fixtures

```typescript
const test = base.extend({
  tempDir: async ({}, use) => {
    const dir = await fs.mkdtemp('/tmp/test-');
    await use(dir);                    // ← Test runs here
    await fs.rm(dir, { recursive: true }); // ← Cleanup after test
  },
});
```

---

## Advanced Patterns

### Fixture Dependencies

Fixtures can depend on other fixtures:

```typescript
const test = base.extend({
  apiClient: async ({}, use) => {
    const client = new ApiClient();
    await use(client);
    await client.dispose();
  },

  authenticatedClient: async ({ apiClient }, use) => {
    await apiClient.login('admin', 'password');
    await use(apiClient);  // Same client, now authenticated
  },
});
```

### Fixture Overrides

```typescript
// Base fixtures
const baseTest = base.extend({
  apiUrl: ['https://production.api.com', { option: true }],
});

// Override in test
@describe('Staging Tests')
@use({ apiUrl: 'https://staging.api.com' })
class StagingTests {
  @test('uses staging API')
  async test() {
    // apiUrl is now staging
  }
}
```

### Auto-Use Fixtures

Fixtures with `auto: true` run for every test automatically:

```typescript
@describe('Auto-Use Example')
class AutoUseTests {
  @use.define({ auto: true })
  logger = new TestLogger();  // Created for every test

  @test('test 1')
  async test1() {
    this.logger.info('Test 1 running');
  }

  @test('test 2')
  async test2() {
    this.logger.info('Test 2 running');
  }
}
```

---

## Gotchas

### Fixture Order Matters

```typescript
// ❌ authToken depends on user, but user is defined after
@use.define()
get authToken() {
  return `token-${this.user.email}`;  // user not initialized!
}

@use.define()
user = { email: 'test@test.com' };

// ✅ Define dependencies first
@use.define()
user = { email: 'test@test.com' };

@use.define()
get authToken() {
  return `token-${this.user.email}`;  // Works
}
```

### No Fixtures in @beforeAll

```typescript
// ❌ No fixtures in static hooks
@beforeAll()
static async setup() {
  await this.page.goto('/');  // Error! No page in @beforeAll
}

// ✅ Use @beforeEach for fixture access
@beforeEach()
async setup() {
  await this.page.goto('/');
}
```

### Getter Fixtures Re-execute

```typescript
@use.define()
get expensiveData() {
  return computeExpensiveData();  // Called every time!
}

// ✅ Use field for one-time computation
@use.define()
expensiveData = computeExpensiveData();  // Called once
```

---

**Related:** [API Reference](./api-reference.md) | [Core Concepts](./core-concepts.md) | [Best Practices](./best-practices.md)
