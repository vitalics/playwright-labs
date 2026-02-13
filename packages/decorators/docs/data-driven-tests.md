# Data-Driven Tests Guide

Complete guide to writing data-driven tests using `@test.each()`, template parameters, and the `@param` decorator.

## Table of Contents

- [What Are Data-Driven Tests?](#what-are-data-driven-tests)
- [Basic Usage](#basic-usage)
- [Template Strings](#template-strings)
- [The @param Decorator](#the-param-decorator)
- [Advanced Patterns](#advanced-patterns)
- [Edge Cases and Gotchas](#edge-cases-and-gotchas)
- [When to Use](#when-to-use)
- [Best Practices](#best-practices)
- [Real-World Examples](#real-world-examples)

---

## What Are Data-Driven Tests?

Data-driven tests allow you to **run the same test logic with different input data**, reducing code duplication and improving test coverage.

### Without Data-Driven Tests (Repetitive)

```typescript
@describe('Login Tests')
class LoginTests {
  @test('should login with user1@example.com')
  async testUser1() {
    await this.page.fill('#email', 'user1@example.com');
    await this.page.fill('#password', 'password1');
    await this.page.click('#login');
  }

  @test('should login with user2@example.com')
  async testUser2() {
    await this.page.fill('#email', 'user2@example.com');
    await this.page.fill('#password', 'password2');
    await this.page.click('#login');
  }

  @test('should login with user3@example.com')
  async testUser3() {
    await this.page.fill('#email', 'user3@example.com');
    await this.page.fill('#password', 'password3');
    await this.page.click('#login');
  }
  // Imagine 50 more users...
}
```

### With Data-Driven Tests (DRY)

```typescript
@describe('Login Tests')
class LoginTests {
  @test.each([
    ['user1@example.com', 'password1'],
    ['user2@example.com', 'password2'],
    ['user3@example.com', 'password3'],
    // Add 50 more easily!
  ], 'should login with $1')
  async testLogin(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login');
  }
}
```

**Benefits:**
- ✅ Less code duplication
- ✅ Easy to add new test cases
- ✅ Clear test data separation
- ✅ Consistent test logic

---

## Basic Usage

### Syntax

```typescript
@test.each(data, template)
async testMethod(param1, param2, ...) {
  // test implementation
}
```

**Parameters:**
- `data`: Array of arrays containing test data
- `template`: Template string with placeholders (`$1`, `$2`, etc.)

### Simple Example

```typescript
@test.each([
  [2, 3, 5],
  [5, 7, 12],
  [10, 20, 30],
], 'should add $1 + $2 = $3')
async testAddition(a: number, b: number, expected: number) {
  const result = a + b;
  expect(result).toBe(expected);
}

// Generates 3 tests:
// ✓ should add 2 + 3 = 5
// ✓ should add 5 + 7 = 12
// ✓ should add 10 + 20 = 30
```

---

## Template Strings

Template strings allow you to create **descriptive test names** using placeholders that reference your test data.

### Placeholder Syntax

Use `$1`, `$2`, `$3`, etc. to reference parameters by position (1-indexed).

```typescript
@test.each([
  ['Alice', 25, 'Engineer'],
  ['Bob', 30, 'Designer'],
  ['Charlie', 35, 'Manager'],
], 'should process user $1, age $2, role $3')
async testUser(name: string, age: number, role: string) {
  // Test implementation
}

// Generates:
// ✓ should process user Alice, age 25, role Engineer
// ✓ should process user Bob, age 30, role Designer
// ✓ should process user Charlie, age 35, role Manager
```

### Why Use Template Strings?

**❌ Without Templates:**
```typescript
@test.each([
  ['admin@test.com', 'Admin123'],
  ['user@test.com', 'User456'],
], 'login test')  // Same name for all tests!
```

Result: All tests have same generic name, hard to identify failures.

**✅ With Templates:**
```typescript
@test.each([
  ['admin@test.com', 'Admin123'],
  ['user@test.com', 'User456'],
], 'should login with $1')
```

Result: Each test has unique, descriptive name.

### Template Best Practices

#### 1. Include Identifying Information

**❌ Too Generic:**
```typescript
@test.each([...], 'test case $1')
```

**✅ Descriptive:**
```typescript
@test.each([...], 'should login with username: $1')
```

#### 2. Show Expected Behavior

**❌ Just Data:**
```typescript
@test.each([...], '$1, $2, $3')
```

**✅ Clear Expectation:**
```typescript
@test.each([...], 'should calculate $1 + $2 = $3')
```

#### 3. Keep It Readable

**❌ Too Long:**
```typescript
@test.each([...], 'should verify that when user $1 with password $2 logs in at time $3 with device $4 from location $5 the result is $6')
```

**✅ Concise:**
```typescript
@test.each([...], 'should login user $1 from $5: expect $6')
```

### Literal Dollar Signs

If you need a literal `$` character in your test name:

```typescript
@test.each([
  [100, 'USD'],
  [200, 'EUR'],
], 'should process $$1 $2')  // $$ becomes single $

// Generates:
// ✓ should process $100 USD
// ✓ should process $200 EUR
```

---

## The @param Decorator

The `@param` decorator provides **named parameters** and **descriptions** for data-driven tests, making test data more readable and maintainable.

### Basic Syntax

```typescript
@test.each([...], template)
@param('paramName', 'Description of parameter')
async testMethod(paramValue: Type) {
  // test implementation
}
```

### Why Use @param?

**Without @param:**
```typescript
@test.each([
  ['user@example.com', 'pass123', true],
  ['admin@example.com', 'admin456', true],
  ['invalid@example.com', 'wrong', false],
], 'login test: $1 / $2 -> $3')
async testLogin(email: string, password: string, expected: boolean) {
  // What does each parameter mean? 🤔
}
```

**With @param:**
```typescript
@test.each([
  ['user@example.com', 'pass123', true],
  ['admin@example.com', 'admin456', true],
  ['invalid@example.com', 'wrong', false],
], 'login test: $1 / $2 -> $3')
@param('email', 'User email address')
@param('password', 'User password')
@param('shouldSucceed', 'Expected login result')
async testLogin(email: string, password: string, shouldSucceed: boolean) {
  // Parameters are self-documenting! ✓
}
```

### Multiple Parameters

```typescript
@test.each([
  [10, 20, 30, 60],
  [5, 10, 15, 30],
  [100, 200, 300, 600],
], 'sum of $1, $2, $3 should be $4')
@param('first', 'First number in sequence')
@param('second', 'Second number in sequence')
@param('third', 'Third number in sequence')
@param('expected', 'Expected sum of all numbers')
async testSum(first: number, second: number, third: number, expected: number) {
  const result = first + second + third;
  expect(result).toBe(expected);
}
```

### Benefits of @param

1. **Self-Documenting Tests**
   - Clear parameter purpose
   - Easier for new team members
   - Better code reviews

2. **IDE Support**
   - Hover to see descriptions
   - Better autocomplete context
   - Type hints enhanced

3. **Test Reports**
   - Parameter metadata in reports
   - Clearer test documentation
   - Better failure analysis

4. **Maintenance**
   - Easy to understand data structure
   - Refactoring is safer
   - Changes are clearer

### @param Position Matters

The order of `@param` decorators should match parameter order:

```typescript
@test.each([...], template)
@param('first', 'First param')   // position 0
@param('second', 'Second param') // position 1
@param('third', 'Third param')   // position 2
async test(first, second, third) {
  //          ↑      ↑       ↑
  //        pos 0  pos 1   pos 2
}
```

---

## Advanced Patterns

### Complex Objects as Parameters

```typescript
interface User {
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
}

@test.each([
  [{ email: 'admin@test.com', role: 'admin', permissions: ['read', 'write', 'delete'] }],
  [{ email: 'user@test.com', role: 'user', permissions: ['read'] }],
], 'should verify permissions for $1')
@param('user', 'User object with credentials and permissions')
async testPermissions(user: User) {
  // Type-safe access to user properties
  await this.page.fill('#email', user.email);
  // ... test implementation
}
```

### Custom Formatters with serializable

For better test names with complex objects:

```typescript
import { serializable } from '@playwright-labs/decorators';

@test.each([
  [serializable(
    { name: 'John', age: 30 },
    (user) => `${user.name} (${user.age})`
  )],
  [serializable(
    { name: 'Jane', age: 25 },
    (user) => `${user.name} (${user.age})`
  )],
], 'should process user: $1')
@param('user', 'User data object')
async testUser(user: { name: string; age: number }) {
  // Test implementation
}

// Generates:
// ✓ should process user: John (30)
// ✓ should process user: Jane (25)
```

### Combining with Other Decorators

```typescript
@test.each([
  ['admin@test.com', 'Admin123', true],
  ['user@test.com', 'User456', true],
  ['invalid@test.com', 'wrong', false],
], 'login with $1: expect $3')
@param('email', 'Login email')
@param('password', 'Login password')
@param('shouldSucceed', 'Expected result')
@timeout(10000)  // Timeout applies to all generated tests
@tag('auth', 'data-driven')  // Tags apply to all generated tests
async testLogin(email: string, password: string, shouldSucceed: boolean) {
  // Test implementation
}
```

### Nested Arrays

```typescript
@test.each([
  [['apple', 'banana'], 2],
  [['car', 'bike', 'plane'], 3],
  [[], 0],
], 'array with $1 should have length $2')
@param('items', 'Array of items')
@param('expectedLength', 'Expected array length')
async testArrayLength(items: string[], expectedLength: number) {
  expect(items.length).toBe(expectedLength);
}
```

---

## Edge Cases and Gotchas

### 1. Placeholder Numbers Must Match Data Position

**❌ Wrong Placeholder:**
```typescript
@test.each([
  ['Alice', 25],
  ['Bob', 30],
], 'User: $3')  // ❌ No $3 in data!
```

**Result:** Error or undefined in test name.

**✅ Correct:**
```typescript
@test.each([
  ['Alice', 25],
  ['Bob', 30],
], 'User: $1, Age: $2')  // ✓ $1 and $2 exist
```

### 2. Template Strings Don't Execute Code

**❌ Won't Work:**
```typescript
@test.each([
  [10, 20],
], 'sum is ${$1 + $2}')  // ❌ Template literal won't evaluate
```

**✅ Use Data:**
```typescript
@test.each([
  [10, 20, 30],  // Pre-calculate expected
], 'sum of $1 + $2 = $3')
```

### 3. Special Characters in Data

**Issue:**
```typescript
@test.each([
  ['user@example.com'],  // @ symbol
  ['100$'],              // $ symbol
  ['50%'],               // % symbol
], 'process $1')
```

**Result:** Works fine! Special characters are safely included.

### 4. Long Test Names

**⚠️  Problem:**
```typescript
@test.each([
  ['very-long-email-address@subdomain.example.com', 'very-long-password-with-special-characters-123!@#'],
], 'login with email $1 and password $2')
```

**Result:** Test name becomes unwieldy in reports.

**✅ Solution:**
```typescript
// Option 1: Shorten template
@test.each([...], 'login with $1')

// Option 2: Use custom formatter
@test.each([
  [serializable('very-long-email@...', () => 'user@...')],
], 'login with $1')

// Option 3: Use identifiers
@test.each([
  ['ID-001', 'user1@example.com', 'pass1'],
], 'login test: $1')  // Use ID instead
```

### 5. Undefined or Null Values

```typescript
@test.each([
  ['Alice', 25],
  ['Bob', null],      // null age
  [undefined, 30],    // undefined name
], 'User: $1, Age: $2')

// Generates:
// ✓ User: Alice, Age: 25
// ✓ User: Bob, Age: null
// ✓ User: undefined, Age: 30
```

This works, but might not be ideal. Consider using strings like `'<none>'`:

```typescript
@test.each([
  ['Alice', 25],
  ['Bob', '<no age>'],
  ['<no name>', 30],
], 'User: $1, Age: $2')
```

### 6. Arrays and Objects in Templates

```typescript
@test.each([
  [[1, 2, 3], 3],
  [{ name: 'test' }, 1],
], 'data: $1, count: $2')

// Generates:
// ✓ data: 1,2,3, count: 3
// ✓ data: [object Object], count: 1
```

Use `serializable` for better formatting:

```typescript
@test.each([
  [serializable([1, 2, 3], arr => `[${arr.join(',')}]`), 3],
  [serializable({ name: 'test' }, obj => obj.name), 1],
], 'data: $1, count: $2')

// Generates:
// ✓ data: [1,2,3], count: 3
// ✓ data: test, count: 1
```

### 7. Placeholder Limit

**⚠️  Too Many Parameters:**
```typescript
@test.each([
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  // 12 parameters
], 'test $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12')
```

**Issue:** Hard to read, hard to maintain.

**✅ Better Approach:**
```typescript
// Group related data into objects
interface TestData {
  input: { a: number; b: number; c: number; };
  expected: { x: number; y: number; };
}

@test.each([
  [{ input: { a: 1, b: 2, c: 3 }, expected: { x: 4, y: 5 } }],
], 'test with structured data')
@param('data', 'Test input and expected output')
async test(data: TestData) {
  // Cleaner access
}
```

---

## When to Use

### ✅ Good Use Cases

#### 1. Testing Multiple Input Variations

```typescript
@test.each([
  ['valid@email.com', true],
  ['invalid.email', false],
  ['missing@domain', false],
  ['@no-local.com', false],
], 'should validate email $1: expect $2')
async testEmailValidation(email: string, isValid: boolean) {
  const result = validateEmail(email);
  expect(result).toBe(isValid);
}
```

**Why:** Same logic, different inputs.

#### 2. Boundary Testing

```typescript
@test.each([
  [0, 'zero'],
  [1, 'positive'],
  [-1, 'negative'],
  [Number.MAX_VALUE, 'max'],
  [Number.MIN_VALUE, 'min'],
], 'should handle $2 value: $1')
async testBoundaries(value: number, description: string) {
  const result = processNumber(value);
  expect(result).toBeDefined();
}
```

**Why:** Testing edge cases systematically.

#### 3. Localization Testing

```typescript
@test.each([
  ['en', 'Hello'],
  ['es', 'Hola'],
  ['fr', 'Bonjour'],
  ['de', 'Guten Tag'],
], 'should display greeting in $1: "$2"')
@param('locale', 'Language locale code')
@param('expectedGreeting', 'Expected translated greeting')
async testLocalization(locale: string, expectedGreeting: string) {
  await this.page.goto(`/?lang=${locale}`);
  const greeting = await this.page.textContent('.greeting');
  expect(greeting).toBe(expectedGreeting);
}
```

**Why:** Same test across languages.

#### 4. Permission Testing

```typescript
@test.each([
  ['admin', ['read', 'write', 'delete']],
  ['editor', ['read', 'write']],
  ['viewer', ['read']],
  ['guest', []],
], 'user role $1 should have permissions: $2')
async testPermissions(role: string, expectedPermissions: string[]) {
  const perms = await getPermissionsForRole(role);
  expect(perms).toEqual(expectedPermissions);
}
```

**Why:** Same permission logic for different roles.

#### 5. Cross-Browser Testing

```typescript
@test.each([
  ['chromium', 1920, 1080],
  ['firefox', 1920, 1080],
  ['webkit', 1920, 1080],
], 'should render correctly on $1 at $2x$3')
async testBrowsers(browser: string, width: number, height: number) {
  // Test implementation
}
```

**Why:** Same test across browsers.

### ❌ When NOT to Use

#### 1. Tests with Different Logic

**❌ Don't Force It:**
```typescript
@test.each([
  ['login', 'click-login-button'],
  ['signup', 'fill-form-and-submit'],
  ['forgot-password', 'enter-email-send-reset'],
], 'test $1')
async testDifferentFlows(flow: string, action: string) {
  // Each flow needs completely different code
  if (flow === 'login') {
    // Login logic
  } else if (flow === 'signup') {
    // Signup logic (totally different!)
  } else {
    // Reset logic (also different!)
  }
}
```

**✅ Use Separate Tests:**
```typescript
@test('should login')
async testLogin() { /* ... */ }

@test('should signup')
async testSignup() { /* ... */ }

@test('should reset password')
async testReset() { /* ... */ }
```

#### 2. When Test Names Matter More Than Data

**❌ Unclear Names:**
```typescript
@test.each([
  [1], [2], [3],
], 'test $1')  // What does 1, 2, 3 mean?
```

**✅ Explicit Names:**
```typescript
@test('should test scenario A')
async testA() { /* ... */ }

@test('should test scenario B')
async testB() { /* ... */ }
```

#### 3. Too Few Test Cases

**❌ Overkill:**
```typescript
@test.each([
  ['user@example.com', 'password'],
], 'login with $1')
async testLogin(email: string, password: string) {
  // Only one test case - why use @test.each?
}
```

**✅ Simple Test:**
```typescript
@test('should login')
async testLogin() {
  await this.page.fill('#email', 'user@example.com');
  await this.page.fill('#password', 'password');
}
```

---

## Best Practices

### 1. Keep Test Data Organized

```typescript
// ✅ Good: Separate data from logic
const loginData = [
  ['user1@test.com', 'pass1', true],
  ['user2@test.com', 'pass2', true],
  ['invalid@test.com', 'wrong', false],
];

@describe('Login Tests')
class LoginTests {
  @test.each(loginData, 'login with $1: expect $3')
  @param('email', 'User email')
  @param('password', 'User password')
  @param('shouldSucceed', 'Expected result')
  async testLogin(email: string, password: string, shouldSucceed: boolean) {
    // Test logic
  }
}
```

### 2. Use Descriptive Templates

```typescript
// ❌ Bad: Generic
@test.each([...], 'test $1')

// ✅ Good: Descriptive
@test.each([...], 'should validate email $1 and expect $2')
```

### 3. Document Parameters with @param

```typescript
// ✅ Always document complex data
@test.each([...], template)
@param('userData', 'Complete user object with profile and settings')
@param('expectedRole', 'Role that should be assigned after processing')
@param('shouldNotify', 'Whether notification email should be sent')
async test(userData, expectedRole, shouldNotify) {
  // Clear what each parameter represents
}
```

### 4. Use TypeScript Types

```typescript
// ✅ Type-safe data-driven tests
interface TestCase {
  input: string;
  expected: boolean;
}

const testCases: TestCase[] = [
  { input: 'valid@email.com', expected: true },
  { input: 'invalid', expected: false },
];

@test.each(
  testCases.map(tc => [tc.input, tc.expected]),
  'validate $1: expect $2'
)
async testValidation(input: string, expected: boolean) {
  // Type-safe!
}
```

### 5. Group Related Test Data

```typescript
// ✅ Group by category
const validEmails = [
  ['user@example.com'],
  ['test@test.co.uk'],
];

const invalidEmails = [
  ['not-an-email'],
  ['missing@domain'],
];

@test.each(validEmails, 'should accept valid email: $1')
async testValid(email: string) { /* ... */ }

@test.each(invalidEmails, 'should reject invalid email: $1')
async testInvalid(email: string) { /* ... */ }
```

---

## Real-World Examples

### Example 1: E-Commerce Price Testing

```typescript
@describe('Product Pricing')
class ProductPricingTests {
  @test.each([
    [100, 0, 100],      // No discount
    [100, 10, 90],      // 10% off
    [100, 50, 50],      // 50% off
    [99.99, 20, 79.99], // Decimal price
  ], 'price $1 with $2% discount = $3')
  @param('originalPrice', 'Product original price')
  @param('discountPercent', 'Discount percentage to apply')
  @param('expectedPrice', 'Final price after discount')
  @timeout(5000)
  async testPriceCalculation(
    originalPrice: number,
    discountPercent: number,
    expectedPrice: number
  ) {
    await this.page.goto('/product/123');
    await this.page.fill('#original-price', originalPrice.toString());
    await this.page.fill('#discount', discountPercent.toString());
    await this.page.click('#calculate');
    
    const finalPrice = await this.page.textContent('.final-price');
    expect(parseFloat(finalPrice)).toBe(expectedPrice);
  }
}
```

### Example 2: Form Validation Matrix

```typescript
interface FormData {
  name: string;
  email: string;
  age: number;
  isValid: boolean;
  errorMessage?: string;
}

@describe('Registration Form Validation')
class FormValidationTests {
  @test.each([
    ['John Doe', 'john@example.com', 25, true, undefined],
    ['', 'john@example.com', 25, false, 'Name is required'],
    ['John', 'invalid-email', 25, false, 'Invalid email'],
    ['John', 'john@example.com', 15, false, 'Must be 18+'],
    ['J', 'john@example.com', 25, false, 'Name too short'],
  ], 'validate form: $1 / $2 / $3 -> $4')
  @param('name', 'User full name')
  @param('email', 'User email address')
  @param('age', 'User age in years')
  @param('isValid', 'Whether form should pass validation')
  @param('errorMessage', 'Expected error message if invalid')
  @tag('validation', 'forms')
  async testFormValidation(
    name: string,
    email: string,
    age: number,
    isValid: boolean,
    errorMessage?: string
  ) {
    await this.page.goto('/register');
    await this.page.fill('#name', name);
    await this.page.fill('#email', email);
    await this.page.fill('#age', age.toString());
    await this.page.click('#submit');
    
    if (isValid) {
      await expect(this.page).toHaveURL('/welcome');
    } else {
      const error = await this.page.textContent('.error');
      expect(error).toContain(errorMessage);
    }
  }
}
```

### Example 3: API Response Testing

```typescript
@describe('API Status Codes')
class ApiStatusTests {
  @test.each([
    ['/api/users', 'GET', 200, 'OK'],
    ['/api/users/1', 'GET', 200, 'OK'],
    ['/api/users', 'POST', 201, 'Created'],
    ['/api/users/999', 'GET', 404, 'Not Found'],
    ['/api/admin', 'GET', 403, 'Forbidden'],
  ], '$2 $1 should return $3 $4')
  @param('endpoint', 'API endpoint path')
  @param('method', 'HTTP method')
  @param('expectedStatus', 'Expected HTTP status code')
  @param('expectedMessage', 'Expected status message')
  async testApiResponses(
    endpoint: string,
    method: string,
    expectedStatus: number,
    expectedMessage: string
  ) {
    const response = await this.request[method.toLowerCase()](endpoint);
    expect(response.status()).toBe(expectedStatus);
    expect(response.statusText()).toContain(expectedMessage);
  }
}
```

---

## Summary

### Key Takeaways

1. **Use `@test.each()`** for testing same logic with different data
2. **Template strings** create descriptive test names with `$1`, `$2`, etc.
3. **`@param` decorator** documents parameters and improves maintainability
4. **Edge cases matter** - handle special characters, nulls, complex objects
5. **Know when to use** - data variations, not different logic
6. **Follow best practices** - organize data, use types, descriptive names

### Quick Reference

```typescript
// Complete pattern
@test.each(data, template)
@param('param1', 'description')
@param('param2', 'description')
@timeout(ms)
@tag('tag1', 'tag2')
async testMethod(param1: Type1, param2: Type2) {
  // Test implementation
}
```

---

**Related:** 
- [API Reference](./api-reference.md) - Complete decorator documentation
- [Best Practices](./best-practices.md) - Testing patterns
- [Edge Cases](./edge-cases.md) - Common pitfalls
- [Migration Guide](./migration-guide.md) - From traditional Playwright

---

**Examples:** See `tests/decorator-test-each.spec.ts` for 29+ working examples.
