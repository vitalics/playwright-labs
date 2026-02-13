# Page Object Model with Decorators

The decorator system is a natural fit for the Page Object Model (POM) pattern. This guide shows how to build maintainable, reusable page objects with decorator-based tests.

## Table of Contents

- [What Is the Page Object Model](#what-is-the-page-object-model)
- [Basic Page Object](#basic-page-object)
- [Using Page Objects in Tests](#using-page-objects-in-tests)
- [Page Object Patterns](#page-object-patterns)
- [Component Objects](#component-objects)
- [Base Test Classes](#base-test-classes)
- [Multi-Page Flows](#multi-page-flows)
- [Data-Driven Tests with POM](#data-driven-tests-with-pom)
- [Project Structure](#project-structure)
- [Best Practices](#best-practices)

---

## What Is the Page Object Model

The Page Object Model encapsulates page-specific selectors and interactions into reusable classes. Tests interact with page objects instead of raw selectors.

**Benefits:**
- Single place to update when UI changes
- Readable test code (business language, not selectors)
- Reusable across multiple test suites
- Easy to maintain as application grows

---

## Basic Page Object

Page objects are plain TypeScript classes that wrap a Playwright `Page`:

```typescript
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toHaveText(message);
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

---

## Using Page Objects in Tests

Instantiate page objects in `@beforeEach` and use them in tests:

```typescript
// tests/login.spec.ts
import { describe, test, beforeEach } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

@describe('Login Tests')
class LoginTests {
  private loginPage: LoginPage;

  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.loginPage.goto();
  }

  @test('should login with valid credentials')
  async testValidLogin() {
    await this.loginPage.login('user@example.com', 'password123');
    await this.loginPage.expectLoggedIn();
  }

  @test('should show error for invalid credentials')
  async testInvalidLogin() {
    await this.loginPage.login('user@example.com', 'wrong');
    await this.loginPage.expectError('Invalid email or password');
  }

  @test('should show error for empty email')
  async testEmptyEmail() {
    await this.loginPage.login('', 'password123');
    await this.loginPage.expectError('Email is required');
  }
}
```

---

## Page Object Patterns

### Page with Navigation

```typescript
// pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly welcomeMessage: Locator;
  readonly userMenu: Locator;
  readonly navLinks: Locator;

  constructor(private page: Page) {
    this.welcomeMessage = page.locator('[data-testid="welcome"]');
    this.userMenu = page.locator('[data-testid="user-menu"]');
    this.navLinks = page.locator('nav a');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async getWelcomeText() {
    return this.welcomeMessage.textContent();
  }

  async navigateTo(section: string) {
    await this.navLinks.filter({ hasText: section }).click();
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async logout() {
    await this.openUserMenu();
    await this.page.locator('text=Logout').click();
    await expect(this.page).toHaveURL('/login');
  }

  async expectVisible() {
    await expect(this.welcomeMessage).toBeVisible();
  }
}
```

### Page with Form Handling

```typescript
// pages/RegistrationPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class RegistrationPage {
  readonly form: {
    firstName: Locator;
    lastName: Locator;
    email: Locator;
    password: Locator;
    confirmPassword: Locator;
    submit: Locator;
  };

  constructor(private page: Page) {
    this.form = {
      firstName: page.locator('#firstName'),
      lastName: page.locator('#lastName'),
      email: page.locator('#email'),
      password: page.locator('#password'),
      confirmPassword: page.locator('#confirmPassword'),
      submit: page.locator('button[type="submit"]'),
    };
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillForm(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.form.firstName.fill(data.firstName);
    await this.form.lastName.fill(data.lastName);
    await this.form.email.fill(data.email);
    await this.form.password.fill(data.password);
    await this.form.confirmPassword.fill(data.password);
  }

  async submit() {
    await this.form.submit.click();
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    await this.fillForm(data);
    await this.submit();
  }

  async expectSuccess() {
    await expect(this.page.locator('.success')).toBeVisible();
  }

  async expectFieldError(field: string, message: string) {
    await expect(
      this.page.locator(`[data-error="${field}"]`)
    ).toHaveText(message);
  }
}
```

---

## Component Objects

For reusable UI components, create component objects:

```typescript
// components/DataTable.ts
import { Page, Locator, expect } from '@playwright/test';

export class DataTable {
  readonly rows: Locator;
  readonly headers: Locator;
  readonly pagination: Locator;
  readonly searchInput: Locator;

  constructor(
    private page: Page,
    private root: Locator,
  ) {
    this.rows = root.locator('tbody tr');
    this.headers = root.locator('thead th');
    this.pagination = root.locator('.pagination');
    this.searchInput = root.locator('input[type="search"]');
  }

  async getRowCount() {
    return this.rows.count();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce
  }

  async sortBy(column: string) {
    await this.headers.filter({ hasText: column }).click();
  }

  async getRow(index: number) {
    return this.rows.nth(index);
  }

  async getCellText(row: number, column: number) {
    return this.rows.nth(row).locator('td').nth(column).textContent();
  }

  async goToPage(pageNum: number) {
    await this.pagination.locator(`text=${pageNum}`).click();
  }
}
```

### Using Component Objects in Page Objects

```typescript
// pages/UsersPage.ts
import { Page, expect } from '@playwright/test';
import { DataTable } from '../components/DataTable';

export class UsersPage {
  readonly table: DataTable;

  constructor(private page: Page) {
    this.table = new DataTable(page, page.locator('#users-table'));
  }

  async goto() {
    await this.page.goto('/admin/users');
  }

  async searchUser(name: string) {
    await this.table.search(name);
  }

  async getUserEmail(rowIndex: number) {
    return this.table.getCellText(rowIndex, 2);  // Email column
  }
}
```

### Using in Tests

```typescript
@describe('Users Management')
class UsersManagementTests {
  private usersPage: UsersPage;

  @beforeEach()
  async setup() {
    this.usersPage = new UsersPage(this.page);
    await this.usersPage.goto();
  }

  @test('should display users table')
  async testTableVisible() {
    const count = await this.usersPage.table.getRowCount();
    expect(count).toBeGreaterThan(0);
  }

  @test('should search users')
  async testSearch() {
    await this.usersPage.searchUser('Alice');
    const email = await this.usersPage.getUserEmail(0);
    expect(email).toContain('alice');
  }

  @test('should sort by name')
  async testSort() {
    await this.usersPage.table.sortBy('Name');
    const firstName = await this.usersPage.table.getCellText(0, 0);
    expect(firstName).toBeTruthy();
  }
}
```

---

## Base Test Classes

Create base classes to share common setup across test suites:

```typescript
// tests/base/AuthenticatedTest.ts
import { BaseTest, beforeEach } from '@playwright-labs/decorators';
import { LoginPage } from '../../pages/LoginPage';

export class AuthenticatedTest extends BaseTest {
  protected loginPage: LoginPage;

  @beforeEach()
  async authenticate() {
    this.loginPage = new LoginPage(this.page);
    await this.loginPage.goto();
    await this.loginPage.login('admin@test.com', 'password');
    await this.loginPage.expectLoggedIn();
  }
}
```

```typescript
// tests/admin/users.spec.ts
import { describe, test, beforeEach } from '@playwright-labs/decorators';
import { expect } from '@playwright/test';
import { AuthenticatedTest } from '../base/AuthenticatedTest';
import { UsersPage } from '../../pages/UsersPage';

@describe('User Administration')
class UserAdminTests extends AuthenticatedTest {
  private usersPage: UsersPage;

  @beforeEach()
  async navigateToUsers() {
    this.usersPage = new UsersPage(this.page);
    await this.usersPage.goto();
  }

  @test('should list all users')
  async testListUsers() {
    const count = await this.usersPage.table.getRowCount();
    expect(count).toBeGreaterThan(0);
  }
}
```

### Layered Base Classes

```typescript
// Layer 1: Basic page access
class BasePageTest extends BaseTest {
  @beforeEach()
  async waitForApp() {
    await this.page.waitForLoadState('domcontentloaded');
  }
}

// Layer 2: Authenticated access
class AuthenticatedPageTest extends BasePageTest {
  @beforeEach()
  async login() {
    await this.page.goto('/login');
    await this.page.fill('#email', 'user@test.com');
    await this.page.fill('#password', 'pass');
    await this.page.click('#submit');
  }
}

// Layer 3: Admin access
class AdminPageTest extends AuthenticatedPageTest {
  @beforeEach()
  async switchToAdmin() {
    await this.page.goto('/admin');
    await this.page.waitForSelector('.admin-panel');
  }
}

// Test suite
@describe('Admin Settings')
class AdminSettingsTests extends AdminPageTest {
  @test('should access settings')
  async test() {
    // Hooks ran: waitForApp → login → switchToAdmin
    await expect(this.page.locator('.admin-panel')).toBeVisible();
  }
}
```

---

## Multi-Page Flows

Test user journeys that span multiple pages:

```typescript
import { describe, test, beforeEach, step } from '@playwright-labs/decorators';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SettingsPage } from '../pages/SettingsPage';

@describe('User Profile Update Flow')
class ProfileUpdateFlowTests {
  private loginPage: LoginPage;
  private dashboardPage: DashboardPage;
  private settingsPage: SettingsPage;

  @beforeEach()
  async setupPages() {
    this.loginPage = new LoginPage(this.page);
    this.dashboardPage = new DashboardPage(this.page);
    this.settingsPage = new SettingsPage(this.page);
  }

  @step('Login as user')
  async loginAsUser() {
    await this.loginPage.goto();
    await this.loginPage.login('user@test.com', 'password');
    await this.dashboardPage.expectVisible();
  }

  @step('Navigate to settings')
  async goToSettings() {
    await this.dashboardPage.navigateTo('Settings');
    await this.settingsPage.expectVisible();
  }

  @test('should update display name')
  async testUpdateName() {
    await this.loginAsUser();
    await this.goToSettings();
    await this.settingsPage.updateDisplayName('New Name');
    await this.settingsPage.expectSaved();
  }

  @test('should update email')
  async testUpdateEmail() {
    await this.loginAsUser();
    await this.goToSettings();
    await this.settingsPage.updateEmail('new@test.com');
    await this.settingsPage.expectVerificationSent();
  }
}
```

---

## Data-Driven Tests with POM

Combine page objects with `@test.each` for thorough testing:

```typescript
import { describe, test, beforeEach } from '@playwright-labs/decorators';
import { serializable } from '@playwright-labs/decorators';
import { LoginPage } from '../pages/LoginPage';

@describe('Login Validation')
class LoginValidationTests {
  private loginPage: LoginPage;

  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.loginPage.goto();
  }

  @test.each([
    ['', 'password', 'Email is required'],
    ['invalid', 'password', 'Invalid email format'],
    ['user@test.com', '', 'Password is required'],
    ['user@test.com', 'abc', 'Password must be at least 8 characters'],
  ], 'validates: $0 / $1 -> $2')
  async testValidation(email: string, password: string, expectedError: string) {
    await this.loginPage.login(email, password);
    await this.loginPage.expectError(expectedError);
  }
}
```

### Using @test.data with POM

```typescript
@describe('Product Search')
class ProductSearchTests {
  private searchPage: SearchPage;

  @test.data()
  searchTerms = [
    ['laptop', 5],
    ['phone', 10],
    ['tablet', 3],
    ['', 0],
  ];

  @beforeEach()
  async setup() {
    this.searchPage = new SearchPage(this.page);
    await this.searchPage.goto();
  }

  @test.each((self) => self.searchTerms, "Search '$0' returns $1 results")
  async testSearch(term: string, expectedCount: number) {
    await this.searchPage.search(term);
    const count = await this.searchPage.getResultCount();
    expect(count).toBe(expectedCount);
  }
}
```

---

## Project Structure

Recommended project structure for POM with decorators:

```
project/
├── pages/                      # Page Objects
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── SettingsPage.ts
│   └── UsersPage.ts
│
├── components/                 # Reusable Component Objects
│   ├── DataTable.ts
│   ├── Modal.ts
│   ├── Navbar.ts
│   └── SearchBar.ts
│
├── tests/
│   ├── base/                   # Base Test Classes
│   │   ├── BasePageTest.ts
│   │   └── AuthenticatedTest.ts
│   │
│   ├── auth/                   # Feature-based test directories
│   │   ├── login.spec.ts
│   │   └── registration.spec.ts
│   │
│   ├── dashboard/
│   │   └── dashboard.spec.ts
│   │
│   └── admin/
│       ├── users.spec.ts
│       └── settings.spec.ts
│
├── playwright.config.ts
└── tsconfig.json
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Page Object | PascalCase + `Page` | `LoginPage.ts` |
| Component | PascalCase | `DataTable.ts` |
| Test File | kebab-case + `.spec.ts` | `login.spec.ts` |
| Base Test | PascalCase + `Test` | `AuthenticatedTest.ts` |

---

## Best Practices

### Keep Page Objects Focused

```typescript
// ✅ Good: One page, one class
export class LoginPage {
  async login(email: string, password: string) {}
  async expectError(message: string) {}
  async expectLoggedIn() {}
}

// ❌ Bad: Multiple pages in one class
export class AllPages {
  async login() {}
  async navigateDashboard() {}
  async updateSettings() {}
  async managUsers() {}
}
```

### Add Assertions to Page Objects

```typescript
// ✅ Good: Assertions in page object
export class ProductPage {
  async expectPrice(expected: string) {
    await expect(this.priceLabel).toHaveText(expected);
  }

  async expectInStock() {
    await expect(this.stockBadge).toHaveText('In Stock');
  }
}

// ❌ Bad: Exposing raw locators for assertions
export class ProductPage {
  getPriceLocator() {
    return this.page.locator('.price');  // Leaks implementation
  }
}
```

### Use @step for Traceability

```typescript
@describe('Checkout Flow')
class CheckoutTests {
  @step('Add item to cart')
  async addToCart(productName: string) {
    await this.productPage.addToCart(productName);
  }

  @step('Complete checkout')
  async checkout() {
    await this.cartPage.proceedToCheckout();
    await this.checkoutPage.fillPayment(this.paymentData);
    await this.checkoutPage.submit();
  }

  @test('should complete purchase')
  async testPurchase() {
    await this.addToCart('Laptop');   // Shows as step in report
    await this.checkout();            // Shows as step in report
    await this.confirmPage.expectOrderPlaced();
  }
}
```

### Don't Put Test Logic in Page Objects

```typescript
// ❌ Bad: Test logic in page object
export class LoginPage {
  async testLoginFlow() {  // Tests don't belong here
    await this.login('user', 'pass');
    await expect(this.page).toHaveURL('/dashboard');
  }
}

// ✅ Good: Page object provides actions, tests provide logic
export class LoginPage {
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

---

**Related:** [Core Concepts](./core-concepts.md) | [Data-Driven Tests](./data-driven-tests.md) | [Best Practices](./best-practices.md)
