# Playwright TypeScript Best Practices

**Version:** 1.1.0  
**Organization:** vitalics <vitalicset@yandex.ru>  
**Date:** May 2026

## Abstract

Comprehensive best practices guide for Playwright TypeScript test automation, designed for AI agents and LLMs. Contains 20+ rules across 8 categories, prioritized by impact from critical (test stability, execution speed) to incremental (advanced patterns). Covers modular fixture composition with mergeTests/mergeExpects, type-safe environment variables, JSON schema validation for API responses, AbortSignal-based cancellation, Node.js timer control, OOP decorator patterns for large teams, OpenTelemetry integration for test observability (custom metrics, distributed traces, Jaeger/Grafana/Prometheus), Slack Block Kit notifications, and email reporting with React Email templates. Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, and specific impact metrics to guide automated test writing and refactoring.

---

## Table of Contents

1. [Test Stability & Reliability](#1-test-stability--reliability) (CRITICAL)
   - 1.1. [Use Auto-Waiting Instead of Manual Waits](#1.1-use-auto-waiting-instead-of-manual-waits)
2. [Test Execution Speed](#2-test-execution-speed) (CRITICAL)
   - 2.1. [Use Page Object Model for Reusability and Maintainability](#2.1-use-page-object-model-for-reusability-and-maintainability)
3. [Locator Best Practices](#3-locator-best-practices) (HIGH)
   - 3.1. [Prefer Role-Based Locators Over CSS/XPath](#3.1-prefer-role-based-locators-over-cssxpath)
4. [Assertions & Waiting](#4-assertions--waiting) (HIGH)
   - 4.1. [Use Web-First Assertions Instead of Generic Expect](#4.1-use-web-first-assertions-instead-of-generic-expect)
5. [Parallel Execution](#5-parallel-execution) (MEDIUM-HIGH)
   - 5.1. [Ensure Test Isolation for Parallel Execution](#5.1-ensure-test-isolation-for-parallel-execution)
   - 5.2. [Use Test Sharding to Distribute Tests Across Multiple Machines](#5.2-use-test-sharding-to-distribute-tests-across-multiple-machines)
6. [Fixtures & Test Organization](#6-fixtures--test-organization) (MEDIUM)
   - 6.1. [Cancel Async Operations and Network Requests with AbortSignal Fixtures](#6.1-cancel-async-operations-and-network-requests-with-abortsignal-fixtures)
   - 6.2. [Compose Fixtures with mergeTests and mergeExpects for Modular Test Suites](#6.2-compose-fixtures-with-mergetests-and-mergeexpects-for-modular-test-suites)
   - 6.3. [Control Node.js Timers in Tests with Promise-Based Timer Fixtures](#6.3-control-nodejs-timers-in-tests-with-promise-based-timer-fixtures)
   - 6.4. [Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation](#6.4-instrument-tests-with-custom-otel-metrics-spans-and-distributed-trace-propagation)
   - 6.5. [Manage Environment Variables with Type-Safe Validated Configuration](#6.5-manage-environment-variables-with-type-safe-validated-configuration)
   - 6.6. [Use Custom Fixtures for Reusable Test Setup and Teardown](#6.6-use-custom-fixtures-for-reusable-test-setup-and-teardown)
   - 6.7. [Use test.describe for Logical Test Grouping](#6.7-use-testdescribe-for-logical-test-grouping)
7. [Debugging & Maintenance](#7-debugging--maintenance) (MEDIUM)
   - 7.1. [Use test.step for Better Test Readability and Debugging](#7.1-use-teststep-for-better-test-readability-and-debugging)
8. [Advanced Patterns](#8-advanced-patterns) (LOW)
   - 8.1. [Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel](#8.1-export-test-traces-and-metrics-to-opentelemetry-backends-with-reporter-otel)
   - 8.2. [Organize Tests with OOP Decorator Pattern for Large Scalable Test Suites](#8.2-organize-tests-with-oop-decorator-pattern-for-large-scalable-test-suites)
   - 8.3. [Send Test Results to Slack with Rich Block Kit Messages via reporter-slack](#8.3-send-test-results-to-slack-with-rich-block-kit-messages-via-reporter-slack)
   - 8.4. [Send Test Run Reports via Email with React Email Templates via reporter-email](#8.4-send-test-run-reports-via-email-with-react-email-templates-via-reporter-email)
   - 8.5. [Use API Mocking for Reliable and Fast Tests](#8.5-use-api-mocking-for-reliable-and-fast-tests)
   - 8.6. [Validate API Response JSON Schemas with toMatchSchema Custom Matcher](#8.6-validate-api-response-json-schemas-with-tomatchschema-custom-matcher)

---

## 1. Test Stability & Reliability

**Impact:** CRITICAL  
**Description:** Flaky tests are the #1 enemy of test automation. Unstable tests waste developer time, reduce confidence, and can mask real bugs. Eliminating flakiness yields the largest gains in test suite value.

### 1.1. Use Auto-Waiting Instead of Manual Waits

**Tags:** auto-waiting, stability, flakiness  
**Impact:** CRITICAL (Eliminates 70-90% of flaky tests caused by timing issues)

**Impact: CRITICAL (eliminates 70-90% of flaky tests caused by timing issues)**

Playwright has built-in auto-waiting for all actions and assertions. Manual waits with `setTimeout`, `waitForTimeout`, or arbitrary delays lead to flaky tests that either fail intermittently or waste time waiting longer than necessary. Auto-waiting makes tests both faster and more reliable.

## When to Use

- **Use auto-waiting (always)**: For all standard interactions (clicks, fills, checks), element visibility assertions, text content checks, and navigation
- **Use explicit waits when**: Waiting for network idle state, specific API responses, custom JavaScript conditions, or third-party scripts to load
- **Avoid manual timeouts**: Never use `setTimeout`, `waitForTimeout`, or `sleep` unless absolutely necessary for specific edge cases
- **Required for**: All projects - auto-waiting is fundamental to Playwright's reliability

## Guidelines

### Do

- Rely on built-in auto-waiting for clicks, fills, and other actions
- Use web-first assertions (toBeVisible, toHaveText) which auto-retry
- Use `waitForLoadState()` for specific load states (load, domcontentloaded, networkidle)
- Use `waitForResponse()` or `waitForRequest()` for specific network events
- Use `waitForFunction()` for custom JavaScript conditions
- Trust Playwright's actionability checks (visible, enabled, stable, receives events)

### Don't

- Don't use `page.waitForTimeout()` or `setTimeout()` - leads to flaky tests
- Don't manually wait for selectors before actions - auto-waiting handles it
- Don't add arbitrary delays "just in case" - makes tests slower
- Don't wait for `networkidle` unless specifically needed (it's slow)
- Don't check element existence and then act on it - actions do both
- Don't over-complicate with manual polling loops - use `waitForFunction()`

### Tool Usage Patterns

- **Auto-waiting actions**: `click()`, `fill()`, `check()`, `selectOption()`, `hover()`, `focus()`, `press()`, `type()`
- **Auto-retrying assertions**: `expect().toBeVisible()`, `toHaveText()`, `toHaveValue()`, `toBeChecked()`, `toBeEnabled()`
- **Explicit waits (when needed)**:
  - `page.waitForLoadState('networkidle')` - Wait for no network activity for 500ms
  - `page.waitForResponse(urlOrPredicate)` - Wait for specific API response
  - `page.waitForRequest(urlOrPredicate)` - Wait for specific API request
  - `page.waitForFunction(pageFunction)` - Wait for custom JavaScript condition
  - `page.waitForSelector()` - Rarely needed, use actions or assertions instead
- **Configuration**: Set default timeout in playwright.config.ts with `timeout` option (default: 30s)

**Incorrect (using manual waits):**

```typescript
import { test, expect } from '@playwright/test';

test('bad - manual waits', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ❌ Arbitrary timeout - too short causes flakiness, too long wastes time
  await page.waitForTimeout(3000);
  await page.click('button');
  
  // ❌ Using setTimeout in tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ❌ Manual wait for element
  await page.waitForSelector('.result');
  await expect(page.locator('.result')).toHaveText('Success');
});
```

**Correct (using auto-waiting):**

```typescript
import { test, expect } from '@playwright/test';

test('good - auto-waiting', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Auto-waits for element to be actionable (visible, enabled, stable)
  await page.click('button');
  
  // ✅ Assertions auto-wait for condition to be met
  await expect(page.locator('.result')).toHaveText('Success');
  
  // ✅ Actions auto-wait for navigation when needed
  await page.getByRole('link', { name: 'Submit' }).click();
  await expect(page).toHaveURL(/.*success/);
});

test('when explicit waiting is needed', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Wait for specific network state
  await page.waitForLoadState('networkidle');
  
  // ✅ Wait for API response
  await page.waitForResponse(resp => 
    resp.url().includes('/api/data') && resp.status() === 200
  );
  
  // ✅ Wait for function to return truthy value
  await page.waitForFunction(() => window.dataLoaded === true);
});
```

## Edge Cases and Constraints

### Limitations

- Auto-waiting has a default 30s timeout - very slow operations may need custom timeout
- `networkidle` waits for 500ms of no network activity, but some SPAs have continuous polling
- Auto-waiting can't detect custom application loading states (e.g., skeleton loaders)
- Third-party scripts loading asynchronously may not be covered by standard auto-waiting
- Canvas or WebGL rendering completion requires custom `waitForFunction()`

### Edge Cases

1. **Infinite loading spinners**: If spinner doesn't disappear due to bug, test times out. Solution: Add assertion that spinner is NOT visible with reasonable timeout.

2. **Elements covered by overlays**: Auto-waiting checks if element receives events, but complex z-index issues may not be caught. Solution: Use `force: true` option cautiously or fix the overlay.

3. **Animations delaying actionability**: Element must be stable for 500ms before action. Very long animations can cause timeouts. Solution: Use `page.emulateMedia({ reducedMotion: 'reduce' })` or disable animations in test environment.

4. **Polling APIs creating "networkidle" race**: If app polls every 2 seconds, `networkidle` never triggers. Solution: Don't use `networkidle` for apps with polling, or use `waitForResponse()` for specific initial load.

5. **Detached elements**: Element removed from DOM while auto-waiting. Solution: Playwright retries and throws "Element is not attached to the DOM" error - fix race condition in test or app.

6. **Shadow DOM elements**: Auto-waiting works but selector must pierce shadow DOM. Solution: Use `>>>` combinator or proper role-based selectors.

### What Breaks If Ignored

- **Using manual waits**: 70-90% more flaky tests, tests wait too long (wasted CI time) or too short (intermittent failures)
- **Not trusting auto-waiting**: Redundant manual checks, slower tests, more complex code
- **Using networkidle everywhere**: Tests become 2-5x slower, may never complete for apps with polling
- **Arbitrary timeouts**: Tests fail on slow CI runners but pass locally (or vice versa)

## Common Mistakes

### Mistake 1: Using waitForTimeout instead of auto-waiting

```typescript
// ❌ Bad: Arbitrary delay
test('bad timing', async ({ page }) => {
  await page.goto('https://example.com');
  await page.waitForTimeout(5000); // ❌ Why 5 seconds? Too short or too long?
  await page.click('button');
});
```

**Why this is wrong**: If button appears in 1 second, you waste 4 seconds. If it takes 6 seconds, test fails.

**How to fix**:

```typescript
// ✅ Good: Auto-waits for button to be actionable
test('good auto-wait', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button'); // Waits automatically until clickable
});
```

### Mistake 2: Manual selector check before action

```typescript
// ❌ Bad: Redundant manual check
test('redundant check', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ❌ Unnecessary - click() does this automatically
  await page.waitForSelector('button');
  await page.click('button');
});
```

**Why this is wrong**: Doubles the waiting time and adds unnecessary code.

**How to fix**:

```typescript
// ✅ Good: Just do the action
test('direct action', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button'); // Auto-waits for button to exist and be actionable
});
```

### Mistake 3: Using networkidle for everything

```typescript
// ❌ Bad: Waiting for networkidle on every page
test('slow networkidle', async ({ page }) => {
  await page.goto('https://example.com');
  await page.waitForLoadState('networkidle'); // ❌ Slow and often unnecessary
  
  await page.click('button');
  await page.waitForLoadState('networkidle'); // ❌ Even slower
});
```

**Why this is wrong**: Waits for 500ms of no network activity - very slow, especially for apps with analytics or polling.

**How to fix**:

```typescript
// ✅ Good: Use specific waits
test('specific waits', async ({ page }) => {
  await page.goto('https://example.com');
  // Default 'load' state is usually sufficient
  
  await page.click('button');
  // Wait for specific response, not all network activity
  await page.waitForResponse(resp => resp.url().includes('/api/data'));
  
  await expect(page.locator('.result')).toBeVisible();
});
```

### Mistake 4: Not handling legitimate delays

```typescript
// ❌ Bad: Expecting instant response from slow operation
test('timeout on slow API', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button'); // Triggers 60-second API call
  
  // ❌ Default 30s timeout will fail
  await expect(page.locator('.result')).toBeVisible();
});
```

**Why this is wrong**: Some operations legitimately take longer than default timeout.

**How to fix**:

```typescript
// ✅ Good: Increase timeout for specific operation
test('handle slow operation', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button');
  
  // Increase timeout for this specific assertion
  await expect(page.locator('.result')).toBeVisible({ timeout: 90000 });
});

// Or set timeout for entire test
test('slow test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  await page.goto('https://example.com');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

Playwright automatically waits for:
- Elements to be visible, enabled, and stable before actions
- Navigation to complete after clicks on links
- Assertions to pass (with retries) before failing
- Network requests when using route interception

Only use explicit waits when you need to wait for something specific that auto-waiting doesn't cover, such as network idle state, custom JavaScript conditions, or specific API responses.

Reference: [Playwright Auto-Waiting](https://playwright.dev/docs/actionability)

---

## 2. Test Execution Speed

**Impact:** CRITICAL  
**Description:** Fast test execution enables rapid feedback loops and efficient CI/CD pipelines. Slow tests reduce developer productivity and increase costs.

### 2.1. Use Page Object Model for Reusability and Maintainability

**Tags:** page-object, organization, maintainability, reusability  
**Impact:** MEDIUM (Reduces test maintenance time by 40-60% and improves test readability)

**Impact: MEDIUM (reduces test maintenance time by 40-60% and improves test readability)**

The Page Object Model (POM) pattern encapsulates page interactions into reusable classes, making tests more maintainable and readable. When UI changes occur, you only need to update the page object instead of every test that interacts with that page.

**Incorrect (duplicated selectors and logic in tests):**

```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});

test('login with invalid credentials shows error', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[data-testid="email-input"]', 'user@example.com');
  await page.fill('[data-testid="password-input"]', 'wrongpassword');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials');
});

test('can navigate to signup from login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.click('[data-testid="signup-link"]');
  await expect(page).toHaveURL(/.*signup/);
});

// If the login form changes, you need to update all these tests!
```

**Correct (using Page Object Model):**

```typescript
// pages/login.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly errorMessage: Locator;
  readonly welcomeMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.loginButton = page.getByTestId('login-button');
    this.signupLink = page.getByTestId('signup-link');
    this.errorMessage = page.getByTestId('error-message');
    this.welcomeMessage = page.getByTestId('welcome-message');
  }

  async goto() {
    await this.page.goto('https://example.com/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.welcomeMessage).toBeVisible();
  }

  async expectLoginError(errorText: string) {
    await expect(this.errorMessage).toContainText(errorText);
  }

  async navigateToSignup() {
    await this.signupLink.click();
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await loginPage.expectLoginSuccess();
});

test('login with invalid credentials shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@example.com', 'wrongpassword');
  await loginPage.expectLoginError('Invalid credentials');
});

test('can navigate to signup from login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.navigateToSignup();
  await expect(page).toHaveURL(/.*signup/);
});

// If the login form changes, you only update the LoginPage class!
```

**Advanced Page Object patterns:**

```typescript
// pages/base.page.ts - Base class for common functionality
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}

// pages/dashboard.page.ts - Extending base page
import { BasePage } from './base.page';
import { Locator } from '@playwright/test';

export class DashboardPage extends BasePage {
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.userMenu = page.getByTestId('user-menu');
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
  }

  async goto() {
    await this.page.goto('https://example.com/dashboard');
    await this.waitForPageLoad();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}

// pages/components/header.component.ts - Reusable component
export class HeaderComponent {
  readonly page: Page;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly navLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    const header = page.locator('header');
    this.logo = header.getByAltText('Logo');
    this.searchInput = header.getByPlaceholder('Search...');
    this.navLinks = header.getByRole('navigation').getByRole('link');
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async navigateTo(linkName: string) {
    await this.navLinks.filter({ hasText: linkName }).click();
  }
}

// Using components in page objects
export class HomePage extends BasePage {
  readonly header: HeaderComponent;
  readonly hero: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);
    this.hero = page.getByTestId('hero-section');
  }

  async goto() {
    await this.page.goto('https://example.com');
  }
}

// tests/homepage.spec.ts
test('can search from homepage', async ({ page }) => {
  const homePage = new HomePage(page);
  await homePage.goto();
  await homePage.header.search('playwright');
  await expect(page).toHaveURL(/.*search.*playwright/);
});
```

**Page Object with fixtures:**

```typescript
// fixtures/pages.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { HomePage } from '../pages/home.page';

type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  homePage: HomePage;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect } from '@playwright/test';

// tests/with-fixtures.spec.ts
import { test, expect } from '../fixtures/pages.fixture';

test('login and navigate', async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await dashboardPage.expectToBeOnDashboard();
});
```

**Best practices for Page Objects:**

```typescript
export class ProductPage {
  readonly page: Page;
  
  // ✅ Use descriptive names for locators
  readonly addToCartButton: Locator;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  
  constructor(page: Page) {
    this.page = page;
    // ✅ Define locators in constructor
    this.addToCartButton = page.getByRole('button', { name: 'Add to Cart' });
    this.productTitle = page.getByTestId('product-title');
    this.productPrice = page.getByTestId('product-price');
  }
  
  // ✅ Methods represent user actions
  async addToCart() {
    await this.addToCartButton.click();
  }
  
  // ✅ Return values when needed for chaining or assertions
  async getProductTitle(): Promise<string> {
    return await this.productTitle.textContent() || '';
  }
  
  // ✅ Include assertion methods for common checks
  async expectProductInStock() {
    await expect(this.addToCartButton).toBeEnabled();
    await expect(this.page.getByText('In Stock')).toBeVisible();
  }
  
  // ✅ Support method chaining for fluent API
  async selectQuantity(quantity: number) {
    await this.page.selectOption('[name="quantity"]', quantity.toString());
    return this; // Enable chaining
  }
  
  async selectSize(size: string) {
    await this.page.getByRole('button', { name: size }).click();
    return this; // Enable chaining
  }
}

// Usage with chaining
test('configure product', async ({ page }) => {
  const productPage = new ProductPage(page);
  await productPage.goto();
  await productPage
    .selectSize('Large')
    .selectQuantity(2);
  await productPage.addToCart();
});
```

Benefits of Page Object Model:
- **Maintainability**: UI changes only require updates in one place
- **Reusability**: Page objects can be used across multiple tests
- **Readability**: Tests read like user actions, not implementation details
- **Type safety**: TypeScript provides autocomplete and compile-time checks
- **Separation of concerns**: Test logic separated from page structure
- **DRY principle**: Don't Repeat Yourself - avoid duplicating selectors and logic

When to use Page Objects:
- ✅ Complex applications with multiple pages
- ✅ Frequently changing UI
- ✅ Shared functionality across tests
- ✅ Large test suites

When it might be overkill:
- ❌ Very simple applications with few pages
- ❌ One-off scripts or exploratory tests
- ❌ When page interactions appear in only one test

Reference: [Playwright Page Object Model](https://playwright.dev/docs/pom)

---

## 3. Locator Best Practices

**Impact:** HIGH  
**Description:** Robust, resilient locators are the foundation of maintainable tests. Good locator strategies ensure tests survive UI refactoring and changes.

### 3.1. Prefer Role-Based Locators Over CSS/XPath

**Tags:** locators, accessibility, maintainability, resilience  
**Impact:** HIGH (Reduces test brittleness by 60-80% and improves accessibility)

**Impact: HIGH (reduces test brittleness by 60-80% and improves accessibility)**

Role-based locators using `getByRole()` are the most resilient locator strategy in Playwright. They target elements by their accessibility role and name, making tests resistant to DOM structure changes and implementation details while simultaneously ensuring your application is accessible to screen readers and assistive technologies.

**Incorrect (fragile CSS/XPath selectors):**

```typescript
import { test, expect } from '@playwright/test';

test('bad - fragile selectors', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ❌ Brittle CSS selector tied to DOM structure
  await page.click('div.container > div.row > button.btn-primary');
  
  // ❌ XPath tied to exact DOM hierarchy
  await page.click('//div[@class="form"]/div[2]/button[1]');
  
  // ❌ Generic class names that may change
  await page.fill('.input-field', 'username');
  
  // ❌ Using nth-child which breaks when order changes
  await page.click('button:nth-child(3)');
  
  // ❌ ID that might be auto-generated or change
  await page.click('#submit-btn-12345');
});
```

**Correct (role-based locators):**

```typescript
import { test, expect } from '@playwright/test';

test('good - role-based locators', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Role-based: finds button by accessible name
  await page.getByRole('button', { name: 'Submit' }).click();
  
  // ✅ Works with partial/regex matching
  await page.getByRole('button', { name: /submit/i }).click();
  
  // ✅ Role + level for headings
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome');
  
  // ✅ Link by accessible name
  await page.getByRole('link', { name: 'Learn more' }).click();
  
  // ✅ Textbox by label association
  await page.getByRole('textbox', { name: 'Username' }).fill('john@example.com');
  
  // ✅ Checkbox by label
  await page.getByRole('checkbox', { name: 'I agree to terms' }).check();
  
  // ✅ Combination of role and state
  await page.getByRole('button', { name: 'Delete', pressed: true }).click();
});

test('role locator hierarchy', async ({ page }) => {
  await page.goto('https://example.com/form');
  
  // ✅ Scope role locators within sections
  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: 'Products' }).click();
  
  // ✅ Find within specific landmarks
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Add to Cart' }).click();
  
  // ✅ Multiple items in a list
  const listItems = page.getByRole('listitem');
  await expect(listItems).toHaveCount(5);
  
  // ✅ Table cells
  const row = page.getByRole('row', { name: /John Doe/ });
  await expect(row.getByRole('cell').nth(2)).toHaveText('Active');
});
```

**When to use other locators:**

```typescript
test('fallback locator strategies', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Use getByLabel for form fields
  await page.getByLabel('Email address').fill('user@example.com');
  
  // ✅ Use getByPlaceholder when no label exists
  await page.getByPlaceholder('Search...').fill('playwright');
  
  // ✅ Use getByText for unique text content
  await page.getByText('Exact text match').click();
  await page.getByText(/partial match/i).click();
  
  // ✅ Use getByTestId for dynamic content without semantic roles
  await page.getByTestId('user-profile-card').click();
  
  // ✅ Use getByAltText for images
  await expect(page.getByAltText('Company logo')).toBeVisible();
  
  // ✅ Use getByTitle for elements with title attributes
  await page.getByTitle('Close dialog').click();
});
```

**Common roles and their usage:**

```typescript
test('common ARIA roles', async ({ page }) => {
  // Buttons and links
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('link', { name: 'Home' }).click();
  
  // Form controls
  await page.getByRole('textbox', { name: 'Email' }).fill('test@example.com');
  await page.getByRole('checkbox', { name: 'Remember me' }).check();
  await page.getByRole('radio', { name: 'Option A' }).check();
  await page.getByRole('combobox', { name: 'Country' }).selectOption('US');
  await page.getByRole('slider', { name: 'Volume' }).fill('75');
  
  // Structure
  await page.getByRole('navigation').isVisible();
  await page.getByRole('main').isVisible();
  await page.getByRole('banner').isVisible(); // header
  await page.getByRole('contentinfo').isVisible(); // footer
  await page.getByRole('complementary').isVisible(); // aside
  
  // Content
  await page.getByRole('heading', { name: 'Title' }).isVisible();
  await page.getByRole('img', { name: 'Logo' }).isVisible();
  await page.getByRole('list').isVisible();
  await page.getByRole('listitem').count();
  
  // Tables
  await page.getByRole('table').isVisible();
  await page.getByRole('row', { name: /John/ }).click();
  await page.getByRole('cell', { name: 'Active' }).isVisible();
  await page.getByRole('columnheader', { name: 'Name' }).click();
  
  // Dialogs
  await page.getByRole('dialog').isVisible();
  await page.getByRole('alertdialog').isVisible();
  
  // Status
  await page.getByRole('status').toHaveText('Saved');
  await page.getByRole('alert').toHaveText('Error occurred');
  await page.getByRole('progressbar').isVisible();
});
```

Benefits of role-based locators:
- **Resilient**: Survive CSS class changes, DOM restructuring, and styling updates
- **Accessible**: Ensure your app works with screen readers and assistive technologies
- **Readable**: Tests clearly express user intent ("click the Submit button")
- **Semantic**: Based on how users and assistive technologies perceive the page
- **Future-proof**: Less likely to break during refactoring

Priority order for locators:
1. `getByRole()` - Best for semantic HTML elements
2. `getByLabel()` - Great for form fields
3. `getByPlaceholder()` - Form fields without labels
4. `getByText()` - Unique text content
5. `getByTestId()` - Last resort for dynamic/non-semantic content

Avoid: CSS selectors, XPath, `nth-child`, auto-generated IDs, or implementation-specific classes.

Reference: [Playwright Locators](https://playwright.dev/docs/locators)

---

## 4. Assertions & Waiting

**Impact:** HIGH  
**Description:** Proper assertions with automatic waiting ensure tests validate the correct behavior without race conditions or false positives.

### 4.1. Use Web-First Assertions Instead of Generic Expect

**Tags:** assertions, auto-waiting, stability, web-first  
**Impact:** HIGH (Eliminates 50-70% of flaky assertions through auto-waiting and retries)

**Impact: HIGH (eliminates 50-70% of flaky assertions through auto-waiting and retries)**

Playwright's web-first assertions automatically wait and retry until the expected condition is met. Using generic `expect()` statements without auto-waiting leads to flaky tests that fail intermittently when elements aren't immediately ready. Web-first assertions make tests both more reliable and more concise.

## When to Use

- **Use web-first assertions for**: All DOM-related checks (visibility, text content, attributes, CSS, element state, counts)
- **Use generic expect for**: API responses, non-DOM JavaScript values, test logic calculations, non-retryable conditions
- **Always prefer web-first when**: Checking anything rendered in the browser, working with locators, verifying UI state
- **Required for**: All projects - web-first assertions are fundamental to Playwright test stability

## Guidelines

### Do

- Use `await expect(locator).toBeVisible()` instead of `expect(await locator.isVisible()).toBe(true)`
- Use `await expect(locator).toHaveText()` instead of `expect(await locator.textContent()).toBe()`
- Use `await expect(locator).toHaveCount()` for checking number of elements
- Use `.not.` for negative assertions (e.g., `.not.toBeVisible()`)
- Use soft assertions (`expect.soft()`) when you want to continue test execution after failures
- Chain locator filters before assertions (e.g., `locator.filter({ hasText: 'Active' })`)
- Set custom timeouts for slow operations (`{ timeout: 30000 }`)

### Don't

- Don't extract DOM values and use generic expect - use web-first assertions directly
- Don't manually wait for selectors before assertions - web-first assertions auto-wait
- Don't use `isVisible()`, `textContent()`, `getAttribute()` with generic expect
- Don't forget to `await` web-first assertions - they return promises
- Don't use web-first assertions for API responses or non-DOM values
- Don't use overly long timeouts by default - configure reasonable defaults in playwright.config.ts

### Tool Usage Patterns

- **Text assertions**: `toHaveText()`, `toContainText()`, `toHaveValue()`
- **Visibility assertions**: `toBeVisible()`, `toBeHidden()`, `toBeAttached()`
- **State assertions**: `toBeEnabled()`, `toBeDisabled()`, `toBeChecked()`, `toBeEditable()`, `toBeFocused()`, `toBeEmpty()`
- **Attribute assertions**: `toHaveAttribute()`, `toHaveClass()`, `toHaveId()`, `toHaveCSS()`
- **Count assertions**: `toHaveCount()`
- **Page assertions**: `toHaveURL()`, `toHaveTitle()`
- **Screenshot assertions**: `toHaveScreenshot()`
- **Configuration**: Set default assertion timeout in playwright.config.ts with `expect.timeout` (default: 5s)

**Incorrect (generic expect without waiting):**

```typescript
import { test, expect } from '@playwright/test';

test('bad - generic expect', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button.load-data');
  
  // ❌ No auto-waiting - fails if element not immediately ready
  const text = await page.locator('.result').textContent();
  expect(text).toBe('Success');
  
  // ❌ Checking visibility without retries
  const isVisible = await page.locator('.message').isVisible();
  expect(isVisible).toBe(true);
  
  // ❌ Manual waiting then generic assertion
  await page.waitForSelector('.status');
  const status = await page.locator('.status').textContent();
  expect(status).toContain('Complete');
  
  // ❌ Array operations without auto-waiting
  const items = await page.locator('.item').allTextContents();
  expect(items).toHaveLength(5);
  
  // ❌ Attribute checking without retries
  const className = await page.locator('button').getAttribute('class');
  expect(className).toContain('active');
});
```

**Correct (web-first assertions with auto-waiting):**

```typescript
import { test, expect } from '@playwright/test';

test('good - web-first assertions', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('button.load-data');
  
  // ✅ Auto-waits and retries until text matches
  await expect(page.locator('.result')).toHaveText('Success');
  
  // ✅ Auto-waits for element to be visible
  await expect(page.locator('.message')).toBeVisible();
  
  // ✅ Auto-waits and checks text content
  await expect(page.locator('.status')).toContainText('Complete');
  
  // ✅ Auto-waits for correct count
  await expect(page.locator('.item')).toHaveCount(5);
  
  // ✅ Auto-waits and checks attribute
  await expect(page.locator('button')).toHaveClass(/active/);
  
  // ✅ Checks element state with retries
  await expect(page.locator('button')).toBeEnabled();
  await expect(page.locator('input')).toBeEditable();
  await expect(page.locator('input')).toBeFocused();
});
```

## Edge Cases and Constraints

### Limitations

- Web-first assertions have default 5s timeout (shorter than action timeout of 30s)
- Soft assertions collect failures but still fail the test at the end
- Screenshot assertions may be flaky across different environments (OS, browser versions)
- `toHaveCSS()` requires exact RGB color values, not color names
- Regex patterns in assertions must account for whitespace and formatting differences

### Edge Cases

1. **Dynamic text with whitespace**: Text content may have extra spaces, newlines, or formatting. Solution: Use `toContainText()` with trimmed strings or regex patterns.

2. **Multiple elements matching selector**: When locator matches multiple elements, some assertions behave differently. Solution: Use `.first()`, `.last()`, `.nth()`, or filter to narrow down.

3. **Element exists but is covered by overlay**: `toBeVisible()` may pass but element can't be interacted with. Solution: Check z-index or use `toBeInViewport()` in addition to `toBeVisible()`.

4. **Text updates during retry period**: If text changes frequently, assertion may never stabilize. Solution: Use longer timeout or wait for stable state first.

5. **Negative assertions completing immediately**: `.not.toBeVisible()` succeeds as soon as element is hidden, not waiting full timeout. Solution: This is usually desired behavior, but be aware it's not symmetric with positive assertions.

6. **CSS assertions on computed styles**: Some CSS properties are computed and may not match expected values. Solution: Use browser DevTools to verify actual computed style values.

### What Breaks If Ignored

- **Using generic expect for DOM**: 50-70% increase in flaky tests, immediate failures without retries
- **Not awaiting assertions**: Assertions don't execute, tests pass incorrectly
- **Manual waits before assertions**: Tests are slower, more complex code, still prone to race conditions
- **Wrong assertion type**: Using `toHaveText()` when you need `toContainText()` causes failures on whitespace differences

## Common Mistakes

### Mistake 1: Extracting value then using generic expect

```typescript
// ❌ Bad: Extract value and use generic expect
test('bad pattern', async ({ page }) => {
  await page.goto('https://example.com');
  const text = await page.locator('h1').textContent();
  expect(text).toBe('Welcome'); // ❌ No retries if element loads slowly
});
```

**Why this is wrong**: Extracts value at one point in time, no retries if element isn't ready.

**How to fix**:

```typescript
// ✅ Good: Use web-first assertion
test('good pattern', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('h1')).toHaveText('Welcome'); // ✅ Auto-retries
});
```

### Mistake 2: Forgetting to await assertions

```typescript
// ❌ Bad: Missing await
test('missing await', async ({ page }) => {
  await page.goto('https://example.com');
  expect(page.locator('h1')).toHaveText('Welcome'); // ❌ Returns promise, doesn't execute!
});
```

**Why this is wrong**: Assertion returns a promise that's never awaited, test passes incorrectly.

**How to fix**:

```typescript
// ✅ Good: Always await web-first assertions
test('with await', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('h1')).toHaveText('Welcome'); // ✅ Properly awaited
});
```

### Mistake 3: Using web-first assertions for API responses

```typescript
// ❌ Bad: Web-first assertion for non-DOM
test('wrong assertion type', async ({ request }) => {
  const response = await request.get('https://api.example.com/data');
  await expect(response.status()).toBe(200); // ❌ Unnecessary await, wrong pattern
});
```

**Why this is wrong**: Web-first assertions are for DOM elements, API responses don't need retries.

**How to fix**:

```typescript
// ✅ Good: Use generic expect for API responses
test('correct pattern', async ({ request }) => {
  const response = await request.get('https://api.example.com/data');
  expect(response.status()).toBe(200); // ✅ No await needed
  
  const data = await response.json();
  expect(data.items).toHaveLength(10); // ✅ Generic expect for data
});
```

### Mistake 4: Not using .not for negative assertions

```typescript
// ❌ Bad: Extract boolean and check with generic expect
test('bad negative check', async ({ page }) => {
  await page.goto('https://example.com');
  const isVisible = await page.locator('.error').isVisible();
  expect(isVisible).toBe(false); // ❌ No retries
});
```

**Why this is wrong**: Extracts boolean at one point, doesn't retry until condition is met.

**How to fix**:

```typescript
// ✅ Good: Use .not with web-first assertion
test('good negative check', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('.error')).not.toBeVisible(); // ✅ Retries
});
```

### Mistake 5: Using wrong text assertion method

```typescript
// ❌ Bad: Using toHaveText with partial text
test('strict text check', async ({ page }) => {
  await page.goto('https://example.com');
  // Element has "  Welcome to our site  " (with spaces)
  await expect(page.locator('h1')).toHaveText('Welcome'); // ❌ Fails - toHaveText is exact
});
```

**Why this is wrong**: `toHaveText()` requires exact match (ignoring outer whitespace), fails on partial matches.

**How to fix**:

```typescript
// ✅ Good: Use toContainText for partial matches
test('partial text check', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('h1')).toContainText('Welcome'); // ✅ Partial match OK
  
  // Or use toHaveText with exact text
  await expect(page.locator('h1')).toHaveText('Welcome to our site'); // ✅ Exact match
});
```

**Common web-first assertions:**

```typescript
test('web-first assertion examples', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Text assertions
  await expect(page.locator('h1')).toHaveText('Welcome');
  await expect(page.locator('.message')).toContainText('success');
  await expect(page.locator('.count')).toHaveText(/\d+ items/);
  
  // Visibility assertions
  await expect(page.locator('.modal')).toBeVisible();
  await expect(page.locator('.loading')).toBeHidden();
  await expect(page.locator('.error')).not.toBeVisible();
  
  // State assertions
  await expect(page.locator('button')).toBeEnabled();
  await expect(page.locator('button')).toBeDisabled();
  await expect(page.locator('input')).toBeEditable();
  await expect(page.locator('input')).toBeEmpty();
  await expect(page.locator('input')).toBeFocused();
  await expect(page.locator('checkbox')).toBeChecked();
  
  // Attribute assertions
  await expect(page.locator('a')).toHaveAttribute('href', '/home');
  await expect(page.locator('button')).toHaveClass('btn-primary');
  await expect(page.locator('input')).toHaveValue('test@example.com');
  await expect(page.locator('div')).toHaveId('main-content');
  
  // Count assertions
  await expect(page.locator('.item')).toHaveCount(10);
  await expect(page.locator('.error')).toHaveCount(0);
  
  // CSS assertions
  await expect(page.locator('.box')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(page.locator('.container')).toHaveCSS('display', 'flex');
  
  // URL and title assertions
  await expect(page).toHaveURL('https://example.com/success');
  await expect(page).toHaveURL(/.*success$/);
  await expect(page).toHaveTitle('Success Page');
  await expect(page).toHaveTitle(/Success/);
  
  // Screenshot comparison
  await expect(page.locator('.chart')).toHaveScreenshot('chart.png');
  await expect(page).toHaveScreenshot('full-page.png');
});
```

**Soft assertions for multiple checks:**

```typescript
test('soft assertions', async ({ page }) => {
  await page.goto('https://example.com/form');
  
  // ✅ Continue test execution even if assertions fail
  await expect.soft(page.locator('.username')).toHaveText('John');
  await expect.soft(page.locator('.email')).toHaveText('john@example.com');
  await expect.soft(page.locator('.status')).toHaveText('Active');
  
  // Test continues and reports all failures at the end
  await page.click('button.submit');
});
```

**Custom timeout for specific assertions:**

```typescript
test('custom assertion timeouts', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Default timeout (from config, usually 5s)
  await expect(page.locator('.fast-element')).toBeVisible();
  
  // ✅ Extended timeout for slow operations
  await expect(page.locator('.slow-loading-data')).toBeVisible({ 
    timeout: 30000 
  });
  
  // ✅ Short timeout for elements that should appear quickly
  await expect(page.locator('.cached-data')).toBeVisible({ 
    timeout: 1000 
  });
});
```

**Negation with .not:**

```typescript
test('negative assertions', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Assert element is not visible
  await expect(page.locator('.error-message')).not.toBeVisible();
  
  // ✅ Assert element doesn't have text
  await expect(page.locator('.status')).not.toHaveText('Failed');
  
  // ✅ Assert element is not checked
  await expect(page.locator('input[type="checkbox"]')).not.toBeChecked();
  
  // ✅ Multiple negative conditions
  await expect(page.locator('button')).not.toBeDisabled();
  await expect(page.locator('.alert')).not.toBeAttached();
});
```

**Combine with locator assertions:**

```typescript
test('locator assertions in chains', async ({ page }) => {
  await page.goto('https://example.com');
  
  // ✅ Filter locators before asserting
  const rows = page.locator('tr');
  await expect(rows.filter({ hasText: 'Active' })).toHaveCount(3);
  
  // ✅ Assert on nth element
  await expect(rows.nth(0)).toContainText('Header');
  
  // ✅ Assert within a specific section
  const nav = page.locator('nav');
  await expect(nav.getByRole('link')).toHaveCount(5);
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
});
```

**When to use generic expect:**

```typescript
test('appropriate use of generic expect', async ({ page, request }) => {
  // ✅ OK for API responses (not DOM elements)
  const response = await request.get('https://api.example.com/data');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.items).toHaveLength(10);
  
  // ✅ OK for non-DOM JavaScript values
  const url = page.url();
  expect(url).toContain('example.com');
  
  // ✅ OK for test logic/calculations
  const numbers = [1, 2, 3, 4, 5];
  const sum = numbers.reduce((a, b) => a + b, 0);
  expect(sum).toBe(15);
  
  // ❌ NOT OK for DOM elements - use web-first assertions instead
  // const text = await page.locator('h1').textContent();
  // expect(text).toBe('Title'); // Bad!
  
  // ✅ Good - web-first assertion for DOM
  await expect(page.locator('h1')).toHaveText('Title');
});
```

**Benefits of web-first assertions:**
- **Auto-waiting**: Automatically retries until condition is met (up to timeout)
- **Stability**: Eliminates race conditions and timing issues
- **Concise**: No need for manual `waitFor*` calls before assertions
- **Clear intent**: Assertion names clearly express what you're checking
- **Better errors**: Failure messages include retry history and screenshots
- **Type-safe**: TypeScript integration catches errors at compile time

**Migration pattern:**

```typescript
// Before (flaky)
const text = await page.locator('.status').textContent();
expect(text).toBe('Ready');

// After (stable)
await expect(page.locator('.status')).toHaveText('Ready');

// Before (verbose)
await page.waitForSelector('.message');
const isVisible = await page.locator('.message').isVisible();
expect(isVisible).toBe(true);

// After (concise)
await expect(page.locator('.message')).toBeVisible();
```

Always prefer web-first assertions (starting with `await expect(page...` or `await expect(locator...)`) over generic expect for any DOM-related checks. Reserve generic `expect()` for API responses, non-DOM JavaScript values, and test logic.

Reference: [Playwright Assertions](https://playwright.dev/docs/test-assertions)

---

## 5. Parallel Execution

**Impact:** MEDIUM-HIGH  
**Description:** Efficient parallel test execution dramatically reduces total test suite runtime. Proper isolation and resource management are essential.

### 5.1. Ensure Test Isolation for Parallel Execution

**Tags:** parallel, isolation, stability, performance  
**Impact:** CRITICAL (Prevents race conditions and enables safe parallel execution)

**Impact: CRITICAL (prevents race conditions and enables safe parallel execution)**

Playwright runs tests in parallel by default. Tests must be completely isolated from each other to prevent flaky failures caused by shared state, resource conflicts, or race conditions. Proper isolation allows you to run tests in parallel safely, dramatically reducing total execution time.

**Incorrect (shared state causing conflicts):**

```typescript
import { test, expect } from '@playwright/test';

// ❌ Global shared state between tests
let sharedUserId: string;
let testCounter = 0;

test('first test creates user', async ({ page }) => {
  await page.goto('https://example.com/signup');
  await page.fill('[name="email"]', 'test@example.com'); // ❌ Same email in parallel tests
  await page.click('button[type="submit"]');
  sharedUserId = await page.locator('[data-testid="user-id"]').textContent();
});

test('second test uses shared state', async ({ page }) => {
  // ❌ Depends on first test's execution and shared variable
  await page.goto(`https://example.com/user/${sharedUserId}`);
  await expect(page.locator('h1')).toHaveText('Profile');
});

test('modifies shared database record', async ({ page }) => {
  // ❌ Multiple tests modifying same record causes conflicts
  await page.goto('https://example.com/admin');
  await page.click('[data-testid="user-1"] button.delete');
  await expect(page.locator('.success')).toBeVisible();
});

test('uses shared file system', async ({ page }) => {
  // ❌ File conflicts when tests run in parallel
  await page.goto('https://example.com/upload');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button.upload')
  ]);
  await fileChooser.setFiles('./test-data/shared-file.txt'); // ❌ Shared file
});

test('increments counter', async ({ page }) => {
  // ❌ Race condition with shared counter
  testCounter++;
  await page.goto(`https://example.com/test/${testCounter}`);
});
```

**Correct (fully isolated tests):**

```typescript
import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

test('isolated user creation', async ({ page }) => {
  // ✅ Each test uses unique data
  const uniqueEmail = `test-${randomUUID()}@example.com`;
  
  await page.goto('https://example.com/signup');
  await page.fill('[name="email"]', uniqueEmail);
  await page.click('button[type="submit"]');
  
  const userId = await page.locator('[data-testid="user-id"]').textContent();
  
  // ✅ Complete test within single test case
  await page.goto(`https://example.com/user/${userId}`);
  await expect(page.locator('h1')).toHaveText('Profile');
});

test('isolated database operations', async ({ page, request }) => {
  // ✅ Create unique test data for this test
  const uniqueUser = await request.post('https://example.com/api/users', {
    data: {
      email: `test-${randomUUID()}@example.com`,
      name: 'Test User'
    }
  });
  const userData = await uniqueUser.json();
  
  await page.goto('https://example.com/admin');
  await page.click(`[data-testid="user-${userData.id}"] button.delete`);
  await expect(page.locator('.success')).toBeVisible();
  
  // ✅ Cleanup is scoped to this test's data
});

test('isolated file uploads', async ({ page }) => {
  // ✅ Create unique file for this test
  const fs = require('fs');
  const path = require('path');
  const uniqueFileName = `test-${randomUUID()}.txt`;
  const filePath = path.join(__dirname, 'tmp', uniqueFileName);
  
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'test content');
  
  await page.goto('https://example.com/upload');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('button.upload')
  ]);
  await fileChooser.setFiles(filePath);
  
  await expect(page.locator('.upload-success')).toBeVisible();
  
  // ✅ Cleanup unique file
  fs.unlinkSync(filePath);
});

// ✅ Each test gets its own browser context (isolated cookies, storage)
test('isolated authentication', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('[name="username"]', `user-${randomUUID()}@example.com`);
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // ✅ Session is isolated to this test's browser context
  await expect(page).toHaveURL('/dashboard');
});
```

**Use fixtures for test isolation:**

```typescript
import { test as base, expect } from '@playwright/test';

// ✅ Custom fixture provides isolated test data
type TestFixtures = {
  uniqueUser: { email: string; id: string };
  authenticatedPage: Page;
};

const test = base.extend<TestFixtures>({
  uniqueUser: async ({ request }, use) => {
    // Setup: Create unique user for this test
    const email = `test-${randomUUID()}@example.com`;
    const response = await request.post('/api/users', {
      data: { email, password: 'test123' }
    });
    const user = await response.json();
    
    // Provide to test
    await use(user);
    
    // Teardown: Clean up this test's data
    await request.delete(`/api/users/${user.id}`);
  },

  authenticatedPage: async ({ page, uniqueUser }, use) => {
    // Setup: Authenticate with unique user
    await page.goto('/login');
    await page.fill('[name="email"]', uniqueUser.email);
    await page.fill('[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Provide authenticated page to test
    await use(page);
    
    // Teardown: Logout happens automatically (context is isolated)
  }
});

test('uses isolated fixture', async ({ authenticatedPage, uniqueUser }) => {
  // ✅ Each test gets fresh authenticated user and page
  await authenticatedPage.goto('/profile');
  await expect(authenticatedPage.locator('[data-testid="email"]'))
    .toHaveText(uniqueUser.email);
});
```

**Configure parallel execution:**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ✅ Run tests in parallel (default)
  fullyParallel: true,
  
  // ✅ Number of parallel workers
  workers: process.env.CI ? 2 : undefined, // Use 2 in CI, CPU count locally
  
  // ✅ Each test gets isolated browser context
  use: {
    // Contexts are automatically isolated
  },
  
  projects: [
    {
      name: 'chromium',
      use: { 
        // ✅ Each project runs in parallel
        ...devices['Desktop Chrome'] 
      },
    },
  ],
});

// ✅ Tests within a file run in parallel by default
test.describe.configure({ mode: 'parallel' }); // Explicit parallel mode

// ✅ Force serial execution only when necessary
test.describe.serial('sequential flow', () => {
  let sharedState: string;
  
  test('step 1', async ({ page }) => {
    sharedState = 'value';
  });
  
  test('step 2', async ({ page }) => {
    // Uses sharedState from step 1
  });
});
```

**Isolation checklist:**
- ✅ Each test uses unique test data (emails, usernames, IDs)
- ✅ No global variables shared between tests
- ✅ Tests don't depend on execution order
- ✅ Each test can run independently
- ✅ Database/API operations use unique identifiers
- ✅ File operations use unique filenames
- ✅ Browser contexts are isolated (automatic in Playwright)
- ✅ Fixtures handle setup and cleanup per test
- ✅ Tests clean up their own data
- ✅ No hardcoded/shared credentials or resources

**When to use serial execution:**
Only use `test.describe.serial()` when tests genuinely must run in sequence (e.g., testing a multi-step user journey where each step depends on the previous state). Most tests should be isolated and parallelizable.

Reference: [Playwright Parallelism](https://playwright.dev/docs/test-parallel)

---

### 5.2. Use Test Sharding to Distribute Tests Across Multiple Machines

**Tags:** parallel, sharding, performance, ci-cd, scalability  
**Impact:** MEDIUM-HIGH (Reduces total test suite time by 50-80% through horizontal scaling)

**Impact: MEDIUM-HIGH (reduces total test suite time by 50-80% through horizontal scaling)**

Test sharding allows you to split your test suite across multiple machines or CI jobs, dramatically reducing total execution time. While parallelization runs tests concurrently on a single machine, sharding distributes the entire test suite across multiple machines, enabling linear scaling of your test infrastructure.

**Incorrect (running all tests on single machine):**

```typescript
// .github/workflows/playwright.yml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      # ❌ All 500 tests run on single machine
      # Takes 30+ minutes even with parallelization
      - name: Run all tests
        run: npx playwright test
      
      # ❌ Slow feedback loop
      # ❌ Wastes CI/CD time
      # ❌ Delays deployments
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ❌ Only using workers on single machine
  workers: 4,
  
  // ❌ No sharding configuration
  // Limited by single machine's resources
  testDir: './tests',
});
```

**Correct (using test sharding across multiple machines):**

```typescript
// .github/workflows/playwright.yml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        # ✅ Split tests across 4 shards (machines)
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      # ✅ Each machine runs 1/4 of the tests
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
      
      # ✅ Upload results from each shard
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ✅ Optimize workers for CI environment
  workers: process.env.CI ? 2 : undefined,
  
  // ✅ Sharding works automatically when --shard flag is used
  // Each shard gets an even distribution of tests
  testDir: './tests',
  
  // ✅ Shorter timeout per test since we have more machines
  timeout: 30000,
  
  use: {
    trace: 'on-first-retry',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Dynamic sharding based on test count:**

```typescript
// .github/workflows/playwright-dynamic.yml
name: Playwright Tests (Dynamic Sharding)

on: [push, pull_request]

jobs:
  # ✅ Determine optimal shard count based on test suite size
  calculate-shards:
    runs-on: ubuntu-latest
    outputs:
      shards: ${{ steps.calculate.outputs.shards }}
    steps:
      - uses: actions/checkout@v3
      - name: Calculate shard count
        id: calculate
        run: |
          TEST_COUNT=$(find tests -name "*.spec.ts" | wc -l)
          # 1 shard per 50 tests, minimum 2, maximum 10
          SHARDS=$(( (TEST_COUNT + 49) / 50 ))
          SHARDS=$(( SHARDS < 2 ? 2 : SHARDS ))
          SHARDS=$(( SHARDS > 10 ? 10 : SHARDS ))
          echo "shards=$SHARDS" >> $GITHUB_OUTPUT
          echo "Calculated $SHARDS shards for $TEST_COUNT tests"

  test:
    needs: calculate-shards
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        # ✅ Dynamic shard count based on test suite size
        shard: ${{ fromJSON(needs.calculate-shards.outputs.shards) }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npx playwright test --shard=${{ matrix.shard }}/${{ needs.calculate-shards.outputs.shards }}
```

**Merging test results from multiple shards:**

```typescript
// .github/workflows/playwright-merge.yml
name: Playwright Tests with Merge

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run tests (shard ${{ matrix.shard }}/4)
        run: npx playwright test --shard=${{ matrix.shard }}/4
      
      # ✅ Upload blob report for merging
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: blob-report-${{ matrix.shard }}
          path: blob-report/
          retention-days: 1

  # ✅ Merge all shard reports into single HTML report
  merge-reports:
    if: always()
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      
      # Download all blob reports
      - uses: actions/download-artifact@v3
        with:
          path: all-blob-reports
      
      # Merge into single HTML report
      - name: Merge reports
        run: npx playwright merge-reports --reporter html ./all-blob-reports
      
      - name: Upload merged report
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-merged
          path: playwright-report/
          retention-days: 30
```

```typescript
// playwright.config.ts for blob reporting
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  
  // ✅ Use blob reporter in CI for merging
  reporter: process.env.CI 
    ? [['blob']] 
    : [['html']],
  
  use: {
    trace: 'on-first-retry',
  },
});
```

**Local testing with sharding:**

```typescript
// package.json - scripts for local sharding
{
  "scripts": {
    // ✅ Run specific shard locally
    "test:shard1": "playwright test --shard=1/4",
    "test:shard2": "playwright test --shard=2/4",
    "test:shard3": "playwright test --shard=3/4",
    "test:shard4": "playwright test --shard=4/4",
    
    // ✅ Run all shards in parallel (requires GNU parallel or similar)
    "test:all-shards": "parallel ::: 'npm run test:shard1' 'npm run test:shard2' 'npm run test:shard3' 'npm run test:shard4'"
  }
}
```

```bash
# ✅ Test specific shard locally
npx playwright test --shard=1/4

# ✅ Test with different shard counts
npx playwright test --shard=2/8  # Shard 2 of 8
npx playwright test --shard=5/10 # Shard 5 of 10
```

**Sharding with test tags/groups:**

```typescript
// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

// ✅ Tag critical tests for separate shard
test.describe('Smoke Tests @smoke', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Home/);
  });
});

// tests/e2e.spec.ts
test.describe('E2E Tests @e2e', () => {
  test('complete checkout flow', async ({ page }) => {
    // Long-running test
  });
});
```

```yaml
# .github/workflows/playwright-tagged.yml
jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests only
        # ✅ Run critical tests on single fast shard
        run: npx playwright test --grep @smoke
  
  full-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - name: Run full suite
        # ✅ Run all tests across multiple shards
        run: npx playwright test --shard=${{ matrix.shard }}/4
```

**Optimal shard configuration strategies:**

```typescript
// Calculate optimal shard count based on resources
const calculateOptimalShards = (testCount: number, avgTestDuration: number) => {
  // ✅ Target: Each shard should complete in 5-10 minutes
  const targetDuration = 7 * 60 * 1000; // 7 minutes in ms
  const totalDuration = testCount * avgTestDuration;
  const optimalShards = Math.ceil(totalDuration / targetDuration);
  
  // ✅ Constrain to reasonable range
  return Math.max(2, Math.min(optimalShards, 20));
};

// Example configurations:
// - 100 tests @ 10s each = 1000s total → 3 shards (330s each)
// - 500 tests @ 15s each = 7500s total → 18 shards (416s each)
// - 50 tests @ 5s each = 250s total → 2 shards (125s each)
```

**Best practices for sharding:**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ✅ Keep fullyParallel for intra-shard parallelization
  fullyParallel: true,
  
  // ✅ Adjust workers per shard based on resources
  workers: process.env.CI ? 2 : undefined,
  
  // ✅ Use retries with sharding for reliability
  retries: process.env.CI ? 2 : 0,
  
  // ✅ Blob reporter for merging shard results
  reporter: process.env.CI ? [['blob']] : [['html']],
  
  use: {
    // ✅ Capture traces only on retry to save resources
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

Benefits of test sharding:
- **Horizontal scaling**: Add more machines to reduce time linearly
- **Faster feedback**: Get results 4-10x faster with proper sharding
- **Resource efficiency**: Distribute load across multiple CI workers
- **Cost optimization**: Pay for parallel execution time, not sequential time
- **Flexible scaling**: Adjust shard count based on test suite size
- **Improved reliability**: Failed shards can be retried independently

When to use sharding:
- ✅ Large test suites (100+ tests or 10+ minutes runtime)
- ✅ CI/CD pipelines with parallel job support
- ✅ Time-sensitive deployments requiring fast feedback
- ✅ Test suites growing beyond single machine capacity
- ✅ When parallelization on single machine isn't enough

When not to use sharding:
- ❌ Small test suites (< 50 tests, < 5 minutes)
- ❌ Limited CI/CD resources or budget constraints
- ❌ Tests with heavy shared state requirements
- ❌ When setup/teardown time exceeds test time

Sharding calculation guidelines:
- **Target duration per shard**: 5-10 minutes ideal
- **Minimum shards**: 2 (even for small suites in CI)
- **Maximum shards**: 20 (diminishing returns beyond this)
- **Shard count**: Should divide evenly into test count when possible
- **Worker count per shard**: 2-4 in CI, CPU count locally

Common sharding patterns:
- **2 shards**: Small to medium test suites (50-200 tests)
- **4 shards**: Medium test suites (200-500 tests)
- **8 shards**: Large test suites (500-1000 tests)
- **10+ shards**: Very large test suites (1000+ tests)

Reference: [Playwright Test Sharding](https://playwright.dev/docs/test-sharding)

---

## 6. Fixtures & Test Organization

**Impact:** MEDIUM  
**Description:** Well-structured tests with proper fixtures and hooks improve code reusability, maintainability, and test clarity.

### 6.1. Cancel Async Operations and Network Requests with AbortSignal Fixtures

**Tags:** abort, signal, AbortController, AbortSignal, cancellation, network, async, fixture-abort  
**Impact:** MEDIUM (enables deterministic cancellation tests and prevents async resource leaks)

**Impact: MEDIUM (enables deterministic cancellation tests and prevents async resource leaks)**

Testing cancellation behavior (user navigates away, timeout exceeded, request manually aborted) requires `AbortController` and `AbortSignal`. Creating them manually in every test is repetitive and their cleanup is often forgotten. The `@playwright-labs/fixture-abort` package provides per-test `abortController` and `abortSignal` fixtures with automatic lifecycle management, plus 7 custom matchers for asserting abort state.

## When to Use

- **Use abortController/abortSignal fixtures when**: Testing fetch cancellation, stream interruption, long-polling termination, or user-initiated cancel flows
- **Use useAbortSignalWithTimeout when**: You need a timeout-based abort that automatically triggers after N milliseconds
- **Use matchers when**: Asserting that a signal is active before the operation and aborted after cancellation
- **Required for**: Any test covering network request cancellation, AbortSignal-aware APIs, or cleanup-on-cancel behavior

## Guidelines

### Do

- Use `signal` fixture to pass to `fetch()`, streams, or any AbortSignal-aware API
- Use `abortController.abort(reason)` with a descriptive reason to identify the cancel source
- Use `toBeAborted()` after cancellation and `toBeActive()` before
- Use `toAbortWithin(ms)` for timeout-based signals (`AbortSignal.timeout(n)`)
- Use `useAbortController(onAbort)` when you need a cleanup callback on abort

### Don't

- Don't share one `abortController` across multiple tests — each test gets its own fresh instance via the fixture
- Don't ignore the abort reason — use `toBeAbortedWithReason(reason)` when the reason matters
- Don't manually create `new AbortController()` when the fixture is available
- Don't forget to handle rejected promises from aborted operations — `fetch` rejects with `AbortError`

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-abort`
- **Fixtures**: `abortController` (AbortController), `abortSignal` (AbortSignal), `useAbortController(onAbort?)`, `useAbortSignalWithTimeout(ms)`
- **Matchers**: `toBeAborted()`, `toBeActive()`, `toBeAbortedWithReason(reason)`, `toHaveAbortedSignal()`, `toHaveActiveSignal()`, `toAbortWithin(ms)`, `toHaveAbortReason(ErrorType)`

## Edge Cases and Constraints

### Limitations

- `abortController` is test-scoped — a new instance is created for every test; you cannot persist it across tests
- `useAbortSignalWithTimeout(ms)` also sets the Playwright test timeout to `ms` — keep this in mind when setting short timeouts
- `toAbortWithin(ms)` is async — always `await` it

### Edge Cases

1. **Multiple abort reasons**: Calling `abort()` a second time is a no-op — the first reason is preserved. Assert with `toBeAbortedWithReason`.
2. **Stream cleanup**: When aborting a `ReadableStream`, call `.cancel()` on the reader — the signal alone doesn't automatically clean up all stream consumers.
3. **Nested async operations**: An aborted signal propagates to child `fetch` calls that receive the same signal — all reject simultaneously.

### What Breaks If Ignored

- **Without abort fixtures**: Manual `new AbortController()` in every test, no automatic teardown, signal never checked
- **Without matchers**: Cancellation assertions require try/catch boilerplate that hides the actual behavior
- **Without cleanup**: Aborted but not-rejected promises keep network connections open, causing test timeouts in slow CI

**Incorrect (manual AbortController, no assertions):**

```typescript
import { test, expect } from '@playwright/test';

test('cancel request', async () => {
  // ❌ Manual creation, no fixture lifecycle
  const ac = new AbortController();

  const promise = fetch('https://api.example.com/data', { signal: ac.signal });
  ac.abort();

  // ❌ Try/catch instead of matchers — brittle, hides assertion
  try {
    await promise;
    throw new Error('Should have aborted');
  } catch (e) {
    expect(e).toBeInstanceOf(Error); // ❌ Too loose — any Error passes
  }
  // ❌ Never checks the signal's final state
});
```

**Correct (fixtures + custom matchers):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import {
  test as abortTest,
  expect as abortExpect,
} from '@playwright-labs/fixture-abort';

export const test = mergeTests(abortTest);
export const expect = mergeExpects(abortExpect);
```

```typescript
import { test, expect } from '../fixtures';

// ✅ Signal starts active
test('signal is active before operation', async ({ abortSignal }) => {
  expect(abortSignal).toBeActive();
  expect(abortSignal).not.toBeAborted();
});

// ✅ Cancel API request and assert abort state
test('abort cancels in-flight fetch', async ({ abortController, abortSignal }) => {
  expect(abortSignal).toBeActive();

  const fetchPromise = fetch('https://httpbin.org/delay/10', { signal: abortSignal });

  abortController.abort('user cancelled');

  await expect(fetchPromise).rejects.toThrow();
  expect(abortSignal).toBeAborted();
  expect(abortSignal).toBeAbortedWithReason('user cancelled');
  expect(abortController).toHaveAbortedSignal();
});

// ✅ Timeout-based abort
test('request aborts after 3 seconds', async () => {
  const signal = AbortSignal.timeout(3000);
  await expect(signal).toAbortWithin(3500); // async — must await
  expect(signal).toHaveAbortReason(DOMException);
});

// ✅ Cleanup callback on abort
test('cleans up on cancel', async ({ useAbortController }) => {
  let cleanedUp = false;

  const controller = useAbortController(() => {
    cleanedUp = true;
  });

  controller.abort();
  expect(cleanedUp).toBe(true);
});

// ✅ Multiple listeners
test('abort notifies all listeners', async ({ abortController, abortSignal }) => {
  let count = 0;
  abortSignal.addEventListener('abort', () => count++);
  abortSignal.addEventListener('abort', () => count++);

  abortController.abort();

  expect(count).toBe(2);
  expect(abortController).toHaveAbortedSignal();
});

// ✅ Pass signal to any AbortSignal-aware API
test('page fetch respects signal', async ({ page, signal, abortController }) => {
  const pagePromise = page.evaluate((signal) => {
    return fetch('/api/slow', { signal });
  }, signal);

  abortController.abort('navigation');

  await expect(pagePromise).rejects.toThrow();
  expect(signal).toBeAbortedWithReason('navigation');
});
```

Reference: [@playwright-labs/fixture-abort](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-abort)

---

### 6.2. Compose Fixtures with mergeTests and mergeExpects for Modular Test Suites

**Tags:** fixtures, mergeTests, mergeExpects, modular, composition, scalability  
**Impact:** MEDIUM (enables scalable fixture composition across large teams without conflicts)

**Impact: MEDIUM (enables scalable fixture composition across large teams without conflicts)**

Playwright's `mergeTests` and `mergeExpects` utilities let you combine multiple fixture sets and custom matchers from separate packages or team modules into a single unified `test` and `expect`. This is the standard pattern for third-party fixture libraries and for splitting large fixture suites across feature teams without naming collisions.

## When to Use

- **Use mergeTests/mergeExpects when**: Combining fixtures from multiple `test.extend()` sources, using third-party fixture packages like `@playwright-labs/*`, or splitting fixtures across domains (auth, database, API)
- **Prefer over manual extend-chaining when**: You have 3+ independent fixture modules, need to compose external packages, or want to isolate fixture ownership by team
- **Required for**: Monorepos, large teams, any project using `@playwright-labs/fixture-*` packages

## Guidelines

### Do

- Create a single `fixtures.ts` (or `test.ts`) entry point that merges everything and re-exports
- Merge both `test` and `expect` objects — `mergeTests` handles fixtures, `mergeExpects` handles matchers
- Type each module's fixtures independently before merging
- Use `mergeTests` at project level in playwright.config.ts-adjacent files, not inside test files

### Don't

- Don't call `mergeTests` inside individual test files — create a shared file
- Don't chain `.extend()` when composing unrelated modules — use `mergeTests` instead
- Don't forget to re-export from the merged file — all tests should import from one place
- Don't mix merged and non-merged imports in the same project

### Tool Usage Patterns

- **Primary tools**: `mergeTests()`, `mergeExpects()` from `@playwright/test`
- **Third-party fixtures**: All `@playwright-labs/fixture-*` packages export a `test` and `expect` that are merge-compatible
- **Pattern**: one `fixtures/index.ts` that merges and re-exports; all spec files import from it

## Edge Cases and Constraints

### Limitations

- Fixture names must be unique across all merged modules — duplicate names cause a runtime error
- `mergeExpects` only merges custom matchers; TypeScript types may need manual declaration merging via `declare module "@playwright/test"`
- Order of merge arguments does not affect fixture resolution but does affect error messages

### Edge Cases

1. **Duplicate fixture names**: If two modules both define `apiClient`, `mergeTests` throws. Solution: namespace fixtures (`authApiClient`, `adminApiClient`) before merging.
2. **Matcher type conflicts**: Two packages extending `Matchers<R>` with the same method name silently override. Solution: check package changelogs before updating.
3. **Circular fixture dependencies across modules**: Module A's fixture depends on Module B's fixture. Works fine with `mergeTests` — Playwright resolves across the merged graph.

### What Breaks If Ignored

- **Without merging**: Deep `.extend().extend().extend()` chains become unreadable and impossible to split across files
- **Without re-exporting from one file**: Tests import inconsistently, some getting older fixture versions
- **Without mergeExpects**: Custom matchers from different packages are silently dropped

**Incorrect (chaining extends for unrelated modules):**

```typescript
// ❌ Hard to maintain, mixes unrelated concerns
import { test as base } from '@playwright/test';
import { authFixtures } from './auth';
import { dbFixtures } from './database';
import { apiFixtures } from './api';

export const test = base
  .extend(authFixtures)
  .extend(dbFixtures)
  .extend(apiFixtures);
// Matchers from each module are lost — no mergeExpects
```

**Correct (using mergeTests and mergeExpects):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';

// Third-party playwright-labs packages
import {
  test as timersTest,
  expect as timersExpect,
} from '@playwright-labs/fixture-timers';
import {
  test as abortTest,
  expect as abortExpect,
} from '@playwright-labs/fixture-abort';
import {
  test as ajvTest,
  expect as ajvExpect,
} from '@playwright-labs/fixture-ajv-ts';
import {
  test as envTest,
  expect as envExpect,
} from '@playwright-labs/fixture-env';

// Internal project fixtures
import { test as authTest, expect as authExpect } from './auth.fixture';
import { test as dbTest } from './database.fixture';

// ✅ Merge all fixtures into one test object
export const test = mergeTests(
  timersTest,
  abortTest,
  ajvTest,
  envTest,
  authTest,
  dbTest,
);

// ✅ Merge all custom matchers into one expect object
export const expect = mergeExpects(
  timersExpect,
  abortExpect,
  ajvExpect,
  envExpect,
  authExpect,
);
```

```typescript
// tests/api.spec.ts — all tests import from one place
import { test, expect } from '../fixtures';

test('POST /users validates schema', async ({ request, schema }) => {
  // schema fixture from @playwright-labs/fixture-ajv-ts
  const UserSchema = schema.object({ id: schema.number(), email: schema.string() });

  const res = await request.post('/api/users', { data: { email: 'test@example.com' } });
  expect(await res.json()).toMatchSchema(UserSchema); // toMatchSchema from ajvExpect
});

test('cancel slow request', async ({ abortController, signal }) => {
  // abortController/signal fixtures from @playwright-labs/fixture-abort
  const fetch = globalThis.fetch('/api/slow', { signal });
  abortController.abort('timeout');
  await expect(fetch).rejects.toThrow();
});
```

```typescript
// Splitting fixtures by team ownership — each team owns a module
// team-auth/fixtures.ts
import { test as base } from '@playwright/test';
export const test = base.extend<{ authToken: string }>({
  authToken: async ({}, use) => {
    const token = await fetchToken();
    await use(token);
  },
});

// team-payments/fixtures.ts
import { test as base } from '@playwright/test';
export const test = base.extend<{ paymentApi: PaymentClient }>({
  paymentApi: async ({}, use) => {
    await use(new PaymentClient());
  },
});

// fixtures/index.ts — platform team composes everything
import { mergeTests } from '@playwright/test';
import { test as authTest } from '../team-auth/fixtures';
import { test as paymentsTest } from '../team-payments/fixtures';

export const test = mergeTests(authTest, paymentsTest);
export { expect } from '@playwright/test';
```

Reference: [Playwright mergeTests](https://playwright.dev/docs/api/class-test#test-merge-tests)

---

### 6.3. Control Node.js Timers in Tests with Promise-Based Timer Fixtures

**Tags:** timers, setTimeout, setInterval, fixture-timers, async, timing, nodejs  
**Impact:** MEDIUM (eliminates real-time waits and makes timing-sensitive tests deterministic)

**Impact: MEDIUM (eliminates real-time waits and makes timing-sensitive tests deterministic)**

Node.js timer APIs (`setTimeout`, `setInterval`, `setImmediate`) are callback-based and awkward to use in async tests. The `@playwright-labs/fixture-timers` package exposes them as first-class Playwright fixtures that return Promises and AsyncIterators, integrate naturally with `await` and `for await...of`, support AbortSignal cancellation, and include 6 custom matchers for timing assertions.

## When to Use

- **Use fixture-timers when**: Testing retry logic, polling, debounce/throttle, timeout races, or any code with timing-sensitive behavior
- **Prefer over `page.waitForTimeout()`**: `waitForTimeout` is a hard sleep; fixture timers are composable and assertable
- **Use custom matchers when**: You need to assert that an operation completes within an SLA or takes at least a minimum duration
- **Required for**: Integration tests involving queues, retry policies, or interval-driven workflows

## Guidelines

### Do

- Use `setTimeout` fixture instead of `page.waitForTimeout()` or raw `setTimeout()`
- Use `setInterval` with `for await...of` for polling patterns
- Use `toResolveWithin(ms)` to assert SLA compliance
- Use `toTakeAtLeast(ms)` to assert minimum delay enforcement
- Cancel timers with `AbortController` to test timeout handling
- Use `scheduler.wait()` when you need precise sub-millisecond-class scheduling

### Don't

- Don't use `page.waitForTimeout()` — it's a hard sleep with no assertions
- Don't import Node's `setTimeout` directly in tests — use the fixture for composability
- Don't leave `setInterval` iterators running — always `break` or call `.return?.()` for cleanup
- Don't use raw `new Promise(resolve => setTimeout(resolve, ms))` when fixture is available

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-timers`
- **Fixtures**: `setTimeout`, `setInterval`, `setImmediate`, `scheduler`
- **Matchers**: `toResolveWithin(ms)`, `toTakeAtLeast(ms)`, `toResolveWith(value)`, `toResolveInTimeRange(min, max)`, `toYield(value?)`, `toYieldWithin(ms)`
- **Cancellation**: All fixtures accept `{ signal: AbortSignal }` as last argument

## Edge Cases and Constraints

### Limitations

- `setInterval` returns an `AsyncIterator`, not a number — do not try to pass it to `clearInterval`
- `toResolveWithin` has ~10ms margin of error on loaded CI machines — use generous bounds in CI
- `scheduler.yield()` is a Node.js 20+ API; tests fail on older runtimes

### Edge Cases

1. **Cleanup of open intervals**: If a test fails mid-loop, the iterator stays open. Use `afterEach` or `signal` cancellation to ensure cleanup.
2. **AbortController shared across multiple timers**: Aborting once cancels all timers sharing the signal — intended but can surprise.
3. **Concurrent timers with `Promise.race`**: Works as expected; use `setTimeout` fixtures in the race array.

### What Breaks If Ignored

- **Without timer fixtures**: Real `setTimeout(fn, 5000)` in tests causes 5-second actual waits, slow CI
- **Without cleanup**: Open `setInterval` iterators keep the test worker alive past completion, causing timeouts
- **Without matchers**: Timing assertions require fragile manual `Date.now()` bookkeeping

**Incorrect (raw timers, hard sleeps, no assertions):**

```typescript
import { test, expect } from '@playwright/test';

test('retry logic', async ({ page }) => {
  // ❌ Hard sleep — always waits 3s even if ready sooner
  await page.waitForTimeout(3000);

  // ❌ Raw callback-based timer — breaks async flow
  await new Promise<void>(resolve => {
    setTimeout(resolve, 1000);
  });

  // ❌ No timing assertion — test passes even if response is 10s late
  const start = Date.now();
  const res = await fetch('/api/data');
  expect(Date.now() - start).toBeLessThan(2000); // manual, fragile
});
```

**Correct (promise-based fixtures and custom matchers):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import {
  test as timersTest,
  expect as timersExpect,
} from '@playwright-labs/fixture-timers';

export const test = mergeTests(timersTest);
export const expect = mergeExpects(timersExpect);
```

```typescript
import { test, expect } from '../fixtures';

// ✅ Basic delay — awaitable, no callbacks
test('waits with delay', async ({ setTimeout }) => {
  const result = await setTimeout(500, 'done');
  expect(result).toBe('done');
});

// ✅ Assert operation completes within SLA
test('API responds within 2s', async ({ setTimeout }) => {
  const fetchPromise = fetch('/api/data');
  await expect(fetchPromise).toResolveWithin(2000);
});

// ✅ Assert minimum delay is enforced (debounce test)
test('debounce enforces 300ms delay', async ({ setTimeout }) => {
  const debounced = setTimeout(300, 'fired');
  await expect(debounced).toTakeAtLeast(295);
});

// ✅ Polling with async iterator
test('poll until service ready', async ({ setInterval }) => {
  const poller = setInterval(200, 'check');
  let ready = false;

  for await (const _ of poller) {
    const res = await fetch('/api/health');
    if ((await res.json()).status === 'ok') {
      ready = true;
      break;
    }
  }

  await poller.return?.(); // cleanup
  expect(ready).toBe(true);
});

// ✅ Timeout race pattern
test('operation vs timeout', async ({ setTimeout }) => {
  const operation = fetch('/api/slow');
  const timeout = setTimeout(5000).then(() => {
    throw new Error('timed out');
  });

  const result = await Promise.race([operation, timeout]);
  expect(result.ok).toBe(true);
});

// ✅ Cancel timer with AbortSignal
test('abort cancels pending timer', async ({ setTimeout }) => {
  const ac = new AbortController();
  const timer = setTimeout(10_000, 'late', { signal: ac.signal });

  ac.abort('cancelled');

  await expect(timer).rejects.toThrow();
});

// ✅ Assert value resolved in time range (not too fast, not too slow)
test('cache warms between 50-200ms', async ({ setTimeout }) => {
  const warmup = setTimeout(100, 'warm');
  await expect(warmup).toResolveInTimeRange(50, 200);
});
```

Reference: [@playwright-labs/fixture-timers](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-timers)

---

### 6.4. Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation

**Tags:** opentelemetry, otel, metrics, spans, tracing, traceparent, counter, histogram, useSpan, withSpan, fixture-otel  
**Impact:** MEDIUM (adds business-level telemetry to tests and connects Playwright spans with upstream service traces)

**Impact: MEDIUM (adds business-level telemetry to tests and connects Playwright spans with upstream service traces)**

The built-in reporter-otel metrics track test results and durations. The `@playwright-labs/fixture-otel` package goes further — its fixtures let you record custom business metrics (`useCounter`, `useHistogram`, `useUpDownCounter`), create named child spans (`useSpan`, `withSpan`), and propagate a W3C `traceparent` into the system under test so every downstream service span appears in the same Jaeger trace as the Playwright test span.

## When to Use

- **Use useCounter when**: Counting specific events inside a test — API calls made, items rendered, retries triggered
- **Use useHistogram when**: Recording latency or size distributions — page load time, response sizes, render durations
- **Use useUpDownCounter when**: Tracking values that go up and down — in-flight requests, queue depth, active connections
- **Use useSpan when**: Grouping a logical operation into a named span visible in Jaeger alongside Playwright steps
- **Use withSpan when**: Wrapping a utility function in a span without needing a fixture
- **Use useTraceparent when**: The test calls real services and you want Playwright and service spans in one trace
- **Requires**: `@playwright-labs/reporter-otel` running in `playwright.config.ts`

## Guidelines

### Do

- Pair `test.step` with `withSpan` for simultaneous visibility in Playwright Trace Viewer and Jaeger
- Use the `using` keyword (TypeScript 5.2+) for deterministic span/metric cleanup within a scope block
- Call `useTraceparent()` once at the top of tests that make real HTTP calls — all auto-instrumented libraries pick it up via `AsyncLocalStorage`
- Add `startWorkerSdk({ instrumentations: [...] })` in a worker-scoped fixture to enable zero-config trace propagation across all tests in the worker
- Use `toBeOtelMetricCollected()` and `toHaveOtelCallCount(n)` to assert that instrumentation fired the expected number of times

### Don't

- Don't call `useTraceparent()` multiple times in one test — it is idempotent and always returns the same object
- Don't use `useSpan` for spans that cross `await` boundaries without holding a reference — the span stays open until fixture teardown, but explicit `span.end()` is clearer
- Don't add test-unique IDs (order IDs, user IDs) as metric attributes — high cardinality exhausts Prometheus label space; use span attributes instead
- Don't import from `@playwright-labs/fixture-otel` in tests that don't use the reporter — the stdout bridge writes JSON lines to stdout, which can interfere with reporters that parse stdout

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-otel @playwright-labs/reporter-otel`
- **Fixtures**: `useCounter(name, options?)`, `useHistogram(name, options?)`, `useUpDownCounter(name, options?)`, `useSpan(name)`, `useTraceparent()`
- **Standalone helper**: `withSpan(name, callback)` — no fixture required
- **Worker SDK**: `startWorkerSdk(options)` — call once per worker for auto-instrumented trace propagation
- **Matchers**: `toBeOtelMetricCollected()`, `toHaveOtelCallCount(n)`, `toHaveOtelMinCallCount(min)`, `toBeOtelSpanEnded()`

## Edge Cases and Constraints

### Limitations

- Metrics and spans are flushed via `process.stdout` (`__pw_otel__` prefix) — they require `reporter-otel` to be active in the same Playwright process; standalone use without the reporter silently discards data
- `withSpan` spans and the reporter's test span are siblings under the same `traceparent` root, not parent–child — this is an architectural trade-off because the test span is created at `onTestEnd`
- `startWorkerSdk()` is a singleton — calling it multiple times is safe; calling it without the reporter running is also safe (exits silently)

### Edge Cases

1. **Span still open after test**: If `span.end()` is not called, the fixture teardown closes it automatically. The span's end time reflects the fixture teardown moment, not the test end.
2. **Nested `withSpan` calls**: Automatically produce parent–child relationships in Jaeger via `AsyncLocalStorage` context propagation — no manual wiring needed.
3. **Manual vs. automatic traceparent**: Both modes use the same `traceparent` value and are fully composable within one test.

### What Breaks If Ignored

- **Without useTraceparent**: Playwright spans and service spans appear as unrelated traces in Jaeger — no end-to-end trace correlation
- **Without custom metrics**: You can only see "test passed/failed" — not "how many retries happened inside this test" or "how long did the checkout API take"
- **Without withSpan + test.step**: Playwright Trace Viewer shows steps but not the downstream spans they trigger; Jaeger shows spans but not the test steps

**Incorrect (no instrumentation, no trace correlation):**

```typescript
import { test, expect } from "@playwright/test";

test("checkout flow", async ({ page, request }) => {
  // ❌ Playwright span exists in Jaeger, but the service spans are separate traces
  const res = await request.post("/api/orders", {
    data: { items: ["abc-123"] },
  });
  expect(res.ok()).toBe(true);
  // ❌ No visibility into how many items were processed, how long it took
});
```

**Correct (trace propagation + custom metrics + span instrumentation):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  reporter: [["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }]],
});
```

```typescript
// fixtures/index.ts — worker SDK + merged fixtures
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as otelTest,
  expect as otelExpect,
  startWorkerSdk,
} from "@playwright-labs/fixture-otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const workerOtel = otelTest.extend<{}, { otelWorker: void }>({
  otelWorker: [
    async ({}, use) => {
      // ✅ Runs once per worker — enables zero-config trace propagation
      startWorkerSdk({ instrumentations: [getNodeAutoInstrumentations()] });
      await use();
    },
    { scope: "worker" },
  ],
});

export const test = mergeTests(workerOtel);
export const expect = mergeExpects(otelExpect);
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "../fixtures";
import { withSpan } from "@playwright-labs/fixture-otel";

test("checkout with full observability", async ({
  page,
  request,
  useTraceparent,
  useCounter,
  useHistogram,
  useSpan,
}) => {
  // ✅ All HTTP calls in this test share one traceId with Playwright's test span
  const { traceparent, traceId } = useTraceparent();
  console.log("Trace:", `http://localhost:16686/trace/${traceId}`);

  // ✅ Business metrics
  const apiCalls  = useCounter("checkout_api_calls", { unit: "calls" });
  const pageLoads = useHistogram("page_load_ms", { unit: "ms" });

  // ✅ Wrapping test.step in withSpan: visible in both Trace Viewer and Jaeger
  await test.step("load cart", () =>
    withSpan("cart.load", async (span) => {
      const start = Date.now();
      await page.goto("/cart");
      const elapsed = Date.now() - start;

      span.setAttribute("cart.url", "/cart");
      pageLoads.record(elapsed, { route: "/cart" });
    }),
  );

  // ✅ Named span for the API call — joins the same trace automatically
  const orderSpan = useSpan("order.create");
  const res = await request.post("/api/orders", {
    headers: { traceparent },               // manual propagation for request fixture
    data: { items: ["abc-123", "def-456"] },
  });
  apiCalls.add(1, { endpoint: "/api/orders", status: String(res.status()) });
  orderSpan.setAttribute("order.items", 2);
  orderSpan.setAttribute("order.status", String(res.status()));
  orderSpan.end();

  expect(res).toBeOK();

  await test.step("confirm page", () =>
    withSpan("confirmation.load", async (span) => {
      const start = Date.now();
      await page.waitForURL("/confirmation/**");
      pageLoads.record(Date.now() - start, { route: "/confirmation" });
      span.setAttribute("confirmation.url", page.url());
    }),
  );

  // ✅ Assert instrumentation fired as expected
  expect(apiCalls).toHaveOtelCallCount(1);
  expect(pageLoads).toHaveOtelMinCallCount(2);
  expect(orderSpan).toBeOtelSpanEnded();
});
```

```typescript
// Tracking in-flight requests with UpDownCounter
test("loading indicator during requests", async ({ page, useUpDownCounter }) => {
  const inFlight = useUpDownCounter("http_in_flight");

  // ✅ Tracks concurrent request depth
  page.on("request",         () => inFlight.add(1));
  page.on("requestfinished", () => inFlight.add(-1));
  page.on("requestfailed",   () => inFlight.add(-1));

  await page.goto("/dashboard");
  expect(inFlight).toHaveOtelMinCallCount(1);
});
```

```typescript
// Scope-bound cleanup with the `using` keyword (TypeScript 5.2+)
test("scope-bound spans and metrics", async ({ useCounter, useSpan, page }) => {
  {
    using span = useSpan("hero.load");           // ✅ span.end() on block exit
    await page.goto("/");
    span.setAttribute("hero.variant", "v2");
  }

  {
    using clicks = useCounter("cta_clicks");     // ✅ clicks.collect() on block exit
    await page.click('[data-testid="cta"]');
    clicks.add(1, { button: "hero-cta" });
  }
});
```

```typescript
// withSpan standalone — no fixture, wraps any async utility
import { withSpan } from "@playwright-labs/fixture-otel";

async function fetchUserWithSpan(id: string) {
  return withSpan("db.users.find", async (span) => {
    span.setAttribute("db.table", "users");
    span.setAttribute("user.id", id);
    return db.users.findById(id); // span status = "error" if this throws
  });
}

test("user profile loads", async ({ page, useTraceparent }) => {
  useTraceparent(); // auto-propagates to withSpan via AsyncLocalStorage
  const user = await fetchUserWithSpan("123");
  await page.goto(`/profile/${user.id}`);
  // db.users.find span appears as child of the test span in Jaeger
});
```

Reference: [@playwright-labs/fixture-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel)

---

### 6.5. Manage Environment Variables with Type-Safe Validated Configuration

**Tags:** environment-variables, configuration, type-safe, validation, fixture-env, ajv-ts, zod  
**Impact:** MEDIUM (prevents test failures caused by missing or misconfigured environment variables)

**Impact: MEDIUM (prevents test failures caused by missing or misconfigured environment variables)**

Accessing `process.env.SOME_VAR` directly in tests is untyped, lacks validation, and causes obscure failures when variables are missing. The `@playwright-labs/fixture-env` package provides a `createEnv()` factory (with ajv-ts or zod schemas), fixtures for safe access (`getEnvValueOrThrow`, `setEnv`, `snapshotEnv`), and custom matchers for asserting env state. Type errors are caught at startup, not mid-test.

## When to Use

- **Use createEnv when**: You have more than 2 required environment variables — validate all at startup with a schema
- **Use setEnv fixture when**: A test needs to override an env variable and restore it afterwards without manual cleanup
- **Use getEnvValueOrThrow when**: A test requires a variable that must exist (auth tokens, API keys, base URLs)
- **Use env matchers when**: Testing configuration loading or environment-conditional behavior

## Guidelines

### Do

- Define a typed `createEnv()` schema at the project root (`env.ts`) and import from it in tests
- Use `prefix` option when all test-specific vars share a common prefix (e.g. `PW_`)
- Use `onValidationError` to fail fast with a clear message before any test runs
- Use `setEnv` fixture in tests rather than mutating `process.env` directly
- Use `snapshotEnv`/`restoreEnv` when a test needs full env isolation
- Combine with `extends` to share common env definitions across environments

### Don't

- Don't access `process.env.X` directly in test code — it's untyped and unvalidated
- Don't modify `process.env` directly in tests without restoring — it bleeds into other tests in the same worker
- Don't skip `onValidationError` — validation errors need to abort the run, not silently default
- Don't define `createEnv` inside test files — it runs at startup, define it once and import

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-env`
- **Install schema**: `npm install ajv-ts` (or `zod`)
- **Exports**: `createEnv` from `@playwright-labs/fixture-env/ajv-ts` or `/zod`
- **Fixtures**: `useEnv`, `setEnv`, `getEnvValue`, `getEnvValueOrThrow`, `hasEnvKey`, `snapshotEnv`, `restoreEnv`, `clearEnvKeys`, `getEnvKeysWithPrefix`, `stripEnvPrefix`
- **Matchers**: `toBeInEnv()`, `toBeInEnvWithValue(value)`, `toMatchEnvPattern(regex)`, `toBeEnvUrl()`, `toBeEnvNumber()`, `toBeEnvBoolean()`, `toBeEnvOneOf(values)`

## Edge Cases and Constraints

### Limitations

- `createEnv` validates at import time — errors surface before `test.beforeAll` runs
- `setEnv` restoration only works for keys set within the fixture scope — pre-existing keys are preserved
- `extends` merges env objects shallowly — duplicate keys in extended envs are overridden by the outer `createEnv`

### Edge Cases

1. **CI vs local**: Use `extends` with a `github` or `gitlab` predefined preset to map CI-injected variables to consistent names.
2. **Secret masking**: Wrap sensitive values in `{ value, masked: true }` if your reporting integration supports it; `createEnv` itself does not mask.
3. **Multiple test projects**: Each project can have its own `createEnv` with different prefixes and schemas — merge them via `extends`.

### What Breaks If Ignored

- **Without validation**: Missing `DATABASE_URL` causes a cryptic `TypeError: Cannot read properties of undefined` 50 tests in
- **Without setEnv cleanup**: A test sets `NODE_ENV=production`, the next test in the same worker sees it, tests become order-dependent
- **Without typed env**: `process.env.PORT` is always `string | undefined` — passing it to `parseInt` without a check silently produces `NaN`

**Incorrect (direct process.env access, no typing, no validation):**

```typescript
import { test, expect } from '@playwright/test';

test('connects to database', async () => {
  // ❌ No validation — undefined if variable not set
  const url = process.env.DATABASE_URL;
  const db = await connect(url as string); // ❌ unsafe cast
  expect(await db.ping()).toBe(true);
});

test('API base URL is set', async ({ request }) => {
  // ❌ Direct env access, test fails with unhelpful error if missing
  const base = process.env.API_BASE_URL!;
  const res = await request.get(`${base}/health`);
  expect(res.ok()).toBe(true);
});
```

**Correct (createEnv with schema validation + env fixtures):**

```typescript
// env.ts — validated at startup, imported by playwright.config.ts and tests
import { createEnv } from '@playwright-labs/fixture-env/ajv-ts';
import { s } from 'ajv-ts';

export const env = createEnv({
  prefix: 'PW_',
  schema: {
    DATABASE_URL: s.string().format('uri'),   // PW_DATABASE_URL
    API_BASE_URL: s.string().format('uri'),   // PW_API_BASE_URL
    AUTH_TOKEN: s.string().min(1),            // PW_AUTH_TOKEN
    LOG_LEVEL: s.enum('debug', 'info', 'warn', 'error').optional(),
  },
  env: process.env,
  onValidationError: (error) => {
    console.error('❌ Invalid test environment:', error);
    process.exit(1); // fail fast before tests start
  },
});
// env.DATABASE_URL, env.API_BASE_URL, etc. are typed as string
```

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import { test as envTest, expect as envExpect } from '@playwright-labs/fixture-env';

export const test = mergeTests(envTest);
export const expect = mergeExpects(envExpect);
```

```typescript
// tests/config.spec.ts
import { test, expect } from '../fixtures';
import { env } from '../env';

// ✅ Typed access — TypeScript knows env.API_BASE_URL is string
test('health endpoint is reachable', async ({ request }) => {
  const res = await request.get(`${env.API_BASE_URL}/health`);
  await expect(res).toBeOK();
});

// ✅ Override env in test scope, auto-restored after
test('feature is disabled in staging', async ({ setEnv }) => {
  setEnv({ FEATURE_FLAG: 'false' });

  const res = await fetch(`${env.API_BASE_URL}/feature`);
  const body = await res.json();
  expect(body.enabled).toBe(false);
  // process.env.FEATURE_FLAG is restored automatically
});

// ✅ Assert env variable exists and has expected format
test('DATABASE_URL is a valid URI', async () => {
  expect('PW_DATABASE_URL').toBeInEnv();
  expect('PW_DATABASE_URL').toBeEnvUrl();
});

// ✅ Get required value or throw with clear error
test('authenticated API call', async ({ getEnvValueOrThrow, request }) => {
  const token = getEnvValueOrThrow('PW_AUTH_TOKEN');
  const res = await request.get('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  await expect(res).toBeOK();
});
```

```typescript
// Using extends to share common variables
import { createEnv } from '@playwright-labs/fixture-env/ajv-ts';

const baseEnv = createEnv({
  env: { NODE_ENV: process.env.NODE_ENV },
});

export const env = createEnv({
  extends: [baseEnv],
  prefix: 'PW_',
  schema: {
    API_BASE_URL: s.string().format('uri'),
  },
  env: process.env,
});
// env.NODE_ENV inherited from baseEnv
```

Reference: [@playwright-labs/fixture-env](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-env)

---

### 6.6. Use Custom Fixtures for Reusable Test Setup and Teardown

**Tags:** fixtures, reusability, custom-fixtures, merge, test-organization  
**Impact:** MEDIUM (Reduces code duplication by 60-80% and improves test maintainability)

**Impact: MEDIUM (reduces code duplication by 60-80% and improves test maintainability)**

Custom fixtures in Playwright allow you to encapsulate reusable setup and teardown logic, share data across tests, and compose complex test scenarios. By extending Playwright's built-in fixtures, you can create domain-specific test helpers that make tests more readable and maintainable while eliminating code duplication.

## When to Use

- **Use custom fixtures when**: You have setup/teardown logic repeated in 3+ tests, need to share authenticated sessions, require database setup, or manage complex test data
- **Essential for**: Authentication flows, API client configuration, database connections, test data creation, page object initialization, mock server setup
- **Consider alternatives when**: Setup is unique to a single test (use inline setup), or fixture would have only one consumer (may be over-engineering)
- **Required for**: Projects with 20+ tests, multi-user role scenarios, integration tests with external dependencies

## Guidelines

### Do

- Create focused fixtures that handle a single responsibility (auth, database, API)
- Use worker-scoped fixtures for expensive operations (database connections, authentication state)
- Compose fixtures by declaring dependencies on other fixtures
- Provide TypeScript types for all custom fixtures
- Use automatic fixtures only for truly global setup that every test needs
- Document fixture cleanup behavior and dependencies
- Keep fixtures in separate files organized by domain (auth.fixture.ts, db.fixture.ts)
- Merge multiple fixture files using `.extend()` chains

### Don't

- Don't duplicate setup logic across fixtures - use fixture dependencies instead
- Don't create fixtures for one-time setup - inline it in the test
- Don't make fixtures too complex - break them into smaller, composable fixtures
- Don't forget teardown logic - always clean up resources in fixtures
- Don't use test-scoped fixtures for expensive operations - use worker-scoped instead
- Don't ignore type safety - always type your fixture objects

### Tool Usage Patterns

- **Primary tools**: `test.extend<FixtureType>()`, `mergeTests()`, `mergeExpects()` from Playwright
- **Configuration**: No special playwright.config.ts required, but can configure globalSetup/globalTeardown for extreme cases
- **Fixture scopes**: 
  - Test-scoped (default): Fresh instance per test
  - Worker-scoped (`{ scope: 'worker' }`): Shared across tests in same worker process
  - Automatic (`{ auto: true }`): Runs for every test even if not explicitly used
- **Helper patterns**: Use `use()` callback to provide fixture value, setup before `use()`, teardown after `use()`

## Edge Cases and Constraints

### Limitations

- Worker-scoped fixtures cannot depend on test-scoped fixtures
- Automatic fixtures run even when not used, potentially slowing down tests
- Fixture dependencies create initialization chains that can be hard to debug if broken
- Parameterized fixtures require test.use() calls which can be forgotten
- Storage state sharing across workers requires careful synchronization

### Edge Cases

1. **Circular fixture dependencies**: If fixture A depends on B and B depends on A, Playwright will error. Solution: Refactor to remove circular dependency or merge into single fixture.

2. **Fixture cleanup failures**: If teardown logic throws an error, test still passes but resources leak. Solution: Wrap teardown in try-catch and log failures.

3. **Parallel test isolation**: Test-scoped fixtures run in parallel, can cause race conditions with shared resources. Solution: Use worker-scoped fixtures or ensure resources are truly isolated.

4. **Authentication token expiry**: Worker-scoped auth tokens may expire during long test runs. Solution: Refresh tokens before use or make token fixture test-scoped.

5. **Database transaction rollback**: If database fixture uses transactions, nested fixtures may commit/rollback at wrong times. Solution: Use single transaction per test or careful transaction boundary management.

### What Breaks If Ignored

- **Without fixtures**: 60-80% code duplication across tests, setup logic scattered everywhere
- **Without proper cleanup**: Resource leaks (database connections, API sessions, file handles)
- **Without worker scoping**: Slow test execution (re-authenticating 100 times vs once per worker)
- **Without type safety**: Runtime errors from incorrect fixture usage, no autocomplete
- **Without composition**: Deeply nested setup code, hard to maintain, impossible to reuse

**Incorrect (duplicated setup in every test):**

```typescript
import { test, expect } from '@playwright/test';

test('user can view profile', async ({ page }) => {
  // ❌ Duplicated login logic in every test
  await page.goto('https://example.com/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  await page.goto('/profile');
  await expect(page.locator('.profile-name')).toBeVisible();
});

test('user can update settings', async ({ page }) => {
  // ❌ Same login logic duplicated
  await page.goto('https://example.com/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  await page.goto('/settings');
  await page.click('[data-testid="edit-profile"]');
});

test('admin can access admin panel', async ({ page }) => {
  // ❌ Similar but slightly different for admin
  await page.goto('https://example.com/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  await page.goto('/admin');
  await expect(page.locator('.admin-panel')).toBeVisible();
});
```

**Correct (using custom fixtures):**

```typescript
// fixtures/auth.fixture.ts
import { test as base, expect, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

// ✅ Extend base test with custom fixtures
export const test = base.extend<AuthFixtures>({
  // ✅ Regular user authentication fixture
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login as regular user
    await page.goto('https://example.com/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Provide authenticated page to test
    await use(page);
    
    // Teardown: Logout happens automatically (page context is disposed)
  },

  // ✅ Admin authentication fixture
  adminPage: async ({ page }, use) => {
    // Setup: Login as admin
    await page.goto('https://example.com/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Provide admin page to test
    await use(page);
    
    // Teardown: Automatic cleanup
  },
});

export { expect };

// tests/profile.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test('user can view profile', async ({ authenticatedPage }) => {
  // ✅ No login code needed - already authenticated
  await authenticatedPage.goto('/profile');
  await expect(authenticatedPage.locator('.profile-name')).toBeVisible();
});

test('user can update settings', async ({ authenticatedPage }) => {
  // ✅ Reuse authentication fixture
  await authenticatedPage.goto('/settings');
  await authenticatedPage.click('[data-testid="edit-profile"]');
});

test('admin can access admin panel', async ({ adminPage }) => {
  // ✅ Use admin-specific fixture
  await adminPage.goto('/admin');
  await expect(adminPage.locator('.admin-panel')).toBeVisible();
});
```

**Merging multiple fixture files:**

```typescript
// fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

export type AuthFixtures = {
  authenticatedPage: Page;
};

export const authFixture = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await use(page);
  },
});

// fixtures/database.fixture.ts
import { test as base } from '@playwright/test';

export type DatabaseFixtures = {
  dbConnection: DatabaseConnection;
  testUser: User;
};

export const databaseFixture = base.extend<DatabaseFixtures>({
  dbConnection: async ({}, use) => {
    const db = await connectToDatabase();
    await use(db);
    await db.close();
  },

  testUser: async ({ dbConnection }, use) => {
    const user = await dbConnection.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });
    await use(user);
    await dbConnection.deleteUser(user.id);
  },
});

// fixtures/api.fixture.ts
import { test as base, APIRequestContext } from '@playwright/test';

export type ApiFixtures = {
  apiContext: APIRequestContext;
  authenticatedApi: APIRequestContext;
};

export const apiFixture = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: 'https://api.example.com',
    });
    await use(context);
    await context.dispose();
  },

  authenticatedApi: async ({ apiContext }, use) => {
    const response = await apiContext.post('/auth/login', {
      data: { email: 'user@example.com', password: 'password123' },
    });
    const { token } = await response.json();
    
    const authContext = await playwright.request.newContext({
      baseURL: 'https://api.example.com',
      extraHTTPHeaders: { 'Authorization': `Bearer ${token}` },
    });
    
    await use(authContext);
    await authContext.dispose();
  },
});

// fixtures/index.ts - ✅ Merge all fixtures
import { test as base } from '@playwright/test';
import { authFixture, AuthFixtures } from './auth.fixture';
import { databaseFixture, DatabaseFixtures } from './database.fixture';
import { apiFixture, ApiFixtures } from './api.fixture';

// ✅ Merge multiple fixture types
type AllFixtures = AuthFixtures & DatabaseFixtures & ApiFixtures;

// ✅ Combine all fixture extensions
export const test = base
  .extend<AuthFixtures>(authFixture)
  .extend<DatabaseFixtures>(databaseFixture)
  .extend<ApiFixtures>(apiFixture);

export { expect } from '@playwright/test';

// tests/integration.spec.ts
import { test, expect } from '../fixtures';

// ✅ Use all fixtures together
test('create user via API and verify in UI', async ({
  authenticatedPage,
  authenticatedApi,
  testUser,
}) => {
  // Use API fixture to create data
  const response = await authenticatedApi.post('/users', {
    data: { name: 'New User', email: 'new@example.com' },
  });
  const newUser = await response.json();

  // Use authenticated page to verify
  await authenticatedPage.goto(`/users/${newUser.id}`);
  await expect(authenticatedPage.locator('.user-name')).toHaveText('New User');

  // testUser fixture provides pre-created test user
  await authenticatedPage.goto(`/users/${testUser.id}`);
  await expect(authenticatedPage.locator('.user-name')).toHaveText('Test User');
});
```

**Worker-scoped fixtures (shared across tests in same worker):**

```typescript
// fixtures/worker-scoped.fixture.ts
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  // ✅ Worker-scoped: set up once per worker process
  workerStorageState: string;
};

type TestFixtures = {
  // Test-scoped: set up for each test
  authenticatedPage: Page;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // ✅ Worker-scoped fixture - runs once per worker
  workerStorageState: [async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Authenticate once per worker
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Save authentication state
    const storageState = await context.storageState();
    await context.close();
    
    await use(JSON.stringify(storageState));
  }, { scope: 'worker' }],

  // ✅ Test-scoped fixture using worker fixture
  authenticatedPage: async ({ page, workerStorageState }, use) => {
    // Reuse authentication state from worker
    await page.context().addCookies(JSON.parse(workerStorageState).cookies);
    await use(page);
  },
});
```

**Automatic and manual fixtures:**

```typescript
// fixtures/automatic.fixture.ts
import { test as base } from '@playwright/test';

type AutoFixtures = {
  // ✅ Automatic fixture: always runs, even if not used
  globalSetup: void;
  
  // Manual fixture: only runs when explicitly used
  databaseConnection: DatabaseConnection;
};

export const test = base.extend<AutoFixtures>({
  // ✅ Automatic fixture with 'auto' option
  globalSetup: [async ({}, use) => {
    console.log('Setting up global configuration');
    // Set environment variables, configure mocks, etc.
    process.env.TEST_MODE = 'true';
    
    await use();
    
    // Cleanup
    delete process.env.TEST_MODE;
    console.log('Cleaned up global configuration');
  }, { auto: true }],

  // ✅ Manual fixture: only runs when test needs it
  databaseConnection: async ({}, use) => {
    console.log('Connecting to database');
    const db = await connectToDatabase();
    await use(db);
    await db.close();
    console.log('Closed database connection');
  },
});

// Test 1: globalSetup runs, databaseConnection doesn't
test('test without database', async ({ page }) => {
  // globalSetup runs automatically
  // databaseConnection does NOT run (not needed)
  await page.goto('/');
});

// Test 2: both run
test('test with database', async ({ page, databaseConnection }) => {
  // globalSetup runs automatically
  // databaseConnection runs because it's used
  await databaseConnection.query('SELECT * FROM users');
});
```

**Fixture dependencies:**

```typescript
// fixtures/dependent.fixture.ts
import { test as base } from '@playwright/test';

type DependentFixtures = {
  apiToken: string;
  apiClient: ApiClient;
  authenticatedUser: User;
};

export const test = base.extend<DependentFixtures>({
  // ✅ Base fixture: generates API token
  apiToken: async ({}, use) => {
    const response = await fetch('https://api.example.com/auth/token', {
      method: 'POST',
      body: JSON.stringify({ client_id: 'test' }),
    });
    const { token } = await response.json();
    
    await use(token);
    
    // Revoke token after test
    await fetch(`https://api.example.com/auth/revoke/${token}`, {
      method: 'DELETE',
    });
  },

  // ✅ Dependent fixture: uses apiToken
  apiClient: async ({ apiToken }, use) => {
    const client = new ApiClient({
      baseURL: 'https://api.example.com',
      headers: { 'Authorization': `Bearer ${apiToken}` },
    });
    
    await use(client);
  },

  // ✅ Depends on apiClient
  authenticatedUser: async ({ apiClient }, use) => {
    const user = await apiClient.getCurrentUser();
    await use(user);
  },
});

// Test uses highest-level fixture, dependencies run automatically
test('user can access profile', async ({ authenticatedUser, page }) => {
  // apiToken → apiClient → authenticatedUser all run in order
  await page.goto(`/profile/${authenticatedUser.id}`);
});
```

**Parameterized fixtures:**

```typescript
// fixtures/parameterized.fixture.ts
import { test as base } from '@playwright/test';

type UserRole = 'admin' | 'user' | 'guest';

type RoleFixtures = {
  userRole: UserRole;
  roleBasedPage: Page;
};

export const test = base.extend<RoleFixtures>({
  userRole: ['user', { option: true }], // ✅ Default value with option flag

  roleBasedPage: async ({ page, userRole }, use) => {
    // ✅ Login based on role parameter
    const credentials = {
      admin: { email: 'admin@example.com', password: 'admin123' },
      user: { email: 'user@example.com', password: 'user123' },
      guest: { email: 'guest@example.com', password: 'guest123' },
    };

    const creds = credentials[userRole];
    await page.goto('/login');
    await page.fill('[name="email"]', creds.email);
    await page.fill('[name="password"]', creds.password);
    await page.click('button[type="submit"]');
    
    await use(page);
  },
});

// ✅ Override fixture parameter per test
test('admin dashboard', async ({ roleBasedPage }) => {
  test.use({ userRole: 'admin' });
  await roleBasedPage.goto('/admin');
});

test('user dashboard', async ({ roleBasedPage }) => {
  test.use({ userRole: 'user' });
  await roleBasedPage.goto('/dashboard');
});

// ✅ Or use in describe block
test.describe('Admin tests', () => {
  test.use({ userRole: 'admin' });

  test('can access admin panel', async ({ roleBasedPage }) => {
    await roleBasedPage.goto('/admin');
  });

  test('can manage users', async ({ roleBasedPage }) => {
    await roleBasedPage.goto('/admin/users');
  });
});
```

**Complex fixture composition example:**

```typescript
// fixtures/complete.fixture.ts
import { test as base, Page } from '@playwright/test';
import { connectDB, Database } from './db';
import { ApiClient } from './api-client';

// ✅ Define all fixture types
type CompleteFixtures = {
  // Database
  database: Database;
  testUser: User;
  
  // API
  apiClient: ApiClient;
  
  // Authentication
  authToken: string;
  authenticatedPage: Page;
  
  // Page Objects
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<CompleteFixtures>({
  // ✅ Level 1: Database connection
  database: async ({}, use) => {
    const db = await connectDB();
    await use(db);
    await db.disconnect();
  },

  // ✅ Level 2: Test user (depends on database)
  testUser: async ({ database }, use) => {
    const user = await database.users.create({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      role: 'user',
    });
    
    await use(user);
    
    await database.users.delete(user.id);
  },

  // ✅ Level 3: Auth token (depends on testUser)
  authToken: async ({ testUser }, use) => {
    const response = await fetch('https://api.example.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'password123',
      }),
    });
    
    const { token } = await response.json();
    await use(token);
  },

  // ✅ Level 4: API client (depends on authToken)
  apiClient: async ({ authToken }, use) => {
    const client = new ApiClient({
      baseURL: 'https://api.example.com',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    
    await use(client);
  },

  // ✅ Level 4: Authenticated page (depends on authToken)
  authenticatedPage: async ({ page, authToken }, use) => {
    await page.goto('/login');
    // Inject token directly (faster than UI login)
    await page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, authToken);
    await page.goto('/dashboard');
    
    await use(page);
  },

  // ✅ Page objects (depend on authenticatedPage)
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ authenticatedPage }, use) => {
    await use(new DashboardPage(authenticatedPage));
  },
});

export { expect } from '@playwright/test';

// tests/complete.spec.ts
import { test, expect } from '../fixtures/complete.fixture';

test('complete workflow with all fixtures', async ({
  testUser,
  apiClient,
  authenticatedPage,
  dashboardPage,
  database,
}) => {
  // ✅ All fixtures available and properly initialized
  
  // Use API client
  const profile = await apiClient.get(`/users/${testUser.id}`);
  expect(profile.email).toBe(testUser.email);
  
  // Use authenticated page
  await dashboardPage.goto();
  await expect(dashboardPage.welcomeMessage).toContainText(testUser.email);
  
  // Verify in database
  const dbUser = await database.users.findById(testUser.id);
  expect(dbUser.lastLogin).toBeDefined();
  
  // All fixtures are automatically cleaned up after test
});
```

## Common Mistakes

### Mistake 1: Creating fixtures that are too broad

```typescript
// ❌ Bad: One giant fixture doing everything
export const test = base.extend({
  everything: async ({ page }, use) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    // Database setup
    const db = await connectDB();
    // API setup
    const api = new ApiClient();
    // Mock setup
    await page.route('**/api/**', route => route.fulfill({ body: '{}' }));
    
    await use({ page, db, api }); // ❌ Too many responsibilities
    
    await db.close();
  },
});
```

**Why this is wrong**: Violates single responsibility, makes fixture hard to reuse, forces tests to initialize everything even if they only need one part.

**How to fix**:

```typescript
// ✅ Good: Separate, focused fixtures
export const test = base
  .extend<{ authenticatedPage: Page }>({ /* auth only */ })
  .extend<{ database: Database }>({ /* db only */ })
  .extend<{ apiClient: ApiClient }>({ /* api only */ });
```

### Mistake 2: Forgetting to clean up resources

```typescript
// ❌ Bad: No cleanup
export const test = base.extend({
  database: async ({}, use) => {
    const db = await connectDB();
    await use(db);
    // ❌ Missing: await db.close();
  },
});
```

**Why this is wrong**: Leaks database connections, file handles, or other resources. With 100 tests, could exhaust connection pool.

**How to fix**:

```typescript
// ✅ Good: Always clean up
export const test = base.extend({
  database: async ({}, use) => {
    const db = await connectDB();
    await use(db);
    await db.close(); // ✅ Cleanup
  },
});
```

### Mistake 3: Using test-scoped fixtures for expensive operations

```typescript
// ❌ Bad: Authenticating for every single test
export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // ❌ This runs for EACH test - very slow
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await use(page);
  },
});
```

**Why this is wrong**: If you have 100 tests, this authenticates 100 times instead of once per worker.

**How to fix**:

```typescript
// ✅ Good: Worker-scoped for expensive operations
export const test = base.extend<{}, { storageState: string }>({
  storageState: [async ({ browser }, use) => {
    // ✅ Runs once per worker
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    const state = await context.storageState();
    await context.close();
    await use(JSON.stringify(state));
  }, { scope: 'worker' }],
  
  authenticatedPage: async ({ page, storageState }, use) => {
    await page.context().addCookies(JSON.parse(storageState).cookies);
    await use(page);
  },
});
```

### Mistake 4: Not typing fixtures properly

```typescript
// ❌ Bad: No types, using 'any'
export const test = base.extend({
  myFixture: async ({}, use) => {
    const data: any = { foo: 'bar' }; // ❌ No type safety
    await use(data);
  },
});
```

**Why this is wrong**: Loses TypeScript benefits, no autocomplete, runtime errors.

**How to fix**:

```typescript
// ✅ Good: Properly typed
type MyFixture = {
  foo: string;
  bar: number;
};

type MyFixtures = {
  myFixture: MyFixture;
};

export const test = base.extend<MyFixtures>({
  myFixture: async ({}, use) => {
    const data: MyFixture = { foo: 'bar', bar: 123 };
    await use(data);
  },
});
```

## Benefits and Best Practices

Benefits of custom fixtures:
- **Eliminate duplication**: Write setup/teardown logic once, reuse everywhere
- **Composability**: Combine multiple fixtures for complex scenarios
- **Dependency management**: Fixtures can depend on other fixtures
- **Automatic cleanup**: Teardown logic runs automatically after each test
- **Type safety**: TypeScript ensures correct fixture usage
- **Test isolation**: Each test gets fresh fixture instances
- **Worker optimization**: Share expensive setup across tests with worker-scoped fixtures
- **Readability**: Tests focus on behavior, not setup

When to use custom fixtures:
- ✅ Authentication/authorization logic used in multiple tests
- ✅ Database setup and teardown
- ✅ API client configuration
- ✅ Test data creation and cleanup
- ✅ Page object initialization
- ✅ Mock server setup
- ✅ Browser context customization
- ✅ Shared configuration or state

Best practices:
- Create focused fixtures that do one thing well
- Use worker-scoped fixtures for expensive operations
- Compose fixtures by depending on other fixtures
- Use automatic fixtures sparingly (only for truly global setup)
- Parameterize fixtures when you need variations
- Provide TypeScript types for all fixtures
- Document fixture dependencies and cleanup behavior
- Keep fixtures in separate files and merge them

Reference: [Playwright Custom Fixtures](https://playwright.dev/docs/test-fixtures)

---

### 6.7. Use test.describe for Logical Test Grouping

**Tags:** organization, fixtures, describe, maintainability  
**Impact:** MEDIUM (Improves test organization and makes test reports more readable)

**Impact: MEDIUM (improves test organization and makes test reports more readable)**

Use `test.describe` to group related tests together. This improves test organization, makes reports easier to read, and allows you to share hooks and configuration across related tests. Well-organized tests are easier to maintain and debug.

**Incorrect (flat test structure):**

```typescript
import { test, expect } from '@playwright/test';

test('login with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});

test('login with invalid password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="username"]', 'user@example.com');
  await page.fill('[name="password"]', 'wrongpassword');
  await page.click('button[type="submit"]');
  await expect(page.locator('.error')).toBeVisible();
});

test('logout redirects to home', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('[data-testid="logout"]');
  await expect(page).toHaveURL('/');
});

test('profile update succeeds', async ({ page }) => {
  await page.goto('/profile');
  await page.fill('[name="name"]', 'New Name');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success')).toBeVisible();
});
```

**Correct (grouped with test.describe):**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      // Shared setup for all login tests
      await page.goto('/login');
    });

    test('succeeds with valid credentials', async ({ page }) => {
      await page.fill('[name="username"]', 'user@example.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('fails with invalid password', async ({ page }) => {
      await page.fill('[name="username"]', 'user@example.com');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('.error')).toBeVisible();
    });

    test('shows validation for empty fields', async ({ page }) => {
      await page.click('button[type="submit"]');
      await expect(page.locator('.validation-error')).toHaveCount(2);
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Authenticate before each logout test
      await page.goto('/login');
      await page.fill('[name="username"]', 'user@example.com');
      await page.fill('[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    });

    test('redirects to home page', async ({ page }) => {
      await page.click('[data-testid="logout"]');
      await expect(page).toHaveURL('/');
    });

    test('clears session data', async ({ page, context }) => {
      await page.click('[data-testid="logout"]');
      const cookies = await context.cookies();
      expect(cookies.find(c => c.name === 'sessionId')).toBeUndefined();
    });
  });
});

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate and navigate to profile for all profile tests
    await page.goto('/login');
    await page.fill('[name="username"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.goto('/profile');
  });

  test('updates name successfully', async ({ page }) => {
    await page.fill('[name="name"]', 'New Name');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success')).toBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await page.fill('[name="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toContainText('valid email');
  });
});

// You can also configure describe blocks
test.describe('Mobile view', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('shows mobile navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.mobile-menu')).toBeVisible();
  });
});
```

Benefits of using `test.describe`:
- **Logical grouping**: Related tests are visually grouped in code and test reports
- **Shared setup**: Use `beforeEach`/`afterEach` hooks for common setup/teardown
- **Better reports**: Test results show hierarchical structure making failures easier to locate
- **Configuration**: Apply specific configuration (timeout, retries, fixtures) to groups
- **Selective execution**: Run specific groups with `test.describe.only()` or skip with `test.describe.skip()`

Naming conventions:
- Use descriptive names that represent the feature or functionality being tested
- Group by feature, component, or user flow
- Nest describe blocks for sub-features or scenarios
- Keep test names concise since the describe context provides clarity

Reference: [Playwright Test Describe](https://playwright.dev/docs/api/class-test#test-describe)

---

## 7. Debugging & Maintenance

**Impact:** MEDIUM  
**Description:** Effective debugging practices and maintainable test code reduce the time spent investigating failures and updating tests.

### 7.1. Use test.step for Better Test Readability and Debugging

**Tags:** debugging, readability, test-steps, reporting  
**Impact:** MEDIUM (Improves test debugging time by 30-40% with clearer test reports)

**Impact: MEDIUM (improves test debugging time by 30-40% with clearer test reports)**

Using `test.step()` breaks down complex tests into logical, named sections that appear in test reports, traces, and error messages. This makes it dramatically easier to understand what a test does and pinpoint exactly where failures occur, especially in long or complex test scenarios.

**Incorrect (monolithic test without steps):**

```typescript
import { test, expect } from '@playwright/test';

test('complete user checkout flow', async ({ page }) => {
  // No clear structure - hard to know where failure occurred
  await page.goto('https://example.com');
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();
  await page.getByRole('button', { name: 'Add to Cart' }).nth(1).click();
  await page.getByTestId('cart-icon').click();
  await expect(page.getByTestId('cart-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.fill('[name="address"]', '123 Main St');
  await page.fill('[name="city"]', 'New York');
  await page.fill('[name="zipCode"]', '10001');
  await page.getByRole('button', { name: 'Continue to Payment' }).click();
  await page.fill('[name="cardNumber"]', '4242424242424242');
  await page.fill('[name="expiry"]', '12/25');
  await page.fill('[name="cvc"]', '123');
  await page.getByRole('button', { name: 'Place Order' }).click();
  await expect(page.locator('.success-message')).toContainText('Order confirmed');
  
  // When this test fails, the error just says "expected to contain text"
  // without context about which part of the checkout flow failed
});
```

**Correct (organized with test.step):**

```typescript
import { test, expect } from '@playwright/test';

test('complete user checkout flow', async ({ page }) => {
  await test.step('Navigate to products page', async () => {
    await page.goto('https://example.com');
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page).toHaveURL(/.*products/);
  });

  await test.step('Add multiple items to cart', async () => {
    await page.getByRole('button', { name: 'Add to Cart' }).first().click();
    await page.getByRole('button', { name: 'Add to Cart' }).nth(1).click();
    await expect(page.getByText('Added to cart')).toHaveCount(2);
  });

  await test.step('Verify cart contents', async () => {
    await page.getByTestId('cart-icon').click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');
    await expect(page.getByTestId('cart-items')).toHaveCount(2);
  });

  await test.step('Fill shipping information', async () => {
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.fill('[name="firstName"]', 'John');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'john@example.com');
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="city"]', 'New York');
    await page.fill('[name="zipCode"]', '10001');
  });

  await test.step('Fill payment information', async () => {
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.fill('[name="expiry"]', '12/25');
    await page.fill('[name="cvc"]', '123');
  });

  await test.step('Complete order and verify confirmation', async () => {
    await page.getByRole('button', { name: 'Place Order' }).click();
    await expect(page.locator('.success-message')).toContainText('Order confirmed');
    await expect(page.locator('.order-number')).toBeVisible();
  });
  
  // Now when test fails, you see exactly which step failed:
  // "Fill payment information" or "Complete order and verify confirmation"
});
```

**Using test.step with return values:**

```typescript
test('data-driven test with steps', async ({ page }) => {
  const userId = await test.step('Create new user', async () => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'New User' }).click();
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    // ✅ Steps can return values for use in later steps
    const userIdElement = await page.locator('[data-testid="user-id"]').textContent();
    return userIdElement?.trim() || '';
  });

  await test.step(`Verify user ${userId} appears in list`, async () => {
    await page.goto('/admin/users');
    await expect(page.getByTestId(`user-${userId}`)).toBeVisible();
  });

  await test.step('Update user permissions', async () => {
    await page.getByTestId(`user-${userId}`).click();
    await page.getByRole('checkbox', { name: 'Admin' }).check();
    await page.getByRole('button', { name: 'Save' }).click();
  });
});
```

**Nested steps for complex scenarios:**

```typescript
test('complex multi-stage process', async ({ page }) => {
  await test.step('Setup test environment', async () => {
    await test.step('Login as admin', async () => {
      await page.goto('/login');
      await page.fill('[name="username"]', 'admin@example.com');
      await page.fill('[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
    });

    await test.step('Configure test data', async () => {
      await page.goto('/admin/settings');
      await page.getByRole('switch', { name: 'Test Mode' }).check();
    });
  });

  await test.step('Execute main test flow', async () => {
    // Main test logic with clear step hierarchy
    await page.goto('/dashboard');
    await expect(page.getByText('Test Mode Active')).toBeVisible();
  });
});
```

**Steps in Page Object Models:**

```typescript
// pages/checkout.page.ts
import { Page, test } from '@playwright/test';

export class CheckoutPage {
  constructor(private page: Page) {}

  async fillShippingInfo(data: ShippingInfo) {
    await test.step('Fill shipping information', async () => {
      await this.page.fill('[name="firstName"]', data.firstName);
      await this.page.fill('[name="lastName"]', data.lastName);
      await this.page.fill('[name="address"]', data.address);
      await this.page.fill('[name="city"]', data.city);
      await this.page.fill('[name="zipCode"]', data.zipCode);
    });
  }

  async fillPaymentInfo(data: PaymentInfo) {
    await test.step('Fill payment information', async () => {
      await this.page.fill('[name="cardNumber"]', data.cardNumber);
      await this.page.fill('[name="expiry"]', data.expiry);
      await this.page.fill('[name="cvc"]', data.cvc);
    });
  }

  async completeOrder() {
    return await test.step('Complete order', async () => {
      await this.page.getByRole('button', { name: 'Place Order' }).click();
      const orderNumber = await this.page.locator('.order-number').textContent();
      return orderNumber?.trim() || '';
    });
  }
}

// tests/checkout.spec.ts
test('checkout with page objects', async ({ page }) => {
  const checkoutPage = new CheckoutPage(page);
  
  // Steps from page objects appear in test report
  await checkoutPage.fillShippingInfo(shippingData);
  await checkoutPage.fillPaymentInfo(paymentData);
  const orderNumber = await checkoutPage.completeOrder();
  
  console.log(`Order ${orderNumber} completed`);
});
```

Benefits of using test.step:
- **Clear test structure**: Tests are self-documenting with descriptive step names
- **Better error messages**: Failures show which step failed, not just which assertion
- **Improved traces**: Trace viewer shows step hierarchy and timing
- **Easier debugging**: Quickly identify which part of a complex test failed
- **Better reporting**: HTML reports group actions by step
- **Enhanced logging**: Step names appear in test output and logs
- **Maintainability**: Complex tests become easier to understand and modify

Best practices:
- Use descriptive step names that explain user intent
- Keep steps focused on a single logical action or verification
- Use steps for multi-step workflows, not for single actions
- Nest steps when appropriate for complex hierarchies
- Return values from steps when needed for subsequent operations
- Include steps in Page Object methods for better tracing

When to use test.step:
- ✅ Multi-step user workflows (login, checkout, form submission)
- ✅ Complex test scenarios with multiple stages
- ✅ Tests that perform setup, execution, and verification phases
- ✅ Data-driven tests with distinct phases
- ✅ Integration tests with multiple system interactions

When it's unnecessary:
- ❌ Single-action tests (one click, one assertion)
- ❌ Very simple tests with 2-3 actions
- ❌ Unit-level tests of individual components

Reference: [Playwright Test Steps](https://playwright.dev/docs/api/class-test#test-step)

---

## 8. Advanced Patterns

**Impact:** LOW  
**Description:** Advanced patterns for specific use cases such as visual testing, API interception, custom matchers, and performance testing.

### 8.1. Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel

**Tags:** opentelemetry, otel, reporter, traces, metrics, jaeger, grafana, prometheus, observability, ci  
**Impact:** MEDIUM (transforms raw test results into queryable time-series metrics and distributed traces for CI observability)

**Impact: MEDIUM (transforms raw test results into queryable time-series metrics and distributed traces for CI observability)**

Playwright's built-in reporter surfaces results as HTML or JSON snapshots. The `@playwright-labs/reporter-otel` package sends every test run as OpenTelemetry traces and metrics to any OTLP-compatible backend — Jaeger, Grafana Tempo, Prometheus, Datadog, Grafana Cloud. Every test becomes a span with step-level children, and built-in metrics track pass rate, duration p95, retries, and process memory without any extra code.

## When to Use

- **Use reporter-otel when**: You want long-term test health trends, flakiness dashboards, or Playwright traces in the same system as your service traces
- **Add fixture-otel when**: Individual tests need custom business counters, latency histograms, or need to propagate a `traceparent` into the system under test
- **Required for**: Teams running CI at scale who need to answer "which tests are getting slower?" or "what's our pass rate over the last 7 days?"

## Guidelines

### Do

- Add `resourceAttributes` with deployment environment and service version — makes dashboards filterable by branch or release
- Pass CI environment variables via `env` option so they appear as span attributes
- Use the `prefix` option to namespace your metrics when sharing a collector with other services
- Set up the full stack (OTel Collector → Jaeger + Prometheus + Grafana) for local development using the provided Docker Compose example
- Query pass rate and duration p95 in Grafana/Prometheus to detect degradation before it becomes a crisis

### Don't

- Don't point Playwright directly at Jaeger or Prometheus — always go through an OTel Collector; it handles buffering, retries, and fan-out
- Don't set `exportIntervalMillis` too low (< 10s) in large parallel runs — it creates unnecessary load on the collector
- Don't skip `satisfies OtelReporterOptions` on the config object — TypeScript type checking prevents misconfigured endpoints from silently dropping data
- Don't use HTTPS without valid certificates unless you set the appropriate Node TLS env vars

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-otel`
- **Default endpoint**: `localhost:4318` (OTLP/HTTP) — standard OTel Collector port
- **Backends tested**: Jaeger, Grafana Tempo, Grafana Cloud, Prometheus (via Collector), Datadog OTLP intake
- **Config key options**: `host`, `port`, `protocol`, `headers`, `auth`, `prefix`, `resourceAttributes`, `env`, `exportIntervalMillis`

## Edge Cases and Constraints

### Limitations

- The reporter creates the test span at `onTestEnd` (not `onTestBegin`) — this is intentional so that annotations pushed during the test are available before the span is created. All timing is preserved via explicit `startTime`.
- `fixture-otel` metrics are sent over a stdout bridge (`__pw_otel__` prefix) — they arrive in the reporter's `onStdOut` hook, not through a direct SDK call. This works across worker boundaries but requires the reporter to be active.
- Without the reporter running, `startWorkerSdk()` in `fixture-otel` exits silently — safe for local runs without a collector

### Edge Cases

1. **Grafana Cloud auth**: Use `auth.username` = instance ID, `auth.password` = API key. Protocol must be `https` and port `443`.
2. **Missing spans in Jaeger**: If spans appear in Prometheus metrics but not Jaeger, the collector is routing traces and metrics to different exporters — check collector pipeline config.
3. **High-cardinality attributes**: Adding unique IDs (user IDs, order IDs) to `resourceAttributes` can exhaust Prometheus label space. Use span attributes via `pw_otel.*` annotations for per-test data instead.

### What Breaks If Ignored

- **Without reporter**: Test results exist only as ephemeral JSON — no trend analysis, no flakiness detection by historical rate
- **Without resourceAttributes**: All spans from all branches land in the same unlabeled bucket — impossible to compare staging vs. main
- **Without OTel Collector**: Pointing directly at Jaeger's OTLP endpoint works but loses the ability to fan-out to Prometheus simultaneously

**Incorrect (no observability, raw JSON only):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["json", { outputFile: "results.json" }], // ❌ ephemeral, not queryable over time
  ],
});
```

**Correct (reporter-otel with full CI enrichment):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type OtelReporterOptions } from "@playwright-labs/reporter-otel";

export default defineConfig({
  reporter: [
    ["list"],  // keep console output
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
        prefix: "e2e_",
        // ✅ Enriches every metric with deployment context
        resourceAttributes: {
          "deployment.environment": process.env.ENVIRONMENT ?? "local",
          "service.version": process.env.APP_VERSION ?? "0.0.0",
          "service.name": "playwright-e2e",
        },
        // ✅ CI variables become span attributes — queryable in Jaeger
        env: {
          CI: process.env.CI,
          BUILD_ID: process.env.BUILD_ID,
          GIT_BRANCH: process.env.GIT_BRANCH,
          GIT_COMMIT: process.env.GIT_COMMIT,
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```typescript
// Grafana Cloud configuration
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otlp-gateway-prod-eu-west-0.grafana.net",
        port: 443,
        protocol: "https",
        auth: {
          username: process.env.GRAFANA_INSTANCE_ID!,  // numeric instance ID
          password: process.env.GRAFANA_API_KEY!,       // Grafana API key
        },
        prefix: "pw_",
        resourceAttributes: {
          "deployment.environment": process.env.ENVIRONMENT ?? "local",
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```typescript
// Remote collector with auth headers (Datadog, Honeycomb, etc.)
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      {
        host: "otel-collector.internal",
        port: 4318,
        protocol: "https",
        headers: {
          "X-Scope-OrgID": "team-frontend",
          "DD-API-KEY": process.env.DD_API_KEY!,
        },
      } satisfies OtelReporterOptions,
    ],
  ],
});
```

```promql
# Useful PromQL queries once data is in Prometheus / Grafana

# Overall pass rate (%)
100 * sum(e2e_tests_total{test_result="pass"}) / sum(e2e_tests_total)

# Pass rate by test suite (identify which suites are flaky)
100 * sum by (test_suite) (e2e_tests_total{test_result="pass"})
  / sum by (test_suite) (e2e_tests_total)

# 95th percentile test duration
histogram_quantile(0.95,
  sum by (le) (rate(e2e_test_duration_milliseconds_bucket[1h]))
)

# Average test duration in seconds (by project)
sum by (test_project) (e2e_test_duration_milliseconds_sum)
  / sum by (test_project) (e2e_test_duration_milliseconds_count)
  / 1000

# Total retries (flakiness signal)
sum(e2e_test_retries_total)

# Tests by browser
sum by (browser_name) (e2e_tests_total)

# Heap memory during test run (MB)
e2e_process_memory_heap_used_bytes / 1024 / 1024
```

```yaml
# docker-compose.yml — local OTel stack for development
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4318:4318"   # OTLP/HTTP
      - "8889:8889"   # Prometheus metrics endpoint
    volumes:
      - ./otel-collector.yaml:/etc/otel-collector.yaml
    command: ["--config=/etc/otel-collector.yaml"]

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686" # Jaeger UI
      - "4317:4317"   # OTLP/gRPC

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

```typescript
// Adding custom span attributes via annotations (no fixture-otel needed)
import { test } from "@playwright/test";
import { annotationLabel } from "@playwright-labs/reporter-otel";

test("checkout flow", async ({ page }) => {
  // ✅ These annotations become span attributes in Jaeger/Tempo
  test.info().annotations.push(
    { type: annotationLabel("feature"), description: "checkout" },
    { type: annotationLabel("team"),    description: "payments" },
    { type: annotationLabel("sprint"),  description: "2026-Q2-W3" },
  );

  await page.goto("/checkout");
  // span attributes: { feature: 'checkout', team: 'payments', sprint: '2026-Q2-W3' }
});
```

Reference: [@playwright-labs/reporter-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-otel)

---

### 8.2. Organize Tests with OOP Decorator Pattern for Large Scalable Test Suites

**Tags:** decorators, OOP, class-based, describe, test, beforeAll, afterAll, scalability, large-teams, e2e  
**Impact:** MEDIUM (reduces boilerplate by 40-60% and enables class-based test organization for large teams)

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

---

### 8.3. Send Test Results to Slack with Rich Block Kit Messages via reporter-slack

**Tags:** slack, reporter, notifications, block-kit, ci, on-failure, webhooks, bot-token  
**Impact:** LOW (keeps teams informed of CI failures in their existing communication channel without checking dashboards)

**Impact: LOW (keeps teams informed of CI failures in their existing communication channel without checking dashboards)**

Checking a CI dashboard for test results requires context-switching. The `@playwright-labs/reporter-slack` package sends Playwright results directly to a Slack channel as interactive [Block Kit](https://api.slack.com/block-kit) messages — with pass/fail counts, failed test list, duration, and a "View Report" button. Use the built-in `BaseTemplate`, compose blocks via builder functions, or write a full JSX template with the `@playwright-labs/slack-buildkit/react` runtime.

## When to Use

- **Use `send: "on-failure"`** (default): Notify the team only when the run has failures — avoids noise on green runs
- **Use `send: "always"`**: Daily scheduled runs where the team wants a success summary too
- **Use Incoming Webhook** when: The target channel is fixed and you don't need dynamic routing — simplest setup
- **Use Bot token** when: You need to post to different channels per project, reply in threads, or set a custom bot name
- **Use custom template** when: `BaseTemplate` doesn't match your team's format — add project links, environment badges, or assignee mentions

## Guidelines

### Do

- Store `SLACK_WEBHOOK_URL` / `SLACK_BOT_TOKEN` in CI secrets, never hardcode them
- Use `satisfies ReporterOptions` on the config object to catch misconfigured options at compile time
- Set `send: "on-failure"` on CI and `send: "never"` locally to avoid spamming the channel during development
- Add `reportUrl` to `BaseTemplate` so recipients can jump directly to the HTML report
- Use `@playwright-labs/slack-buildkit/react` JSX templates for complex layouts — the custom JSX runtime compiles to Block Kit JSON, not HTML

### Don't

- Don't put the Webhook URL or Bot token as a plain string in `playwright.config.ts` — use `process.env`
- Don't use `send: "always"` on per-PR CI runs — only on scheduled / main-branch runs
- Don't import `react` in config unless you add `@playwright-labs/slack-buildkit/react` as the `jsxImportSource` — the JSX runtime is not React DOM
- Don't exceed Slack's 50-block limit per message with very large test suites — filter or paginate the failed tests list

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-slack @playwright-labs/slack-buildkit`
- **JSX templates (optional)**: `npm install react` + `/** @jsxImportSource @playwright-labs/slack-buildkit/react */`
- **Transport**: `webhookUrl` (Incoming Webhook) or `token` + `channel` (Web API, requires `chat:write` scope)
- **Built-in template**: `import { BaseTemplate } from "@playwright-labs/reporter-slack/templates"`
- **Block builders**: `header()`, `section()`, `divider()`, `actions()`, `button()`, `context()` from `@playwright-labs/slack-buildkit`
- **`send` option**: `"always"` | `"on-failure"` (default) | `"never"`

## Edge Cases and Constraints

### Limitations

- Slack Incoming Webhooks are tied to one channel — use Bot token + `channel` option for dynamic routing
- Block Kit messages have a 50-block limit — `BaseTemplate` caps the failed tests list at 10 to stay within bounds
- `@playwright-labs/slack-buildkit/react` is a custom JSX runtime that outputs Block Kit JSON, not HTML — do not mix with `react-dom`

### Edge Cases

1. **Multiple Playwright projects**: Run the reporter once with a single `blocks` function that combines results from all projects, or add one reporter entry per project with different channel IDs.
2. **Monorepo / matrix CI**: Pass a unique `reportUrl` per job so each notification links to the correct artifact.
3. **Rate limiting**: Slack's Incoming Webhook rate limit is 1 message/second. For very long test runs with `send: "always"`, the single end-of-run message is well within limits.

### What Breaks If Ignored

- **Without reporter-slack**: Teams discover failures only when they manually check CI — delayed response to broken main
- **Without `reportUrl`**: Recipients have no direct link to the HTML report and must navigate CI manually
- **Without `send: "on-failure"`**: Every green run generates a Slack notification — channel becomes noisy and notifications are ignored

**Incorrect (no Slack notification, hardcoded secrets):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["html"]],
  // ❌ Team never learns about failures until someone checks CI
});
```

**Correct (BaseTemplate with Incoming Webhook):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { BaseTemplate } from "@playwright-labs/reporter-slack/templates";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-slack",
      {
        // ✅ Secrets from environment — never hardcoded
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        // ✅ Only notify on failures — no noise on green runs
        send: "on-failure",
        blocks: (result, testCases) =>
          BaseTemplate(result, testCases, {
            projectName: "My App — E2E",
            // ✅ Link to the HTML report artifact in CI
            reportUrl: process.env.CI_REPORT_URL,
          }),
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Custom template with builder functions:**

```typescript
import { defineConfig } from "@playwright/test";
import {
  header, section, divider, actions, button, context,
} from "@playwright-labs/slack-buildkit";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        send: "on-failure",
        blocks: (result, testCases) => {
          const passed  = testCases.filter(([, r]) => r.status === "passed").length;
          const failed  = testCases.filter(([, r]) => r.status === "failed").length;
          const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
          const emoji   = failed > 0 ? "🔴" : "✅";

          const blocks = [
            header(`${emoji} E2E — ${result.status.toUpperCase()}`),
            section(
              `*Passed:* ${passed}  •  *Failed:* ${failed}  •  *Skipped:* ${skipped}`,
            ),
            divider(),
          ];

          // ✅ List failed tests (capped to avoid hitting Slack's 50-block limit)
          if (failed > 0) {
            const failedTests = testCases
              .filter(([, r]) => r.status === "failed")
              .slice(0, 8);

            for (const [tc, r] of failedTests) {
              const err = r.errors[0]?.message?.split("\n")[0] ?? "unknown error";
              blocks.push(section(`• \`${tc.title}\`\n_${err}_`));
            }

            if (failed > 8) {
              blocks.push(section(`_…and ${failed - 8} more failures_`));
            }

            blocks.push(divider());
          }

          if (process.env.CI_REPORT_URL) {
            blocks.push(
              actions([
                button("view_report", "View Report", process.env.CI_REPORT_URL, "primary"),
              ]),
            );
          }

          blocks.push(context([
            `Branch: ${process.env.GIT_BRANCH ?? "local"}`,
            new Date().toUTCString(),
          ]));

          return blocks;
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

**JSX template (React-like syntax → Block Kit JSON):**

```tsx
// playwright.config.tsx (rename from .ts)
/** @jsxImportSource @playwright-labs/slack-buildkit/react */
import { defineConfig } from "@playwright/test";
import {
  Blocks, Header, Section, Divider, Actions, Button, Context,
} from "@playwright-labs/slack-buildkit/react";
import { type ReporterOptions } from "@playwright-labs/reporter-slack";

function TestReport({
  passed, failed, skipped, url, branch,
}: {
  passed: number; failed: number; skipped: number;
  url?: string; branch?: string;
}) {
  return (
    <Blocks>
      <Header>{failed > 0 ? "🔴 Tests Failed" : "✅ Tests Passed"}</Header>
      <Section>
        {`*Passed:* ${passed}   *Failed:* ${failed}   *Skipped:* ${skipped}`}
      </Section>
      {branch && <Section>{`Branch: \`${branch}\``}</Section>}
      <Divider />
      {url && (
        <Actions>
          <Button url={url} style="primary" action_id="view_report">
            View Report
          </Button>
        </Actions>
      )}
      <Context>{`${new Date().toUTCString()}`}</Context>
    </Blocks>
  );
}

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        webhookUrl: process.env.SLACK_WEBHOOK_URL!,
        send: "on-failure",
        blocks: (result, testCases) => {
          const passed  = testCases.filter(([, r]) => r.status === "passed").length;
          const failed  = testCases.filter(([, r]) => r.status === "failed").length;
          const skipped = testCases.filter(([, r]) => r.status === "skipped").length;
          // ✅ JSX is compiled to Block Kit JSON by @playwright-labs/slack-buildkit/react
          return (
            <TestReport
              passed={passed}
              failed={failed}
              skipped={skipped}
              url={process.env.CI_REPORT_URL}
              branch={process.env.GIT_BRANCH}
            />
          );
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Bot token (Web API) for dynamic channels:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-slack",
      {
        // ✅ Web API transport — allows dynamic channel selection
        token: process.env.SLACK_BOT_TOKEN!,
        // ✅ Channel ID (starts with C) or channel name
        channel: process.env.SLACK_CHANNEL_ID ?? "C12345678",
        send: "on-failure",
        blocks: (result, testCases) =>
          BaseTemplate(result, testCases, { projectName: "E2E Suite" }),
        onSend: (response) => {
          console.log("Slack notification sent:", response.ts); // thread timestamp
        },
      } satisfies ReporterOptions,
    ],
  ],
});
```

Reference: [@playwright-labs/reporter-slack](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-slack)

---

### 8.4. Send Test Run Reports via Email with React Email Templates via reporter-email

**Tags:** email, reporter, notifications, react-email, nodemailer, ci, on-failure, html-template  
**Impact:** LOW (delivers structured test reports to stakeholders who don't have CI access)

**Impact: LOW (delivers structured test reports to stakeholders who don't have CI access)**

CI dashboards are only accessible to engineers. Stakeholders, QA managers, and on-call teams often need test results delivered to their inbox. The `@playwright-labs/reporter-email` package sends Playwright results as formatted emails via any SMTP provider (Gmail, SendGrid, AWS SES, Mailgun, and 50+ others powered by nodemailer). Use the built-in React Email templates, write a custom HTML string, or author a full React component for pixel-perfect email design.

## When to Use

- **Use `send: "on-failure"`** (default): Notify only when the run breaks — avoids inbox noise on healthy runs
- **Use `send: "always"`**: Scheduled nightly runs where stakeholders want a daily summary regardless of result
- **Use built-in templates** when: You need a polished email out of the box — `PlaywrightReportEmail`, `PlaywrightReportTailwindEmail`, `PlaywrightReportShadcnEmail`
- **Use custom React template** when: You need to match brand colors, add logo, or include environment-specific information
- **Use local Maildev** when: Testing the reporter locally without sending real email

## Guidelines

### Do

- Store SMTP credentials in CI secrets and read from `process.env` — never hardcode passwords
- Use `satisfies ReporterOptions` on the config object for compile-time type checking
- Install `@react-email/components` and `@react-email/render` for email-client-compatible HTML — the renderer inlines CSS automatically for Gmail and Outlook compatibility
- Use a dynamic `subject` function that includes pass/fail status so recipients can triage from the subject line alone
- Set `send: "never"` in a local `.env` override to avoid sending emails during local development
- Test with [Maildev](https://github.com/maildev/maildev) locally (`docker run -p 1080:1080 -p 1025:1025 maildev/maildev`) before connecting a real SMTP service

### Don't

- Don't pass `html` and `text` simultaneously — they are mutually exclusive; `html` takes precedence
- Don't use `react-dom/server`'s `renderToString` directly for email — it does not inline CSS; use `@react-email/render` which handles it
- Don't name the config file `.tsx` unless `tsconfig.json` has `"jsx": "react-jsx"` — JSX in config only works when the compiler is configured for it
- Don't send large attachments (screenshots, traces) as inline email content — link to CI artifacts instead

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-email`
- **React Email (recommended)**: `npm install react react-dom @react-email/components @react-email/render`
- **Built-in templates**: `import { PlaywrightReportEmail, PlaywrightReportTailwindEmail, PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates"`
- **SMTP services**: Gmail, SendGrid, AWS SES, Mailgun, Outlook365, Postmark, Brevo, Maildev (local) — 50+ via nodemailer `service` option
- **`send` option**: `"always"` | `"on-failure"` (default) | `"never"`
- **Attachments**: `attachments: [{ path: "...", name: "..." }]` — standard nodemailer attachment format

## Edge Cases and Constraints

### Limitations

- React Email requires `@react-email/render` to inline CSS — without it the reporter falls back to `react-dom/server` which produces class-based CSS that breaks in Gmail
- Gmail with `service: "Gmail"` requires an App Password when 2FA is enabled — not the account password
- AWS SES requires the `from` address to be verified in SES before sending
- File attachments add to email size — Outlook and Gmail enforce ~25MB limits

### Edge Cases

1. **Image attachments as inline CID**: Reference the attachment in HTML as `<img src="cid:image.png">` and include the same `name` in the `attachments` array with a matching `contentType`.
2. **Rendering custom JSX in `.ts` config**: Use `React.createElement(MyComponent, props)` instead of JSX syntax — no `tsconfig.json` changes needed.
3. **Large test suites**: The built-in templates render every test row — for 500+ tests, consider filtering to only failed tests in your `html` function to keep email size manageable.

### What Breaks If Ignored

- **Without email reporter**: Stakeholders without CI access never learn about failures until an engineer escalates manually
- **Without `@react-email/render`**: Emails render correctly in a browser preview but break in Gmail (CSS stripped) and Outlook (CSS not supported)
- **Without dynamic subject**: Subject line reads "Playwright Test Report" on both pass and fail — recipients cannot triage without opening the email

**Incorrect (no email, or hardcoded credentials with plain HTML):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["html"]],
  // ❌ Stakeholders have no visibility without CI access
});
```

```typescript
// ❌ Hardcoded credentials + static subject + no template
[
  "@playwright-labs/reporter-email",
  {
    from: "bot@company.com",
    to: "team@company.com",
    subject: "Playwright Report",          // ❌ same subject always — impossible to triage
    html: "<p>Tests ran.</p>",             // ❌ no results, useless
    // ❌ SMTP password in plaintext in source code
    auth: { user: "bot@company.com", pass: "s3cr3t" },
  },
]
```

**Correct (built-in React Email template via Incoming credentials from env):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import React from "react";
import { type ReporterOptions } from "@playwright-labs/reporter-email";
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-email",
      {
        // ✅ Credentials from CI secrets
        service: "SendGrid",
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY!,
        },
        from: "ci@company.com",
        to: ["qa-team@company.com", "product@company.com"],
        // ✅ Dynamic subject makes triage possible from inbox
        subject: (result) =>
          `[E2E] ${result.status === "passed" ? "✅ Passed" : "❌ Failed"} — ${new Date().toLocaleDateString()}`,
        // ✅ Built-in template — polished, email-client compatible
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
        // ✅ Only send on failure — no inbox noise on green runs
        send: "on-failure",
      } satisfies ReporterOptions,
    ],
  ],
});
```

**Swap templates — three built-in styles:**

```typescript
// Default (inline styles — maximum compatibility)
import { PlaywrightReportEmail } from "@playwright-labs/reporter-email/templates";

// Tailwind CSS layout
import { PlaywrightReportTailwindEmail } from "@playwright-labs/reporter-email/templates";

// shadcn/ui-inspired design (status badge, card border)
import { PlaywrightReportShadcnEmail } from "@playwright-labs/reporter-email/templates";

// All accept identical props: { result, testCases }
html: (result, testCases) =>
  React.createElement(PlaywrightReportShadcnEmail, { result, testCases }),
```

**Custom React Email template:**

```tsx
// emails/report.tsx
import React from "react";
import {
  Html, Head, Body, Container, Heading, Text, Hr, Row, Column,
} from "@react-email/components";
import type { FullResult } from "@playwright/test/reporter";
import type { TestCases } from "@playwright-labs/reporter-email";

export function CompanyReport({
  result,
  testCases,
  env,
}: {
  result: FullResult;
  testCases: TestCases;
  env?: string;
}) {
  const failed  = testCases.filter(([, r]) => r.status === "failed");
  const passed  = testCases.filter(([, r]) => r.status === "passed");

  return (
    <Html lang="en">
      <Head />
      <Body style={{ fontFamily: "sans-serif", background: "#f4f4f4" }}>
        <Container style={{ background: "#fff", padding: "24px", borderRadius: "8px" }}>
          <Heading style={{ color: failed.length > 0 ? "#dc2626" : "#16a34a" }}>
            {failed.length > 0 ? "❌ Tests Failed" : "✅ All Tests Passed"}
          </Heading>
          {env && <Text style={{ color: "#6b7280" }}>Environment: {env}</Text>}
          <Hr />
          <Row>
            <Column><Text><strong>Passed:</strong> {passed.length}</Text></Column>
            <Column><Text><strong>Failed:</strong> {failed.length}</Text></Column>
          </Row>
          {failed.length > 0 && (
            <>
              <Hr />
              <Heading as="h3">Failed Tests</Heading>
              {failed.slice(0, 10).map(([tc, r], i) => (
                <Text key={i} style={{ color: "#dc2626" }}>
                  • {tc.title}
                  {r.errors[0]?.message && (
                    <span style={{ color: "#6b7280", fontSize: "12px" }}>
                      {" — "}{r.errors[0].message.split("\n")[0]}
                    </span>
                  )}
                </Text>
              ))}
            </>
          )}
          <Hr />
          <Text style={{ color: "#9ca3af", fontSize: "12px" }}>
            {new Date().toUTCString()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

```typescript
// playwright.config.ts — use custom template
import React from "react";
import { CompanyReport } from "./emails/report";

html: (result, testCases) =>
  React.createElement(CompanyReport, {
    result,
    testCases,
    env: process.env.ENVIRONMENT ?? "staging",
  }),
```

**Local development with Maildev:**

```bash
# Start Maildev — local SMTP + web UI (no real emails sent)
docker run -p 1080:1080 -p 1025:1025 maildev/maildev
```

```typescript
// playwright.config.ts — local testing config
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        service: "Maildev",
        port: 1025,
        from: "ci@local.dev",
        to: "team@local.dev",
        subject: (r) => `[LOCAL] ${r.status}`,
        send: "always",
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
// Open http://localhost:1080 to view the rendered email
```

**AWS SES with attachments:**

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-email",
      {
        service: "SES-EU-WEST-1",
        auth: {
          user: process.env.AWS_SES_ACCESS_KEY!,
          pass: process.env.AWS_SES_SECRET_KEY!,
        },
        from: "noreply@company.com",   // must be SES-verified
        to: "team@company.com",
        subject: (r) =>
          `[E2E] ${r.status === "passed" ? "✅" : "❌"} ${process.env.ENVIRONMENT}`,
        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
        send: "on-failure",
        // ✅ Attach the Playwright HTML report
        attachments: [
          {
            path: "playwright-report/index.html",
            name: "playwright-report.html",
          },
        ],
      } satisfies ReporterOptions,
    ],
  ],
});
```

Reference: [@playwright-labs/reporter-email](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-email)

---

### 8.5. Use API Mocking for Reliable and Fast Tests

**Tags:** api, mocking, performance, reliability, advanced  
**Impact:** LOW (Improves test reliability and reduces execution time by 40-60% for API-dependent tests)

**Impact: LOW (improves test reliability and reduces execution time by 40-60% for API-dependent tests)**

API mocking allows you to intercept and mock network requests, making tests faster, more reliable, and independent of external services. This is especially valuable for testing error scenarios, edge cases, and reducing flakiness caused by network issues or third-party API dependencies.

## When to Use

- **Use API mocking when**: Testing UI error handling, loading states, edge cases, or when depending on third-party/paid/rate-limited APIs
- **Essential for**: Unit/component-level UI tests, testing error scenarios, offline development, CI/CD fast feedback loops
- **Consider real APIs when**: Running integration tests, E2E smoke tests, verifying actual API contracts, performance testing with realistic data
- **Required for**: Projects with external dependencies, third-party APIs, or when testing error handling is critical

## Guidelines

### Do

- Mock APIs for fast unit/component tests, use real APIs for critical integration tests
- Keep mock data realistic and synchronized with actual API responses
- Test both success and failure scenarios (4xx, 5xx errors, timeouts, network failures)
- Use fixtures for reusable mock patterns shared across multiple tests
- Document which endpoints are mocked in each test
- Version mock responses when API versions change
- Use `route.continue()` to let certain requests through while mocking others

### Don't

- Don't mock everything - some tests should verify real API integration
- Don't use stale mock data that doesn't match current API schema
- Don't forget to test error scenarios (500 errors, timeouts, malformed responses)
- Don't create overly complex mocks - keep them simple and maintainable
- Don't mock internal application APIs in E2E tests - only external dependencies
- Don't forget to remove mocks after tests (`page.unroute()` if needed)

### Tool Usage Patterns

- **Primary tools**: `page.route(pattern, handler)`, `route.fulfill()`, `route.continue()`, `route.abort()`, `route.fetch()`
- **Configuration**: Set `baseURL` in playwright.config.ts to simplify route patterns
- **Mock patterns**:
  - `route.fulfill({ status, body })` - Return mock response
  - `route.continue()` - Let request proceed to real server
  - `route.abort('failed')` - Simulate network failure
  - `route.fetch()` - Fetch real response, then modify it
- **Helper utilities**: Create fixture-based mocks for reusability, use helper functions to generate mock data

## Edge Cases and Constraints

### Limitations

- Mocks don't verify actual API behavior - real API might change without tests failing
- Mocked responses may drift from real API schema over time
- Complex authentication flows (OAuth, tokens) can be difficult to mock accurately
- WebSocket and Server-Sent Events (SSE) mocking is more complex than HTTP
- Service workers can interfere with route mocking if not properly handled
- CORS and authentication headers must be mocked correctly or requests may fail

### Edge Cases

1. **Concurrent requests to same endpoint**: Multiple parallel requests may need different responses. Solution: Track request count or use request body/headers to differentiate.

2. **Mock timing with parallel navigation**: If page navigates before mock is set up, requests go through unmocked. Solution: Set up mocks before `page.goto()` or use `page.route()` with `{ times: 1 }`.

3. **Mock cleanup between tests**: Mocks from one test may affect subsequent tests. Solution: Mocks are automatically cleared when page context is destroyed, or explicitly use `page.unroute()`.

4. **Wildcard route patterns conflicting**: Multiple `page.route()` patterns may match same request. Solution: Playwright uses last-registered route first, be careful with wildcard patterns.

5. **GraphQL endpoint mocking**: Single endpoint with different operations. Solution: Parse request body to determine operation and return appropriate mock.

6. **File upload mocking**: Multipart form data requires special handling. Solution: Use `route.fetch()` to get real request, modify, and fulfill.

### What Breaks If Ignored

- **Without mocking external dependencies**: Tests become flaky (network issues), slow (real API latency), expensive (API costs), and fail when external services are down
- **Without testing error scenarios**: Production bugs when APIs fail, poor user experience during errors
- **Without mock maintenance**: Tests pass with stale mocks while real API has breaking changes
- **Over-mocking everything**: Miss integration bugs between frontend and backend, false confidence

**Incorrect (relying on real API calls):**

```typescript
import { test, expect } from '@playwright/test';

test('bad - depends on real API', async ({ page }) => {
  // ❌ Test depends on external API availability
  await page.goto('https://example.com/products');
  
  // ❌ Slow - waits for real network requests
  // ❌ Flaky - fails if API is down or slow
  // ❌ Can't test error scenarios easily
  await expect(page.locator('.product')).toHaveCount(10);
  
  // ❌ Hard to test specific data scenarios
  await page.getByRole('button', { name: 'Load More' }).click();
  await expect(page.locator('.product')).toHaveCount(20);
});

test('bad - cannot test error states', async ({ page }) => {
  // ❌ How do you test API error handling?
  // You can't easily force the real API to return errors
  await page.goto('https://example.com/products');
  // Can't verify error handling behavior
});

test('bad - slow test due to API delays', async ({ page }) => {
  // ❌ Test is slow due to real API latency
  await page.goto('https://example.com/dashboard');
  
  // Waiting for multiple real API calls
  await page.waitForLoadState('networkidle'); // Could take seconds
  
  await expect(page.locator('.data-loaded')).toBeVisible();
});
```

**Correct (using API mocking):**

```typescript
import { test, expect } from '@playwright/test';

test('good - mock successful API response', async ({ page }) => {
  // ✅ Mock API response with controlled data
  await page.route('**/api/products', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        products: [
          { id: 1, name: 'Product 1', price: 19.99 },
          { id: 2, name: 'Product 2', price: 29.99 },
        ]
      })
    });
  });

  await page.goto('https://example.com/products');
  
  // ✅ Fast - no real network delay
  // ✅ Reliable - always returns same data
  await expect(page.locator('.product')).toHaveCount(2);
  await expect(page.locator('.product').first()).toContainText('Product 1');
});

test('good - test error scenarios', async ({ page }) => {
  // ✅ Easily test error handling
  await page.route('**/api/products', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });

  await page.goto('https://example.com/products');
  
  // ✅ Verify error state is displayed correctly
  await expect(page.locator('.error-message')).toContainText('Failed to load products');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('good - test loading states', async ({ page }) => {
  // ✅ Control timing to test loading states
  await page.route('**/api/products', async route => {
    // Simulate slow API
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ products: [] })
    });
  });

  await page.goto('https://example.com/products');
  
  // ✅ Verify loading spinner appears
  await expect(page.locator('.loading-spinner')).toBeVisible();
  
  // Wait for mock to complete
  await expect(page.locator('.loading-spinner')).not.toBeVisible();
});
```

**Advanced mocking patterns:**

```typescript
test('mock with dynamic responses', async ({ page }) => {
  let requestCount = 0;
  
  // ✅ Track and vary responses based on request
  await page.route('**/api/products*', async route => {
    requestCount++;
    const url = new URL(route.request().url());
    const page = url.searchParams.get('page') || '1';
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        products: generateMockProducts(parseInt(page)),
        page: parseInt(page),
        hasMore: parseInt(page) < 3
      })
    });
  });

  await page.goto('https://example.com/products');
  await expect(page.locator('.product')).toHaveCount(10);
  
  await page.getByRole('button', { name: 'Next Page' }).click();
  await expect(page.locator('.product')).toHaveCount(20);
  
  expect(requestCount).toBe(2);
});

test('mock multiple endpoints', async ({ page }) => {
  // ✅ Mock all required endpoints
  await page.route('**/api/user', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ id: 1, name: 'John Doe', role: 'admin' })
    });
  });

  await page.route('**/api/notifications', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ count: 5, unread: 3 })
    });
  });

  await page.route('**/api/settings', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ theme: 'dark', language: 'en' })
    });
  });

  await page.goto('https://example.com/dashboard');
  await expect(page.locator('.username')).toHaveText('John Doe');
  await expect(page.locator('.notification-badge')).toHaveText('3');
});

test('conditional mocking - only mock specific scenarios', async ({ page }) => {
  // ✅ Mock only certain requests, let others through
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    
    if (url.includes('/api/products')) {
      // Mock products endpoint
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ products: [] })
      });
    } else {
      // Let other API calls through
      await route.continue();
    }
  });

  await page.goto('https://example.com');
});
```

**Using fixtures for reusable mocks:**

```typescript
// fixtures/api-mocks.fixture.ts
import { test as base } from '@playwright/test';

type MockFixtures = {
  mockProducts: void;
  mockUserAuth: void;
};

export const test = base.extend<MockFixtures>({
  mockProducts: async ({ page }, use) => {
    await page.route('**/api/products', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          products: [
            { id: 1, name: 'Test Product', price: 99.99 }
          ]
        })
      });
    });
    await use();
  },

  mockUserAuth: async ({ page }, use) => {
    await page.route('**/api/auth/user', async route => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          authenticated: true,
          user: { id: 1, email: 'test@example.com' }
        })
      });
    });
    await use();
  }
});

// tests/with-mocks.spec.ts
import { test, expect } from '../fixtures/api-mocks.fixture';

test('use product mocks', async ({ page, mockProducts }) => {
  await page.goto('/products');
  await expect(page.locator('.product')).toHaveCount(1);
});

test('use auth mocks', async ({ page, mockUserAuth }) => {
  await page.goto('/profile');
  await expect(page.locator('.email')).toHaveText('test@example.com');
});
```

**Inspecting and modifying real responses:**

```typescript
test('modify real API responses', async ({ page }) => {
  // ✅ Intercept and modify real responses
  await page.route('**/api/products', async route => {
    const response = await route.fetch();
    const data = await response.json();
    
    // Modify the real data
    data.products = data.products.map((p: any) => ({
      ...p,
      price: p.price * 0.5 // Apply 50% discount
    }));
    
    await route.fulfill({
      response,
      body: JSON.stringify(data)
    });
  });

  await page.goto('https://example.com/products');
  // Now all prices are halved
});

test('add artificial delays to real APIs', async ({ page }) => {
  // ✅ Test how UI handles slow responses
  await page.route('**/api/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.goto('https://example.com');
  await expect(page.locator('.loading')).toBeVisible();
});
```

**Testing network failures:**

```typescript
test('handle network timeouts', async ({ page }) => {
  // ✅ Simulate timeout
  await page.route('**/api/products', async route => {
    await route.abort('timedout');
  });

  await page.goto('https://example.com/products');
  await expect(page.locator('.error')).toContainText('Request timed out');
});

test('handle connection failures', async ({ page }) => {
  // ✅ Simulate network failure
  await page.route('**/api/products', async route => {
    await route.abort('failed');
  });

  await page.goto('https://example.com/products');
  await expect(page.locator('.offline-message')).toBeVisible();
});
```

## Common Mistakes

### Mistake 1: Setting up mocks after navigation

```typescript
// ❌ Bad: Mock is set up AFTER page loads
test('bad mock timing', async ({ page }) => {
  await page.goto('https://example.com/products'); // Requests already fired!
  
  await page.route('**/api/products', async route => {
    await route.fulfill({ body: '[]' }); // Too late - request already completed
  });
  
  // Test will use real API data, not mock
});
```

**Why this is wrong**: By the time the mock is registered, the page has already loaded and API requests have completed.

**How to fix**:

```typescript
// ✅ Good: Mock BEFORE navigation
test('correct mock timing', async ({ page }) => {
  // Set up mock first
  await page.route('**/api/products', async route => {
    await route.fulfill({ 
      status: 200,
      body: JSON.stringify({ products: [] })
    });
  });
  
  // Then navigate
  await page.goto('https://example.com/products');
  // Mock is active and intercepts requests
});
```

### Mistake 2: Not testing error scenarios

```typescript
// ❌ Bad: Only test success case
test('only happy path', async ({ page }) => {
  await page.route('**/api/products', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ products: [/* data */] })
    });
  });
  
  await page.goto('/products');
  // What happens if API returns 500? We never test that!
});
```

**Why this is wrong**: Production will experience API errors, but tests don't verify error handling works.

**How to fix**:

```typescript
// ✅ Good: Test both success and failure
test('success case', async ({ page }) => {
  await page.route('**/api/products', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify({ products: [] }) });
  });
  await page.goto('/products');
  await expect(page.locator('.product-list')).toBeVisible();
});

test('error case - 500', async ({ page }) => {
  await page.route('**/api/products', async route => {
    await route.fulfill({ 
      status: 500, 
      body: JSON.stringify({ error: 'Internal Server Error' })
    });
  });
  await page.goto('/products');
  await expect(page.locator('.error-message')).toContainText('Failed to load');
});

test('error case - timeout', async ({ page }) => {
  await page.route('**/api/products', async route => {
    await route.abort('timedout');
  });
  await page.goto('/products');
  await expect(page.locator('.error-message')).toContainText('Request timed out');
});
```

### Mistake 3: Using stale mock data

```typescript
// ❌ Bad: Mock data doesn't match current API
test('stale mock data', async ({ page }) => {
  await page.route('**/api/user', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 1,
        name: 'John Doe',
        // ❌ Real API now returns 'email', 'role', 'avatar'
        // but mock is outdated and missing these fields
      })
    });
  });
  
  await page.goto('/profile');
  // May fail or show incorrect UI because mock is incomplete
});
```

**Why this is wrong**: Mock data drifts from real API schema, tests pass but production breaks.

**How to fix**:

```typescript
// ✅ Good: Keep mock data synchronized with API schema
// api-mocks/user.mock.ts
export const mockUserResponse = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  avatar: 'https://example.com/avatar.jpg',
  createdAt: '2024-01-01T00:00:00Z'
  // Update this when API schema changes
};

// tests/profile.spec.ts
import { mockUserResponse } from '../api-mocks/user.mock';

test('current mock data', async ({ page }) => {
  await page.route('**/api/user', async route => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockUserResponse)
    });
  });
  
  await page.goto('/profile');
  await expect(page.locator('.email')).toHaveText(mockUserResponse.email);
});
```

### Mistake 4: Overly broad route patterns

```typescript
// ❌ Bad: Too broad, mocks everything
test('broad pattern', async ({ page }) => {
  await page.route('**/*', async route => {
    await route.fulfill({ status: 200, body: '{}' });
    // ❌ This mocks EVERYTHING including images, fonts, CSS, analytics
  });
  
  await page.goto('/products');
  // Nothing loads correctly - too much is mocked!
});
```

**Why this is wrong**: Mocking too broadly breaks unrelated functionality and makes tests unrealistic.

**How to fix**:

```typescript
// ✅ Good: Specific patterns for what you need
test('specific patterns', async ({ page }) => {
  // Only mock specific API endpoints
  await page.route('**/api/products', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify({ products: [] }) });
  });
  
  await page.route('**/api/user', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify({ id: 1, name: 'John' }) });
  });
  
  // Everything else (images, fonts, CSS) loads normally
  await page.goto('/products');
});

// Or use conditional logic
test('conditional mocking', async ({ page }) => {
  await page.route('**/*', async route => {
    const url = route.request().url();
    
    if (url.includes('/api/')) {
      // Mock only API calls
      await route.fulfill({ status: 200, body: '{}' });
    } else {
      // Let everything else through
      await route.continue();
    }
  });
});
```

## Benefits and Best Practices

Benefits of API mocking:
- **Speed**: Tests run 10-100x faster without real network calls
- **Reliability**: No flakiness from network issues or API downtime
- **Control**: Test specific scenarios including edge cases and errors
- **Isolation**: Tests don't depend on external services or test data
- **Repeatability**: Same results every time, no random failures
- **Cost**: Reduce API usage costs and rate limiting issues
- **Development**: Work offline or with incomplete backend services

When to use API mocking:
- ✅ Testing UI error handling and edge cases
- ✅ Testing loading states and transitions
- ✅ Fast feedback in CI/CD pipelines
- ✅ Third-party API dependencies
- ✅ Rate-limited or paid APIs
- ✅ Development against incomplete backends

When to use real APIs:
- ✅ Integration tests verifying actual API contracts
- ✅ End-to-end smoke tests in staging/production
- ✅ Performance testing with realistic data
- ✅ Testing actual authentication flows

Best practices:
- Use mocks for unit/component-level UI tests
- Use real APIs for integration and E2E tests (subset)
- Keep mock data realistic and up-to-date
- Version mock responses with API versions
- Use fixtures for reusable mock patterns
- Document what endpoints are mocked in tests

Reference: [Playwright Network Mocking](https://playwright.dev/docs/network)

---

### 8.6. Validate API Response JSON Schemas with toMatchSchema Custom Matcher

**Tags:** schema, validation, api-testing, json-schema, ajv-ts, toMatchSchema, fixtures  
**Impact:** MEDIUM (catches contract regressions instantly without writing per-field assertions)

**Impact: MEDIUM (catches contract regressions instantly without writing per-field assertions)**

Manually asserting every field of an API response is tedious and misses unexpected fields or type changes. The `@playwright-labs/fixture-ajv-ts` package provides a `schema` fixture (powered by [ajv-ts](https://npmjs.com/package/ajv-ts)) and a `toMatchSchema` custom matcher that validates any value against a JSON schema in one assertion. Schema definitions live outside tests, can be shared across suites, and produce structured error messages on failure.

## When to Use

- **Use toMatchSchema when**: Validating API response bodies, webhook payloads, form submissions, or any structured JSON
- **Define schemas separately when**: Multiple tests share the same endpoint contract — define once, import everywhere
- **Use inline schema (via `schema` fixture) when**: Schema is test-specific and small
- **Required for**: API contract testing, preventing silent response structure changes in CI

## Guidelines

### Do

- Define schemas in `schemas/` files colocated with the feature they describe
- Use `s.object()` with explicit required fields — do not rely on loose matching
- Use `s.string().format('email')`, `s.string().format('uri')` for semantic validation
- Use `.optional()` on nullable/optional fields rather than `s.union(s.string(), s.undefined())`
- Combine `toBeOK()` (HTTP status) with `toMatchSchema()` (body shape) for full coverage
- Add the fixture to your `mergeTests`/`mergeExpects` composite — see `fixture-merge-tests-expects` rule

### Don't

- Don't use `toMatchSchema` for non-JSON values like HTML strings or binary buffers
- Don't define schemas inline with `schema` fixture for schemas shared across test files
- Don't ignore the `Errors:` section in failed assertions — it pinpoints the exact failing field
- Don't use `s.any()` to silence schema errors — fix the schema or the API

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-ajv-ts ajv-ts`
- **Fixture**: `schema` — alias for `s` (ajv-ts schema builder) usable inside tests
- **Matcher**: `expect(value).toMatchSchema(schema, options?)` — works on any value, not just locators
- **Schema builders**: `s.object()`, `s.array()`, `s.string()`, `s.number()`, `s.boolean()`, `s.enum()`, `.optional()`, `.nullable()`, `.format()`

## Edge Cases and Constraints

### Limitations

- `toMatchSchema` uses strict mode by default — extra fields not defined in the schema will fail validation unless explicitly allowed with `s.object().additionalProperties(true)`
- Nested object schemas are validated recursively; deeply nested errors report the full JSON path
- Schema builder API follows [ajv-ts](https://npmjs.com/package/ajv-ts) — refer to its docs for advanced formats

### Edge Cases

1. **Paginated list responses**: Wrap per-item schema in `s.array(ItemSchema)` and assert on the array root.
2. **Polymorphic responses** (`data` is string or number): Use `s.string().or(s.number())`.
3. **Optional nested object**: Use `AddressSchema.optional()` — if the field is present it must match the schema, if absent it's valid.

### What Breaks If Ignored

- **Without schema validation**: API silently changes `email` to `emailAddress` — all tests pass, feature breaks in production
- **Without `toBeOK()` check first**: `toMatchSchema` runs against the error body (4xx/5xx), producing confusing schema errors
- **Without shared schemas**: Same schema defined in 5 test files — one endpoint changes, 4 tests fail, 1 is forgotten

**Incorrect (manual per-field assertions, no schema):**

```typescript
import { test, expect } from '@playwright/test';

test('GET /users/1 returns user', async ({ request }) => {
  const res = await request.get('/api/users/1');
  const body = await res.json();

  // ❌ Manual field checks — misses type errors and extra/missing fields
  expect(body.id).toBeDefined();
  expect(typeof body.name).toBe('string');
  expect(typeof body.email).toBe('string');
  // ❌ Never checks that `createdAt` is a date string, `role` is an enum, etc.
  // ❌ If the API adds a `password` field by mistake, this test still passes
});
```

**Correct (schema fixture + toMatchSchema):**

```typescript
// fixtures/index.ts
import { mergeTests, mergeExpects } from '@playwright/test';
import {
  test as ajvTest,
  expect as ajvExpect,
} from '@playwright-labs/fixture-ajv-ts';

export const test = mergeTests(ajvTest);
export const expect = mergeExpects(ajvExpect);
```

```typescript
// schemas/user.ts — shared schema, import everywhere
import { s } from 'ajv-ts';

export const UserSchema = s.object({
  id: s.number(),
  name: s.string().min(1),
  email: s.string().format('email'),
  role: s.enum('admin', 'user', 'guest'),
  createdAt: s.string().format('date-time'),
  address: s.object({
    street: s.string(),
    city: s.string(),
    country: s.string(),
  }).optional(),
});

export const UsersListSchema = s.array(UserSchema);
```

```typescript
// tests/users.spec.ts
import { test, expect } from '../fixtures';
import { UserSchema, UsersListSchema } from '../schemas/user';

// ✅ Single assertion covers all fields, types, and formats
test('GET /users/1 returns valid user', async ({ request }) => {
  const res = await request.get('/api/users/1');
  await expect(res).toBeOK();
  expect(await res.json()).toMatchSchema(UserSchema);
});

// ✅ Array response validation
test('GET /users returns array of valid users', async ({ request }) => {
  const res = await request.get('/api/users');
  await expect(res).toBeOK();
  const body = await res.json();
  expect(body).toMatchSchema(UsersListSchema);
  expect(body.length).toBeGreaterThan(0);
});

// ✅ Inline schema with `schema` fixture for one-off tests
test('POST /auth/token returns token shape', async ({ request, schema }) => {
  const TokenSchema = schema.object({
    accessToken: schema.string().min(10),
    expiresIn: schema.number().min(0),
    tokenType: schema.enum('Bearer'),
  });

  const res = await request.post('/api/auth/token', {
    data: { username: 'user', password: 'pass' },
  });
  await expect(res).toBeOK();
  expect(await res.json()).toMatchSchema(TokenSchema);
});

// ✅ Negative test — verify error response shape
test('GET /users/999 returns error schema', async ({ request, schema }) => {
  const ErrorSchema = schema.object({
    error: schema.string(),
    code: schema.number(),
  });

  const res = await request.get('/api/users/999');
  expect(res.status()).toBe(404);
  expect(await res.json()).toMatchSchema(ErrorSchema);
});
```

Reference: [@playwright-labs/fixture-ajv-ts](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ajv-ts)

---

## References

- https://playwright.dev
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/api/class-test
- https://playwright.dev/docs/test-assertions
- https://playwright.dev/docs/locators
- https://playwright.dev/docs/test-parallel
- https://playwright.dev/docs/test-sharding
- https://playwright.dev/docs/trace-viewer
- https://playwright.dev/docs/test-fixtures
- https://playwright.dev/docs/test-fixtures#custom-fixture-title
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-timers
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ajv-ts
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-env
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-abort
- https://github.com/vitalics/playwright-labs/tree/main/packages/decorators
- https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-otel
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel
- https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-slack
- https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-email

---

*This document was automatically generated from individual rule files.*  
*Last updated: 2026-05-20*
