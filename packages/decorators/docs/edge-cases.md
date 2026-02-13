# Edge Cases and Gotchas

This guide covers uncommon scenarios, edge cases, and potential pitfalls when using decorators.

## Table of Contents

- [Decorator Application Order](#decorator-application-order)
- [This Context](#this-context)
- [Async/Await Gotchas](#asyncawait-gotchas)
- [Inheritance Issues](#inheritance-issues)
- [Fixture Timing](#fixture-timing)
- [Timeout Edge Cases](#timeout-edge-cases)
- [Hook Execution Order](#hook-execution-order)
- [Data-Driven Test Pitfalls](#data-driven-test-pitfalls)
- [TypeScript Quirks](#typescript-quirks)
- [Performance Considerations](#performance-considerations)

---

## Decorator Application Order

### Multiple Decorators Execute Bottom-to-Top

Decorators are applied from **bottom to top**, but for `@before`/`@after` hooks, we reverse the execution order to make it intuitive.

```typescript
@test('with multiple hooks')
@before(async (self) => console.log('Hook 1'))
@before(async (self) => console.log('Hook 2'))
@before(async (self) => console.log('Hook 3'))
async test() {
  console.log('Test');
}

// Output:
// Hook 1  ← First decorator, runs first
// Hook 2  ← Second decorator, runs second
// Hook 3  ← Third decorator, runs third
// Test
```

**Why This Matters:**
- Cleanup should happen in reverse order of setup
- Resource dependencies must be considered

```typescript
// ✅ Correct: Open connection → Start transaction
@before(async (self) => {
  self.connection = await openConnection();
})
@before(async (self) => {
  self.transaction = await self.connection.beginTransaction();
})
@after(async (self) => {
  await self.transaction.rollback();  // Rollback first
})
@after(async (self) => {
  await self.connection.close();      // Then close connection
})
async test() {}
```

---

## This Context

### Arrow Functions Lose Context

**❌ Wrong:**
```typescript
@test('bad test')
myTest = async () => {
  await this.page.goto('/');  // 'this' is undefined or wrong!
}
```

**✅ Correct:**
```typescript
@test('good test')
async myTest() {
  await this.page.goto('/');  // 'this' is correct
}
```

### Binding Issues with Extracted Methods

**❌ Problematic:**
```typescript
class MyTests {
  private async helper() {
    await this.page.goto('/');  // 'this' might be wrong
  }

  @test('test')
  async test() {
    const fn = this.helper;
    await fn();  // Lost 'this' binding!
  }
}
```

**✅ Solutions:**
```typescript
// Solution 1: Use arrow function
class MyTests {
  private helper = async () => {
    await this.page.goto('/');
  }
  
  @test('test')
  async test() {
    await this.helper();  // Works!
  }
}

// Solution 2: Bind explicitly
class MyTests {
  private async helper() {
    await this.page.goto('/');
  }
  
  @test('test')
  async test() {
    const fn = this.helper.bind(this);
    await fn();  // Works!
  }
}

// Solution 3: Call directly
class MyTests {
  private async helper() {
    await this.page.goto('/');
  }
  
  @test('test')
  async test() {
    await this.helper();  // Simplest and best!
  }
}
```

---

## Async/Await Gotchas

### Forgetting Await

**❌ Common Mistake:**
```typescript
@test('bad test')
async test() {
  this.page.goto('/');  // ❌ Missing await!
  await this.page.click('button');  // May click before page loads
}
```

**✅ Correct:**
```typescript
@test('good test')
async test() {
  await this.page.goto('/');  // ✅ Properly awaited
  await this.page.click('button');
}
```

### Parallel Operations Need Promise.all

**❌ Sequential (slower):**
```typescript
@test('slow test')
async test() {
  await operation1();  // Waits for 1 to finish
  await operation2();  // Then starts 2
  await operation3();  // Then starts 3
  // Total time: T1 + T2 + T3
}
```

**✅ Parallel (faster):**
```typescript
@test('fast test')
async test() {
  await Promise.all([
    operation1(),
    operation2(),
    operation3(),
  ]);
  // Total time: max(T1, T2, T3)
}
```

### Fire-and-Forget is Dangerous

**❌ Dangerous:**
```typescript
@test('dangerous test')
async test() {
  this.page.goto('/');  // Fire and forget - BAD!
  // Test may end before navigation completes
}
```

---

## Inheritance Issues

### Lifecycle Hooks in Base Classes

**Issue:** Hooks in base class run for all derived classes.

```typescript
class BaseTests {
  @beforeEach()
  async baseSetup() {
    console.log('Base setup');
  }
}

@describe('Derived Tests')
class DerivedTests extends BaseTests {
  @beforeEach()
  async derivedSetup() {
    console.log('Derived setup');
  }
  
  @test('test')
  async test() {
    console.log('Test');
  }
}

// Output:
// Base setup      ← Base class hook runs first
// Derived setup   ← Derived class hook runs second
// Test
```

**Workaround:** Override hooks carefully:

```typescript
class BaseTests {
  @beforeEach()
  async setup() {
    await this.baseSetup();
  }
  
  protected async baseSetup() {
    // Base setup logic
  }
}

@describe('Derived')
class DerivedTests extends BaseTests {
  protected override async baseSetup() {
    await super.baseSetup();  // Call parent
    // Add derived logic
  }
}
```

### Static Method Inheritance

**❌ Confusing:**
```typescript
class BaseTests {
  static data: any;
  
  @beforeAll()
  static async setup() {
    this.data = { value: 'base' };  // Which 'this'?
  }
}

@describe('Derived')
class DerivedTests extends BaseTests {
  @test('test')
  async test() {
    console.log(BaseTests.data);     // Base class data
    console.log(DerivedTests.data);  // May be undefined!
  }
}
```

**✅ Explicit is better:**
```typescript
class BaseTests {
  @beforeAll()
  static async setup() {
    BaseTests.data = { value: 'base' };  // Explicit class reference
  }
}
```

---

## Fixture Timing

### Getter Fixtures Execute Every Time

```typescript
@use.define()
get timestamp() {
  return Date.now();  // Called every time you access it
}

@test('test')
async test() {
  const t1 = this.timestamp;
  await sleep(100);
  const t2 = this.timestamp;
  console.log(t1 === t2);  // false! Different values
}
```

**Solution:** Use field for cached values:

```typescript
@use.define()
timestamp = Date.now();  // Evaluated once

@test('test')
async test() {
  const t1 = this.timestamp;
  await sleep(100);
  const t2 = this.timestamp;
  console.log(t1 === t2);  // true! Same value
}
```

### Fixture Dependency Order

**❌ Won't work:**
```typescript
@use.define()
get authToken() {
  return `token-${this.user.email}`;  // user not initialized yet!
}

@use.define()
user = { email: 'test@example.com' };
```

**✅ Correct order:**
```typescript
@use.define()
user = { email: 'test@example.com' };  // Define first

@use.define()
get authToken() {
  return `token-${this.user.email}`;  // Now works
}
```

---

## Timeout Edge Cases

### Very Small Timeouts

```typescript
@timeout(1)  // ⚠️ Warning: May fail unexpectedly
async test() {
  // Even instant operations might not complete in 1ms
}
```

**Best Practice:** Minimum 100ms for real tests.

### Timeout Inheritance

```typescript
@describe('Tests')
@timeout(10000)  // Class timeout
class MyTests {
  @test('fast')
  @timeout(5000)  // Override: 5s
  async fastTest() {}
  
  @test('slow')
  async slowTest() {}  // Uses class timeout: 10s
}
```

### Multiple Timeout Decorators

**❌ Confusing:**
```typescript
@timeout(5000)
@timeout(10000)  // ⚠️ Last one wins
async test() {}
```

**✅ Use one:**
```typescript
@timeout(10000)  // Clear and unambiguous
async test() {}
```

---

## Hook Execution Order

### Hooks with Same Decorator Multiple Times

```typescript
const setup1 = async (self) => console.log('Setup 1');
const setup2 = async (self) => console.log('Setup 2');

@test('test')
@before(setup1)
@before(setup1)  // ⚠️ Same function twice
@before(setup2)
async test() {
  console.log('Test');
}

// Output:
// Setup 1  ← Runs
// Setup 1  ← Runs again (same function)
// Setup 2
// Test
```

**Usually unintentional - check your decorators!**

### After Hooks Run Even on Failure

```typescript
@test('failing test')
@after(async (self) => {
  console.log('Cleanup runs');  // Always executes
})
async test() {
  throw new Error('Test failed');
  // After hook still runs!
}
```

**This is intentional** - cleanup should always happen.

---

## Data-Driven Test Pitfalls

### Template String Gotchas

**❌ Wrong placeholder:**
```typescript
@test.each([
  ['user@example.com', 'pass123'],
], 'login with email: $email')  // ❌ $email doesn't exist
```

**✅ Correct:**
```typescript
@test.each([
  ['user@example.com', 'pass123'],
], 'login with email: $1')  // ✅ Use $1, $2, etc.
```

### Complex Objects in Data

**❌ Won't serialize well:**
```typescript
@test.each([
  [{ nested: { deep: { object: true } } }],
], 'test with $1')  // Title will be ugly
```

**✅ Use serializable decorator:**
```typescript
import { serializable } from '@playwright-labs/decorators';

@test.each([
  [serializable({ complex: 'object' }, (obj) => obj.complex)],
], 'test with $1')
async test(obj) {}
```

---

## TypeScript Quirks

### experimentalDecorators Must Be False

**❌ Won't work:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": true  // ❌ Wrong!
  }
}
```

**✅ Correct:**
```json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // or omit completely
    "target": "ES2022"
  }
}
```

### Property Initialization Order

```typescript
@describe('Tests')
class MyTests {
  // ❌ Accessing 'this' before initialization
  private helper = this.createHelper();  // Error!
  
  private createHelper() {
    return { page: this.page };
  }
}
```

**✅ Initialize in constructor or hook:**
```typescript
@describe('Tests')
class MyTests {
  private helper: any;
  
  @beforeEach()
  async setup() {
    this.helper = this.createHelper();  // ✅ Works
  }
}
```

---

## Performance Considerations

### Too Many Hooks

```typescript
@test('test')
@before(hook1)
@before(hook2)
@before(hook3)
// ... 10 more hooks
async test() {}  // ⚠️ Consider refactoring
```

**Each hook adds overhead.** Consolidate when possible:

```typescript
@test('test')
@before(async (self) => {
  await setupAll(self);  // One hook, multiple operations
})
async test() {}
```

### Heavy Setup in Fixtures

**❌ Slow:**
```typescript
@use.define()
get heavyData() {
  return computeExpensiveData();  // Runs on every access!
}

@test('test')
async test() {
  const d1 = this.heavyData;  // Computes
  const d2 = this.heavyData;  // Computes again!
}
```

**✅ Faster:**
```typescript
@use.define()
heavyData = computeExpensiveData();  // Computes once

// Or use worker-scoped fixture for sharing across tests
@use.define({ scope: 'worker' })
async heavyData() {
  return await computeExpensiveData();
}
```

---

## Common Pitfalls Summary

### ❌ Don't

```typescript
// Don't use arrow functions for test methods
@test('bad') myTest = async () => {}

// Don't forget await
await this.page.goto('/');

// Don't use experimentalDecorators
// tsconfig.json: "experimentalDecorators": true

// Don't share mutable state between tests
static sharedArray = [];  // Dangerous!

// Don't access fixtures in static methods
@beforeAll()
static async setup() {
  await this.page.goto('/');  // No 'page' in static!
}
```

### ✅ Do

```typescript
// Do use regular async methods
@test('good') async myTest() {}

// Do always await promises
await this.page.goto('/');

// Do use TC39 decorators
// tsconfig.json: "target": "ES2022"

// Do use instance properties for state
private testData: any;  // Fresh per test

// Do access fixtures in instance methods
@beforeEach()
async setup() {
  await this.page.goto('/');  // ✅ Works
}
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
@test('debug test')
async test() {
  console.log('Page URL:', this.page.url());
  console.log('Test instance:', this);
  console.log('Available fixtures:', Object.keys(this));
}
```

### Check Decorator Application

```typescript
@test('check decorators')
async test() {
  const metadata = (this.constructor as any)[Symbol.metadata];
  console.log('Metadata:', metadata);
}
```

### Verify Hook Execution

```typescript
@beforeEach()
async setup() {
  console.log('beforeEach running');
}

@before(async (self) => {
  console.log('@before hook running');
})
@test('test')
async test() {
  console.log('Test running');
}

@after(async (self) => {
  console.log('@after hook running');
})
```

---

## When Things Go Wrong

### Error: "Cannot read property 'page' of undefined"

**Cause:** Using arrow function or wrong `this` binding.  
**Fix:** Use regular `async method()` syntax.

### Error: "Decorator is not a function"

**Cause:** `experimentalDecorators: true` in tsconfig.json.  
**Fix:** Set to `false` or remove.

### Error: "@before can only be used on methods"

**Cause:** Applying `@before` to non-method.  
**Fix:** Only use on test methods with `@test`.

### Warning: "Timeout is very small"

**Cause:** Timeout < 100ms.  
**Fix:** Use realistic timeout values (≥ 1000ms for real tests).

### Warning: "Hook function has no parameters"

**Cause:** `@before(() => {})` without `self` parameter.  
**Fix:** Add parameter: `@before(async (self) => {})`.

---

**Related:** [API Reference](./api-reference.md) | [Troubleshooting](./troubleshooting.md) | [Best Practices](./best-practices.md)
