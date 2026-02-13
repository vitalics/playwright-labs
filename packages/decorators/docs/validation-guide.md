# Runtime Validation Guide

This document describes all runtime validations implemented in the decorator system to ensure robust behavior in CI/CD environments.

## Overview

All decorators now include comprehensive runtime validation to catch errors early and provide clear, actionable error messages. This is especially important for CI/CD pipelines where early detection of configuration issues saves time and resources.

## @timeout Decorator Validations

### Input Validations

#### 1. Undefined/Null Check
```typescript
@timeout(undefined) // ❌ Error: @timeout decorator requires a timeout value in milliseconds
@timeout(null)      // ❌ Error: @timeout decorator requires a timeout value in milliseconds
```

**Error Message:** `@timeout decorator requires a timeout value in milliseconds. Usage: @timeout(5000)`

#### 2. Type Check
```typescript
@timeout("5000")    // ❌ Error: requires a number, got string
@timeout(true)      // ❌ Error: requires a number, got boolean
@timeout({})        // ❌ Error: requires a number, got object
@timeout([1000])    // ❌ Error: requires a number, got object
```

**Error Message:** `@timeout decorator requires a number, got ${typeof value}. Usage: @timeout(5000)`

#### 3. NaN Check
```typescript
@timeout(NaN)       // ❌ Error: received NaN
@timeout(0/0)       // ❌ Error: received NaN
```

**Error Message:** `@timeout decorator received NaN. Please provide a valid number. Usage: @timeout(5000)`

#### 4. Infinity Check
```typescript
@timeout(Infinity)  // ❌ Error: received Infinity
@timeout(-Infinity) // ❌ Error: received Infinity
@timeout(1/0)       // ❌ Error: received Infinity
```

**Error Message:** `@timeout decorator received Infinity. Please provide a finite number. Usage: @timeout(5000)`

#### 5. Positive Number Check
```typescript
@timeout(0)         // ❌ Error: requires positive number
@timeout(-1000)     // ❌ Error: requires positive number
@timeout(-0.1)      // ❌ Error: requires positive number
```

**Error Message:** `@timeout decorator requires a positive number, got ${value}. Timeouts must be greater than 0.`

### Warnings

#### 6. Very Large Timeout Warning (> 10 minutes)
```typescript
@timeout(700000)    // ⚠️  Warning: 11.7 minutes is very large
```

**Warning Message:** `⚠️  @timeout decorator: Timeout of ${ms}ms (${minutes} minutes) is very large. Consider if this is intentional.`

#### 7. Very Small Timeout Warning (< 100ms)
```typescript
@timeout(50)        // ⚠️  Warning: 50ms is very small
@timeout(1)         // ⚠️  Warning: 1ms is very small
```

**Warning Message:** `⚠️  @timeout decorator: Timeout of ${ms}ms is very small and may cause tests to fail unexpectedly.`

### Context Validations

#### 8-9. Context Validation
```typescript
// Internal validation - ensures decorator context is valid
```

**Error Message:** `@timeout decorator: Invalid decorator context. This decorator must be used with TC39 decorators.`

#### 10-12. Duplicate Timeout Detection
```typescript
@describe()
@timeout(5000)
@timeout(10000)  // ⚠️  Warning: Duplicate timeout detected
class MyTests {}
```

**Warning Message:** `⚠️  @timeout decorator: Duplicate class-level timeout detected. Previous: 5000ms, New: 10000ms. The new value will be used.`

#### 13. Invalid Target Detection
```typescript
@timeout(5000)
set myProperty(value) {}  // ❌ Error: Cannot use on setters
```

**Error Message:** `@timeout decorator can only be used on classes, methods, or fields. Got: ${kind}. If you see this error, you may be applying @timeout to an unsupported target like a setter or accessor.`

### Valid Usage Examples

```typescript
// ✅ All valid uses
@timeout(1)                    // Minimum (with warning)
@timeout(5000)                 // Standard 5 seconds
@timeout(60000)                // 1 minute
@timeout(0.5)                  // Decimal numbers OK
@timeout(5e3)                  // Scientific notation OK
@timeout(Number.MAX_SAFE_INTEGER) // Very large (with warning)
```

## @before Decorator Validations

### Input Validations

#### 1. Undefined/Null Check
```typescript
@before(undefined)  // ❌ Error: requires a hook function
@before(null)       // ❌ Error: requires a hook function
```

**Error Message:** `@before decorator requires a hook function. Usage: @before(async (self) => { /* setup code */ })`

#### 2. Type Check
```typescript
@before("setup")    // ❌ Error: requires a function, got string
@before(123)        // ❌ Error: requires a function, got number
@before({})         // ❌ Error: requires a function, got object
@before([])         // ❌ Error: requires a function, got object
```

**Error Message:** `@before decorator requires a function, got ${typeof value}. Usage: @before(async (self) => { /* setup code */ })`

#### 3. Function Arity Warning
```typescript
@before(() => {})   // ⚠️  Warning: no parameters
```

**Warning Message:** `⚠️  @before decorator: Hook function has no parameters. It should accept 'self' parameter to access test instance. Usage: @before(async (self) => { /* use self */ })`

### Context Validations

#### 4-7. Context and Metadata Validation
```typescript
// Internal validations ensuring proper decorator context
```

**Error Messages:**
- `@before decorator: Invalid decorator context`
- `@before decorator can only be used on methods. Got: ${kind}`
- `@before decorator: Method context is missing metadata`
- `@before decorator: Unable to determine method name`

#### 8. Duplicate Hook Warning
```typescript
const setup = (self) => {};
@before(setup)
@before(setup)  // ⚠️  Warning: Same function registered multiple times
async test() {}
```

**Warning Message:** `⚠️  @before decorator: The same hook function is registered multiple times on method '${name}'. This may be unintentional.`

#### 9. Too Many Hooks Warning
```typescript
@before(fn1)
@before(fn2)
// ... 10 more @before decorators
@before(fn11)  // ⚠️  Warning: 11 hooks is excessive
async test() {}
```

**Warning Message:** `⚠️  @before decorator: Method '${name}' has ${count} @before hooks. This may indicate overly complex test setup.`

### Valid Usage Examples

```typescript
// ✅ All valid uses
@before(async (self) => {})           // Async arrow function
@before((self) => {})                 // Sync arrow function
@before(function(self) {})            // Function expression
@before(function setup(self) {})      // Named function
@before(Helper.setup)                 // Class method reference
@before(obj.method.bind(obj))         // Bound function
@before((self, extra) => {})          // Multiple parameters
@before((self, opt = true) => {})     // Default parameters
@before((self, ...args) => {})        // Rest parameters
```

## @after Decorator Validations

The `@after` decorator has the same validations as `@before`, with identical error messages and warning conditions.

### Key Differences in Error Messages

- Error messages reference "cleanup code" instead of "setup code"
- Warnings mention "test cleanup" instead of "test setup"

### Valid Usage Examples

```typescript
// ✅ All valid uses (same as @before)
@after(async (self) => {})            // Async cleanup
@after((self) => {})                  // Sync cleanup
@after(function cleanup(self) {})     // Named cleanup function
```

## Best Practices for CI/CD

### 1. Use Appropriate Timeouts
```typescript
// ✅ Good
@timeout(5000)         // Short for unit tests
@timeout(30000)        // Medium for integration tests
@timeout(120000)       // Long for E2E tests

// ❌ Avoid
@timeout(1)            // Too small, causes flaky tests
@timeout(1000000)      // Too large, wastes CI resources
```

### 2. Provide Self Parameter
```typescript
// ✅ Good
@before(async (self) => {
  self.resource = await acquire();
})

// ⚠️  Warning (but works)
@before(async () => {
  // Can't access test instance
})
```

### 3. Avoid Duplicate Decorators
```typescript
// ✅ Good
@timeout(5000)
class MyTests {}

// ⚠️  Warning
@timeout(5000)
@timeout(10000)  // Duplicate - use one or the other
class MyTests {}
```

### 4. Keep Hook Count Reasonable
```typescript
// ✅ Good
@before(setup1)
@before(setup2)
@before(setup3)
async test() {}

// ⚠️  Warning at 10+ hooks
// Consider refactoring into fewer, more organized hooks
```

## Error Categories

### Critical Errors (Test Fails Immediately)
- Undefined/null values
- Wrong types
- NaN/Infinity
- Non-positive numbers for timeout
- Invalid decorator targets

### Warnings (Test Continues, Logged)
- Very large/small timeouts
- Missing self parameter
- Duplicate decorators
- Excessive hook count

## Validation Test Coverage

We have **47 comprehensive validation tests** covering:

### @timeout (10 tests)
- undefined, null, non-number, NaN, Infinity
- negative, zero, positive values
- minimum (1ms), maximum (MAX_SAFE_INTEGER)

### @before (9 tests)
- undefined, null, non-function types
- number, object, array rejection
- async, sync, arrow, named functions acceptance

### @after (9 tests)
- Same validation as @before
- boolean, array rejection
- bound functions, class method references

### Edge Cases (8 tests)
- Decimal numbers, very large numbers
- Scientific notation
- Functions with no/multiple/default/rest parameters

### Type Coercion (4 tests)
- String numbers, booleans
- Objects with valueOf
- Arrays

### Boundary Values (5 tests)
- 1ms, 0.1ms, -0.1ms
- Number.EPSILON, -Number.EPSILON

### Function References (3 tests)
- Same function multiple times
- Bound functions
- Class method references

## CI/CD Integration

All validation errors are designed to:

1. **Fail Fast**: Errors are caught at decorator application time, before tests run
2. **Clear Messages**: Every error includes the problem and correct usage
3. **Actionable**: Error messages tell you exactly what to fix
4. **Consistent**: Same validation patterns across all decorators
5. **Visible**: Warnings use console.warn for visibility in CI logs

Example CI output:
```
Error: @timeout decorator requires a positive number, got -1000. Timeouts must be greater than 0.
    at timeout (decorator-timeout.ts:120:11)
    at MyTests (my-test.spec.ts:5:1)
```

This makes debugging in CI/CD environments quick and straightforward.
