# Troubleshooting

Common issues and their solutions when using the decorator system.

## Table of Contents

- [Configuration Errors](#configuration-errors)
- [Runtime Errors](#runtime-errors)
- [Fixture Errors](#fixture-errors)
- [Lifecycle Hook Errors](#lifecycle-hook-errors)
- [Data-Driven Test Errors](#data-driven-test-errors)
- [Type Errors](#type-errors)
- [Test Discovery Issues](#test-discovery-issues)
- [Performance Issues](#performance-issues)
- [Debugging Techniques](#debugging-techniques)

---

## Configuration Errors

### "Decorator is not a function"

**Cause:** `experimentalDecorators` is enabled in tsconfig.json.

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // Must be false or omitted
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

### "Decorators are not valid here"

**Cause:** TypeScript target is too low.

**Solution:**
```json
{
  "compilerOptions": {
    "target": "ES2022"  // Must be ES2022 or higher
  }
}
```

### "Cannot find module '@playwright-labs/decorators'"

**Cause:** Package not installed or wrong import path.

**Solution:**
```bash
npm install @playwright-labs/decorators @playwright/test
```

Check that your import is correct:
```typescript
import { describe, test } from '@playwright-labs/decorators';
```

---

## Runtime Errors

### "Cannot read property 'page' of undefined"

**Cause:** Using arrow function for test method.

```typescript
// ❌ Wrong
@test('test')
myTest = async () => {
  await this.page.goto('/');  // 'this' is undefined!
}
```

**Solution:** Use regular method syntax:
```typescript
// ✅ Correct
@test('test')
async myTest() {
  await this.page.goto('/');
}
```

### "describe decorator can only be used on classes"

**Cause:** Using `@describe` on something other than a class.

```typescript
// ❌ Wrong
@describe('test')
function myTests() {}
```

**Solution:** Apply `@describe` only to classes:
```typescript
// ✅ Correct
@describe('test')
class MyTests {}
```

### "@test decorator can only be used on methods"

**Cause:** Using `@test` on a field or other non-method target.

```typescript
// ❌ Wrong
@test('test')
testData = { key: 'value' };
```

**Solution:** Apply `@test` only to methods:
```typescript
// ✅ Correct
@test('test')
async testData() {
  expect({ key: 'value' }).toBeDefined();
}
```

### "Unsupported decorator type" from @test.data

**Cause:** Using `@test.data()` on something other than a field or method.

**Solution:** Use on fields or methods only:
```typescript
// ✅ Field
@test.data()
params = [[1, 2, 3]];

// ✅ Method
@test.data()
getData() { return [[1, 2, 3]]; }
```

### "@test.each callback returned a Promise"

**Cause:** Using an async data provider with the `@test.each` callback form.

```typescript
// ❌ Wrong: Async data provider
@test.each((self) => self.fetchData(), '$0 + $1')
async test(a: number, b: number) {}

async fetchData() {
  return await fetch('/data').then(r => r.json());
}
```

**Solution:** Use synchronous data sources. Playwright requires synchronous test registration:
```typescript
// ✅ Correct: Sync field
@test.data()
data = [[1, 2], [3, 4]];

@test.each((self) => self.data, '$0 + $1')
async test(a: number, b: number) {}

// ✅ Correct: Sync method
@test.data()
getData() {
  return [[1, 2], [3, 4]];  // No async/await
}
```

---

## Fixture Errors

### "this.page is undefined" in @beforeAll

**Cause:** Playwright fixtures are not available in static/beforeAll hooks.

```typescript
// ❌ Wrong
@beforeAll()
static async setup() {
  await this.page.goto('/');  // No fixtures in @beforeAll!
}
```

**Solution:** Use `@beforeEach` for fixture access:
```typescript
// ✅ Correct
@beforeEach()
async setup() {
  await this.page.goto('/');  // Fixtures available here
}
```

### Fixture Not Available on this

**Cause:** Custom fixture not included in `makeDecorators` extraction.

**Solution:** Either use default extraction (all Playwright fixtures) or include your fixture:
```typescript
const { describe, test } = makeDecorators(
  myTest,
  (fixtures) => ({
    page: fixtures.page,
    myCustomFixture: fixtures.myCustomFixture,  // Include it
  })
);
```

### Fixture Values Stale or Shared

**Cause:** Using static properties or getter fixtures without understanding their lifecycle.

```typescript
// ❌ Static: shared between tests
static data: any;

// ❌ Getter: recomputes every access
@use.define()
get timestamp() { return Date.now(); }
```

**Solution:**
```typescript
// ✅ Instance field: fresh per test
private data: any;

// ✅ Field fixture: computed once per test
@use.define()
timestamp = Date.now();
```

---

## Lifecycle Hook Errors

### "@beforeEach cannot be used on static methods"

**Cause:** Using `@beforeEach` on a static method.

```typescript
// ❌ Wrong
@beforeEach()
static async setup() {}
```

**Solution:** `@beforeEach`/`@afterEach` must be instance methods:
```typescript
// ✅ Correct
@beforeEach()
async setup() {}

// For static setup, use @beforeAll
@beforeAll()
static async setupSuite() {}
```

### "@beforeEach/@afterEach cannot be used on private methods"

**Cause:** Using lifecycle decorators on private methods.

```typescript
// ❌ Wrong
@beforeEach()
private async setup() {}
```

**Solution:** Use non-private methods:
```typescript
// ✅ Correct
@beforeEach()
async setup() {}

// Or protected if using inheritance
@beforeEach()
protected async setup() {}
```

### Hook Running Multiple Times

**Cause:** Inherited hooks plus own hooks.

```typescript
class Base {
  @beforeEach()
  async setup() { console.log('Base setup'); }
}

@describe('Child')
class Child extends Base {
  @beforeEach()
  async childSetup() { console.log('Child setup'); }
  // Both setup() and childSetup() will run
}
```

**Solution:** This is expected behavior. Override if you want to replace:
```typescript
class Child extends Base {
  @beforeEach()
  async setup() {  // Same name overrides parent
    await super.setup();  // Optionally call parent
    // ... child setup
  }
}
```

### @before/@after Not Running

**Cause:** Applied to a method that's not decorated with `@test`.

```typescript
// ❌ Wrong: @before without @test
@before(async (self) => { /* ... */ })
async helperMethod() {}
```

**Solution:** `@before`/`@after` must be on `@test`-decorated methods:
```typescript
// ✅ Correct
@test('my test')
@before(async (self) => { /* ... */ })
async myTest() {}
```

---

## Data-Driven Test Errors

### "Missing argument for placeholder"

**Cause:** Template has more placeholders than data columns.

```typescript
// ❌ Wrong: $2 but only 2 columns
@test.each([
  [1, 2],
], '$0 + $1 = $2')  // $2 doesn't exist!
```

**Solution:** Match placeholders to data columns:
```typescript
// ✅ Correct: 3 columns for 3 placeholders
@test.each([
  [1, 2, 3],
], '$0 + $1 = $2')
```

### Test Names Show "[object Object]"

**Cause:** Complex objects in data without custom serializer.

```typescript
// ❌ Bad: Object serializes as [object Object]
@test.each([
  [{ name: 'Alice' }, 'admin'],
], 'User $0 has role $1')
```

**Solution:** Use `serializable` for custom formatting:
```typescript
import { serializable } from '@playwright-labs/decorators';

// ✅ Good: Custom serializer
@test.each([
  [serializable((u: any) => u.name)({ name: 'Alice' }), 'admin'],
], 'User $0 has role $1')
// Generates: "User Alice has role admin"
```

### @test.each With Empty Array

This is valid and creates no tests:
```typescript
@test.each([], 'should not run: $0')
async test() {}  // No tests created (this is correct)
```

---

## Type Errors

### "Property 'page' does not exist on type"

**Cause:** Not extending `BaseTest`.

**Solution:**
```typescript
import { BaseTest, describe, test } from '@playwright-labs/decorators';

@describe('Tests')
class MyTests extends BaseTest {
  @test('test')
  async test() {
    await this.page.goto('/');  // Now typed correctly
  }
}
```

### "@test does not support index based variables"

**Cause:** Using `$0`, `$1` in `@test()` name (not `@test.each`).

```typescript
// ❌ Wrong: @test doesn't support indexed vars
@test('add $0 and $1')
async test() {}
```

**Solution:** Use `@param` with named variables, or use `@test.each`:
```typescript
// ✅ With @param
@param('x') x = 5;
@test('add $x')
async test() {}

// ✅ With @test.each
@test.each([[1, 2]], 'add $0 and $1')
async test(a: number, b: number) {}
```

### "Parameter name cannot contain spaces"

**Cause:** Space in `@param` name.

```typescript
// ❌ Wrong
@param('user name')
username = 'Alice';
```

**Solution:** Use camelCase or underscores:
```typescript
// ✅ Correct
@param('userName')
username = 'Alice';
```

---

## Test Discovery Issues

### Tests Not Running

**Cause 1:** Class not decorated with `@describe`.
```typescript
// ❌ Missing @describe
class MyTests {
  @test('test')
  async test() {}
}
```
**Fix:** Add `@describe`:
```typescript
@describe('My Tests')
class MyTests {
  @test('test')
  async test() {}
}
```

**Cause 2:** Methods not decorated with `@test`.
```typescript
// ❌ Method not discovered
@describe('Tests')
class MyTests {
  async testSomething() {}  // Not decorated!
}
```
**Fix:** Add `@test`:
```typescript
@describe('Tests')
class MyTests {
  @test('test something')
  async testSomething() {}
}
```

**Cause 3:** File not matching Playwright's `testMatch` pattern.
```
tests/
├── my-tests.spec.ts     ✅ Matches default pattern
├── my-tests.ts           ❌ Missing .spec.ts
└── my-tests.test.ts      ✅ Also valid
```

### Wrong Number of Tests Running

**Cause:** Sharding or filtering active.

Check your `playwright.config.ts`:
```typescript
export default defineConfig({
  shard: { current: 1, total: 4 },  // Only runs 1/4 of tests
  grep: /@smoke/,                     // Only runs tagged tests
});
```

---

## Performance Issues

### Tests Running Slowly

**Checklist:**
1. **Unnecessary navigation**: Use `@beforeEach` for shared navigation
2. **Hard-coded waits**: Replace `waitForTimeout` with `expect()` auto-retry
3. **Sequential setup**: Use `Promise.all` for independent operations
4. **Heavy fixtures**: Use worker scope for expensive resources
5. **Full browser**: Use headless mode in CI

```typescript
// ❌ Slow
await this.page.waitForTimeout(5000);

// ✅ Fast
await expect(this.page.locator('.loaded')).toBeVisible();
```

### Hook Running Too Long

Add timeouts to hooks:
```typescript
@beforeEach()
@timeout(5000)  // Fail fast if setup is slow
async setup() {
  await this.page.goto('/');
}
```

---

## Debugging Techniques

### Enable Headed Mode

```bash
npx playwright test --headed
```

### Use Playwright UI Mode

```bash
npx playwright test --ui
```

### Add Console Logging

```typescript
@test('debug test')
async test() {
  console.log('Page URL:', this.page.url());
  console.log('Browser:', this.browserName);
  console.log('Viewport:', this.viewport);
}
```

### Inspect Metadata

```typescript
@test('inspect metadata')
async test() {
  const metadata = (this.constructor as any)[Symbol.metadata];
  console.log('Class metadata:', JSON.stringify(metadata, null, 2));
}
```

### Use Playwright Trace

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',  // Capture trace on failure
  },
});
```

### Pause Test Execution

```typescript
@test('debug interactively')
async test() {
  await this.page.goto('/');
  await this.page.pause();  // Opens Playwright Inspector
}
```

### Check Hook Execution Order

```typescript
@beforeAll()
static async b() { console.log('1. beforeAll'); }

@beforeEach()
async be() { console.log('2. beforeEach'); }

@test('test')
@before(async () => console.log('3. before'))
@after(async () => console.log('5. after'))
async test() { console.log('4. test body'); }

@afterEach()
async ae() { console.log('6. afterEach'); }

@afterAll()
static async a() { console.log('7. afterAll'); }
```

---

## Quick Reference: Error → Solution

| Error Message | Likely Cause | Fix |
|---------------|-------------|-----|
| "Decorator is not a function" | `experimentalDecorators: true` | Set to `false` |
| "Cannot read property 'page'" | Arrow function method | Use regular method |
| "can only be used on methods" | Wrong decorator target | Check decorator placement |
| "@beforeEach on static" | Wrong method type | Remove `static` |
| "cannot be used on private" | Private method | Make non-private |
| "Missing argument for placeholder" | Mismatched data/template | Align columns and placeholders |
| "returned a Promise" | Async data provider | Use sync data |
| "Property 'page' does not exist" | Missing `extends BaseTest` | Add `extends BaseTest` |

---

**Related:** [Edge Cases](./edge-cases.md) | [Best Practices](./best-practices.md) | [API Reference](./api-reference.md)
