---
title: Control Node.js Timers in Tests with Promise-Based Timer Fixtures
impact: MEDIUM
impactDescription: eliminates real-time waits and makes timing-sensitive tests deterministic
tags: timers, setTimeout, setInterval, fixture-timers, async, timing, nodejs
---

## Control Node.js Timers in Tests with Promise-Based Timer Fixtures

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
