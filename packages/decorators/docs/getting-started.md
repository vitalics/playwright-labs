# Getting Started

Welcome to @playwright-labs/decorators! This guide will help you write your first test using decorators.

## Table of Contents

- [Installation](#installation)
- [TypeScript Configuration](#typescript-configuration)
- [Your First Test](#your-first-test)
- [Adding Lifecycle Hooks](#adding-lifecycle-hooks)
- [Using Fixtures](#using-fixtures)
- [Running Tests](#running-tests)
- [Next Steps](#next-steps)

## Installation

Install the package alongside Playwright Test:

```bash
npm install @playwright-labs/decorators @playwright/test
```

Or with yarn:

```bash
yarn add @playwright-labs/decorators @playwright/test
```

Or with pnpm:

```bash
pnpm add @playwright-labs/decorators @playwright/test
```

## TypeScript Configuration

**Important:** This library uses TC39 Stage 3 decorators, NOT legacy `experimentalDecorators`.

Update your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // Must be false or omitted
    "target": "ES2022",               // Required for decorators
    "lib": ["ES2022"],                // Required for decorators
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

> **Common Mistake:** Do NOT enable `experimentalDecorators: true`. This library requires modern TC39 decorators.

## Your First Test

Create a file `example.spec.ts`:

```typescript
import { describe, test } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('My First Test Suite')
class MyFirstTests {
  @test('should perform basic math')
  async testMath() {
    const result = 2 + 2;
    expect(result).toBe(4);
  }

  @test('should check string equality')
  async testStrings() {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('World');
  }
}
```

That's it! You've written your first tests with decorators.

## Adding Lifecycle Hooks

Let's add setup and teardown logic:

```typescript
import { describe, test, beforeEach, afterEach } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('Calculator Tests')
class CalculatorTests {
  private calculator: { value: number };

  @beforeEach()
  async setup() {
    // Runs before each test
    this.calculator = { value: 0 };
    console.log('Calculator initialized');
  }

  @test('should add numbers')
  async testAddition() {
    this.calculator.value = 5 + 3;
    expect(this.calculator.value).toBe(8);
  }

  @test('should subtract numbers')
  async testSubtraction() {
    this.calculator.value = 10 - 4;
    expect(this.calculator.value).toBe(6);
  }

  @afterEach()
  async cleanup() {
    // Runs after each test
    console.log(`Final value: ${this.calculator.value}`);
  }
}
```

## Using Fixtures

Access Playwright fixtures via `this.page`, `this.context`, etc:

```typescript
import { describe, test, beforeEach } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('Web Page Tests')
class WebPageTests {
  @beforeEach()
  async navigateToPage() {
    await this.page.goto('https://example.com');
  }

  @test('should have correct title')
  async testTitle() {
    await expect(this.page).toHaveTitle(/Example Domain/);
  }

  @test('should have heading')
  async testHeading() {
    const heading = this.page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('Example Domain');
  }

  @test('should have link')
  async testLink() {
    const link = this.page.locator('a');
    await expect(link).toBeVisible();
  }
}
```

### Available Fixtures

By default, these fixtures are available on `this`:

- `this.page` - The Page object
- `this.context` - The BrowserContext
- `this.browser` - The Browser instance
- `this.request` - API request context

Need more fixtures? See the [Fixtures Guide](./fixtures.md).

## Running Tests

Run your tests with Playwright's test runner:

```bash
# Run all tests
npx playwright test

# Run specific file
npx playwright test example.spec.ts

# Run with UI mode
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Run with specific browser
npx playwright test --project=chromium
```

## Next Steps

Now that you've written your first test, explore these topics:

### Essential Reading

1. [**Core Concepts**](./core-concepts.md) - Understand how decorators work
2. [**Lifecycle Hooks**](./lifecycle-hooks.md) - Master setup and teardown
3. [**API Reference**](./api-reference.md) - Complete decorator documentation

### Common Use Cases

4. [**Page Object Model**](./page-object-model.md) - Organize your test code
5. [**Data-Driven Tests**](./data-driven-tests.md) - Test with multiple data sets
6. [**Timeout Configuration**](./timeout-configuration.md) - Manage test timeouts

### Advanced Topics

7. [**Fixtures Guide**](./fixtures.md) - Create custom fixtures
8. [**Best Practices**](./best-practices.md) - Write maintainable tests
9. [**Edge Cases**](./edge-cases.md) - Handle complex scenarios

## Quick Tips

### ✅ Do's

```typescript
// ✅ Use meaningful test names
@test('should login with valid credentials')

// ✅ Use beforeEach for repeated setup
@beforeEach()
async setup() { /* ... */ }

// ✅ Access fixtures via this
async test() {
  await this.page.goto('/');
}

// ✅ Use @timeout for slow tests
@test('slow operation')
@timeout(60000)
async slowTest() { /* ... */ }
```

### ❌ Don'ts

```typescript
// ❌ Don't use experimentalDecorators
// tsconfig.json
{
  "experimentalDecorators": true  // Wrong!
}

// ❌ Don't forget to await async operations
@test('bad test')
async test() {
  this.page.goto('/');  // Missing await!
}

// ❌ Don't share state between tests
class BadTests {
  static sharedData = [];  // State persists between tests!
}

// ❌ Don't use arrow functions for test methods
@test('bad test')
testMethod = async () => {  // Won't have correct 'this'
  // ...
}
```

## Common Issues

### Issue: "Cannot read property 'page' of undefined"

**Cause:** Using arrow function instead of regular method.

```typescript
// ❌ Wrong
@test('my test')
myTest = async () => {
  await this.page.goto('/');  // 'this' is wrong!
}

// ✅ Correct
@test('my test')
async myTest() {
  await this.page.goto('/');  // 'this' is correct
}
```

### Issue: "Decorator is not a function"

**Cause:** `experimentalDecorators` is enabled in tsconfig.json.

**Solution:** Set `"experimentalDecorators": false` or remove it completely.

### Issue: Tests not running

**Cause:** Class not imported/exported properly.

**Solution:** Classes with `@describe` decorator are automatically registered. Just import the file.

## Example Project Structure

```
my-project/
├── tests/
│   ├── auth/
│   │   └── login.spec.ts
│   ├── pages/
│   │   ├── LoginPage.ts
│   │   └── DashboardPage.ts
│   └── api/
│       └── users.spec.ts
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Sample Test File

Here's a complete example showing common patterns:

```typescript
import { describe, test, beforeAll, beforeEach, afterEach, afterAll, timeout } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';

@describe('Complete Example')
@timeout(30000) // 30 seconds for all tests
class CompleteExample {
  static testData: any;

  @beforeAll()
  static async setupSuite() {
    // Runs once before all tests
    this.testData = await loadTestData();
  }

  @beforeEach()
  async setupTest() {
    // Runs before each test
    await this.page.goto('https://example.com');
  }

  @test('basic test')
  async testBasic() {
    await expect(this.page).toHaveTitle(/Example/);
  }

  @test('with specific timeout')
  @timeout(5000) // Override class timeout
  async testFast() {
    const heading = this.page.locator('h1');
    await expect(heading).toBeVisible();
  }

  @afterEach()
  async cleanupTest() {
    // Runs after each test
    await this.page.context().clearCookies();
  }

  @afterAll()
  static async cleanupSuite() {
    // Runs once after all tests
    await cleanup(this.testData);
  }
}
```

## Getting Help

- 📖 [Full Documentation](../README.md#documentation)
- 🐛 [Report Issues](https://github.com/anthropics/claude-code/issues)
- 💬 [Ask Questions](https://github.com/anthropics/claude-code/discussions)

---

**Next:** [Core Concepts →](./core-concepts.md)
