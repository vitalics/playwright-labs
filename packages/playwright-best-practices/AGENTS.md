# Playwright TypeScript Best Practices

**Version:** 1.2.0  
**Organization:** vitalics <vitalicset@yandex.ru>  
**Date:** July 2026

## Abstract

Comprehensive best practices guide for Playwright TypeScript test automation, designed for AI agents and LLMs. Contains 29 rules across 8 categories, prioritized by impact from critical (test stability, execution speed) to incremental (advanced patterns). Covers modular fixture composition with mergeTests/mergeExpects, type-safe environment variables, JSON schema validation for API responses, AbortSignal-based cancellation, Node.js timer control, OOP decorator patterns for large teams, OpenTelemetry integration for test observability (custom and global metrics, distributed traces, Jaeger/Grafana/Prometheus, auto-instrumented step/annotation/run metrics), Prometheus remote-write reporting with custom counters/gauges/histograms, Slack Block Kit notifications, email reporting with React Email templates, framework-aware selectors for Angular/React/Vue, realistic test data with faker, Allure report enrichment, real-service testing with Testcontainers, human-like input simulation, and type-safe SQL with compile-time validated queries. Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, and specific impact metrics to guide automated test writing and refactoring.

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
   - 6.4. [Enrich Test Reports with fixture-allure](#6.4-enrich-test-reports-with-fixture-allure)
   - 6.5. [Generate Realistic Test Data with fixture-faker](#6.5-generate-realistic-test-data-with-fixture-faker)
   - 6.6. [Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation](#6.6-instrument-tests-with-custom-otel-metrics-spans-and-distributed-trace-propagation)
   - 6.7. [Instrument Tests with Custom Prometheus Counters, Gauges, and Histograms](#6.7-instrument-tests-with-custom-prometheus-counters-gauges-and-histograms)
   - 6.8. [Manage Environment Variables with Type-Safe Validated Configuration](#6.8-manage-environment-variables-with-type-safe-validated-configuration)
   - 6.9. [Reuse Global Metrics Across Tests with useGlobalCounter and useGlobalHistogram](#6.9-reuse-global-metrics-across-tests-with-useglobalcounter-and-useglobalhistogram)
   - 6.10. [Simulate Human-Like Input with ghost-cursor](#6.10-simulate-human-like-input-with-ghost-cursor)
   - 6.11. [Test Against Real Services with fixture-testcontainers](#6.11-test-against-real-services-with-fixture-testcontainers)
   - 6.12. [Use Custom Fixtures for Reusable Test Setup and Teardown](#6.12-use-custom-fixtures-for-reusable-test-setup-and-teardown)
   - 6.13. [Use test.describe for Logical Test Grouping](#6.13-use-testdescribe-for-logical-test-grouping)
7. [Debugging & Maintenance](#7-debugging--maintenance) (MEDIUM)
   - 7.1. [Use test.step for Better Test Readability and Debugging](#7.1-use-teststep-for-better-test-readability-and-debugging)
8. [Advanced Patterns](#8-advanced-patterns) (LOW)
   - 8.1. [Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel](#8.1-export-test-traces-and-metrics-to-opentelemetry-backends-with-reporter-otel)
   - 8.2. [Organize Tests with OOP Decorator Pattern for Large Scalable Test Suites](#8.2-organize-tests-with-oop-decorator-pattern-for-large-scalable-test-suites)
   - 8.3. [Push Test Metrics to Prometheus in Real Time with reporter-prometheus-remote-write](#8.3-push-test-metrics-to-prometheus-in-real-time-with-reporter-prometheus-remote-write)
   - 8.4. [Query Components with Framework-Aware Selectors (angular=, react=, vue=)](#8.4-query-components-with-framework-aware-selectors-angular-react-vue)
   - 8.5. [Send Test Results to Slack with Rich Block Kit Messages via reporter-slack](#8.5-send-test-results-to-slack-with-rich-block-kit-messages-via-reporter-slack)
   - 8.6. [Send Test Run Reports via Email with React Email Templates via reporter-email](#8.6-send-test-run-reports-via-email-with-react-email-templates-via-reporter-email)
   - 8.7. [Type-Safe SQL in Tests with fixture-sql and ts-plugin-sql](#8.7-type-safe-sql-in-tests-with-fixture-sql-and-ts-plugin-sql)
   - 8.8. [Use API Mocking for Reliable and Fast Tests](#8.8-use-api-mocking-for-reliable-and-fast-tests)
   - 8.9. [Validate API Response JSON Schemas with toMatchSchema Custom Matcher](#8.9-validate-api-response-json-schemas-with-tomatchschema-custom-matcher)

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

### 6.4. Enrich Test Reports with fixture-allure

**Tags:** allure, reporting, fixtures, decorators, masking  
**Impact:** MEDIUM (turns flat pass/fail output into structured Allure reports with steps, attachments, and masked secrets)

**Impact: MEDIUM (turns flat pass/fail output into structured Allure reports with steps, attachments, and masked secrets)**

A failing test without structure forces you to open a trace just to learn which of the 30 actions broke. The `@playwright-labs/fixture-allure` package gives you a `useAllure` fixture for test metadata (id, severity, owner, epic/feature/story, tags, issues, links), the full `allure-js-commons` runtime for named steps and attachments, and `functionDecorator`/`methodDecorator` helpers that wrap shared helpers and page-object methods in Allure steps automatically — with `PARAMETER.MASKED` to keep credentials out of the report.

## When to Use

- **Use useAllure when**: A test needs Allure metadata — `id`, `severity`, `owner`, `epic`, `feature`, `story`, `suite`, `component`, `labels`, `parameters`, `tags`, `issues`, `links`
- **Use allure.step / allure.attachment when**: Grouping a multi-action flow into a named step, or attaching screenshots, payloads, and logs to the report
- **Use functionDecorator / methodDecorator when**: A helper or page-object method is called from many tests and every call site should produce the same named step
- **Use PARAMETER.MASKED when**: A credential or token must be visible as a parameter in the report but its value must stay hidden
- **Use DEFAULT_CONFIG / makeReporterDescription when**: Wiring the `allure-playwright` reporter into `playwright.config.ts` with environment info
- **Requires**: `allure-js-commons` (peer dependency) installed, and the `allure-playwright` reporter active — the reporter entry produced by `makeReporterDescription` targets it

## Guidelines

### Do

- Call `useAllure({ ... })` once at the top of the test, before any steps — it returns the `allure-js-commons` runtime you use for `step`, `attachment`, and `parameter`
- Merge the fixture into your project test object with `mergeTests`/`mergeExpects` instead of importing `test` from the package in every spec
- Decorate shared helpers once with `functionDecorator` and page-object methods with `@methodDecorator` — every call site gets an identical, correctly named step
- Mark every secret in decorator `args` as `PARAMETER.MASKED` (shown as masked in the report) or `PARAMETER.HIDDEN` (not shown at all)
- Set `attachResult: false` on helpers that return tokens, sessions, or large objects — the return value is serialized into the report by default
- Spread `ENVIRONMENT_INFO` into a custom `environmentInfo` so `os_platform`, `os_release`, `os_version`, `parallelism`, and `node_version` always reach the report

### Don't

- Don't pass secrets through `allure.parameter` or the `parameters` option without `options: { mode: "masked" }` — the report is an artifact that gets archived and shared in CI
- Don't wrap every call site in manual `allure.step` blocks — names drift, steps get forgotten, and refactors break the report structure; decorate the helper instead
- Don't call a decorated function without `await` — `functionDecorator` always returns a `Promise`, even when the wrapped function is synchronous
- Don't apply `@methodDecorator` to non-async methods or non-method members — it is async-only and throws `AllureStep decorator can only be used on methods` on anything else
- Don't enable `parametrizeArguments: true` on helpers that receive secrets — it serializes the entire arguments array into the report with no masking

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-allure allure-js-commons allure-playwright`
- **Fixtures**: `useAllure(context)` (preferred) and `allure` (raw runtime) — both from the package's `test` export
- **Runtime API** (returned by `useAllure`): `allure.step(name, body)`, `allure.attachment(name, content, contentType)`, `allure.parameter(name, value, options?)`
- **Decorators**: `functionDecorator(fn, options?)`, `@methodDecorator(options?)` with options `name`, `args`, `attachResult`, `attachError`, `throwError`, `parametrizeArguments`, `parametrizeThis`
- **Parameter modes**: `PARAMETER.DEFAULT`, `PARAMETER.HIDDEN`, `PARAMETER.MASKED`
- **Config helpers**: `DEFAULT_CONFIG`, `REPORTER_DESCRIPTION`, `makeReporterDescription({ outputFolder, resultsDir, detail, environmentInfo })`, `ENVIRONMENT_INFO`

## Edge Cases and Constraints

### Limitations

- `functionDecorator` always returns a `Promise`, even for synchronous functions — this is by design because Allure steps and attachments are async; every caller must `await`
- `@methodDecorator` uses the standard TC39 decorators syntax (TypeScript 5+), not the legacy `experimentalDecorators` transform, and works only on `async` methods
- Steps and attachments need an active Allure runtime — provided by the `allure-playwright` reporter; without it, report data has nowhere to land
- `attachResult` (default `true`) serializes the full return value with `util.inspect` at unlimited depth into a `return` attachment — large objects produce large attachments, and secrets are serialized as-is
- Decorator `args` are **positional**: each `[name, mode]` entry maps to the call argument at the same array index, not to a parameter name

### Edge Cases

1. **Decorated helper receives `page` as its first argument**: The positional `args` mapping shifts — `[["username", PARAMETER.DEFAULT]]` would label the `page` object as "username". Either list every leading argument (`["page", PARAMETER.HIDDEN]`) or close over `page` instead of passing it.
2. **Nested decorated calls**: A decorated helper calling another decorated helper produces a nested step tree in the report — this is desirable; you get the outer flow and inner operations for free.
3. **`throwError: false`**: The error is captured as an `error` attachment and returned instead of thrown — the step stays green. Keep the default `throwError: true` unless you deliberately handle the returned error.

### What Breaks If Ignored

- **Without masking**: Credentials land in the Allure report in plain text — archived in CI artifacts, visible to anyone with report access, a credential leak
- **Without steps and metadata**: A 30-action test renders as one flat row — triage means opening the trace for every failure, and the report can't be filtered by epic, feature, severity, or owner
- **Without decorators**: Manual `allure.step` wrappers at every call site drift apart — three names for the same login flow, missing steps after refactors

**Incorrect (plain-text secret, manual steps at every call site):**

```typescript
import { test } from "@playwright/test";
import * as allure from "allure-js-commons";

test("user can log in", async ({ page }) => {
  // ❌ Secret written into the report in plain text — archived with CI artifacts
  await allure.parameter("password", "SuperSecret123!");

  // ❌ Manual step wrappers at every call site — easy to forget, names drift
  await allure.step("fill username", async () => {
    await page.fill("#username", "qa-user");
  });
  await allure.step("fill password", async () => {
    await page.fill("#password", "SuperSecret123!");
  });
  await allure.step("submit the login form", async () => {
    await page.click("#submit");
  });

  // ❌ No metadata — report can't be filtered by severity, owner, or feature
});
```

**Why this fails:**
- The password value is stored unmasked in the report and in every CI artifact archive
- Step names are duplicated per call site; rename the flow and half the reports still show the old name
- There is no `severity`, `owner`, `epic`, or `feature` — a 500-test run is one unsortable list

**Correct (useAllure metadata + decorated helper with masked password):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import {
  makeReporterDescription,
  ENVIRONMENT_INFO,
} from "@playwright-labs/fixture-allure";

export default defineConfig({
  reporter: [
    ["html"],
    makeReporterDescription({
      outputFolder: "output/allure-results",
      environmentInfo: {
        Environment: "staging",
        ...ENVIRONMENT_INFO, // ✅ os_platform, os_release, os_version, parallelism, node_version
      },
    }),
  ],
});
```

```typescript
// fixtures/index.ts — merge once, import everywhere
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as allureTest,
  expect as allureExpect,
} from "@playwright-labs/fixture-allure";

export const test = mergeTests(allureTest);
export const expect = mergeExpects(allureExpect);
```

```typescript
// helpers/login.ts — decorate once, every call site gets the same step
import { functionDecorator, PARAMETER } from "@playwright-labs/fixture-allure";
import type { Page } from "@playwright/test";

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#submit");
}

export const loginStep = functionDecorator(login, {
  name: "Login",
  args: [
    ["page", PARAMETER.HIDDEN], // ✅ positional: first entry maps to the first argument
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED], // ✅ shown masked in the report
  ],
  attachResult: false, // ✅ never serialize session data into the report
});
```

```typescript
// tests/login.spec.ts
import { test, expect } from "../fixtures";
import { loginStep } from "../helpers/login";

test("user can log in", async ({ page, useAllure }) => {
  const allure = useAllure({
    id: 123456,
    layer: "UI",
    severity: "critical",
    owner: "John Doe",
    epic: "User Management",
    feature: "Login",
    story: "User can log in",
    tags: ["ui", "regression"],
    issues: [{ url: "https://example.com/issue1", name: "Issue 1" }],
  });

  // ✅ one named "Login" step, password masked — identical in every test that calls it
  await loginStep(page, "qa-user", process.env.QA_PASSWORD!);

  await allure.step("dashboard loads", async () => {
    await expect(page).toHaveURL(/.*dashboard/);
    // ✅ visual evidence attached to the step
    await allure.attachment("dashboard", await page.screenshot(), "image/png");
  });
});
```

**Why this works:**
- The password never appears in the report — `PARAMETER.MASKED` masks the value while keeping the parameter visible
- The "Login" step is defined once on the helper; renaming it updates every test's report at once
- Metadata makes the report filterable by severity, owner, epic, feature, and tags, and `ENVIRONMENT_INFO` records where the run happened

## Common Mistakes

### Mistake 1: Secrets in the report in plain text

```typescript
test("login", async ({ page, useAllure }) => {
  const allure = useAllure({
    // ❌ record-form parameters have no masking — value stored as-is
    parameters: { username: "qa-user", password: "SuperSecret123!" },
  });

  // ❌ same problem through the runtime API
  await allure.parameter("api_token", process.env.API_TOKEN!);
});
```

**Why this is wrong**: The Allure report is a build artifact — it gets archived, attached to tickets, and shared. Any parameter without `mode: "masked"` is stored in plain text.

**How to fix**:

```typescript
test("login", async ({ page, useAllure }) => {
  const allure = useAllure({
    // ✅ array form accepts per-parameter options
    parameters: [
      { name: "username", value: "qa-user" },
      { name: "password", value: "SuperSecret123!", options: { mode: "masked" } },
    ],
  });

  // ✅ same masking through the runtime API
  await allure.parameter("api_token", process.env.API_TOKEN!, { mode: "masked" });
});
```

### Mistake 2: Misaligned positional args in decorators

```typescript
const loginStep = functionDecorator(login, {
  args: [
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED],
  ],
});
// login(page, username, password) — ❌ "username" shows the serialized page object,
// ❌ "password" masks the username, and the real password is never recorded or masked
```

**Why this is wrong**: Decorator `args` map to call arguments by array index, not by parameter name. When the helper's first parameter is `page`, every entry shifts by one — and the secret can end up under a `PARAMETER.DEFAULT` entry.

**How to fix**:

```typescript
const loginStep = functionDecorator(login, {
  args: [
    ["page", PARAMETER.HIDDEN], // ✅ account for every leading argument
    ["username", PARAMETER.DEFAULT],
    ["password", PARAMETER.MASKED],
  ],
});
```

### Mistake 3: Forgetting to await a decorated function

```typescript
test("login then checkout", async ({ page }) => {
  loginStep(page, "qa-user", process.env.QA_PASSWORD!); // ❌ missing await
  await page.goto("/checkout"); // runs before the login step finishes
});
```

**Why this is wrong**: `functionDecorator` returns a `Promise` even when the wrapped function is synchronous, because Allure steps and attachments are async. Without `await`, the next action races the decorated call — the test acts on an unauthenticated page and the step may never be recorded.

**How to fix**:

```typescript
test("login then checkout", async ({ page }) => {
  await loginStep(page, "qa-user", process.env.QA_PASSWORD!); // ✅
  await page.goto("/checkout");
});
```

### Mistake 4: Decorating a non-async or non-method member

```typescript
class AuthPage {
  @methodDecorator({ name: "token" })
  get token() {
    // ❌ throws: AllureStep decorator can only be used on methods
    return this._token;
  }

  @methodDecorator()
  syncHelper() {
    // ❌ methodDecorator works only with async methods
    return 42;
  }
}
```

**Why this is wrong**: `@methodDecorator` validates `context.kind` and supports only `async` methods under the standard TC39 decorators syntax (TypeScript 5+).

**How to fix**:

```typescript
class AuthPage {
  @methodDecorator({ name: "Refresh token" })
  async refreshToken() {
    // ✅ async method — wrapped in an Allure step named "Refresh token"
    this._token = await fetchNewToken();
  }
}
```

## Advanced Patterns

Decorate an entire page object so the report mirrors the object's API, and combine it with per-test metadata:

```typescript
// pages/auth-page.ts
import { methodDecorator, PARAMETER } from "@playwright-labs/fixture-allure";
import type { Page } from "@playwright/test";

export class AuthPage {
  constructor(private page: Page) {}

  @methodDecorator({
    name: "Login via UI",
    args: [
      ["username", PARAMETER.DEFAULT],
      ["password", PARAMETER.MASKED],
    ],
  })
  async login(username: string, password: string) {
    await this.page.goto("/login");
    await this.page.fill("#username", username);
    await this.page.fill("#password", password);
    await this.page.click("#submit");
  }

  @methodDecorator() // ✅ step name defaults to the method name
  async logout() {
    await this.page.click("#user-menu");
    await this.page.click("#logout");
  }
}
```

```typescript
// tests/auth.spec.ts
import { test, expect } from "../fixtures";
import { AuthPage } from "../pages/auth-page";

test("login and logout", async ({ page, useAllure }) => {
  useAllure({
    layer: "UI",
    severity: "blocker",
    feature: "Authentication",
    suite: "Auth",
    links: [{ url: "https://example.com/auth-spec", name: "Auth specification" }],
  });

  const auth = new AuthPage(page);
  await auth.login("qa-user", process.env.QA_PASSWORD!); // "Login via UI" step, password masked
  await expect(page).toHaveURL(/.*dashboard/);
  await auth.logout(); // "logout" step
});
```

**When to use this pattern**: Suites with stable page objects shared across many specs — the report structure stays consistent even as tests are added, and every method call is traceable without a single manual `allure.step`.

For zero-config setup, spread `DEFAULT_CONFIG` (its reporter is `REPORTER_DESCRIPTION`, writing to `output/allure-results`) and override only what you need:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { DEFAULT_CONFIG } from "@playwright-labs/fixture-allure";

export default defineConfig({
  ...DEFAULT_CONFIG, // ✅ allure-playwright reporter with default environment info
  testMatch: "**/*.spec.ts",
  use: { baseURL: "https://example.com" },
});
```

## Integration with Other Best Practices

- **Compose Fixtures with mergeTests and mergeExpects**: The package's `test`/`expect` are designed to be merged into your project's fixture object once — combine them with your own fixtures in a single `mergeTests` call instead of importing per-spec.
- **Use Page Object Model for Reusability and Maintainability**: `@methodDecorator` on page-object methods gives you the POM's reuse benefits plus an automatic report structure that mirrors the object's API.
- **Use test.step for Better Test Readability and Debugging**: Keep `test.step` for Trace Viewer grouping and `allure.step` (or decorators) for the Allure report — they serve different consumers and compose fine in the same test.
- **Send Test Results to Slack / Email reporters**: The generated Allure report is the artifact those notifications should link to — masked parameters keep the linked report safe to share.

Reference: [@playwright-labs/fixture-allure](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-allure)

---

### 6.5. Generate Realistic Test Data with fixture-faker

**Tags:** faker, test-data, fixtures, data-generation  
**Impact:** MEDIUM (eliminates hardcoded data collisions and makes every test run generate unique, locale-aware inputs)

**Impact: MEDIUM (eliminates hardcoded data collisions and makes every test run generate unique, locale-aware inputs)**

Hardcoded emails, usernames, and IDs are a quiet source of test failure: a second run hits a unique constraint in the database, a parallel worker collides with its neighbor, or a "test user" left over from last week makes an assertion ambiguous. The `@playwright-labs/fixture-faker` package wraps `@faker-js/faker` in Playwright fixtures — `faker` for immediate use and `useFaker` for configured instances (locale, seed, randomizer) — so every test gets realistic, freshly generated data that never repeats between runs.

## When to Use

- **Use the `faker` fixture when**: Any test fills a form, creates an entity, or registers a user — emails, passwords, names, phone numbers, addresses
- **Use `useFaker` when**: You need a configured instance — a different locale (`useFaker({ locale: "fr" })`), a deterministic seed for reproducing a CI failure (`useFaker({ seed: 1234 })`), or a custom `randomizer`
- **Use generation over constants when**: The system under test enforces uniqueness (emails, usernames, SKUs) or rejects duplicates
- **Consider alternatives when**: The test asserts on a specific seeded entity (a known admin account, a fixture row inserted by a migration) — generate the *input*, not the *precondition*
- **Required for**: CRUD and registration flows, tests that run more than once against the same environment, parallel suites sharing one database

## Guidelines

### Do

- Store every generated value in a local variable and reuse that variable for both the action and the assertion
- Generate data as close to the action as possible — at the top of the test or inside the `test.step` that uses it
- Use domain-appropriate generators: `faker.internet.email()` for emails, `faker.person.fullName()` for names, `faker.string.uuid()` for opaque IDs
- Use `useFaker({ locale })` for localized forms — a French locale produces French names, addresses, and phone formats that actually pass localized validation
- Use `useFaker({ seed })` when you need byte-for-byte reproducibility — debugging a flaky run, snapshotting a generated payload
- Merge the package's `test`/`expect` into your shared fixture file once with `mergeTests`/`mergeExpects`, then import from there everywhere

### Don't

- Don't call a generator twice and expect the same value — `faker.internet.email()` returns a **different** email on every call; capture it once
- Don't hardcode `test@example.com` or `user-123` in tests that create resources — the second run against the same backend fails on uniqueness
- Don't depend on data a previous test created with hardcoded values — test-order coupling breaks under sharding and retries
- Don't assert exact equality against unseeded random data (`toBe(faker.lorem.sentence())` twice is a guaranteed mismatch) — assert shape, format, or the captured variable
- Don't generate a new faker instance per assertion — one instance per test is enough; more instances only add entropy you have to track

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-faker` (peer deps: `@playwright/test` and `@faker-js/faker`)
- **Fixtures**: `faker` (preconfigured, default locale `en_US`) and `useFaker(options?)` where `options` is `{ locale?, randomizer?, seed? }`; `locale` accepts any key of faker's `allLocales` (`"en_US"`, `"fr"`, `"de"`, `"ja"`, …)
- **Exports**: `test`, `expect`, and the `Fixture` type from `@playwright-labs/fixture-faker`
- **Matchers**: none — the exported `expect` is Playwright's base expect. It exists so it composes cleanly via `mergeExpects` with other Playwright-labs packages, not to add assertions
- **Cleanup**: both fixtures return a `Faker & Disposable` — the `faker` fixture disposes its internal reference at teardown, so instances never leak between tests

## Edge Cases and Constraints

### Limitations

- Generation is pseudo-random, not guaranteed-unique. Two calls to `faker.internet.email()` colliding is astronomically unlikely but not impossible — backends with hard uniqueness guarantees should still key off `faker.string.uuid()` or a worker-scoped prefix
- The default `faker` fixture is fixed to `en_US`. Requesting another locale requires calling `useFaker({ locale })` yourself — there is no config-level locale override
- A faker instance obtained from `useFaker` is only valid inside the current test — it is disposed with the fixture scope, so don't stash it in module-level state for reuse across tests

### Edge Cases

1. **Reproducing a failed CI run**: Regenerate the identical data by passing the seed — `useFaker({ seed: 1234 })` makes every subsequent generator call deterministic. Log generated values on failure so you can pick a seed or the raw values for local reproduction.
2. **Parallel workers on a shared database**: Randomness alone is usually enough, but for strict uniqueness combine faker output with `test.info().workerIndex` or `test.info().testId` — e.g. an email local-part containing the test ID.
3. **Localized validation**: A German postal-code field rejects a US ZIP. Generate with `useFaker({ locale: "de" })` so `faker.location.zipCode()` matches what the form validates.
4. **Seeded vs. unseeded in one suite**: `useFaker` creates a fresh instance per call, so a seeded instance for one assertion doesn't affect the unseeded `faker` fixture used elsewhere in the same test.

### What Breaks If Ignored

- **Second-run failures**: `register.spec.ts` passes on a clean database, then fails forever with "email already taken" until someone wipes the environment
- **Parallel collisions**: Two workers submit the same hardcoded username within the same second — one gets a 409, and the failure looks like a race in the app instead of the test data
- **Order coupling**: `test B` logs in with the credentials `test A` created. Run `test B` alone, on a different shard, or after a retry — it fails for a missing precondition, not an app bug
- **Stale-data ambiguity**: An assertion matches a leftover record from a previous run, so the test passes while the feature is actually broken

**Incorrect (hardcoded data, second run collides, workers conflict):**

```typescript
import { test, expect } from "@playwright/test";

test("user registration", async ({ page }) => {
  await page.goto("/signup");

  // ❌ Same values on every run — the second run hits "email already taken"
  await page.fill("#email", "john.doe@example.com");
  await page.fill("#username", "johndoe");
  await page.fill("#password", "Password123!");
  await page.click("#submit");

  // ❌ Passes if ANY previous run left this user behind — proves nothing about this run
  await expect(page.locator("#welcome")).toContainText("johndoe");
});

test("login with the registered user", async ({ page }) => {
  // ❌ Depends on the previous test's hardcoded data — breaks alone, on shards, on retry
  await page.goto("/login");
  await page.fill("#email", "john.doe@example.com");
  await page.fill("#password", "Password123!");
  await page.click("#submit");
});
```

**Why this fails:**
- Fixed emails/usernames violate uniqueness constraints on any run after the first
- Parallel workers submit identical data simultaneously — intermittent 409s misread as app races
- Cross-test dependency on a hardcoded precondition makes tests non-runnable in isolation

**Correct (generated data captured in variables, self-contained tests):**

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

test("user registration and login", async ({ page, faker }) => {
  // ✅ Fresh, realistic values on every run — no collisions, no stale matches
  const email = faker.internet.email();
  const username = faker.internet.username();
  const password = faker.internet.password({ length: 16 });

  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#submit");

  // ✅ Asserts against the values THIS run generated
  await expect(page.locator("#welcome")).toContainText(username);

  // ✅ Same test logs in with its own data — no cross-test dependency
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("#submit");
  await expect(page).toHaveURL(/\/dashboard/);
});
```

**Why this works:**
- Every run produces unique inputs, so uniqueness constraints never fire between runs
- Actions and assertions share captured variables — no mismatch, no stale hits
- The test carries its full lifecycle, so it passes alone, on any shard, in any order

## Common Mistakes

### Mistake 1: Generating the value twice — action and assertion diverge

```typescript
test("profile shows email", async ({ page, faker }) => {
  await page.goto("/settings");
  await page.fill("#email", faker.internet.email());
  await page.click("#save");

  // ❌ Second call generates a DIFFERENT email — assertion can never pass
  await expect(page.locator("#email")).toHaveValue(faker.internet.email());
});
```

**Why this is wrong**: Every generator call produces new random data. The value asserted is not the value submitted, so the test fails deterministically — or worse, passes by coincidence once in a million runs and hides the bug.

**How to fix**:

```typescript
test("profile shows email", async ({ page, faker }) => {
  const email = faker.internet.email(); // ✅ capture once

  await page.goto("/settings");
  await page.fill("#email", email);
  await page.click("#save");

  await expect(page.locator("#email")).toHaveValue(email); // ✅ same value
});
```

### Mistake 2: Shared fixed test data across parallel workers

```typescript
const SKU = "SKU-0001"; // ❌ every worker creates the same SKU

test("create product", async ({ page }) => {
  await page.goto("/products/new");
  await page.fill("#sku", SKU);
  await page.click("#create");
  // Worker B gets "duplicate SKU" whenever it overlaps with worker A
});
```

**Why this is wrong**: Module-level constants are identical in every worker process. Any backend uniqueness rule turns parallelism into a coin flip.

**How to fix**:

```typescript
test("create product", async ({ page, faker }) => {
  // ✅ Unique per test execution; testId makes collisions structurally impossible
  const sku = `SKU-${test.info().testId.slice(0, 8)}-${faker.string.alphanumeric(6)}`;

  await page.goto("/products/new");
  await page.fill("#sku", sku);
  await page.click("#create");
  await expect(page.locator("#sku-cell")).toHaveText(sku);
});
```

### Mistake 3: Asserting exact content of unseeded random text

```typescript
test("bio saves", async ({ page, faker }) => {
  await page.goto("/profile");
  await page.fill("#bio", faker.lorem.sentence());
  await page.click("#save");

  // ❌ Compares against a freshly generated sentence, not the submitted one
  await expect(page.locator("#bio-preview")).toHaveText(faker.lorem.sentence());
});
```

**Why this is wrong**: Same double-generation bug as Mistake 1, but subtler with free text — it reads like a content assertion while actually asserting nothing.

**How to fix**:

```typescript
test("bio saves", async ({ page, faker }) => {
  const bio = faker.lorem.sentence(); // ✅ capture, submit, assert — one value

  await page.goto("/profile");
  await page.fill("#bio", bio);
  await page.click("#save");
  await expect(page.locator("#bio-preview")).toHaveText(bio);
});
```

## Advanced Patterns

### Multi-locale data for internationalized forms

`useFaker` builds a fresh `Faker` instance for any locale exported by faker's `allLocales`, so one spec can cover several markets:

```typescript
import { test, expect } from "@playwright-labs/fixture-faker";

const locales = ["en_US", "fr", "de", "ja"] as const;

for (const locale of locales) {
  test(`signup works for locale ${locale}`, async ({ page, useFaker }) => {
    // ✅ Locale-aware names, addresses, phones that pass localized validation
    const faker = await useFaker({ locale });

    await page.goto(`/${locale}/signup`);
    await page.fill("#name", faker.person.fullName());
    await page.fill("#city", faker.location.city());
    await page.fill("#email", faker.internet.email());
    await page.click("#submit");
    await expect(page.locator("#welcome")).toBeVisible();
  });
}
```

### Deterministic data with a seed

When a CI failure needs exact local reproduction, trade randomness for determinism:

```typescript
test("invoice totals (seeded)", async ({ page, useFaker }) => {
  // ✅ Identical data on every run — failures replay byte-for-byte
  const faker = await useFaker({ seed: 1234 });

  const product = faker.commerce.productName();
  const price = faker.commerce.price();

  await page.goto("/invoice/new");
  await page.fill("#product", product);
  await page.fill("#price", price);
  await page.click("#save");
  await expect(page.locator("#product-cell")).toHaveText(product);
});
```

**When to use this pattern**: Seeds are for debugging and replay, not the default. Keeping the suite unseeded by default means the data itself explores the input space — occasionally surfacing edge cases (long names, apostrophes, unicode) that fixed data never would.

### Merging into a shared fixture file

Compose `faker` with your other fixtures once, following the merge pattern:

```typescript
// fixtures/index.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as fakerExpect,
  test as fakerTest,
} from "@playwright-labs/fixture-faker";

export const test = mergeTests(fakerTest);
export const expect = mergeExpects(fakerExpect);
```

Every spec then imports `test`/`expect` from `fixtures` and gets `faker` and `useFaker` alongside page objects and other custom fixtures — one import, no duplication.

## Integration with Other Best Practices

- **Merge Tests and Expects** (`fixture-merge-tests-expects`): `fixture-faker` is designed for `mergeTests`/`mergeExpects` — merging is the intended way to combine it with other Playwright-labs fixture packages
- **Parallel Test Isolation** (`parallel-test-isolation`): generated data is the data-layer half of isolation — each test owns its entities, so workers and shards never share mutable state
- **Web-First Assertions** (`assertion-web-first`): pair generated inputs with `expect(locator).toHaveValue(captured)` instead of reading input values manually — the assertion auto-waits while the captured variable stays stable
- **API Mocking** (`advanced-api-mocking`): seed mock responses with faker data at route-setup time so UI assertions can match against the same captured values
- **Scale considerations**: At 100+ tests, generated data turns "environment reset" from a nightly chore into a non-issue — but only if every test generates rather than borrows. Audit for module-level string constants; they are the residue that still collides

Reference: [@playwright-labs/fixture-faker](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-faker)

---

### 6.6. Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation

**Tags:** opentelemetry, otel, metrics, spans, tracing, traceparent, counter, histogram, useSpan, withSpan, fixture-otel  
**Impact:** MEDIUM (adds business-level telemetry to tests and connects Playwright spans with upstream service traces)

**Impact: MEDIUM (adds business-level telemetry to tests and connects Playwright spans with upstream service traces)**

The built-in reporter-otel metrics track test results and durations. The `@playwright-labs/fixture-otel` package goes further — its fixtures let you record custom business metrics (`useCounter`, `useHistogram`, `useUpDownCounter`), create named child spans (`useSpan`, `withSpan`), and propagate a W3C `traceparent` into the system under test so every downstream service span appears in the same Jaeger trace as the Playwright test span.

## When to Use

- **Use useCounter when**: Counting specific events inside a test — API calls made, items rendered, retries triggered
- **Use useHistogram when**: Recording latency or size distributions — page load time, response sizes, render durations
- **Use useUpDownCounter when**: Tracking values that go up and down — in-flight requests, queue depth, active connections
- **Use useGlobalCounter when**: Counting events across the whole worker run — total URL/page calls, suite-wide API usage; one shared instance per worker, values accumulate between tests
- **Use useGlobalHistogram when**: Recording distributions across the whole worker run — page-load latency for the entire suite, not a single test; one shared instance per worker, values accumulate between tests
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
- **Fixtures**: `useCounter(name, options?)`, `useHistogram(name, options?)`, `useUpDownCounter(name, options?)`, `useGlobalCounter(name, options?)`, `useGlobalHistogram(name, options?)`, `useSpan(name)`, `useTraceparent()`
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

## Global Metrics Across Tests

`useGlobalCounter` and `useGlobalHistogram` return a **shared** metric instance — one per metric name for the whole worker process, cached in a module-level registry. Every test that asks for the same name receives the same object, and recorded values accumulate across the tests of that worker. All global metrics are auto-flushed at the teardown of every test that used a global fixture — no manual `collect()` needed.

Two constraints to keep in mind:

- **Per worker, not per run**: each Playwright worker keeps its own registry. The reporter deduplicates instruments by metric name, so data points from all workers still land in a single OTel instrument.
- **One kind per name**: requesting a name already registered as the other kind (e.g. `useGlobalHistogram("x")` after `useGlobalCounter("x")`) throws an error. Options apply only at first creation and are ignored on subsequent calls for the same name.

```typescript
// tests/navigation.spec.ts — url_calls counted across the whole worker run
test("home page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });
  // ✅ auto-flushed at teardown — no collect() call needed
});

test("dashboard", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // ✅ same shared instance

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  // ✅ values accumulate across tests within the worker
  expect(urlCalls).toHaveOtelCallCount(2);
});
```

```typescript
// Run-wide latency distribution with a shared histogram
test("run-wide latency", async ({ useGlobalHistogram, page }) => {
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });

  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.record(Date.now() - start, { route: "/dashboard" });
});
```

## Integration with Other Best Practices

- **fixture-global-metrics**: Dedicated rule for the shared global fixtures — registry semantics, naming conventions, and aggregation pitfalls when metrics span multiple tests and workers. Use this rule for per-test instrumentation; follow `fixture-global-metrics` when metrics must accumulate across a run.

Reference: [@playwright-labs/fixture-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel)

---

### 6.7. Instrument Tests with Custom Prometheus Counters, Gauges, and Histograms

**Tags:** prometheus, metrics, counter, gauge, histogram, fixtures, monitoring  
**Impact:** MEDIUM (turns test activity into queryable Prometheus metrics for CI dashboards and alerting)

**Impact: MEDIUM (turns test activity into queryable Prometheus metrics for CI dashboards and alerting)**

The `@playwright-labs/reporter-prometheus-remote-write` reporter ships built-in test metrics (durations, counts, step timings). The `@playwright-labs/fixture-prometheus` package adds custom business metrics from inside tests: per-test fixtures `useCounterMetric` / `useGaugeMetric`, and worker-shared `useGlobalCounter` / `useGlobalHistogram`. Under the hood all of them are `@playwright-labs/prometheus-core` primitives (`Counter`, `Gauge`, `Histogram`) that serialize timeseries to stdout on `collect()` — the reporter picks them up and pushes them to Prometheus via remote write. Without the reporter in your config, every metric you record goes nowhere.

## When to Use

- **Use useCounterMetric when**: Counting events inside a single test — API calls made, elements rendered, retries triggered
- **Use useGaugeMetric when**: Tracking a value that goes up and down — in-flight requests, active sessions, items in a cart
- **Use useGlobalCounter / useGlobalHistogram when**: The same metric should accumulate across all tests in a worker — total page visits, suite-wide load-time distribution
- **Use standalone Counter / Gauge / Histogram when**: You need metrics outside test bodies — module scope, helper utilities, worker-scoped fixtures — via `@playwright-labs/prometheus-core` (also re-exported by the reporter)
- **Required for**: Any setup where metrics must actually reach Prometheus — the reporter is not optional, it is the transport

## Guidelines

### Do

- Configure `@playwright-labs/reporter-prometheus-remote-write` in `playwright.config.ts` with `serverUrl` before recording anything — no reporter, no delivery
- Call `.collect()` explicitly on metrics from `useCounterMetric` / `useGaugeMetric` — per-test fixtures are **not** auto-flushed at teardown
- Use the `using` keyword (TypeScript 5.2+) for scope-bound metrics — `Symbol.dispose` calls `collect()` and `reset()` on block exit
- Choose custom histogram `buckets` that match your SLOs (e.g. `[0.1, 0.5, 1, 2.5, 5]` seconds) instead of always accepting `DEFAULT_BUCKETS`
- Keep labels low-cardinality: route names, endpoints, regions — values from a small, bounded set
- Use `useGlobalCounter` / `useGlobalHistogram` for cross-test accumulation — they auto-flush at every test's teardown

### Don't

- Don't assume per-test fixtures flush themselves — an uncollected `useCounterMetric` metric silently vanishes when the test ends
- Don't record metrics without the reporter configured — `collect()` writes JSON events to `process.stdout`, and with nobody parsing them the data is lost
- Don't call `collect()` in a tight loop expecting deltas to accumulate — each call drains pending samples; a call with no new samples is a no-op
- Don't put test-unique values (test IDs, user IDs, timestamps) into labels — high cardinality exhausts the Prometheus label space
- Don't register the same name via both `useGlobalCounter` and `useGlobalHistogram` — it throws `Global metric "<name>" is already registered as a <kind>`
- Don't pass unsorted or empty `buckets` to a `Histogram` — the constructor throws `"buckets" must be a non-empty array of finite numbers in strictly ascending order`

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/fixture-prometheus @playwright-labs/reporter-prometheus-remote-write`
- **Per-test fixtures**: `useCounterMetric(name, labels?)` → `Counter`, `useGaugeMetric(name, labels?)` → `Gauge`
- **Worker-shared fixtures**: `useGlobalCounter(name, labels?)`, `useGlobalHistogram(name, { buckets?, labels? })`
- **Standalone primitives**: `new Counter({ name, ...labels }, initialValue?)`, `new Gauge({ name, ...labels })`, `new Histogram({ name, buckets?, ...labels })` from `@playwright-labs/prometheus-core`
- **Metric API**: `inc(value?)`, `dec(value?)`, `set(value)`, `zero()`, `observe(value)`, `labels(extra)`, `collect()`, `reset()`
- **Reporter options**: `serverUrl` (required, throws if missing), `prefix` (default `pw_`, applied to every metric name), `headers`, `auth.username` / `auth.password`, `labels`, `env`

## Edge Cases and Constraints

### Limitations

- Metrics travel over a **stdout event bridge**: `collect()` writes a newline-terminated single-line JSON event (`{ name: "prometheus-remote-writer", payload }`) per series, and the reporter's `onStdOut` hook parses and pushes them. This requires the reporter to be active in the same Playwright run — standalone use silently discards data.
- `collect()` has **drain semantics**: it flushes only samples recorded since the previous flush. A repeated `collect()` with no new samples writes nothing. This is deliberate — Prometheus 3.x rejects remote-write requests that re-send already-pushed samples ("out of order sample"), which would break the entire batch.
- Sample timestamps are **strictly increasing**: several `inc()` calls within the same millisecond still get distinct timestamps (`Math.max(Date.now(), last + 1)`), because Prometheus keeps only the first sample when several share a timestamp.
- "Global" fixtures are global **per worker process**, not per run. With N workers you get N independent instances of the same metric.
- A `Histogram` is multi-series: one flush emits one stdout event per child counter with pending samples — one per bucket plus `_sum` and `_count`.

### Edge Cases

1. **Histogram composition**: A `Histogram` is a composition of `Counter`s, not a `Metric` subclass: cumulative `${name}_bucket{le="<bound>"}` counters (including `le="+Inf"`), plus `${name}_sum` and `${name}_count`. `observe(value)` increments every bucket whose bound is `>= value` (the `+Inf` bucket always matches), adds `value` to `_sum`, and increments `_count`. Buckets default to `DEFAULT_BUCKETS` (`[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`). Children are exposed as `histogram.buckets`, `histogram.sum`, `histogram.count`.
2. **Global fixture creation options**: `buckets` / `labels` passed to `useGlobalHistogram` apply only at first creation — later calls with the same name return the cached instance and ignore new options.
3. **Mid-test collect on globals**: Manual `collect()` on a global metric is safe — drain semantics ensure the auto-flush at teardown only emits what is new.

### What Breaks If Ignored

- **Without the reporter**: every `collect()` call writes to stdout and nothing is parsed or pushed — dashboards stay empty with no error anywhere
- **Without collect() on per-test fixtures**: the fixture tears down, the metric is garbage-collected, and the samples never leave the worker
- **Without drain semantics awareness**: re-collecting the same metric "to be safe" emits nothing; conversely, never collecting means samples accumulate in memory until the worker exits
- **Without bucket discipline**: default buckets tuned for seconds make millisecond-scale observations land almost entirely in the first bucket — the histogram becomes useless for latency analysis

**Incorrect (metrics recorded but never shipped):**

```typescript
// playwright.config.ts — ❌ no Prometheus reporter configured
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [["list"]],
});
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "@playwright-labs/fixture-prometheus";

test("checkout flow", async ({ page, useCounterMetric, useGaugeMetric }) => {
  const apiCalls = useCounterMetric("checkout_api_calls", {
    endpoint: "/api/orders",
  });
  const inFlight = useGaugeMetric("http_in_flight");

  page.on("request", () => inFlight.inc());
  page.on("requestfinished", () => inFlight.dec());

  await page.goto("/checkout");
  apiCalls.inc();
  // ❌ Test ends here: collect() was never called, so the samples stay in the
  // worker's memory. Even if they were collected, no reporter is configured
  // to parse the stdout events — the data is lost either way.
  await expect(page).toHaveURL("/confirmation");
});
```

**Why this fails:**

- Per-test fixtures do not auto-flush — without `collect()` the samples never leave the worker process
- Without `@playwright-labs/reporter-prometheus-remote-write` in the config, stdout events are never parsed or pushed
- The failure is silent: tests pass, no error is logged, and Grafana shows nothing

**Correct (reporter configured, metrics explicitly collected):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

export default defineConfig({
  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      {
        serverUrl: "http://localhost:9090/api/v1/write",
        prefix: "e2e_", // ✅ every metric lands as e2e_<name>
      } satisfies PrometheusOptions,
    ],
  ],
});
```

```typescript
// tests/fixtures.ts — re-export so every spec uses the extended test
export { test, expect } from "@playwright-labs/fixture-prometheus";
```

```typescript
// tests/checkout.spec.ts
import { test, expect } from "./fixtures";

test("checkout flow", async ({ page, useCounterMetric, useGaugeMetric }) => {
  const apiCalls = useCounterMetric("checkout_api_calls", {
    endpoint: "/api/orders", // ✅ low-cardinality label
  });
  const inFlight = useGaugeMetric("http_in_flight");

  page.on("request", () => inFlight.inc());
  page.on("requestfinished", () => inFlight.dec());
  page.on("requestfailed", () => inFlight.dec());

  await page.goto("/checkout");
  apiCalls.inc();

  await expect(page).toHaveURL("/confirmation");

  // ✅ Explicit flush — per-test fixtures are not collected automatically
  apiCalls.labels({ status: "success" }).collect();
  inFlight.collect();
});

// ✅ Scope-bound collection with the `using` keyword (TypeScript 5.2+)
test("hero banner renders", async ({ page, useCounterMetric }) => {
  {
    using renders = useCounterMetric("hero_renders");
    await page.goto("/");
    await expect(page.getByTestId("hero")).toBeVisible();
    renders.inc();
  } // ✅ collect() + reset() called automatically on block exit
});
```

**Why this works:**

- The reporter's `onStdOut` hook intercepts the JSON events from `collect()` and remote-writes them to Prometheus
- Explicit `collect()` (or `using`) guarantees per-test metrics are flushed before the fixture tears down
- The `prefix` option namespaces all metrics, and low-cardinality labels keep queries fast

## Common Mistakes

### Mistake 1: Expecting per-test fixtures to auto-flush

```typescript
test("tracks nothing", async ({ page, useCounterMetric }) => {
  const clicks = useCounterMetric("cta_clicks");
  await page.getByTestId("cta").click();
  clicks.inc();
  // ❌ no collect() — the sample dies with the test
});
```

**Why this is wrong**: Only `useGlobalCounter` / `useGlobalHistogram` auto-flush at teardown. `useCounterMetric` / `useGaugeMetric` require an explicit `collect()`.

**How to fix**:

```typescript
test("tracks clicks", async ({ page, useCounterMetric }) => {
  const clicks = useCounterMetric("cta_clicks", { button: "hero-cta" });
  await page.getByTestId("cta").click();
  clicks.inc();
  clicks.collect(); // ✅ flush before teardown
});
```

### Mistake 2: Installing the fixtures but not the reporter

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [["html"]], // ❌ metrics are written to stdout and never parsed
});
```

**Why this is wrong**: The fixture system has no network path of its own. `collect()` serializes timeseries as newline-delimited JSON on the worker's stdout; only the reporter's `onStdOut` hook turns them into remote-write requests. Without it, `serverUrl` is never read and nothing is shipped.

**How to fix**:

```typescript
export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      { serverUrl: "http://localhost:9090/api/v1/write" },
    ],
  ],
});
```

### Mistake 3: High-cardinality labels and invalid buckets

```typescript
test("label explosion", async ({ page, useCounterMetric }) => {
  // ❌ unique value per test run — one new label set per execution
  const orders = useCounterMetric("orders_created", {
    orderId: crypto.randomUUID(),
  });
  await page.goto("/orders/new");
  orders.inc();
  orders.collect();
});

test("bad buckets", async ({ useGlobalHistogram }) => {
  // ❌ not strictly ascending — constructor throws
  const t = useGlobalHistogram("page_load_seconds", { buckets: [1, 0.5, 5] });
  t.observe(0.3);
});
```

**Why this is wrong**: Every distinct label set creates a new timeseries in Prometheus — unique IDs per run exhaust label space and make aggregation impossible. And `Histogram` validates bucket bounds at construction: empty arrays, non-finite values, or non-ascending order all throw.

**How to fix**:

```typescript
test("bounded labels", async ({ page, useCounterMetric }) => {
  // ✅ labels from a small, bounded set
  const orders = useCounterMetric("orders_created", { route: "/orders/new" });
  await page.goto("/orders/new");
  orders.inc();
  orders.collect();
});

test("valid buckets", async ({ useGlobalHistogram }) => {
  // ✅ strictly ascending bounds matched to your SLOs
  const t = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5],
    labels: { route: "/dashboard" },
  });
  t.observe(0.3);
});
```

## Advanced Patterns

### Standalone metrics in a worker-scoped fixture

Use `@playwright-labs/prometheus-core` primitives directly when metrics must outlive a single test but you want full control over flushing:

```typescript
// fixtures/worker-metrics.ts
import { test as base } from "@playwright/test";
import { Counter, Histogram } from "@playwright-labs/prometheus-core";

export const test = base.extend<
  {},
  { workerMetrics: { apiCalls: Counter; loadTime: Histogram } }
>({
  workerMetrics: [
    async ({}, use) => {
      const apiCalls = new Counter({ name: "api_calls", job: "e2e" });
      const loadTime = new Histogram({
        name: "page_load_seconds",
        buckets: [0.1, 0.5, 1, 2.5, 5],
      });
      await use({ apiCalls, loadTime });
      // ✅ Flush once per worker — drain semantics ship exactly the new samples
      apiCalls.collect();
      loadTime.collect();
    },
    { scope: "worker" },
  ],
});
```

```typescript
// tests/dashboard.spec.ts
import { test } from "../fixtures/worker-metrics";

test("dashboard loads", async ({ page, workerMetrics }) => {
  const start = Date.now();
  await page.goto("/dashboard");
  workerMetrics.loadTime.observe((Date.now() - start) / 1000);
  workerMetrics.apiCalls.inc();
});
```

**When to use this pattern**: You already maintain a custom fixture file and want suite-level aggregation without the `useGlobal*` cache semantics — e.g. different labels per project, or flushing in `afterAll` instead of per-test teardown.

### Suite-wide latency distribution with useGlobalHistogram

```typescript
import { test } from "./fixtures";

test("home page", async ({ page, useGlobalHistogram }) => {
  const loadTime = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5], // ✅ applies at first creation only
  });
  const start = Date.now();
  await page.goto("/");
  loadTime.observe((Date.now() - start) / 1000);
  // ✅ no collect() needed — auto-flushed at this test's teardown
});

test("users page", async ({ page, useGlobalHistogram }) => {
  const loadTime = useGlobalHistogram("page_load_seconds"); // ✅ same instance
  const start = Date.now();
  await page.goto("/users");
  loadTime.observe((Date.now() - start) / 1000);
});
```

The flush emits the full composition: cumulative `pw_page_load_seconds_bucket{le="0.1"}` … `{le="+Inf"}`, plus `pw_page_load_seconds_sum` and `pw_page_load_seconds_count`. Query it with standard PromQL:

```promql
# p95 page load across the suite
histogram_quantile(0.95,
  sum by (le) (rate(pw_page_load_seconds_bucket[1h]))
)

# average observed load time
sum(pw_page_load_seconds_sum) / sum(pw_page_load_seconds_count)
```

## Integration with Other Best Practices

- **fixture-merge-tests-expects**: Merge `test`/`expect` from `@playwright-labs/fixture-prometheus` with your other extensions via `mergeTests` / `mergeExpects` so every spec file imports from one fixture module
- **parallel-test-isolation**: Global metrics are per-worker — with N workers you get N series distinguished only by their samples; aggregate in PromQL (`sum by (name)`) rather than expecting a single suite-wide value
- **advanced-otel-reporter**: The Prometheus reporter and `reporter-otel` can run side by side in the `reporter` array — use Prometheus for metric dashboards and alerting, OTel traces for per-test debugging
- **Scale considerations**: At 100+ tests, prefer `useGlobalCounter` / `useGlobalHistogram` (one auto-flush per test, drained deltas) over per-test `collect()` storms, and keep every label set bounded

Reference: [@playwright-labs/fixture-prometheus](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-prometheus)

---

### 6.8. Manage Environment Variables with Type-Safe Validated Configuration

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

### 6.9. Reuse Global Metrics Across Tests with useGlobalCounter and useGlobalHistogram

**Tags:** global metrics, counter, histogram, fixtures, otel, prometheus, accumulation, worker  
**Impact:** MEDIUM (aggregates run-wide counters and latency distributions across tests without manual bookkeeping)

**Impact: MEDIUM (aggregates run-wide counters and latency distributions across tests without manual bookkeeping)**

Per-test fixtures like `useCounter` / `useHistogram` (fixture-otel) or `useCounterMetric` / `useGaugeMetric` (fixture-prometheus) create a fresh metric for every test — values die with the test. The global fixtures `useGlobalCounter` and `useGlobalHistogram` return a **shared instance** cached in a module-level registry keyed by `${kind}:${name}`: every test in the same worker that asks for the same name receives the **same object**, and recorded values accumulate across the whole run. Use them for cross-test aggregates — total URL calls, run-wide latency distributions, retry counts across the suite — instead of re-implementing accumulation with module-level variables.

## When to Use

- **Use useGlobalCounter when**: Counting events across the whole run — page/URL calls, API requests, retries triggered by any test
- **Use useGlobalHistogram when**: Building a latency or size distribution over many tests — every `page.goto` duration in the suite landing in one histogram
- **Use per-test fixtures instead when**: A value must be isolated to one test — call counts asserted per test, per-test latency, anything you would not want another test's data to pollute
- **Consider alternatives when**: You need run-wide totals across *all* workers — global metrics are per-worker, so query the backend (Prometheus/Grafana) and sum by metric name instead of reading one counter in-process
- **Identical API in both stacks**: `@playwright-labs/fixture-otel` (with `@playwright-labs/reporter-otel`) and `@playwright-labs/fixture-prometheus` (with `@playwright-labs/reporter-prometheus-remote-write`) expose the same `useGlobalCounter` / `useGlobalHistogram` fixtures with the same semantics

## Guidelines

### Do

- Request the same global metric by name from as many tests as need it — the registry guarantees they share one instance per worker
- Pass `options` (OTel stack) or `labels` / `buckets` (Prometheus stack) at the first call site and treat them as the canonical configuration for that metric name
- Record with low-cardinality attributes — `url`, `route`, `endpoint` — never per-test unique IDs
- Rely on the automatic flush: every test that used a global fixture triggers `collect()` on all registered global metrics at teardown
- Query the backend for run-wide totals — the reporter deduplicates instruments by metric name, so data points from all workers land in a single instrument

### Don't

- Don't request the same name with the other kind — `useGlobalHistogram("x")` after `useGlobalCounter("x")` throws `Global metric "x" is already registered as a counter`
- Don't pass options on later calls expecting them to merge or override — options apply only at first creation and are silently ignored afterwards
- Don't call `collect()` to "reset" a global metric between tests — `collect()` drains and emits, it does not zero the value; use a per-test fixture when you need isolation
- Don't expect one counter to span the whole run when `workers > 1` — each worker is a separate process with its own registry, so N workers produce N independent instances
- Don't use global metrics for assertions about a single test's behavior — accumulation makes pass/fail depend on test execution order within the worker

### Tool Usage Patterns

- **Install (OTel)**: `npm install @playwright-labs/fixture-otel @playwright-labs/reporter-otel`
- **Install (Prometheus)**: `npm install @playwright-labs/fixture-prometheus @playwright-labs/reporter-prometheus-remote-write`
- **OTel fixtures**: `useGlobalCounter(name, options?)` → `Counter.add(n, attributes?)`; `useGlobalHistogram(name, options?)` → `Histogram.record(value, attributes?)`
- **Prometheus fixtures**: `useGlobalCounter(name, labels?)` → `Counter.inc()` / `Counter.inc(n)`; `useGlobalHistogram(name, { buckets?, labels? })` → `Histogram.observe(value)`
- **Registry key**: `${kind}:${name}` — kind and name together identify the shared instance
- **Matchers (OTel)**: `toHaveOtelCallCount(n)` works on global counters and sees the accumulated count across tests in the worker

## Edge Cases and Constraints

### Limitations

- **Per-worker scope**: Playwright runs each worker in its own process. "Global" means global to one worker process — with 4 workers, `url_calls` exists as 4 independent counters, each accumulating only the tests its worker executed
- **Options are frozen at creation**: the first test to request a name decides its `unit`, `labels`, and `buckets`; a later test passing different options gets the original instance with no warning
- **Kind collision is fatal**: requesting an already-registered name with the other kind throws immediately, failing that test

### Edge Cases

1. **Test with no new recordings**: Flush drains, so a global metric untouched since the last flush is a no-op at teardown — no empty data points, no double emission. Manual mid-test `collect()` calls remain safe for the same reason.
2. **Same name, two spec files**: Both files get the same instance *within one worker*; if Playwright schedules them on different workers, each worker accumulates its own value. The backend still aggregates by metric name.
3. **First creation inside a shared setup helper**: If a `beforeEach` or custom fixture creates the metric with options, those options win for the whole worker — put canonical options in the earliest shared call site, not in individual tests.

### What Breaks If Ignored

- **Recreating a per-test metric per test for a run-wide number**: every test emits its own isolated series — totals must be reconstructed by hand, and per-test names/labels often diverge silently
- **Module-level `let total = 0` accumulation**: works until sharding or retries change scheduling, survives nothing outside the process, and never reaches the metrics backend
- **Asserting exact counts on a global metric**: `expect(urlCalls).toHaveOtelCallCount(1)` in the second test fails because the first test already recorded — assertions on globals must expect accumulated values

**Incorrect (per-test fixture used for a run-wide aggregate):**

```typescript
import { test, expect } from "@playwright-labs/fixture-otel";

test("home page", async ({ useCounter, page }) => {
  // ❌ Fresh counter per test — the suite-wide total is lost
  const urlCalls = useCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });

  expect(urlCalls).toHaveOtelCallCount(1);
});

test("dashboard", async ({ useCounter, page }) => {
  // ❌ Another isolated instance — starts from zero again
  const urlCalls = useCounter("url_calls", { unit: "requests" });

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  // There is no way to know how many URL calls the run made in total.
  expect(urlCalls).toHaveOtelCallCount(1);
});
```

**Why this fails:**
- Each test creates and flushes its own counter — no cross-test total exists anywhere
- The two `url_calls` series are independent; the backend sees two isolated points, not an accumulating signal
- Any "how many pages did the whole suite hit?" question requires manual post-processing of every per-test emission

**Correct (global counter accumulating across tests):**

```typescript
import { test, expect } from "@playwright-labs/fixture-otel";

test("home page", async ({ useGlobalCounter, page }) => {
  // ✅ First creation — options apply here and only here
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });

  await page.goto("/home");
  urlCalls.add(1, { url: "/home" });
}); // flushed automatically at teardown — no manual collect() needed

test("dashboard", async ({ useGlobalCounter, page }) => {
  // ✅ Same instance as the previous test — value carries over
  const urlCalls = useGlobalCounter("url_calls");

  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });

  expect(urlCalls).toHaveOtelCallCount(2); // accumulated across both tests
});
```

**Why this works:**
- The registry returns the same object for `"counter:url_calls"` to every test in the worker — additions accumulate
- Teardown flush emits the running total after each test that used a global fixture, with zero bookkeeping in test code
- The reporter deduplicates instruments by metric name, so data from all workers lands in one `url_calls` instrument for backend-side run totals

The same pattern in the Prometheus stack — note the different method names:

```typescript
import { test } from "@playwright-labs/fixture-prometheus";

test("home page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls");
  await page.goto("/");
  urlCalls.inc();
});

test("users page", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // same instance
  await page.goto("/users");
  urlCalls.inc(); // now counts 2 page visits across both tests
});
```

## Common Mistakes

### Mistake 1: Requesting the same name with the other kind

```typescript
test("a", async ({ useGlobalCounter, page }) => {
  useGlobalCounter("page_load_ms").add(1);
});

test("b", async ({ useGlobalHistogram, page }) => {
  // ❌ Throws: Global metric "page_load_ms" is already registered as a counter
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });
});
```

**Why this is wrong**: The registry keys instances by `${kind}:${name}` but enforces one kind per name. A counter and a histogram cannot share a name in the same worker.

**How to fix**:

```typescript
test("b", async ({ useGlobalHistogram, page }) => {
  // ✅ Distinct name per kind — or reuse the existing kind for that name
  const loadTime = useGlobalHistogram("page_load_duration_ms", { unit: "ms" });
  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.record(Date.now() - start, { route: "/dashboard" });
});
```

### Mistake 2: Expecting later options to apply

```typescript
test("a", async ({ useGlobalCounter, page }) => {
  // First creation — no unit configured
  useGlobalCounter("url_calls").add(1);
});

test("b", async ({ useGlobalCounter, page }) => {
  // ❌ { unit: "requests" } is silently ignored — the metric already exists
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });
});
```

**Why this is wrong**: Options apply only at first creation and are ignored on subsequent calls for the same name. Test "b" reads as if it configures the metric, but the configuration depends on which test happens to run first in the worker.

**How to fix**:

```typescript
// fixtures/global-metrics.ts — single canonical creation point
import { test as base } from "@playwright-labs/fixture-otel";

export const test = base.extend<{ urlCalls: void }>({
  urlCalls: [
    async ({ useGlobalCounter }, use) => {
      // ✅ Canonical options, created before any test records
      useGlobalCounter("url_calls", { unit: "requests" });
      await use();
    },
    { auto: true },
  ],
});
```

```typescript
test("dashboard", async ({ useGlobalCounter, page }) => {
  const urlCalls = useGlobalCounter("url_calls"); // options already settled
  await page.goto("/dashboard");
  urlCalls.add(1, { url: "/dashboard" });
});
```

The Prometheus equivalent — later `buckets` / `labels` are likewise ignored:

```typescript
test("a", async ({ useGlobalHistogram, page }) => {
  // ✅ Buckets decided at first creation; later calls cannot change them
  const loadTime = useGlobalHistogram("page_load_seconds", {
    buckets: [0.1, 0.5, 1, 2.5, 5],
  });
  const start = Date.now();
  await page.goto("/dashboard");
  loadTime.observe((Date.now() - start) / 1000);
});
```

### Mistake 3: Asserting per-test values on a global metric

```typescript
test("checkout", async ({ useGlobalCounter, page }) => {
  const apiCalls = useGlobalCounter("api_calls");
  await page.goto("/checkout");
  apiCalls.add(1, { endpoint: "/api/orders" });

  // ❌ Fails whenever an earlier test in this worker already recorded to api_calls
  expect(apiCalls).toHaveOtelCallCount(1);
});
```

**Why this is wrong**: Global metrics accumulate. An exact-count assertion makes the test's outcome depend on which tests ran before it in the same worker — order-dependent, and breaks when tests are added, removed, or resharded.

**How to fix**:

```typescript
test("checkout", async ({ useCounter, page }) => {
  // ✅ Per-test fixture for per-test assertions — isolated value
  const apiCalls = useCounter("api_calls", { unit: "calls" });
  await page.goto("/checkout");
  apiCalls.add(1, { endpoint: "/api/orders" });

  expect(apiCalls).toHaveOtelCallCount(1); // exactly this test's activity
});
```

## Advanced Patterns

Combine a global counter (how often) with a global histogram (how slow) to get a suite-level performance profile from ordinary navigation code:

```typescript
import { test, type Counter, type Histogram } from "@playwright-labs/fixture-otel";
import type { Page } from "@playwright/test";

async function visit(
  page: Page,
  url: string,
  urlCalls: Counter,
  loadTime: Histogram,
) {
  const start = Date.now();
  await page.goto(url);
  loadTime.record(Date.now() - start, { route: url });
  urlCalls.add(1, { url });
}

test("suite profile — home", async ({ page, useGlobalCounter, useGlobalHistogram }) => {
  const urlCalls = useGlobalCounter("url_calls", { unit: "requests" });
  const loadTime = useGlobalHistogram("page_load_ms", { unit: "ms" });

  await visit(page, "/home", urlCalls, loadTime);
});

test("suite profile — dashboard", async ({ page, useGlobalCounter, useGlobalHistogram }) => {
  const urlCalls = useGlobalCounter("url_calls");
  const loadTime = useGlobalHistogram("page_load_ms");

  await visit(page, "/dashboard", urlCalls, loadTime);
});
```

Once data is in Prometheus (either stack reaches it — via the OTel Collector for fixture-otel, via remote-write for fixture-prometheus), run-wide questions become queries:

```promql
# Total URL calls across the whole run (all workers summed by metric name)
sum(url_calls_total)

# p95 page load across every test that navigated
histogram_quantile(0.95,
  sum by (le) (rate(page_load_ms_bucket[1h]))
)
```

**When to use this pattern**: regression detection at suite level — "did the average page get slower this release?" — where per-test assertions are too noisy and backend trends give the answer for free.

## Integration with Other Best Practices

- **Instrument Tests with Custom OTel Metrics, Spans, and Distributed Trace Propagation**: per-test `useCounter` / `useHistogram` answer "what happened inside this test"; global fixtures answer "what happened across the run". Use both — isolated values for assertions, global values for trends.
- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel**: global metrics require the reporter active in the same process — the stdout bridge silently discards data without it. Add `resourceAttributes` so accumulated series are filterable by branch and environment.
- **Merge Fixtures and Expects**: put canonical global-metric creation (with options) into a shared fixtures module so every spec file imports the same settled configuration.
- **Parallel Test Sharding**: sharding splits workers across machines — global metrics stay per-worker, so always read run-wide totals from the backend (`sum` by metric name), never from in-process state.

Reference: [@playwright-labs/fixture-otel](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-otel) and [@playwright-labs/fixture-prometheus](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-prometheus)

---

### 6.10. Simulate Human-Like Input with ghost-cursor

**Tags:** ghost-cursor, mouse, anti-bot, human-like, input  
**Impact:** LOW (helps anti-bot-sensitive flows pass mouse-movement heuristics, but costs speed and reliability on ordinary tests)

**Impact: LOW (helps anti-bot-sensitive flows pass mouse-movement heuristics, but costs speed and reliability on ordinary tests)**

Playwright's native `locator.click()` teleports the mouse to the target and clicks instantly. That is exactly what you want for 99% of tests — but some pages score "humanness" by observing pointer trajectories: login forms behind bot protection, CAPTCHA-adjacent flows, fraud-scored checkouts. The `@playwright-labs/ghost-cursor` package generates realistic Bézier-curve mouse paths with overshoot, jitter, and Fitts's-law timing on top of the native `page.mouse` API, and `@playwright-labs/fixture-ghost-cursor` wires it into `@playwright/test` via `test.extend`. Use it surgically on the flows that need it — never as a blanket replacement for native clicks.

## When to Use

- **Use ghost-cursor when**: A specific flow is gated by anti-bot heuristics that track mouse movement (e.g., a login or signup form that rejects instantaneous clicks)
- **Use the `ghostCursor` fixture when**: You need a ready-to-use cursor with default options in a test
- **Use the `useGhostCursor` factory when**: You need custom options — `visible` overlay for debugging, `performRandomMoves` for idle movement, or `defaultOptions` like `hesitate` and `waitForClick`
- **Consider alternatives when**: The target is your own application with no bot detection — native `locator.click()` is faster, auto-waits for actionability, and is far less flaky
- **Required for**: Tests against third-party or production-like environments where you cannot disable bot protection and the flow fails with plain Playwright clicks

## Guidelines

### Do

- Restrict ghost-cursor to the few tests that actually hit anti-bot heuristics — tag or group them so the cost is visible
- Prefer the `ghostCursor` / `useGhostCursor` fixtures from `@playwright-labs/fixture-ghost-cursor` over calling `createCursor(page)` manually — the fixture keeps cursor creation consistent and mergeable via `mergeTests`
- Keep using web-first assertions (`expect(page).toHaveURL(...)`, `toBeVisible()`) after every cursor action — ghost-cursor changes *how* you click, not *how* you assert
- Tune realism through `defaultOptions` when a flow needs it: `click: { hesitate: 100, waitForClick: 50 }` adds human-like pauses around the press
- Use `useGhostCursor({ visible: true })` or `installMouseHelper()` locally to watch the trajectory while developing the test
- Resolve role-based locators to handles with `locator.elementHandle()` when you want ghost-cursor to click a locator you already have — cursor methods accept a CSS/XPath selector or an `ElementHandle`

### Don't

- Don't apply ghost-cursor to every test in the suite — Bézier path generation plus realistic delays make each click noticeably slower than `locator.click()`, and the suite pays for it with zero benefit
- Don't expect ghost-cursor to replace web-first assertions or auto-waiting — it is an input simulation tool, not a waiting strategy
- Don't expect cursor actions to auto-wait for actionability like `locator.click()` does — `page.mouse` dispatches raw events; use the `waitForSelector` option or wait for the element explicitly first
- Don't enable `performRandomMoves: true` in CI unless a heuristic genuinely requires idle movement — background motion adds runtime and non-determinism to every test that uses the cursor
- Don't fake typing with the mouse — ghost-cursor has no keyboard API; click the field with the cursor, then use `page.fill()` or `page.keyboard` as usual
- Don't treat ghost-cursor as a CAPTCHA solver — it only makes mouse movement look human; it does not defeat challenges, fingerprinting, or rate limiting

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/ghost-cursor @playwright-labs/fixture-ghost-cursor`
- **Standalone**: `createCursor(page, options?)` from `@playwright-labs/ghost-cursor` — for scripts without the test runner
- **Fixtures**: `ghostCursor` (default options) and `useGhostCursor(options?)` (factory) from `@playwright-labs/fixture-ghost-cursor`
- **Movement**: `move(selector)`, `moveTo({ x, y })`, `moveBy({ x, y })`, `getLocation()`
- **Clicking**: `click(selector?, options?)`, `mouseDown()`, `mouseUp()` with `ClickOptions` — `hesitate`, `waitForClick`, `button`, `clickCount`
- **Scrolling**: `scroll({ y })`, `scrollTo('bottom')`, `scrollIntoView(selector)` with `ScrollOptions` — `scrollSpeed`, `scrollDelay`
- **Realism tuning** (`MoveOptions`): `overshootThreshold`, `moveSpeed`, `moveDelay`, `randomizeMoveDelay`, `paddingPercentage`, `useTimestamps`, `maxTries`, `waitForSelector`
- **Debug**: `visible: true` cursor option, or `installMouseHelper()` / `removeMouseHelper()` on an existing cursor

## Edge Cases and Constraints

### Limitations

- Cursor actions go through `page.mouse`, bypassing Playwright's actionability checks (visible, stable, enabled, receives events). A native `locator.click()` that waits and retries is strictly more reliable against ordinary UI.
- Selectors are CSS/XPath strings or `ElementHandle`s — there is no `Locator` overload. Convert with `await locator.elementHandle()` when starting from a role locator.
- Human-like timing is deliberate latency: `hesitate`, `waitForClick`, `moveDelay`, and randomized movement all add wall-clock time per action. Across hundreds of tests this compounds into minutes of CI time.
- Ghost-cursor simulates the mouse only. Keyboard input, file uploads, and drag-and-drop still need the native `page.keyboard`, `setInputFiles()`, or manual `mouseDown`/`move`/`mouseUp` sequences.

### Edge Cases

1. **Element moves during the approach**: The path is computed up front; if the target shifts (lazy layout, animation), the click can land off-target. `MoveOptions.maxTries` (default `10`) retries when element intersection fails — wait for layout stability before clicking.
2. **Long-distance moves**: Overshoot is applied only above `overshootThreshold` (default `500` px). If a heuristic expects overshoot on shorter moves, lower the threshold via `defaultOptions.move`.
3. **Detached elements**: If the selector resolves but the element detaches before the cursor arrives, the click hits stale coordinates. Pass `waitForSelector` in options or assert visibility first.
4. **Headless vs. headed**: Trajectories work in both modes, but `visible: true` and `installMouseHelper()` are only useful when you can see the browser — strip them from CI runs.

### What Breaks If Ignored

- **Applied everywhere**: Suite runtime inflates measurably, and tests get flakier because raw `page.mouse` events skip actionability checks — you traded the most reliable click in Playwright for a slower one with no anti-bot to impress
- **Treated as a waiting strategy**: Clicks fire against elements that are not ready yet — intermittent `misclick` failures that no amount of `hesitate` will fix
- **Expected to defeat bot detection alone**: Mouse trajectories are one signal among many (fingerprints, TLS, timing, reputation) — the flow still gets blocked and the test fails anyway

**Incorrect (ghost-cursor applied indiscriminately, assertions replaced by hope):**

```typescript
import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

test("add item to cart", async ({ page, ghostCursor }) => {
  await page.goto("/products");

  // ❌ Own application, no bot protection — native click is faster and auto-waits
  await ghostCursor.click("text=Add to cart");

  // ❌ Raw mouse click with no actionability check, then a hard-coded wait
  //    instead of a web-first assertion — flaky and slow at the same time
  await ghostCursor.click("#checkout");
  await page.waitForTimeout(3000);

  // ❌ Ghost-cursor everywhere: every test in the suite pays the trajectory
  //    tax for zero anti-bot benefit
  expect(page.url()).toContain("/confirmation"); // ❌ non-retrying assertion
});
```

**Why this fails:**
- Every cursor click generates and plays a Bézier path with realistic delays — pure overhead where no heuristic is watching
- `page.mouse` events do not wait for the element to be visible, stable, or enabled, so the click races the UI
- `waitForTimeout` + a non-retrying `page.url()` assertion reintroduces exactly the flakiness web-first assertions exist to prevent

**Correct (ghost-cursor scoped to the anti-bot-sensitive flow, web-first assertions everywhere):**

```typescript
// tests/fixtures.ts
import { mergeTests, test as base } from "@playwright/test";
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ✅ Merge once — every spec can opt into ghostCursor per test
export const test = mergeTests(base, ghostTest);
export { expect } from "@playwright/test";
```

```typescript
// tests/login.spec.ts
import { test, expect } from "./fixtures";

test("login behind bot protection", async ({ page, ghostCursor }) => {
  await page.goto("https://app.example.com/login");

  // ✅ Human-like approach + click on the protected form only
  await ghostCursor.click("#username");
  await page.fill("#username", "user@example.com"); // keyboard stays native

  await ghostCursor.click("#password");
  await page.fill("#password", "s3cret");

  // ✅ hesitate/waitForClick add realistic pauses around the press
  await ghostCursor.click("#submit", { hesitate: 120, waitForClick: 60 });

  // ✅ Web-first assertion — ghost-cursor changes the click, never the check
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("ordinary settings page — no ghost-cursor", async ({ page }) => {
  await page.goto("/settings");

  // ✅ No anti-bot here: native locator click auto-waits and is faster
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});
```

**Why this works:**
- The trajectory cost is paid only by the test that faces the anti-bot heuristic; the rest of the suite keeps native speed and auto-waiting
- `page.fill()` handles typing — ghost-cursor owns the mouse, Playwright owns the keyboard
- Web-first assertions retry until the condition holds, so the test stays deterministic regardless of how long the human-like click took

## Common Mistakes

### Mistake 1: Using ghost-cursor as the default click for the whole suite

```typescript
// tests/fixtures.ts
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ❌ Re-exporting the ghost test as THE test — every spec now clicks
//    with Bézier paths, even plain CRUD screens
export const test = ghostTest;
```

**Why this is wrong**: Each `ghostCursor.click()` generates a path, replays it with inter-frame delays, and skips actionability checks. Multiplied across a suite, this is slower and flakier than the native click it replaced, with no anti-bot audience.

**How to fix**:

```typescript
// tests/fixtures.ts
import { mergeTests, test as base } from "@playwright/test";
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ✅ Base test stays the default; ghostCursor is available on demand
export const test = mergeTests(base, ghostTest);

// tests that need it destructure { ghostCursor }; everyone else
// keeps using locator.click()
```

### Mistake 2: Expecting ghost-cursor to wait for the element

```typescript
test("checkout", async ({ page, ghostCursor }) => {
  await page.goto("/cart");
  // ❌ Button is rendered by a slow API call — the raw mouse click fires
  //    at whatever is under the cursor right now
  await ghostCursor.click("#place-order");
});
```

**Why this is wrong**: `page.mouse` dispatches events immediately. Without Playwright's actionability checks, the click races rendering and lands on nothing — or worse, on the wrong element.

**How to fix**:

```typescript
test("checkout", async ({ page, ghostCursor }) => {
  await page.goto("/cart");

  // ✅ Wait explicitly first — web-first — then let the cursor do its work
  const placeOrder = page.getByRole("button", { name: "Place order" });
  await expect(placeOrder).toBeVisible();
  await expect(placeOrder).toBeEnabled();

  // ✅ Or pass waitForSelector so the cursor waits before moving
  await ghostCursor.click("#place-order", { waitForSelector: 5000 });
});
```

### Mistake 3: Trying to type or solve challenges with the cursor

```typescript
test("signup", async ({ page, ghostCursor }) => {
  // ❌ ghost-cursor has no keyboard API — this clicks the field and stops
  await ghostCursor.click("#email");
  // ...now what? there is no cursor.type()
});
```

**Why this is wrong**: The package simulates mouse movement, clicks, and scrolling only. Keyboard input is out of scope, and no amount of realistic mouse motion passes an actual CAPTCHA challenge.

**How to fix**:

```typescript
test("signup", async ({ page, ghostCursor }) => {
  // ✅ Cursor handles the human-like approach; native APIs handle the rest
  await ghostCursor.click("#email");
  await page.fill("#email", "new@example.com");
  await page.keyboard.press("Tab");
  await page.fill("#password", "s3cret");
});
```

### Mistake 4: Leaving debug aids on in CI

```typescript
test("protected flow", async ({ page, useGhostCursor }) => {
  // ❌ visible overlay + random idle moves in CI: slower, non-deterministic,
  //    and nobody is watching the browser
  const cursor = useGhostCursor({ visible: true, performRandomMoves: true });
  await cursor.click("#submit");
});
```

**Why this is wrong**: `visible` injects a debug overlay you cannot see in headless CI, and `performRandomMoves` keeps the mouse wandering between actions — extra runtime and entropy in an environment that needs determinism.

**How to fix**:

```typescript
test("protected flow", async ({ page, useGhostCursor }) => {
  // ✅ Debug locally with the overlay; CI gets the default, deterministic cursor
  const cursor = useGhostCursor({
    visible: !!process.env.DEBUG_CURSOR,
  });
  await cursor.click("#submit");
});
```

## Advanced Patterns

### Custom realism profiles with defaultOptions

```typescript
import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

test("fraud-scored checkout", async ({ page, useGhostCursor }) => {
  // ✅ One profile applied to every cursor call in this test
  const cursor = useGhostCursor({
    start: { x: 100, y: 100 },
    defaultOptions: {
      move: { overshootThreshold: 300, moveDelay: 50 },
      click: { hesitate: 100, waitForClick: 50 },
    },
  });

  await page.goto("/checkout");
  await cursor.scrollIntoView("#payment-form");
  await cursor.click("#card-number");
  await page.fill("#card-number", "4242424242424242");
  await cursor.click("#pay", { hesitate: 150 });

  await expect(page).toHaveURL(/\/order-confirmed/);
});
```

**When to use this pattern**: A specific flow is scored on interaction cadence and you need consistent hesitation/overshoot tuning across several cursor actions — set it once in `defaultOptions` instead of repeating options per call.

### Combining role locators with cursor movement

```typescript
import { test, expect } from "./fixtures";

test("protected form with role locators", async ({ page, ghostCursor }) => {
  await page.goto("/signup");

  const submit = page.getByRole("button", { name: "Create account" });
  // ✅ Web-first waiting on the locator, human-like click via its handle
  await expect(submit).toBeVisible();
  await ghostCursor.click(await submit.elementHandle());

  await expect(page).toHaveURL(/\/welcome/);
});
```

**When to use this pattern**: Your suite is standardized on role-based locators (see locator-role-based) but one flow needs human-like input — resolve the locator to an `ElementHandle` and keep both worlds.

### Inspecting trajectories with the math utilities

```typescript
import { path, overshoot, type Vector } from "@playwright-labs/ghost-cursor";

// ✅ Generate and assert on the raw trajectory in a unit test of your own
//    tooling — no browser required
const start: Vector = { x: 0, y: 0 };
const end: Vector = { x: 600, y: 400 };
const points = path(start, end);

console.assert(points[0].x === 0 && points.at(-1)!.x === 600);
```

**When to use this pattern**: Debugging or documenting what the cursor actually does — `path(start, end)`, `bezierCurve`, and `overshoot` are exported for exactly this kind of offline inspection.

## Integration with Other Best Practices

- **assertion-web-first**: Non-negotiable alongside ghost-cursor. The cursor changes how input is delivered; assertions must still auto-retry (`toHaveURL`, `toBeVisible`) or the added latency turns into race conditions.
- **stable-auto-waiting**: Ghost-cursor bypasses Playwright's built-in auto-waiting for clicks. Compensate with explicit web-first waits on the target before every cursor action, or use the `waitForSelector` option.
- **locator-role-based**: Cursor methods take CSS/XPath selectors or `ElementHandle`s. Keep authoring role-based locators and convert with `elementHandle()` at the boundary instead of falling back to brittle CSS everywhere.
- **parallel-test-isolation**: Each `ghostCursor` fixture instance is bound to the test's own `page`, so parallel workers never share cursor state — but remember each worker pays the speed cost independently.
- **Scale considerations**: At 100+ tests, even a few seconds of trajectory time per protected flow is fine; applied suite-wide it adds many minutes. Keep ghost-cursor usage countable on one hand per project.

Reference: [@playwright-labs/ghost-cursor](https://github.com/vitalics/playwright-labs/tree/main/packages/ghost-cursor) and [@playwright-labs/fixture-ghost-cursor](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ghost-cursor)

---

### 6.11. Test Against Real Services with fixture-testcontainers

**Tags:** testcontainers, docker, integration, database, fixtures  
**Impact:** MEDIUM (catches SQL, migration, and connection bugs that mocks hide, with automatic container cleanup after every test)

**Impact: MEDIUM (catches SQL, migration, and connection bugs that mocks hide, with automatic container cleanup after every test)**

Mocks drift from reality: a stubbed database accepts any query, a fake cache ignores TTL semantics, and neither will ever tell you that your migration is broken or your connection string is wrong. The `@playwright-labs/fixture-testcontainers` package wraps [Testcontainers](https://testcontainers.com/) in Playwright fixtures — `useContainer` starts a real Docker container (PostgreSQL, MySQL, Redis, or any image) per test and **stops it automatically, even if the test fails**. `useContainerFromDockerFile` builds and starts a custom image from a local Dockerfile. The package's `expect` adds 13 custom matchers for asserting container state — health, ports, logs, labels, networks — without writing polling loops.

## When to Use

- **Use useContainer when**: Integration tests need a real database, cache, or broker — validating SQL queries, running migrations, testing cache invalidation against actual Redis
- **Use useContainerFromDockerFile when**: The service under test has its own Dockerfile and you want to test the exact image you deploy
- **Use the custom matchers when**: Asserting container readiness and state (`toBeContainerHealthy`, `toBeContainerPort`) instead of guessing with sleeps
- **Consider alternatives when**: Pure unit tests with no I/O, or CI agents without a Docker daemon — mock at the API boundary there instead
- **Required for**: Tests that would otherwise mock the persistence layer — schema changes, query rewrites, and connection handling are exactly what mocks cannot verify

## Guidelines

### Do

- Import `test` and `expect` from `@playwright-labs/fixture-testcontainers` instead of `@playwright/test` — the fixtures and matchers are pre-wired
- Always set an explicit `waitStrategy` (`Wait.forLogMessage`, `Wait.forHttp`, `Wait.forHealthCheck`) so the fixture resolves only when the service is actually ready
- Pair `healthCheck` with `Wait.forHealthCheck()` for databases, then assert `toBeContainerHealthy()` — a listening port is not proof of an initialized database
- Read the real endpoint via `container.getHost()` and `container.getMappedPort(5432)` — Docker assigns a free host port, which keeps parallel workers collision-free
- Wrap containers in typed fixtures with `base.extend` (e.g., a `redisUrl` fixture) so tests declare intent instead of repeating container setup
- Assert container configuration with the package matchers — ports, labels, name, network, user, log output — rather than re-inspecting via CLI

### Don't

- Don't mock the database in integration tests — a mock that always returns rows proves nothing about your SQL, schema, or migration scripts
- Don't start containers with a bare `new GenericContainer(...).start()` in a test body and no cleanup — the container keeps running after the test ends
- Don't pin host ports (`{ container: 5432, host: 5432 }`) — two parallel workers cannot bind the same host port; let Docker map ephemeral ports
- Don't call the async matchers without `await` (`toBeContainerHealthy()`, `toMatchContainerLogMessage(...)`) — an un-awaited assertion promise lets a failing check pass silently
- Don't assume `useContainer` resolution means "ready for queries" without a `waitStrategy` — the default wait sees the port open before PostgreSQL finishes initializing
- Don't run container tests where no Docker daemon is available — there is no automatic fallback; gate them by project or environment instead

### Tool Usage Patterns

- **Install**: `npm install -D @playwright-labs/fixture-testcontainers testcontainers`
- **Fixtures**: `useContainer(imageOrContainer, opts?)`, `useContainerFromDockerFile(context, dockerfilePath?, opts?)` — both return `Promise<StartedTestContainer>`
- **Options**: every `ContainerOpts` key maps 1:1 to a `GenericContainer.with*` method — `ports` → `withExposedPorts`, `environment` → `withEnvironment`, `healthCheck` → `withHealthCheck`, `waitStrategy` → `withWaitStrategy`, `startupTimeout` → `withStartupTimeout`, plus `command`, `name`, `labels`, `network`, `networkAliases`, `bindMounts`, `tmpFs`, `copyFiles`, `reuse`, `pullPolicy`, and more
- **Wait strategies**: `Wait.forLogMessage(...)`, `Wait.forHttp(path, port)`, `Wait.forHealthCheck()` — imported from `testcontainers`
- **Requirements**: `@playwright/test` >= 1.57.0, `testcontainers` >= 10.0.0, Docker running locally
- **The 13 custom matchers** (import `expect` from the package):

| Matcher | Async | Asserts |
| ------- | ----- | ------- |
| `toBeContainerRunning()` | yes | Container state is `running` |
| `toBeContainerStarted()` | yes | Container status is `running` |
| `toBeContainerStopped()` | yes | Container status is `exited` |
| `toBeContainerHealthy()` | yes | Docker HEALTHCHECK status is `healthy` |
| `toMatchContainerLogMessage(string \| RegExp, collator?)` | yes | Logs contain substring / match regex |
| `toHaveContainerUser(user?, collator?)` | yes | Container runs as the given user |
| `toMatchContainerUser(string \| RegExp, collator?)` | yes | Container user matches pattern |
| `toHaveContainerLabel(key, value?, collator?)` | no | Label present (optional exact value) |
| `toBeContainerPort(port)` | no | Port is mapped to a host port |
| `toMatchContainerPortInRange(port, range?)` | no | Mapped host port within `{ min, max }` bounds |
| `toHaveContainerName(string, collator?)` | no | Exact container name |
| `toMatchContainerName(string \| RegExp, collator?)` | no | Container name matches pattern |
| `toHaveContainerNetwork(networkName, collator?)` | no | Connected to the given network |

All matchers support `.not`; string matchers accept an optional `Intl.Collator` for locale-aware matching (ignored when a `RegExp` is passed — use regex flags instead).

## Edge Cases and Constraints

### Limitations

- Requires a running Docker daemon on the machine executing the tests — developers and CI agents without Docker cannot run these tests at all
- Container startup adds seconds per test, and the first run pulls images from the registry — pre-pull images in CI or control pulling via `pullPolicy`
- All containers started in one test are stopped in parallel after it — teardown time grows with container count per test
- `await using` cleanup syntax requires TypeScript ≥ 5.2 and `"lib": ["ES2022", "esnext.disposable"]` in `tsconfig.json`

### Edge Cases

1. **Port open, database not initialized**: The default wait strategy resolves when the port listens, but PostgreSQL logs `ready to accept connections` only after init — early queries fail intermittently. Use `Wait.forLogMessage("ready to accept connections")` or a `healthCheck` + `Wait.forHealthCheck()`.
2. **Parallel workers and fixed host ports**: Two workers binding host port 5432 collide on startup. Pass `ports: 5432` (container port only) and resolve the endpoint with `getMappedPort(5432)`.
3. **Containers outside a test body**: `useContainer` is test-scoped. In a custom fixture, `test.beforeAll`, or a global setup script use `await using` — `StartedTestContainer` implements `Symbol.asyncDispose`, so the container stops when the scope exits, with no `try/finally`.
4. **Non-English logs and names**: String matchers accept an `Intl.Collator` (e.g., `new Intl.Collator("fr", { sensitivity: "base" })`) for locale- and case-insensitive matching.

### What Breaks If Ignored

- **Without a wait strategy or healthcheck**: Tests race container startup — flaky `ECONNREFUSED` and "database system is starting up" errors that pass on retry and erode trust in the suite
- **Without fixture cleanup**: Leaked containers accumulate on developer machines and CI agents — stale `postgres`/`redis` containers exhaust ports and disk until `docker system prune`
- **Without real services**: Mocks drift from real SQL and cache semantics — the suite stays green while production breaks on the first real query

**Incorrect (mocked database — green tests, unverified SQL):**

```typescript
import { test, expect } from "@playwright/test";

// ❌ A hand-rolled stub that accepts any query and always returns rows
const db = {
  query: async (_sql: string) => [{ id: 1, email: "user@example.com" }],
};

test("user email shown on profile", async ({ page }) => {
  const rows = await db.query("SELEC * FORM users"); // ❌ typo'd SQL passes too
  await page.goto(`/profile/${rows[0].id}`);
  await expect(page.getByTestId("email")).toHaveText("user@example.com");
  // ❌ Nothing here touches PostgreSQL — schema, migrations, and queries unverified
});
```

**Why this fails:**
- The stub cannot reject invalid SQL, missing columns, or a failed migration — the test passes no matter how broken the data layer is
- Mock return shapes drift from the real schema over time; tests keep passing against a shape production no longer returns
- Connection handling, authentication, and startup ordering are never exercised

**Correct (real PostgreSQL container, readiness wait, auto-cleanup):**

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("user email shown on profile", async ({ useContainer, page }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432, // ✅ container port only — Docker maps a free host port
    environment: {
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "secret",
      POSTGRES_DB: "shop",
    },
    // ✅ Docker-level healthcheck: pg_isready every 1s, up to 5 retries
    healthCheck: {
      test: ["CMD-SHELL", "pg_isready -U test"],
      interval: 1_000,
      retries: 5,
    },
    waitStrategy: Wait.forHealthCheck(), // ✅ resolves only when healthy
    startupTimeout: 30_000,
  });

  // ✅ Assert infrastructure state with the package matchers
  await expect(postgres).toBeContainerRunning();
  await expect(postgres).toBeContainerHealthy();
  expect(postgres).toBeContainerPort(5432);

  const url = `postgres://test:secret@${postgres.getHost()}:${postgres.getMappedPort(5432)}/shop`;
  await runMigrations(url); // ✅ real migrations against a real database
  await seedUser(url, { id: 1, email: "user@example.com" });

  await page.goto("/profile/1");
  await expect(page.getByTestId("email")).toHaveText("user@example.com");
  // ✅ container stops automatically here — even if an assertion above threw
});
```

**Why this works:**
- The test fails if the SQL, schema, or migration is wrong — exactly the bugs mocks hide
- `waitStrategy: Wait.forHealthCheck()` guarantees the fixture resolves after PostgreSQL is ready, eliminating startup races
- Ephemeral port mapping via `getMappedPort` keeps parallel workers collision-free, and fixture teardown stops the container on every outcome

## Common Mistakes

### Mistake 1: No Readiness Wait — Test Races Container Startup

```typescript
import { test } from "@playwright-labs/fixture-testcontainers";

test("races startup", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  // ❌ default wait sees a listening port, but PostgreSQL is still initializing
  await seedDatabase(postgres.getMappedPort(5432)); // flaky ECONNREFUSED
});
```

**Why this is wrong**: A listening port only proves the process bound a socket, not that the database finished initializing and accepts authenticated connections. The test passes or fails depending on machine speed — classic timing flakiness.

**How to fix**:

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("waits for readiness", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    // ✅ explicit readiness contract
    waitStrategy: Wait.forLogMessage("ready to accept connections"),
    startupTimeout: 30_000,
  });
  await expect(postgres).toMatchContainerLogMessage("ready to accept connections");
  await seedDatabase(postgres.getMappedPort(5432)); // deterministic
});
```

### Mistake 2: Leaking Containers with Manual start()

```typescript
import { test } from "@playwright/test";
import { GenericContainer } from "testcontainers";

test("manual container", async () => {
  const container = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();
  const port = container.getMappedPort(6379);
  // ❌ test ends, container keeps running — 100 tests leave 100 stale containers
});
```

**Why this is wrong**: Nothing stops the container. Leaked containers pile up on laptops and CI agents, holding ports and disk until someone runs `docker system prune` — and subsequent runs start failing on environment state rather than code.

**How to fix**: use the fixture (automatic stop, even on failure), or `await using` when no fixture is available:

```typescript
import { test } from "@playwright-labs/fixture-testcontainers";

test("fixture cleanup", async ({ useContainer }) => {
  const redis = await useContainer("redis:8", { ports: 6379 });
  // ✅ stopped automatically after the test, pass or fail
});
```

```typescript
import { test } from "@playwright/test";
import { GenericContainer } from "testcontainers";

test("explicit scope cleanup", async () => {
  await using redis = await new GenericContainer("redis:8")
    .withExposedPorts(6379)
    .start();
  // ✅ Symbol.asyncDispose stops the container when the scope exits — no try/finally
});
```

### Mistake 3: Pinning Host Ports

```typescript
test("fixed host port", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    // ❌ every worker tries to bind host port 5432 — second worker fails to start
    ports: [{ container: 5432, host: 5432 }],
    environment: { POSTGRES_PASSWORD: "secret" },
  });
});
```

**Why this is wrong**: Fixed host ports serialize what should be parallel and break the moment two tests (or two CI jobs on one agent) use the same database image.

**How to fix**: expose the container port only and resolve the assigned host port:

```typescript
test("ephemeral host port", async ({ useContainer }) => {
  const postgres = await useContainer("postgres:16", {
    ports: 5432, // ✅ Docker assigns a free host port
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  expect(postgres).toMatchContainerPortInRange(5432, { min: 1024, max: 65535 });
  const url = `postgres://postgres:secret@${postgres.getHost()}:${postgres.getMappedPort(5432)}`;
});
```

### Mistake 4: Forgetting await on Async Matchers

```typescript
test("un-awaited assertion", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  // ❌ returns a Promise — the test can pass before the assertion resolves
  expect(container).toBeContainerHealthy();
});
```

**Why this is wrong**: The health assertion becomes an unhandled floating promise; a failing check may surface after the test already reported success — or crash the worker as an unhandled rejection.

**How to fix**:

```typescript
test("awaited assertion", async ({ useContainer }) => {
  const container = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
  });
  await expect(container).toBeContainerHealthy(); // ✅ assertion gates the test
  expect(container).toBeContainerPort(5432); // port matchers are sync — no await
});
```

## Advanced Patterns

Compose containers into typed fixtures so tests declare dependencies, not setup code:

```typescript
// fixtures/index.ts — a redisUrl fixture any test can request
import { test as base, expect } from "@playwright-labs/fixture-testcontainers";

export const test = base.extend<{ redisUrl: string }>({
  redisUrl: async ({ useContainer }, use) => {
    const container = await useContainer("redis:8", { ports: 6379 });
    await use(
      `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    );
    // ✅ container stops when the fixture tears down
  },
});
export { expect };
```

Build and run a custom image with `useContainerFromDockerFile`, waiting on an HTTP health endpoint:

```typescript
import { test, expect } from "@playwright-labs/fixture-testcontainers";
import { Wait } from "testcontainers";

test("app image from Dockerfile", async ({ useContainerFromDockerFile }) => {
  const app = await useContainerFromDockerFile("./docker", "Dockerfile.test", {
    ports: 8080,
    waitStrategy: Wait.forHttp("/health", 8080), // ✅ poll until HTTP 200
  });

  await expect(app).toBeContainerRunning();
  expect(app).toMatchContainerPortInRange(8080, { min: 1024 }); // no upper bound
});
```

Start a full stack in one test — all containers stop in parallel afterwards:

```typescript
test("cache + database stack", async ({ useContainer }) => {
  const redis = await useContainer("redis:8", { ports: 6379 });
  const postgres = await useContainer("postgres:16", {
    ports: 5432,
    environment: { POSTGRES_PASSWORD: "secret" },
    waitStrategy: Wait.forLogMessage("ready to accept connections"),
  });

  await expect(redis).toMatchContainerLogMessage("Ready to accept connections");
  await expect(postgres).toBeContainerRunning();
  // ✅ both containers are stopped in parallel after the test
});
```

**When to use this pattern**: Typed container fixtures pay off once more than a couple of tests share the same service; Dockerfile builds belong in tests that validate the deployable artifact itself; multi-container stacks are for true end-to-end flows — keep per-test container count low, since startup time is additive.

## Integration with Other Best Practices

- **Compose Fixtures with mergeTests and mergeExpects**: Merge `test` and `expect` from `fixture-testcontainers` with other `@playwright-labs/*` fixture packages so one suite combines containers, custom matchers, and other fixtures without import conflicts
- **Ensure Test Isolation for Parallel Execution**: Ephemeral port mapping makes per-test containers parallel-safe by construction — combine with test-scoped data (unique databases/schemas per test) so parallel workers never share mutable state
- **Use Auto-Waiting Instead of Manual Waits**: `waitStrategy` is the container-side equivalent of web-first assertions — declare readiness conditions (`Wait.forLogMessage`, `Wait.forHealthCheck`) instead of `setTimeout` sleeps
- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel**: Real containers make tests slower by design — track duration p95 trends to keep the integration suite's cost visible and catch image-pull regressions in CI
- **Scale considerations**: At 100+ container-backed tests, image pulls and startup dominate runtime — pre-pull images on CI agents, control pulling via `pullPolicy`, and reserve real containers for tests whose assertions actually need them

Reference: [@playwright-labs/fixture-testcontainers](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-testcontainers)

---

### 6.12. Use Custom Fixtures for Reusable Test Setup and Teardown

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

### 6.13. Use test.describe for Logical Test Grouping

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

Playwright's built-in reporter surfaces results as HTML or JSON snapshots. The `@playwright-labs/reporter-otel` package sends every test run as OpenTelemetry traces and metrics to any OTLP-compatible backend — Jaeger, Grafana Tempo, Prometheus, Datadog, Grafana Cloud. Every test becomes a span with step-level children, and built-in metrics track pass rate, duration p95, retries, step counts and durations by category, annotation counts, run wall-clock time, and process memory without any extra code.

## When to Use

- **Use reporter-otel when**: You want long-term test health trends, flakiness dashboards, or Playwright traces in the same system as your service traces
- **Add fixture-otel when**: Individual tests need custom business counters, latency histograms, or need to propagate a `traceparent` into the system under test
- **Use the built-in step and run metrics when**: You need to know where suite time goes — `pw_test_step_count` / `pw_test_step_duration` are recorded for every step (nested included) with a `test.step.category` attribute, `pw_test_annotation_count` tracks tagging by `annotation.type`, and `pw_run_duration` captures wall-clock run time — all with zero code changes
- **Required for**: Teams running CI at scale who need to answer "which tests are getting slower?" or "what's our pass rate over the last 7 days?"

## Guidelines

### Do

- Add `resourceAttributes` with deployment environment and service version — makes dashboards filterable by branch or release
- Pass CI environment variables via `env` option so they appear as span attributes
- Use the `prefix` option to namespace your metrics when sharing a collector with other services
- Set up the full stack (OTel Collector → Jaeger + Prometheus + Grafana) for local development using the provided Docker Compose example
- Query pass rate and duration p95 in Grafana/Prometheus to detect degradation before it becomes a crisis
- Group `pw_test_step_duration` by `test.step.category` (`pw:api`, `expect`, `hook`, `test.step`) to see whether actions, assertions, or hooks dominate suite time before optimizing anything
- Alert on `pw_run_duration` for CI job duration — it is wall-clock per run, so it stays honest under parallel workers where summing per-test durations misleads
- Slice `pw_test_annotation_count` by `annotation.type` to audit tagging discipline across suites (`issue`, `feature`, or custom types)

### Don't

- Don't point Playwright directly at Jaeger or Prometheus — always go through an OTel Collector; it handles buffering, retries, and fan-out
- Don't set `exportIntervalMillis` too low (< 10s) in large parallel runs — it creates unnecessary load on the collector
- Don't skip `satisfies OtelReporterOptions` on the config object — TypeScript type checking prevents misconfigured endpoints from silently dropping data
- Don't use HTTPS without valid certificates unless you set the appropriate Node TLS env vars
- Don't rebuild step, annotation, or run-duration metrics with `fixture-otel` counters — the reporter records them automatically; reserve custom fixtures for business metrics the reporter cannot see

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/reporter-otel`
- **Default endpoint**: `localhost:4318` (OTLP/HTTP) — standard OTel Collector port
- **Backends tested**: Jaeger, Grafana Tempo, Grafana Cloud, Prometheus (via Collector), Datadog OTLP intake
- **Config key options**: `host`, `port`, `protocol`, `headers`, `auth`, `prefix`, `resourceAttributes`, `env`, `exportIntervalMillis`
- **Auto-instrumented metrics (no code required)**: `pw_test_step_count` / `pw_test_step_duration` (attrs `test.step.category`, `test.suite`, `test.project`, `browser.*`), `pw_test_annotation_count` (attrs `annotation.type`, `test.suite`), `pw_run_duration` (run wall-clock, ms histogram recorded at `onEnd`)
- **Runtime resource attributes**: `process.runtime.name` is auto-detected as `nodejs`, `bun`, or `deno` (via `process.versions`); `process.runtime.version` plus full component versions land as `process.runtime.versions.*` (`…versions.node`, `…versions.v8`, `…versions.openssl`, `…versions.bun` under Bun, `…versions.deno` under Deno) — split dashboards by runtime when CI runners are heterogeneous

## Edge Cases and Constraints

### Limitations

- The reporter creates the test span at `onTestEnd` (not `onTestBegin`) — this is intentional so that annotations pushed during the test are available before the span is created. All timing is preserved via explicit `startTime`.
- `fixture-otel` metrics are sent over a stdout bridge (`__pw_otel__` prefix) — they arrive in the reporter's `onStdOut` hook, not through a direct SDK call. This works across worker boundaries but requires the reporter to be active.
- Without the reporter running, `startWorkerSdk()` in `fixture-otel` exits silently — safe for local runs without a collector

### Edge Cases

1. **Grafana Cloud auth**: Use `auth.username` = instance ID, `auth.password` = API key. Protocol must be `https` and port `443`.
2. **Missing spans in Jaeger**: If spans appear in Prometheus metrics but not Jaeger, the collector is routing traces and metrics to different exporters — check collector pipeline config.
3. **High-cardinality attributes**: Adding unique IDs (user IDs, order IDs) to `resourceAttributes` can exhaust Prometheus label space. Use span attributes via `pw_otel.*` annotations for per-test data instead.
4. **Mixed runtimes in CI**: If some runners execute Playwright under Bun or Deno, `process.runtime.name` and `process.runtime.versions.*` (visible in Prometheus `target_info`) tell them apart — filter by runtime before comparing duration trends, because runtimes are not performance-equivalent.

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

# Where suite time goes — total step seconds by category
sum by (test_step_category) (e2e_test_step_duration_milliseconds_sum) / 1000

# 95th percentile step duration by category (find slow hooks or expects)
histogram_quantile(0.95,
  sum by (le, test_step_category) (rate(e2e_test_step_duration_milliseconds_bucket[1h]))
)

# Step counts by category
sum by (test_step_category) (e2e_test_step_count_total)

# Annotation usage by type (tagging discipline across suites)
sum by (annotation_type) (e2e_test_annotation_count_total)

# Wall-clock run duration (CI job time trend)
histogram_quantile(0.95,
  sum by (le) (rate(e2e_run_duration_milliseconds_bucket[1d]))
)

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

### 8.3. Push Test Metrics to Prometheus in Real Time with reporter-prometheus-remote-write

**Tags:** prometheus, metrics, reporter, remote-write, grafana, monitoring, observability, ci  
**Impact:** MEDIUM (turns ephemeral CI results into live, queryable Prometheus series for dashboards and alerting)

**Impact: MEDIUM (turns ephemeral CI results into live, queryable Prometheus series for dashboards and alerting)**

Playwright's HTML report is a static snapshot: it lives inside one CI build, gets archived as an artifact, and cannot answer "is this suite getting slower over the last 30 days?" The `@playwright-labs/reporter-prometheus-remote-write` package pushes every test result into Prometheus as it happens — `onTestEnd` and `onTestStepEnd` series arrive during the run, run-level aggregates flush at exit, and Node.js process stats ride along. Grafana turns that into pass-rate trends, duration heatmaps, and failure-spike alerts next to your application metrics.

## When to Use

- **Use this reporter when**: Your observability stack is already Prometheus + Grafana and you want test health (pass rate, duration, retries, timeouts) queryable with PromQL and alertable via Alertmanager
- **Use this reporter when**: You want metrics *during* the run — per-test and per-step series land in Prometheus as each test finishes, not after the HTML report is uploaded
- **Consider reporter-otel when**: You need distributed traces, or you ship telemetry to multiple backends through an OTel Collector instead of pushing straight to Prometheus
- **Consider the HTML report when**: You only need to debug a single failed run locally — a time-series database adds no value there
- **Required for**: Teams tracking flakiness and duration trends across branches, shards, and releases over weeks or months

## Guidelines

### Do

- Set `serverUrl` to the full remote-write endpoint — `http://localhost:9090/api/v1/write`, not just `http://localhost:9090`
- Start Prometheus 3.x with `--web.enable-remote-write-receiver` (on 2.x use `--enable-feature=remote-write-receiver`) — the push endpoint is off by default
- Keep `["list"]` in the reporter array — this reporter sets `printsToStdio()` to `false`, so without `list` you get no console output
- Use the `prefix` option (default `pw_`) to namespace metrics when several test suites share one Prometheus
- Add static dimensions via `labels` (e.g. `{ ci: "true", branch: "main" }`) — they are applied to every series the reporter pushes
- Pass an explicit allowlist via `env` (e.g. `{ GIT_BRANCH: process.env.GIT_BRANCH }`) so build metadata becomes the `pw_env` series
- Type the options object with `satisfies PrometheusOptions` — TypeScript catches a missing `serverUrl` at compile time instead of at run start

### Don't

- Don't omit `serverUrl` — the reporter constructor throws a `TypeError` and the run never starts
- Don't forget the receiver flag on Prometheus — without it the endpoint answers **404** and every push is lost
- Don't pass `env: process.env` — it leaks tokens, passwords, and internal hostnames into a database your whole org can read
- Don't put run-unique values (build IDs, timestamps, test IDs) into the `labels` option — every run becomes a new set of series and cardinality explodes; per-test identity is already on the built-in series via labels like `title`, `testId`, `location`
- Don't create `Counter`/`Gauge` metrics without calling `.collect()` — nothing is sent until you do
- Don't use a key literally named `name` inside `env` or `labels` — it collides with the metric-name field

### Tool Usage Patterns

- **Install**: `npm i @playwright-labs/reporter-prometheus-remote-write`
- **Options** (`PrometheusOptions`): `serverUrl` (required, `string | URL`), `headers`, `auth.username` / `auth.password` (basic auth), `prefix` (default `pw_`), `labels`, `env` (default `{}` — deliberately empty for security)
- **Endpoint**: the reporter POSTs snappy-compressed remote-write payloads to `<prometheus>/api/v1/write` — Prometheus needs no scrape job for Playwright; a self-scrape-only `prometheus.yml` is enough
- **Custom metrics**: `Counter` and `Gauge` are re-exported from the reporter (source: `@playwright-labs/prometheus-core`); fixtures `useCounterMetric` / `useGaugeMetric` / `useGlobalCounter` / `useGlobalHistogram` live in the sibling `@playwright-labs/fixture-prometheus` package
- **Ready-made stack**: `examples/grafana-stack` in the monorepo — `pnpm install && pnpm test:e2e` boots Prometheus + Grafana via Docker Compose, runs a metrics-generating project, then a `verify` project that queries the Prometheus HTTP API to assert the data arrived

## Edge Cases and Constraints

### Limitations

- Run-level aggregates (`pw_tests_total_count`, `pw_tests_passed_count`, `pw_tests_failed_count`, `pw_tests_skipped_count`, `pw_tests_timed_out_count`, `pw_tests_total_duration`) are flushed **once at `onExit`** — they appear in Prometheus only after the whole run completes. Per-test and per-step series are the real-time part.
- The remote-write receiver is **disabled by default** in Prometheus. There is no config-file toggle — it is a command-line flag.
- Push model: Prometheus never scrapes Playwright. If Prometheus is unreachable, the metrics are simply not stored — the reporter does not buffer to disk.
- `env` defaults to `{}` on purpose: the reporter's README states that sending **all** environment variables would make them visible to any Prometheus user.

### Edge Cases

1. **Prometheus version flag drift**: Prometheus 2.x used `--enable-feature=remote-write-receiver`; 3.x moved it to `--web.enable-remote-write-receiver`. Copying a 2.x compose file against a `prom/prometheus:v3.x` image silently restores the 404 behavior.
2. **Empty series are skipped**: the reporter drains each metric and only sends unsent samples — a drained metric with no new samples produces an empty series that Prometheus rejects, and resending old samples triggers "out of order sample" rejections. Expect a metric to exist only after it recorded at least one sample.
3. **Authenticated / multi-tenant endpoints**: for a remote Prometheus behind basic auth use `auth: { username, password }`; for gateway-style setups pass extra HTTP headers via `headers` (e.g. an org/tenant header).
4. **Custom metrics cross worker boundaries as stdout events**: `.collect()` writes a newline-delimited JSON `{ name: "prometheus-remote-writer", payload }` line that the reporter parses in `onStdOut`. The reporter's own internal output is counted in `pw_stdout` with label `internal="true"` so you can filter it out of log-volume queries.

### What Breaks If Ignored

- **Without the receiver flag**: every POST to `/api/v1/write` gets a 404 and not a single series reaches Prometheus — dashboards stay empty even though the run "reported" fine
- **Without `serverUrl`**: `TypeError` from the reporter constructor — Playwright exits before running any test
- **HTML-only reporting**: results die with the CI artifact — no pass-rate trend, no duration p95 history, no alerting when `main` starts failing
- **Without `labels`/`env` enrichment**: all runs from all branches land in identical series — you cannot compare `main` vs. a feature branch or staging vs. CI

**Incorrect (static HTML snapshot only — nothing queryable over time):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"], // ❌ a per-build artifact — cannot trend pass rate or duration
  ],
});
```

**Why this fails:**

- Every build produces an isolated report; there is no way to ask "which tests got slower this month?"
- Failure spikes on `main` are discovered by someone opening the report, not by an alert
- Duration, retry, and timeout data never reaches the same dashboards the team already watches

**Correct (remote-write reporter with typed options and CI enrichment):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

export default defineConfig({
  reporter: [
    ["list"], // ✅ keep console output — the reporter itself prints nothing
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      {
        // ✅ full remote-write path; Prometheus must run with
        // --web.enable-remote-write-receiver (3.x) or
        // --enable-feature=remote-write-receiver (2.x)
        serverUrl: "http://localhost:9090/api/v1/write",
        prefix: "pw_",
        // ✅ static dimensions on every series — filterable in PromQL
        labels: {
          ci: String(Boolean(process.env.CI)),
          branch: process.env.GIT_BRANCH ?? "local",
        },
        // ✅ explicit allowlist — becomes the pw_env series; never process.env
        env: {
          GIT_COMMIT: process.env.GIT_COMMIT,
          BUILD_ID: process.env.BUILD_ID,
        },
      } satisfies PrometheusOptions,
    ],
  ],
});
```

**Why this works:**

- Per-test (`pw_test_duration`, `pw_test_retry_count`) and per-step (`pw_test_step_duration`) series arrive in Prometheus while the run is still executing
- `labels` and the allowlisted `env` make every query sliceable by branch and build
- `satisfies PrometheusOptions` turns misconfiguration into a compile error instead of a runtime `TypeError`

## Common Mistakes

### Mistake 1: Prometheus 3.x started without the remote-write receiver flag

```yaml
# docker-compose.yml — BROKEN against Prometheus 3.x
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090"
    # ❌ no receiver flag — POST /api/v1/write answers 404
    command: ["--config.file=/etc/prometheus/prometheus.yml"]
```

**Why this is wrong**: The receiver is off by default. The reporter pushes every series to `/api/v1/write`, gets a 404 for each batch, and no metric is ever stored. On 2.x the flag was `--enable-feature=remote-write-receiver`; upgrading the image without updating the flag brings the 404 back.

**How to fix**:

```yaml
# docker-compose.yml — Prometheus 3.x with the receiver enabled
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    # ✅ CRITICAL: turns the remote-write endpoint on
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--web.enable-remote-write-receiver"
```

### Mistake 2: Omitting `serverUrl`

```typescript
// ❌ throws TypeError before the first test runs
reporter: [["@playwright-labs/reporter-prometheus-remote-write"]];
```

**Why this is wrong**: `serverUrl` is the only required option. The constructor validates it immediately and raises a `TypeError` telling you to set `serverUrl: 'http://localhost:9090/api/v1/write'` — the run never starts.

**How to fix**:

```typescript
// ✅ always pass the full endpoint URL, typed for autocomplete
import { type PrometheusOptions } from "@playwright-labs/reporter-prometheus-remote-write";

reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
    } satisfies PrometheusOptions,
  ],
];
```

### Mistake 3: Sending the whole environment with `env: process.env`

```typescript
// ❌ leaks CI tokens, registry credentials, and internal hosts into Prometheus
reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
      env: process.env, // every variable becomes a label on the pw_env series
    },
  ],
];
```

**Why this is wrong**: The `env` object becomes label values on the constant-1 `pw_env` series. Prometheus is typically readable by the whole organization — `NPM_TOKEN`, `AWS_SECRET_ACCESS_KEY`, and database URLs would all be queryable. This is exactly why the option defaults to `{}`.

**How to fix**:

```typescript
// ✅ allowlist only non-secret build metadata
import os from "node:os";

reporter: [
  [
    "@playwright-labs/reporter-prometheus-remote-write",
    {
      serverUrl: "http://localhost:9090/api/v1/write",
      env: {
        user: os.userInfo().username,
        platform: os.platform(),
        productVersion: process.env.MY_PRODUCT_VERSION, // e.g. 2.4.8
      },
    },
  ],
];
```

### Mistake 4: Custom metric never collected

```typescript
import { test } from "@playwright/test";
import { Counter } from "@playwright-labs/reporter-prometheus-remote-write";

const urlCalls = new Counter({ name: "url_calls" }, 0);

test("counts URL calls", async ({ page }) => {
  await page.goto("https://example.com");
  urlCalls.inc();
  // ❌ no .collect() — the sample stays in the worker and is never pushed
});
```

**Why this is wrong**: Custom metrics travel from the worker to the reporter only when `.collect()` serializes the series to stdout. `inc()` alone mutates local state; `pw_url_calls` never appears in Prometheus.

**How to fix**:

```typescript
// ✅ flush in an afterAll hook — or use the `using` keyword for scoped flush
test.afterAll(() => {
  urlCalls.collect(); // → pw_url_calls appears in Prometheus
});
```

## Advanced Patterns

### Built-in metrics reference (default `pw_` prefix)

| Metric | Pushed at | What it shows |
| --- | --- | --- |
| `pw_tests_total_count`, `pw_tests_passed_count`, `pw_tests_failed_count`, `pw_tests_skipped_count`, `pw_tests_timed_out_count` | `onExit` | Run totals by outcome |
| `pw_tests_total_duration` | `onExit` | Wall time of the whole run (ms) |
| `pw_config`, `pw_project` | `onExit` (labeled at `onBegin`) | Constant-1 series carrying config labels (`workers`, `shard_current`, `shard_total`, …) and project labels (`projectName`, `timeout`, …) |
| `pw_test`, `pw_test_duration`, `pw_test_retry_count` | `onTestEnd` | Per-test result, duration (ms), retries — labels include `title`, `suite`, `location`, `actualStatus`, `workerIndex` |
| `pw_test_attachment_count`, `pw_test_attachment_size` | `onTestEnd` | Attachment count and size in bytes per test |
| `pw_test_annotation_count` | `onTestEnd` | Annotations with `type` / `description` labels |
| `pw_test_step_duration`, `pw_test_step`, `pw_test_step_error_count` | `onTestStepEnd` | Per-step duration and errors, including every `test.step` |
| `pw_test_step_total_count`, `pw_test_step_total_duration`, `pw_test_step_total_error` | `onTestEnd` / `onExit` | Step aggregates across the run |
| `pw_error_count`, `pw_test_errors` | `onError` | Errors with `message` / `snippet` labels |
| `pw_stdout`, `pw_stderr` | `onStdOut` / `onStdErr` | Output volume; reporter-internal lines carry `internal="true"` |
| `pw_node_memory_heap_used`, `pw_node_memory_rss`, `pw_node_memory_external`, `pw_node_cpu_user`, `pw_node_cpu_system`, `pw_node_os`, `pw_node_versions`, `pw_node_argv`, `pw_env` | updated on every hook, flushed at `onExit` | Node.js process stats of the Playwright main process — memory-leak and worker-load signal |

### Useful PromQL once data flows

```promql
# Pass rate of the latest run (%)
100 * pw_tests_passed_count / pw_tests_total_count

# Slowest tests by duration (ms)
topk(10, pw_test_duration)

# Total duration per suite
sum by (suite) (pw_test_duration)

# Step errors accumulated over the last hour
increase(pw_test_step_total_error[1h])

# Playwright main-process heap (MB)
pw_node_memory_heap_used / 1024 / 1024

# Retry hotspots — tests that needed a retry at all
pw_test_retry_count > 0
```

### Custom business metrics inside tests

```typescript
import { test } from "@playwright/test";
import { Counter, Gauge } from "@playwright-labs/reporter-prometheus-remote-write";

// Standalone counter shared by the whole spec file — lands as pw_e2e_page_visits
const pageVisits = new Counter({ name: "e2e_page_visits" }, 0);

test("tracks page visits and in-flight users", async ({ page }) => {
  pageVisits.inc();

  // ✅ `using` flushes via .collect() automatically on scope exit (TS 5.2+)
  {
    using activeUsers = new Gauge({ name: "e2e_active_users" });
    activeUsers.set(10);
    activeUsers.inc();
    activeUsers.dec(2); // → pw_e2e_active_users 9
  }

  await page.goto("https://example.com");
});

test.afterAll(() => {
  pageVisits.collect(); // standalone metrics still need an explicit flush
});
```

**When to use this pattern**: business-level counters (API calls triggered, items rendered) that the built-in result metrics cannot express. For per-test metrics prefer the `useCounterMetric` / `useGaugeMetric` fixtures from `@playwright-labs/fixture-prometheus` — they scope creation and flush to the test lifecycle.

### Local Prometheus + Grafana stack (docker-compose)

```yaml
# docker-compose.yml — minimal stack, mirrors examples/grafana-stack
services:
  prometheus:
    image: prom/prometheus:v3.3.0
    ports:
      - "9090:9090" # Prometheus UI
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    # NOTE: --web.enable-remote-write-receiver is CRITICAL — it is what turns
    # the push endpoint /api/v1/write on. Without it Prometheus answers 404.
    # (Prometheus 2.x used --enable-feature=remote-write-receiver.)
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--web.enable-remote-write-receiver"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9090/-/ready"]
      interval: 5s
      timeout: 5s
      retries: 10

  grafana:
    image: grafana/grafana:11.6.0
    ports:
      - "3000:3000" # Grafana UI — anonymous admin, no login
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_AUTH_DISABLE_LOGIN_FORM=true
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      prometheus:
        condition: service_healthy
```

```yaml
# prometheus.yml — self-scrape only; all pw_* metrics arrive via remote write
global:
  scrape_interval: 5s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets:
          - localhost:9090
```

The complete runnable version lives in `examples/grafana-stack` (tests, datasource provisioning, a `generate` project that pushes metrics, a `verify` project that asserts they landed, and a `demo` project with intentional fail/timeout/retry scenarios). From that directory: `pnpm install && pnpm test:e2e`, then explore `pw_tests_total_count` at http://localhost:9090 or in Grafana's Explore view at http://localhost:3000; `pnpm infra:down` stops the stack.

## Integration with Other Best Practices

- **Export Test Traces and Metrics to OpenTelemetry Backends with reporter-otel** (`advanced-otel-reporter`): pick this remote-write reporter when Prometheus is the only destination and you want direct push with zero collector infrastructure; pick reporter-otel when you also need traces or multiple backends. Both accept `prefix` and an `env` allowlist, so dashboard conventions carry over.
- **Debug Test Steps** (`debug-test-steps`): every `test.step` you add for readability also becomes a `pw_test_step_duration` series — step discipline pays off twice, in the trace viewer and in Grafana.
- **Parallel Test Sharding** (`parallel-test-sharding`): the `pw_config` series carries `shard_current` / `shard_total` labels, so sharded CI jobs are distinguishable in Prometheus instead of blending into one run.
- **`@playwright-labs/fixture-prometheus`**: use `useCounterMetric` / `useGaugeMetric` / `useGlobalCounter` / `useGlobalHistogram` fixtures instead of hand-managing `Counter` instances — global fixtures accumulate across tests in a worker and flush automatically at teardown.

Reference: [@playwright-labs/reporter-prometheus-remote-write](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-prometheus-remote-write)

---

### 8.4. Query Components with Framework-Aware Selectors (angular=, react=, vue=)

**Tags:** selectors, angular, react, vue, component, locators  
**Impact:** LOW-MEDIUM (decouples component tests from DOM structure — CSS refactors and wrapper changes stop breaking selectors)

## Query Components with Framework-Aware Selectors (angular=, react=, vue=)

**Impact: LOW-MEDIUM (decouples component tests from DOM structure — CSS refactors and wrapper changes stop breaking selectors)**

CSS and XPath selectors that drill into a component's rendered markup couple your tests to implementation details: class names, wrapper divs, attribute placement. All of these change for reasons unrelated to the behavior under test. The `@playwright-labs/selectors-angular`, `@playwright-labs/selectors-react`, and `@playwright-labs/selectors-vue` packages register custom Playwright selector engines (`angular=`, `react=`, `vue=`) that query components by their public contract — tag/name, props/inputs, state — instead of their DOM output. Each package also ships a fixture (`$ng`, `$r`, `$v`) for typed runtime inspection of component internals and a set of framework-aware `expect` matchers.

## When to Use

- **Use framework-aware selectors when**: Tests target Angular, React, or Vue components and currently break on CSS renames, added wrapper elements, or `data-testid` churn
- **Use the `$ng` / `$r` / `$v` fixtures when**: A test needs to read component internals at runtime — Angular inputs/outputs/signals, React props/state/context, Vue props/setup state/Options API data — without writing `page.evaluate` boilerplate
- **Consider alternatives when**: The app is server-rendered without a client framework, the test runs against a production build (all three engines require development builds), or the target is plain static markup — use role-based locators there
- **Required for**: Component-heavy suites where selectors should describe what the component *is*, not how it happens to render today

## Guidelines

### Do

- Register the engine once per worker — or import the bundled `test` from the package and let the fixture auto-register it
- Query by the component's public contract: tag name and `@Input()` in Angular, component name and props in React, component name and props in Vue
- Use nested property paths (`[user.role="admin"]`) instead of flattening data into `data-*` attributes just to make it selectable
- Import the extended `expect` from the package to get framework-aware matchers with descriptive failure messages
- Narrow with `.first()` / `.last()` / `.nth(n)` exactly as with standard locators — the fixture wrappers mirror the Playwright API
- Keep using standard Playwright locators (`getByRole`, `getByText`) for user-visible behavior; use framework selectors where the component boundary is the thing under test

### Don't

- Don't write XPath into component internals (`.//div[contains(@class,'btn')]`) — it breaks on every styling pass
- Don't add `data-testid` or `data-*` attributes solely to expose state the framework already holds — query the component instead
- Don't run these engines against production builds — Angular strips `window.ng`, bundlers strip React fiber metadata, Vue strips `_instance`/`subTree`; selectors return empty results
- Don't assert a plain `@Output() EventEmitter` value with `toBeNgOutput` — it only reads `model()` signals; use `toHaveNgOutput` for existence
- Don't reference hook state by variable name in React function components — names are not preserved at runtime; use the numeric hook index (`state.0`)

### Tool Usage Patterns

- **Install**: `npm install -D @playwright-labs/selectors-angular` / `selectors-react` / `selectors-vue` (requires `@playwright/test ^1.57.0`; Angular 9+, React 16+, Vue 3)
- **Engines**: `AngularEngine`, `ReactEngine`, `VueEngine` — pass to `selectors.register('angular' | 'react' | 'vue', Engine)`
- **Fixtures**: `import { test } from '@playwright-labs/selectors-*'` gives `$ng` / `$r` / `$v` and auto-registers the engine per worker
- **Matchers (Angular)**: `toBeNgComponent()`, `toHaveNgInput(name)`, `toHaveNgOutput(name)`, `toBeNgInput(name, value)`, `toBeNgOutput(name, value)`, `toHaveNgSignal(name)`, `toBeNgSignal(name, value)`, `toBeNgRouterOutlet()`, `toBeNgIf(condition?)`, `toBeNgFor()`
- **Matchers (React)**: `toBeReactComponent()`, `toHaveReactProp(name, value?)`, `toBeReactProp(name, value)`, `toHaveReactState(path, value?)`, `toBeReactState(path, value)`, `toHaveReactContext(name, value?)`, `toMatchReactSnapshot(html)`
- **Matchers (Vue)**: `toBeVueComponent()`, `toHaveVueProp(name, value?)`, `toBeVueProp(name, value)`, `toHaveVueSetup(path, value?)`, `toBeVueSetup(path, value)`, `toHaveVueData(path, value?)`, `toBeVueData(path, value)`, `toMatchVueSnapshot(html)`

## Selector Syntax by Framework

All three engines share the CSS attribute-selector convention: `=` exact, `*=` contains, `^=` starts with, `$=` ends with, `|=` exact-or-hyphen-prefixed, `~=` word in list, `/regex/flags`, `i` flag for case-insensitive, bare `[prop]` for truthy, chained `[a][b]` blocks for logical AND.

```typescript
// Angular — component tag is the lowercase tag from @Component({ selector: 'app-button' })
// Matches @Input() values and any public property; nested paths traverse the instance
page.locator('angular=app-button[label="Submit"]');
page.locator('angular=app-user-card[user.role="admin"]');
page.locator('angular=app-button[type="danger"][disabled]');

// React — component display name; sources: props (default), state, context
page.locator('react=Button[props.label="Submit"]');
page.locator('react=Button[label="Submit"]');          // same — props is the default source
page.locator('react=Counter[state.0=5]');              // first useState hook
page.locator('react=ThemedButton[context.theme="dark"]'); // class component context

// Vue — component name; sources: props (default), setup (Composition API), data (Options API)
page.locator('vue=Button[variant="danger"][disabled=true]');
page.locator('vue=Counter[setup.count=0]');            // refs auto-unwrapped
page.locator('vue=OptionsCounter[data.count=5]');
```

## Edge Cases and Constraints

### Limitations

- **Development builds only.** Angular requires the `window.ng` DevTools API (present in `ng serve` / dev builds, or re-attach via `enableDebugTools` in `main.ts`). React requires fiber metadata (`__reactFiber$<hash>` / `_reactInternals`) that webpack/Vite strip under `NODE_ENV=production`. Vue requires `__vue_app__`, `app._instance`, and `subTree`, which production builds remove. Build your e2e target in development mode.
- **Vue 3 only** for `selectors-vue` (tested on 3.4+); Vue 2 is not supported.
- React `context()` and `toHaveReactContext` work only for **class components** (`static contextType` / `contextTypes`) — `useContext` values have no stable identifier in the fiber tree.
- React function-component state is exposed as a numerically indexed object by hook declaration order; only `useState` and `useReducer` hooks are counted (effect, ref, memo, and context hooks are skipped).

### Edge Cases

1. **HOCs without own DOM nodes (React/Vue)**: a Higher-Order Component that renders only children maps to the first DOM element of its inner tree, so `$r(...).props()` may resolve the inner component's fiber. The `react=OuterHOC[props.x=1]` selector itself is unaffected — it matches against the HOC's own props.
2. **`React.memo` / `forwardRef`**: matched by the wrapped component's display name (`React.memo(Button)` is `react=Button`); an explicit `displayName` on the wrapper takes precedence.
3. **Angular model vs. emitter outputs**: `toBeNgOutput(name, value)` reads the current value of a `model()` signal only. On a plain `EventEmitter` output it fails with a descriptive error pointing to `toHaveNgOutput`.
4. **Structural directives (Angular)**: `NgIf`/`NgForOf` live on the `<ng-template>` anchor, not on rendered content — target the template element with `toBeNgIf()` / `toBeNgFor()`, not the projected `li`.
5. **Vue Composition API `inject()`**: values injected inside `<script setup>` are visible as setup state (`setup.themeName`); Options API `inject` is not separately exposed.
6. **React 18 concurrent features**: the engine reads the committed fiber tree — it reflects painted state, not in-progress `useTransition`/`useDeferredValue` renders.

### What Breaks If Ignored

- **Against production builds**: every `angular=`/`react=`/`vue=` query returns zero elements — tests fail with opaque "locator resolved to 0 elements" timeouts instead of a clear configuration error
- **With CSS-into-internals selectors**: a designer renaming `btn-primary` or a developer adding a wrapper `<div>` breaks tests that have nothing to do with the changed styling
- **With `data-testid` inflation**: components accumulate test-only attributes that ship to users and drift out of sync with the real state they mirror

**Incorrect (CSS/XPath through component internals + manual fiber digging):**

```typescript
import { test, expect } from '@playwright/test';

test('submit button state', async ({ page }) => {
  // ❌ Breaks when btn-primary is renamed, a wrapper is added, or the
  //    <button> migrates into a child component
  await page.locator('.user-form > div.actions button.btn-primary:not([disabled])').click();

  // ❌ XPath into rendered markup — no connection to the component contract
  await page.locator('//app-user-card//span[contains(@class,"role") and text()="admin"]').click();

  // ❌ Manual fiber traversal: verbose, untyped, hash-suffixed key changes per build
  const label = await page.evaluate((el) => {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
    return (el as any)[key]?.return?.memoizedProps?.label;
  }, await page.locator('button').elementHandle());

  // ❌ State mirrored into the DOM purely so tests can see it
  await expect(page.locator('[data-count="5"]')).toBeVisible();
});
```

**Why this fails:**
- Class names and nesting are implementation details — they change on styling refactors that do not touch behavior, producing red tests with zero signal
- `page.evaluate` fiber digging is untyped and depends on React's internal key naming, which is not a public API guarantee
- `data-count`-style attributes duplicate component state into the DOM; when the two drift apart the test asserts a lie

**Correct (framework-aware engines + runtime inspection fixtures):**

```typescript
// Angular — import the bundled test to get $ng (engine auto-registers per worker)
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright-labs/selectors-angular';

test('submit button state', async ({ $ng }) => {
  // ✅ Targets the component contract: tag + @Input — survives CSS refactors
  const button = $ng('angular=app-button[label="Submit"][disabled=false]');
  await button.click();

  // ✅ Reads inputs and signals directly from the component instance
  expect(await $ng('app-counter').first().signal<number>('count')).toBe(5);
  await expect($ng('app-button').first()).toBeNgComponent();
  await expect($ng('angular=app-button[label="Submit"]')).toBeNgInput('label', 'Submit');
});
```

```typescript
// React
import { test } from '@playwright-labs/selectors-react';
import { expect } from '@playwright-labs/selectors-react';

test('counter increments', async ({ $r }) => {
  // ✅ Queries the first useState hook value — no data-count attribute needed
  const counter = $r('react=Counter[state.0=5]');
  await counter.locator('button').last().click(); // ReactHtmlElement extends Locator

  // ✅ Typed introspection replaces page.evaluate fiber digging
  expect(await $r('react=Button').prop<string>('label')).toBe('Submit');
  await expect(counter).toBeReactState('0', 6);
  await expect($r('react=UserCard[props.user.role="admin"]')).toBeReactProp('user', {
    name: 'Alice',
    role: 'admin',
  });
});
```

```typescript
// Vue
import { test } from '@playwright-labs/selectors-vue';
import { expect } from '@playwright-labs/selectors-vue';

test('counter increments', async ({ $v }) => {
  // ✅ Composition API setup state, refs auto-unwrapped
  const counter = $v('vue=Counter[setup.count=0]');
  await counter.locator('button').last().click();

  await expect($v('vue=Counter').first()).toBeVueSetup('count', 1);
  await expect($v('vue=Button').first()).toHaveVueProp('variant', 'danger');
  // ✅ Options API data via the data. source
  await expect($v('vue=OptionsCounter')).toHaveVueData('count', 0);
});
```

**Why this works:**
- The component name and its prop/input contract change together with the feature — a CSS refactor or a new wrapper element does not touch the selector
- Fixtures return typed values (`input<T>`, `prop<T>`, `state<T>`, `setup<T>`) instead of `any` from `page.evaluate`
- No test-only attributes are added to production markup
- Matchers fail with messages listing available inputs/outputs/signals or props, so debugging starts from the component's actual shape

## Common Mistakes

### Mistake 1: Registering the engine in every spec file

```typescript
// ❌ Repeated in each spec — noise, and easy to forget in the newest file
import { selectors } from '@playwright/test';
import { ReactEngine } from '@playwright-labs/selectors-react';
selectors.register('react', ReactEngine);
```

**Why this is wrong**: `selectors.register` must run once per worker before any browser context is created. Scattering it across specs is redundant and silently missing from any file that forgets it.

**How to fix**:

```typescript
// ✅ Import the bundled test — the fixture auto-registers the engine per worker
import { test } from '@playwright-labs/selectors-react';

// ✅ Or register once in a shared setup file imported by playwright.config.ts
// tests/setup.ts
import { selectors } from '@playwright/test';
import { ReactEngine } from '@playwright-labs/selectors-react';
selectors.register('react', ReactEngine);
```

### Mistake 2: Running framework selectors against a production build

```typescript
// playwright.config.ts — ❌ webServer builds the app for production
export default defineConfig({
  webServer: {
    command: 'npm run build && npm run start', // NODE_ENV=production strips fiber metadata
    url: 'http://localhost:3000',
  },
});
```

**Why this is wrong**: all three engines read framework internals (`window.ng`, `__reactFiber$`, `__vue_app__`) that production builds strip. Every query returns empty and the failure looks like a missing element, not a misconfiguration.

**How to fix**: serve a development build to the e2e suite (`ng serve --configuration=development`, `npm run dev`), or for Angular explicitly re-attach debug tools:

```typescript
// main.ts (Angular) — only if a production bundle must be tested
import { enableDebugTools } from '@angular/platform-browser';

bootstrapApplication(AppComponent).then((appRef) => {
  if (environment.production) enableDebugTools(appRef.components[0]);
});
```

### Mistake 3: Asserting function-component state by variable name (React)

```typescript
// ❌ 'count' is a source-level name — it does not exist at runtime
await expect($r('react=Counter').first()).toBeReactState('count', 5);
```

**Why this is wrong**: React does not preserve hook variable names. Function-component state is indexed by hook declaration order.

**How to fix**:

```typescript
// const [count] = useState(0);  → index "0"
// const [name]  = useState(''); → index "1"
await expect($r('react=Counter').first()).toBeReactState('0', 5);
page.locator('react=Counter[state.0=5]');
```

## Advanced Patterns

### Imperative state mutation + change detection (Angular)

```typescript
import { test } from '@playwright-labs/selectors-angular';
import { expect } from '@playwright/test';

test('reflects imperative mutation', async ({ $ng }) => {
  const counter = $ng('app-counter').first();
  // After mutating component state imperatively, re-run change detection
  await counter.detectChanges();
  await expect(counter).toContainText('0');

  // Discover the component's actual shape before writing assertions
  const inputs = await $ng('app-button').first().inputs();   // ['label', 'disabled', 'type']
  const outputs = await $ng('app-button').first().outputs(); // ['clicked']
  const signals = await counter.signals();                   // ['count']
  expect(inputs).toContain('label');
});
```

### Combining frameworks on one page

The engines coexist — register each one (or merge the bundled tests) and mix freely with standard locators:

```typescript
import { mergeTests } from '@playwright/test';
import { test as angularTest } from '@playwright-labs/selectors-angular';
import { test as reactTest } from '@playwright-labs/selectors-react';

export const test = mergeTests(angularTest, reactTest);

test('hybrid micro-frontend page', async ({ page, $ng, $r }) => {
  await $r('react=SearchBar[props.placeholder="Search"]').fill('shoes');
  await expect(page.getByRole('list')).toBeVisible(); // ✅ standard locator for behavior
  await expect($ng('angular=app-product-card').first()).toBeNgComponent();
});
```

**When to use this pattern**: micro-frontend shells, incremental framework migrations, and pages embedding a widget built on another stack.

## When CSS and Role Locators Are Still the Right Tool

Framework selectors are a complement, not a replacement. Keep standard locators for:

- **User-visible behavior**: `getByRole('button', { name: 'Submit' })` asserts what the user perceives — accessible name and role — which component queries cannot express
- **Static, non-component markup**: headings, footers, prose, layout containers — there is no component boundary to query
- **Production-smoke suites**: anything running against a production bundle, where all three engines are blind by design
- **Cross-framework pages**: role/text locators are framework-agnostic and keep working through a rewrite from one stack to another

A sound default: role-based locators for flows, framework selectors for component contract and state assertions.

## Integration with Other Best Practices

- **locator-role-based**: role locators verify the accessibility contract; `angular=`/`react=`/`vue=` verify the component contract — use both, each where it is strongest
- **stable-auto-waiting**: framework-engine locators are standard Playwright locators — auto-waiting, retry-ability, and web-first assertions apply unchanged
- **fixture-merge-tests-expects**: `mergeTests` / `mergeExpects` combine the bundled `test`/`expect` exports of several selector packages (plus other fixture packages) into one shared fixture module
- **Scale considerations**: in a 100+ test suite, prefer one shared `tests/setup.ts` registration (or the auto-registering fixtures) over per-file `selectors.register` calls; keep framework selectors out of page objects shared with production-smoke tests, since those run where the engines cannot

Reference: [@playwright-labs/selectors-angular](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-angular) · [@playwright-labs/selectors-react](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-react) · [@playwright-labs/selectors-vue](https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-vue)

---

### 8.5. Send Test Results to Slack with Rich Block Kit Messages via reporter-slack

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

### 8.6. Send Test Run Reports via Email with React Email Templates via reporter-email

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

### 8.7. Type-Safe SQL in Tests with fixture-sql and ts-plugin-sql

**Tags:** sql, sqlite, postgres, mysql, type-safety, fixtures, ts-plugin  
**Impact:** LOW-MEDIUM (catches SQL mistakes at compile time and eliminates leaked connections in database-backed tests)

**Impact: LOW-MEDIUM (catches SQL mistakes at compile time and eliminates leaked connections in database-backed tests)**

End-to-end tests that touch a database usually fail in two boring ways: a query string with a typo that only blows up at runtime, and a connection opened in `beforeEach` that never closes because the test threw before `afterEach` ran. The three-package SQL system fixes both. `@playwright-labs/sql-core` provides a typed `sql` function whose `SqlStatement<P>` phantom brand encodes the parameter count at the type level — structurally invalid SQL resolves to `never` at compile time. `@playwright-labs/fixture-sql` wires connections into Playwright's fixture lifecycle so every connection auto-closes, even on failure. `@playwright-labs/ts-plugin-sql` adds schema-aware autocomplete, diagnostics, and hover inside your editor, driven by a `db-types.ts` file generated from your live database via the `sql-core pull` CLI.

## When to Use

- **Use fixture-sql when**: Any test reads or writes a real database — seeding data, asserting persisted state, or verifying migrations
- **Use `sql("…")` / `sql(["…"])` when**: You want the compiler to validate SQL structure and enforce the params array length before the test ever runs
- **Use the tagged template `` sql`…` `` when**: You want editor syntax highlighting and ts-plugin-sql completions, and compile-time param checking is not needed (the template form returns plain `string`)
- **Add ts-plugin-sql when**: The team writes SQL by hand and you want table/column autocomplete and structural diagnostics inside the editor
- **Consider alternatives when**: Tests only stub HTTP or use an in-memory app — a database fixture is overhead you do not need
- **Required for**: Suites where a leaked connection exhausts the database pool in CI, or where schema drift between the app and test queries causes runtime-only failures

## Guidelines

### Do

- Import `test` and `expect` from `@playwright-labs/fixture-sql` and set the adapter once per file: `test.use({ sqlAdapter: pgAdapter(url) })`
- Use `sql("…")` or `sql(["…"])` for any query with parameters — the `SqlStatement<P>` brand makes TypeScript enforce the params tuple
- Generate row types from the live database with `pnpm sql-core pull --adapter <sqlite|pg|mysql> --url <url> --out ./src/db-types.ts` and pass them to `db.query<UsersRow>(...)`
- Point ts-plugin-sql's `schemaFile` option at the same generated file so editor autocomplete and your test types never drift apart
- Re-run the `pull` CLI in CI (or on schema migration) to keep generated types in sync with the real schema
- Use `useSql(adapter)` when a test needs a second connection — it is registered for automatic teardown like the primary `sql` fixture
- Prefer `sqliteAdapter(':memory:')` for the fastest possible isolation — every test gets a brand-new database with zero cleanup

### Don't

- Don't concatenate values into query strings — use `?` (SQLite/MySQL) or `$1, $2, …` (PostgreSQL) placeholders with a params array
- Don't manage connections with `beforeEach`/`afterEach` — a mid-test failure skips your `close()` and leaks the connection
- Don't expect compile-time validation from the tagged template form `` sql`…` `` — TypeScript infers `TemplateStringsArray` for tagged templates, so it always returns `string`
- Don't use `$N` placeholders out of order — `$3` without `$1` and `$2` resolves to `never` at compile time by design
- Don't run `pnpm sql-core pull` with `sql-core` installed only as a transitive dependency — pnpm links bins of direct dependencies only, so install it as a direct devDependency
- Don't hand-write row interfaces that duplicate the schema — they go stale silently; generate them with the `pull` CLI instead

### Tool Usage Patterns

- **Install**: `pnpm add -D @playwright-labs/fixture-sql @playwright-labs/sql-core @playwright-labs/ts-plugin-sql` plus the driver you use — `better-sqlite3 >=9.0.0`, `pg >=8.0.0`, or `mysql2 >=3.0.0`
- **Adapters**: `sqliteAdapter` from `@playwright-labs/fixture-sql/sqlite`, `pgAdapter` from `@playwright-labs/fixture-sql/pg`, `mysqlAdapter` from `@playwright-labs/fixture-sql/mysql` — all accept a connection URL or a config object
- **Fixtures**: `sql: SqlClient` (auto-opened/auto-closed), `useSql(adapter): Promise<SqlClient>` (extra connections), `sqlAdapter: SqlAdapter` (configuration option)
- **Type utilities**: `SQLParams<S>`, `ValidSQL<S>`, `InferSQLParams<S>`, `SqlStatement<P>` — re-exported from `@playwright-labs/fixture-sql`
- **Client API**: `db.query<T>(stmt, params)` → `{ rows, rowCount, command? }`; `db.execute(stmt, params)`; `db.close()`
- **CLI**: `pnpm sql-core pull --adapter sqlite|pg|mysql --url <url> [--out <file>]` (short flags `-a`, `-u`, `-o`); npm users run `npx playwright-labs-sql-core pull ...`
- **Editor plugin**: `{ "name": "@playwright-labs/ts-plugin-sql", "tag": "sql", "schemaFile": "./src/db-types.ts" }` in `tsconfig.json` `compilerOptions.plugins`

## Edge Cases and Constraints

### Limitations

- The tagged template form cannot be type-checked — TypeScript always widens tagged template arguments to `TemplateStringsArray`, so literal-type inference is impossible. This is a language limitation, not a package bug. Use `sql("…")` or `sql(["…"])` when validation matters.
- The compile-time validator models a subset of SQL grammar: `SELECT` requires `FROM`, `UPDATE` requires a table and `SET`, `DELETE` requires `FROM` and a table, `INSERT` requires `INTO` plus `VALUES` or a sub-`SELECT`, `CREATE` requires `TABLE` and a name. Optional clauses (`JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, `OFFSET`) are accepted after the required ones. Exotic statements outside this grammar resolve to `never`.
- ts-plugin-sql runs inside `tsserver` — it provides editor features only and has no effect on `tsc` builds or CI type-checking. Compile-time safety comes from `sql-core`'s type system, not from the plugin.
- All three database drivers are optional peer dependencies — a missing driver surfaces as an import error, not a config warning. Install exactly the one you use.

### Edge Cases

1. **Multi-element array form**: `sql(["SELECT * FROM ", " WHERE id = ?"])` returns plain `string` — a multi-element array means dynamic SQL, so validation is skipped intentionally.
2. **VS Code not showing completions**: The plugin only loads when the editor uses the workspace TypeScript version. Run **TypeScript: Select TypeScript Version → Use Workspace Version**.
3. **`schemaFile` vs `schema`**: When both options are present in the plugin config, `schemaFile` wins. Use the inline `schema` object only for small projects without a live database to introspect.
4. **CLI prints to stdout**: Without `--out`, generated types go to stdout — pipe or redirect them, or always pass `--out ./src/db-types.ts` in scripts.

### What Breaks If Ignored

- **Raw string queries**: A missing `FROM`, a wrong column name, or a mismatched params array fails at runtime — in CI, minutes after the commit, instead of at the keystroke
- **Manual connection management**: A test that throws before `afterEach` leaks its connection; under parallel workers this exhausts the database pool and fails unrelated tests with timeout errors
- **Stale hand-written types**: The app adds a column or changes a nullability, tests keep compiling against the old shape, and `rows[0].email` is `undefined` at runtime with no type error

**Incorrect (raw strings, manual lifecycle, no generated types):**

```typescript
import { test, expect } from "@playwright/test";
import pg from "pg";

let client: pg.Client;

test.beforeEach(async () => {
  client = new pg.Client(process.env.DATABASE_URL);
  await client.connect();
});

test.afterEach(async () => {
  await client.end(); // ❌ never runs if the test throws before teardown is reached in CI worker shutdown
});

test("loads a user", async () => {
  const id = 1;
  // ❌ string concatenation — SQL injection vector, no param checking
  const res = await client.query(`SELECT * FROM users WHERE id = ${id}`);
  // ❌ rows is `any[]` — a renamed column compiles fine and fails at runtime
  expect(res.rows[0].emial).toBe("alice@example.com");
});
```

**Why this fails:**
- `SELECT * FROM users WHERE id = ${id}` is an injection vector and bypasses every parameter check
- `res.rows` is untyped — `emial` (typo) compiles cleanly and produces `undefined` at runtime
- `beforeEach`/`afterEach` lifecycle breaks the moment a test throws mid-query or a worker is recycled — the connection leaks
- Nothing ties the test's row shape to the real schema; drift is invisible

**Correct (fixture lifecycle + typed `sql` + generated row types):**

```typescript
// Generate types once (and on every schema change):
//   pnpm sql-core pull --adapter pg --url postgresql://user:pass@localhost/mydb --out ./src/db-types.ts
import { test, expect } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";
import { sql } from "@playwright-labs/fixture-sql";
import type { UsersRow } from "./db-types.js";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test("loads a user", async ({ sql: db }) => {
  // ✅ compile-time validated: correct structure, exactly one param enforced
  const { rows } = await db.query<UsersRow>(
    sql("SELECT id, name, email FROM users WHERE id = $1"),
    [1],
  );
  // ✅ rows is UsersRow[] — a typo'd property is a compile error
  expect(rows[0]!.email).toBe("alice@example.com");
  // ✅ connection closes automatically even if the expect above throws
});
```

**Why this works:**
- `sql("…")` returns `SqlStatement<[unknown]>` — calling `db.query(stmt)` without params, or with two params, is a compile error
- Invalid SQL (`sql("SELECT * WHERE id = $1")` — missing `FROM`) resolves to `never` and fails at the call site, before any test runs
- The `sql` fixture is owned by Playwright's teardown — the connection closes even on failure, and each test gets its own client
- `UsersRow` is generated from the live database by the `pull` CLI, so types track the real schema

## Common Mistakes

### Mistake 1: Expecting type safety from the tagged template form

```typescript
import { sql } from "@playwright-labs/fixture-sql";

// ❌ returns plain string — no param checking, no structural validation
const stmt = sql`SELECT * FROM users WHERE id = ?`;
await db.query(stmt); // compiles fine — missing param not caught
```

**Why this is wrong**: TypeScript infers `TemplateStringsArray` for tagged template arguments, which prevents literal-type inference. The template form always returns `string`, so the typed `query` overloads never engage.

**How to fix**:

```typescript
// ✅ plain string form returns SqlStatement<[unknown]>
const stmt = sql("SELECT * FROM users WHERE id = ?");
await db.query(stmt, [1]); // params enforced at compile time

// Array form is identical — useful when SQL is stored separately
const stmt2 = sql(["SELECT * FROM users WHERE id = ?"]);
```

Use the tagged template form deliberately — for editor syntax highlighting and ts-plugin-sql completions — not by accident.

### Mistake 2: Leaking connections with manual lifecycle

```typescript
test("two databases", async () => {
  const primary = await pgAdapter(primaryUrl).create();
  const replica = await pgAdapter(replicaUrl).create();
  // ❌ if anything below throws, neither connection closes
  await primary.execute("INSERT INTO events (id, type) VALUES ($1, $2)", [1, "login"]);
  const { rows } = await replica.query("SELECT * FROM events");
  expect(rows).toHaveLength(1);
  await primary.close();
  await replica.close();
});
```

**Why this is wrong**: The first assertion failure or unexpected throw skips every `close()` below it. Under `fullyParallel` with several workers, leaked connections accumulate until the database refuses new ones.

**How to fix**:

```typescript
test("two databases", async ({ useSql }) => {
  // ✅ both connections registered for automatic teardown
  const primary = await useSql(pgAdapter(primaryUrl));
  const replica = await useSql(pgAdapter(replicaUrl));

  await primary.execute(
    sql("INSERT INTO events (id, type) VALUES ($1, $2)"),
    [1, "login"],
  );
  const { rows } = await replica.query(sql("SELECT * FROM events"));
  expect(rows).toHaveLength(1);
});
```

### Mistake 3: `pnpm sql-core` command not found

```bash
# ❌ fails — sql-core is present only as a transitive dependency of fixture-sql
pnpm sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts
# ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "sql-core" not found
```

**Why this is wrong**: pnpm only links bins of *direct* dependencies into `node_modules/.bin`. `fixture-sql` depends on `sql-core`, but that does not expose its CLI to your scripts.

**How to fix**:

```bash
# ✅ install as a direct devDependency
pnpm add -D @playwright-labs/sql-core
pnpm sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts

# npm users can skip the explicit install:
npx playwright-labs-sql-core pull --adapter sqlite --url ./dev.db --out ./src/db-types.ts
```

### Mistake 4: Gaps in `$N` parameter sequences

```typescript
// ❌ resolves to never — $1 and $2 are missing, so the statement is rejected
const stmt = sql("SELECT * FROM users WHERE a = $1 AND c = $3");
```

**Why this is wrong**: The type system requires `$N` placeholders to be sequential — `$3` without `$2` means the params tuple is ambiguous, so `SQLParams<S>` returns `never` and the call site fails to compile. This is the validator working as designed, not a false positive.

**How to fix**:

```typescript
// ✅ sequential placeholders compile and enforce a 3-element params tuple
const stmt = sql("SELECT * FROM users WHERE a = $1 AND b = $2 AND c = $3");
await db.query(stmt, ["x", "y", "z"]);
```

## Advanced Patterns

### Full pipeline: live schema → generated types → editor intelligence → typed tests

```bash
# 1. Introspect the live database (run on schema changes / in CI)
pnpm sql-core pull --adapter pg --url $DATABASE_URL --out ./src/db-types.ts
```

```json
// 2. tsconfig.json — enable schema-aware editor features
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@playwright-labs/ts-plugin-sql",
        "tag": "sql",
        "schemaFile": "./src/db-types.ts"
      }
    ]
  }
}
```

```typescript
// 3. tests/users.spec.ts — compile-time safety plus editor autocomplete
import { test, expect } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";
import { sql } from "@playwright-labs/ts-plugin-sql"; // same sql function, re-exported
import type { UsersRow } from "../src/db-types.js";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test("typed query with IDE support", async ({ sql: db }) => {
  const { rows, rowCount } = await db.query<UsersRow>(
    sql("SELECT id, name, email FROM users WHERE id = $1"),
    [1],
  );
  expect(rowCount).toBe(1);
  expect(rows[0]!.name).toBe("Alice");
});
```

The generated file declares one interface per table plus a `Tables` map keyed by table name — import the row types in tests and point `schemaFile` at the same file, so the editor and the compiler always agree.

### Per-test schema isolation on a shared PostgreSQL instance

```typescript
import { randomUUID } from "node:crypto";
import { test } from "@playwright-labs/fixture-sql";
import { pgAdapter } from "@playwright-labs/fixture-sql/pg";

test.use({ sqlAdapter: pgAdapter(process.env.DATABASE_URL!) });

test.beforeEach(async ({ sql: db }) => {
  const schema = `test_${randomUUID().replace(/-/g, "")}`;
  await db.execute(`CREATE SCHEMA ${schema}`);
  await db.execute(`SET search_path TO ${schema}`);
});
```

**When to use this pattern**: Suites running against one shared Postgres in CI where tests must not see each other's rows. For SQLite, prefer `sqliteAdapter(':memory:')` — isolation is free. For a file-backed SQLite seeded before the suite, use `sqliteAdapter('./fixtures/seed.db')`.

## Integration with Other Best Practices

- **Ensure Test Isolation for Parallel Execution**: The `sql` fixture gives every test its own client by default, which is the database half of test isolation. Combine with per-test schemas (above) when the database itself is shared, and never share a module-level `SqlClient` between tests.
- **Use Custom Fixtures for Reusable Test Setup and Teardown**: Extend the `fixture-sql` `test` object with your own fixtures (seed helpers, row factories) instead of wrapping connections in custom `beforeEach` blocks — you keep auto-close and add reuse on top.
- **Use test.describe for Logical Test Grouping**: Override `sqlAdapter` per describe block — e.g. a read-only suite pointed at a replica — while the rest of the file uses the primary database.
- **Scale considerations**: At 100+ database-backed tests, connection churn dominates. Keep one adapter per file via `test.use()`, prefer `:memory:` SQLite where the dialect allows, and add the `pull` CLI to CI so schema drift fails the type-check job before the e2e job starts.

## Expected Input/Output

**Input scenario**: A test queries `users` with a parameterised `SELECT` using `sql("…")` and a generated `UsersRow` type.

**Expected outcome**: TypeScript enforces the params tuple, `db.query<UsersRow>` returns `rows: UsersRow[]`, and the connection closes automatically after the test — pass or fail.

**Failure scenario**: The query is written as a raw template string, or the params array is missing.

**Expected error**: For `sql("SELECT * WHERE id = ?")` — a compile error at the call site because the statement is `never` (missing `FROM`). For `db.query(stmt)` where `stmt: SqlStatement<[unknown]>` — a compile error: params argument required. Neither error waits for a test run.

Reference: [@playwright-labs/sql-core](https://github.com/vitalics/playwright-labs/tree/main/packages/sql-core), [@playwright-labs/fixture-sql](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-sql), [@playwright-labs/ts-plugin-sql](https://github.com/vitalics/playwright-labs/tree/main/packages/ts-plugin-sql)

---

### 8.8. Use API Mocking for Reliable and Fast Tests

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

### 8.9. Validate API Response JSON Schemas with toMatchSchema Custom Matcher

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
- https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-prometheus-remote-write
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-prometheus
- https://github.com/vitalics/playwright-labs/tree/main/packages/prometheus-core
- https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-angular
- https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-react
- https://github.com/vitalics/playwright-labs/tree/main/packages/selectors-vue
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-faker
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-allure
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-testcontainers
- https://github.com/vitalics/playwright-labs/tree/main/packages/ghost-cursor
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ghost-cursor
- https://github.com/vitalics/playwright-labs/tree/main/packages/sql-core
- https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-sql
- https://github.com/vitalics/playwright-labs/tree/main/packages/ts-plugin-sql

---

*This document was automatically generated from individual rule files.*  
*Last updated: 2026-07-21*
