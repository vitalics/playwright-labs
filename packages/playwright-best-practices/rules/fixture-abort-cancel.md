---
title: Cancel Async Operations and Network Requests with AbortSignal Fixtures
impact: MEDIUM
impactDescription: enables deterministic cancellation tests and prevents async resource leaks
tags: abort, signal, AbortController, AbortSignal, cancellation, network, async, fixture-abort
---

## Cancel Async Operations and Network Requests with AbortSignal Fixtures

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
