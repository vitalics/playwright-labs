# @playwright-labs/fixture-timers

Promise-based Node.js timer APIs as Playwright test fixtures, with custom matchers for timing assertions.

## Installation

```sh
npm install @playwright/test @playwright-labs/fixture-timers # npm
pnpm add @playwright/test @playwright-labs/fixture-timers # pnpm
yarn add @playwright/test @playwright-labs/fixture-timers # yarn
```

## Features

- Promise-based `setTimeout`, `setInterval`, `setImmediate`, and `scheduler` as Playwright fixtures
- Async iterator support for `setInterval` (use `for await...of`)
- `AbortSignal` support on all timer fixtures
- 6 custom expect matchers for timing assertions
- Generic type support (`setTimeout<T>` resolves to `Promise<T>`)
- Composable with other fixtures via `mergeTests` / `mergeExpects`

## Fixtures

### Merging with your test setup

```ts
// fixture.ts
import { mergeTests, mergeExpects } from "@playwright/test";
import {
  test as timersTest,
  expect as timersExpect,
} from "@playwright-labs/fixture-timers";

export const test = mergeTests(timersTest);
export const expect = mergeExpects(timersExpect);
```

Or use directly:

```ts
import { test, expect } from "@playwright-labs/fixture-timers";
```

### `setTimeout`

Promise-based timeout that resolves after a delay with an optional value.

```typescript
import { test, expect } from "@playwright-labs/fixture-timers";

test("resolves with value after delay", async ({ setTimeout }) => {
  const result = await setTimeout(100, "hello");
  expect(result).toBe("hello");
});

test("basic delay", async ({ setTimeout }) => {
  await setTimeout(500); // wait 500ms
});
```

**Signature:**

```typescript
setTimeout<T = void>(delay?: number, value?: T, options?: TimerOptions) => Promise<T>
```

### `setInterval`

Returns an async iterator that yields a value at regular intervals. Use `for await...of` to consume it, and call `.return?.()` to clean up.

```typescript
import { test, expect } from "@playwright-labs/fixture-timers";

test("poll at intervals", async ({ setInterval }) => {
  const poller = setInterval(200, "tick");

  let count = 0;
  for await (const value of poller) {
    expect(value).toBe("tick");
    count++;
    if (count >= 3) break;
  }

  expect(count).toBe(3);
});

test("manual iteration", async ({ setInterval }) => {
  const iterator = setInterval(100, "value");

  const first = await iterator.next();
  expect(first.value).toBe("value");
  expect(first.done).toBe(false);

  await iterator.return?.(); // cleanup
});
```

**Signature:**

```typescript
setInterval<T = void>(delay?: number, value?: T, options?: TimerOptions) => NodeJS.AsyncIterator<T>
```

### `setImmediate`

Promise that resolves on the next iteration of the event loop, before `setTimeout(0)`.

```typescript
import { test, expect } from "@playwright-labs/fixture-timers";

test("immediate resolves before timeout", async ({ setImmediate, setTimeout }) => {
  const order: string[] = [];

  const t = setTimeout(0).then(() => { order.push("timeout"); });
  const i = setImmediate().then(() => { order.push("immediate"); });

  await Promise.all([t, i]);
  expect(order[0]).toBe("immediate");
});

test("resolves with value", async ({ setImmediate }) => {
  const result = await setImmediate("fast");
  expect(result).toBe("fast");
});
```

**Signature:**

```typescript
setImmediate<T = void>(value?: T, options?: TimerOptions) => Promise<T>
```

### `scheduler`

The Node.js `scheduler` API for precise timing control.

```typescript
import { test } from "@playwright-labs/fixture-timers";

test("scheduler wait and yield", async ({ scheduler }) => {
  await scheduler.wait(100); // wait 100ms
  await scheduler.yield();   // yield control to the event loop
});
```

**Methods:**

- `scheduler.wait(delay, options?)` -- wait for a specified time (ms)
- `scheduler.yield()` -- yield control to the event loop

### AbortSignal Support

All timer fixtures accept an `options` parameter with an optional `signal` for cancellation:

```typescript
import { test, expect } from "@playwright-labs/fixture-timers";

test("abort cancels timer", async ({ setTimeout }) => {
  const ac = new AbortController();
  const promise = setTimeout(10000, "late", { signal: ac.signal });

  ac.abort();

  await expect(promise).rejects.toThrow();
});

test("abort cancels interval", async ({ setInterval }) => {
  const ac = new AbortController();
  const iterator = setInterval(100, "tick", { signal: ac.signal });

  const first = await iterator.next();
  expect(first.value).toBe("tick");

  ac.abort();

  await expect(iterator.next()).rejects.toThrow();
});
```

## Custom Matchers

### `toResolveWithin(maxMs)`

Asserts that a promise resolves within a maximum time window.

```typescript
test("operation completes within SLA", async ({ setTimeout }) => {
  const promise = setTimeout(50, "done");
  await expect(promise).toResolveWithin(100);
});
```

### `toTakeAtLeast(minMs)`

Asserts that a promise takes at least a minimum amount of time to resolve.

```typescript
test("delay is enforced", async ({ setTimeout }) => {
  const promise = setTimeout(100);
  await expect(promise).toTakeAtLeast(95);
});
```

### `toResolveWith(expectedValue)`

Asserts that a promise resolves with a specific value using strict equality (`===`).

```typescript
test("resolves with expected value", async ({ setTimeout }) => {
  const promise = setTimeout(50, "test-value");
  await expect(promise).toResolveWith("test-value");
});
```

### `toResolveInTimeRange(minMs, maxMs)`

Asserts that a promise resolves within a specific time window (not too fast, not too slow).

```typescript
test("response within acceptable range", async ({ setTimeout }) => {
  const promise = setTimeout(100, "result");
  await expect(promise).toResolveInTimeRange(95, 150);
});
```

### `toYield(expectedValue?)`

Asserts that an async iterator yields a value. Optionally checks the yielded value with strict equality.

```typescript
test("interval yields expected value", async ({ setInterval }) => {
  const iterator = setInterval(100, "tick");

  await expect(iterator).toYield("tick");
  await expect(iterator).toYield(); // any value

  await iterator.return?.();
});
```

### `toYieldWithin(maxMs)`

Asserts that an async iterator yields its next value within a time limit.

```typescript
test("interval yields on time", async ({ setInterval }) => {
  const iterator = setInterval(100);
  await expect(iterator).toYieldWithin(150);
  await iterator.return?.();
});
```

## Real-World Examples

### Retry with Exponential Backoff

```typescript
import { test, expect } from "@playwright-labs/fixture-timers";

test("retry with backoff", async ({ setTimeout }) => {
  let attempts = 0;

  const fetchWithRetry = async () => {
    for (let i = 0; i < 3; i++) {
      attempts++;
      try {
        const res = await fetch("/api/data");
        if (res.ok) return res.json();
      } catch {
        // retry
      }
      await setTimeout(100 * Math.pow(2, i)); // 100ms, 200ms, 400ms
    }
    throw new Error("All retries exhausted");
  };

  await expect(fetchWithRetry()).toResolveWithin(1000);
});
```

### Polling with Async Iterator

```typescript
test("poll until ready", async ({ setInterval }) => {
  const poller = setInterval(500, "check");

  for await (const _ of poller) {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.ready) break;
  }

  await poller.return?.();
});
```

### Timeout Race

```typescript
test("operation vs timeout", async ({ setTimeout }) => {
  const operation = fetch("/api/slow-endpoint");
  const timeout = setTimeout(5000).then(() => {
    throw new Error("Operation timed out");
  });

  const result = await Promise.race([operation, timeout]);
  expect(result).toBeTruthy();
});
```

### Debounce Pattern

```typescript
test("debounced action", async ({ setTimeout }) => {
  let executeCount = 0;
  let pending: Promise<void> | null = null;

  const debounce = async (fn: () => void, delay: number) => {
    pending = setTimeout(delay);
    await pending;
    fn();
  };

  await debounce(() => executeCount++, 100);
  expect(executeCount).toBe(1);
});
```

### Coordinating Multiple Timers

```typescript
test("sequential delays", async ({ setTimeout, setImmediate, scheduler }) => {
  await setImmediate();          // yield control first
  await scheduler.wait(50);      // wait 50ms
  const val = await setTimeout(100, 42); // wait 100ms, get 42
  expect(val).toBe(42);
});
```

---

## API Reference

### Fixtures

| Fixture        | Type                                                                            | Description                                   |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `setTimeout`   | `<T = void>(delay?: number, value?: T, options?: TimerOptions) => Promise<T>`   | Promise-based timeout with optional value      |
| `setInterval`  | `<T = void>(delay?: number, value?: T, options?: TimerOptions) => AsyncIterator<T>` | Async iterator yielding at regular intervals  |
| `setImmediate` | `<T = void>(value?: T, options?: TimerOptions) => Promise<T>`                   | Resolves on the next event loop iteration      |
| `scheduler`    | `{ wait(delay, options?): Promise<void>; yield(): Promise<void> }`              | Node.js scheduler API                          |

### Custom Matchers

| Matcher                              | Input         | Description                                    |
| ------------------------------------ | ------------- | ---------------------------------------------- |
| `toResolveWithin(maxMs)`             | Promise       | Resolves within max time                       |
| `toTakeAtLeast(minMs)`               | Promise       | Takes at least min time to resolve             |
| `toResolveWith(value)`               | Promise       | Resolves with exact value (strict `===`)       |
| `toResolveInTimeRange(minMs, maxMs)` | Promise       | Resolves within a min/max time window          |
| `toYield(value?)`                    | AsyncIterator | Yields a value (optionally matching)           |
| `toYieldWithin(maxMs)`               | AsyncIterator | Next yield happens within max time             |

---

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import { test, expect, type Fixture } from "@playwright-labs/fixture-timers";

test("typed example", async ({
  setTimeout,   // <T>(delay?, value?, options?) => Promise<T>
  setInterval,  // <T>(delay?, value?, options?) => AsyncIterator<T>
  setImmediate, // <T>(value?, options?) => Promise<T>
  scheduler,    // { wait(delay, options?): Promise<void>; yield(): Promise<void> }
}) => {
  const str = await setTimeout(100, "hello");  // inferred as string
  const num = await setImmediate(42);           // inferred as number
});
```
