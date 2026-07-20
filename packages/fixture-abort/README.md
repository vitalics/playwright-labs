# @playwright-labs/fixture-abort

A collection of generic Playwright fixtures and utilities for enhanced test functionality including abort controllers, decorators, and custom matchers.

## Installation

```sh
npm install @playwright/test @playwright-labs/fixture-abort # npm
pnpm add @playwright/test @playwright-labs/fixture-abort # pnpm
yarn add @playwright/test @playwright-labs/fixture-abort # yarn
```

## Features

- 🎯 **AbortController & AbortSignal** - Cancel async operations and handle timeouts
- 🎨 **Decorators** - Add test steps with dynamic naming
- ✅ **Custom Matchers** - Intuitive assertions for abort states

---

## AbortController & AbortSignal

Fixtures for managing cancellable operations and handling timeouts in your Playwright tests.

### Fixtures

#### Adding fixture in your test framework

```ts
// filename: fixture.ts
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as abortTest,
  expect as abortExpect,
} from "@playwright-labs/fixture-abort";

export const test = mergeTests(abortTest);
export const expect = mergeExpects(abortExpect);
```

and now you are ready to use the fixtures in your tests.

```ts
// filename: some.test.ts
import { test, expect } from "./fixture";

test("some fetch operation", ({ signal }) => {
  fetch("https://example.com", { signal });
});
```

#### `abortController`

An `AbortController` instance automatically created for each test.

```typescript
import { test, expect } from "@playwright-labs/fixture-abort";

test("cancel operation", async ({ abortController }) => {
  // Abort the operation
  abortController.abort("User cancelled");

  expect(abortController).toHaveAbortedSignal();
});
```

#### `signal`

The `signal` associated with the test's AbortController. Use this with fetch, promises, or any API that supports AbortSignal.

```typescript
import { test, expect } from "@playwright-labs/fixture-abort";

test("cancel API request", async ({ signal, abortController }) => {
  const fetchPromise = fetch("https://api.example.com", {
    signal: signal,
  });

  // Cancel the request
  abortController.abort("Test cancelled");

  await expect(fetchPromise).rejects.toThrow();
  expect(signal).toBeAborted();
});
```

#### `useAbortController(onAbort?)`

Returns the AbortController with optional callback registration.

```typescript
test("with cleanup callback", async ({ useAbortController }) => {
  const controller = useAbortController(() => {
    console.log("Operation cancelled - cleaning up resources");
  });

  controller.abort();
});
```

#### `useSignalWithTimeout(timeout)`

Creates an AbortSignal that automatically aborts after the specified timeout. Also sets the Playwright test timeout.

```typescript
test("timeout operation", async ({ useSignalWithTimeout }) => {
  const signal = useSignalWithTimeout(5000); // 5 seconds

  const operation = fetch("https://api.example.com", { signal });
  // Will abort after 5 seconds
});
```

### Custom Matchers

Intuitive assertions for testing abort controllers and signals.

#### `toBeAborted()`

Asserts that an AbortSignal has been aborted.

```typescript
test("signal is aborted", async ({ signal, abortController }) => {
  abortController.abort();
  expect(signal).toBeAborted();
});
```

#### `toBeActive()`

Asserts that an AbortSignal is active (not aborted).

```typescript
test("signal is active", async ({ signal }) => {
  expect(signal).toBeActive();
  expect(signal).not.toBeAborted();
});
```

#### `toBeAbortedWithReason(reason)`

Asserts that a signal was aborted with a specific reason.

```typescript
test("aborted with reason", async ({ signal, abortController }) => {
  const reason = "User cancelled";
  abortController.abort(reason);

  expect(signal).toBeAbortedWithReason(reason);
});
```

#### `toHaveAbortedSignal()`

Asserts that an AbortController's signal has been aborted.

```typescript
test("controller aborted", async ({ abortController }) => {
  abortController.abort();
  expect(abortController).toHaveAbortedSignal();
});
```

#### `toHaveActiveSignal()`

Asserts that an AbortController's signal is active.

```typescript
test("controller active", async ({ abortController }) => {
  expect(abortController).toHaveActiveSignal();
});
```

#### `toAbortWithin(timeout)`

Asserts that a signal will abort within a specified timeout (async).

```typescript
test("signal times out", async () => {
  const signal = AbortSignal.timeout(100);
  await expect(signal).toAbortWithin(200);
});
```

#### `toHaveAbortReason(ErrorType)`

Asserts that a signal's reason is an instance of a specific error type.

```typescript
test("timeout error", async () => {
  const signal = AbortSignal.timeout(100);
  await expect(signal).toAbortWithin(200);
  expect(signal).toHaveAbortReason(Error);
});
```

### Real-World Examples

#### Cancelling API Requests

```typescript
import { test, expect } from "@playwright-labs/fixture-abort";

test("cancel slow API request", async ({ abortController, signal }) => {
  expect(signal).toBeActive();

  const apiCall = fetch("https://slow-api.example.com/data", {
    signal: signal,
  });

  // Cancel after 1 second
  setTimeout(() => abortController.abort("Timeout"), 1000);

  await expect(apiCall).rejects.toThrow();
  expect(signal).toBeAborted();
  expect(signal).toBeAbortedWithReason("Timeout");
});
```

#### Handling Timeouts

```typescript
test("operation with timeout", async ({ useSignalWithTimeout }) => {
  const signal = useSignalWithTimeout(3000);

  const longOperation = new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      reject(new Error("Operation timed out"));
    });

    // Simulate long operation
    setTimeout(() => resolve("done"), 5000);
  });

  await expect(longOperation).rejects.toThrow("Operation timed out");
  expect(signal).toBeAborted();
  expect(signal).toHaveAbortReason(Error);
});
```

#### Multiple Abort Listeners

```typescript
test("multiple listeners", async ({ abortController, signal }) => {
  let cleanup1Done = false;
  let cleanup2Done = false;

  signal.addEventListener("abort", () => {
    cleanup1Done = true;
  });

  signal.addEventListener("abort", () => {
    cleanup2Done = true;
  });

  abortController.abort();

  expect(cleanup1Done).toBe(true);
  expect(cleanup2Done).toBe(true);
  expect(signal).toBeAborted();
});
```

---

## API Reference

### Fixtures

| Fixture                     | Type              | Description                                             |
| --------------------------- | ----------------- | ------------------------------------------------------- |
| `abortController`           | `AbortController` | Controller instance for managing cancellable operations |
| `signal`                    | `AbortSignal`     | Signal for passing to async operations                  |
| `useAbortController`        | `options`         | Get controller with optional callback                   |
| `useSignalWithTimeout` | `options`         | Create signal with automatic timeout                    |

### Custom Matchers

| Matcher                         | Description                          |
| ------------------------------- | ------------------------------------ |
| `toBeAborted()`                 | Signal has been aborted              |
| `toBeActive()`                  | Signal is active (not aborted)       |
| `toBeAbortedWithReason(reason)` | Signal aborted with specific reason  |
| `toHaveAbortedSignal()`         | Controller's signal is aborted       |
| `toHaveActiveSignal()`          | Controller's signal is active        |
| `toAbortWithin(timeout)`        | Signal aborts within timeout (async) |
| `toHaveAbortReason(ErrorType)`  | Signal's reason matches error type   |
