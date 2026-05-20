# @playwright-labs/fixture-otel

## 1.1.0

### Minor Changes

- a80f334: Fix: issue with attaching parent for `spanId` for `withSpan` function (#49). Example:

  ```ts
  import { withSpan } from "@playwright-labs/fixture-otel";

  test('some test', () => {
    withSpan("parent", (parentSpan) => {
      withSpan("child", (childSpan) => {
        // implementation
      });
    });
  });
  })
  ```

  Before:

  ```md
  [test span]
  ├── parent
  └── child
  ```

  After:

  ```md
  [test]
  └── parent
  └── child
  ```

- b32d9ba: Feature: add traceparent in fixture (#49)

  Added `useTraceparent()` fixture — generates a W3C traceparent at fixture initialisation,
  registers it as the `pw_otel.traceparent` annotation so the reporter places the test span
  inside that trace, and activates the corresponding OTel context for the duration of the test.

  **Automatic propagation** (requires `startWorkerSdk()` in the worker): the
  `AsyncLocalStorageContextManager` picks up the activated context and all auto-instrumented
  libraries (`node:http`, global `fetch`, gRPC, …) propagate the traceparent without any
  manual header injection:

  ```ts
  test("checkout", async ({ useTraceparent, page }) => {
    useTraceparent(); // activates OTel context; return value is optional
    await page.goto("/checkout"); // all fetch/http requests carry the same traceId
  });
  ```

  **Manual propagation**: call `useTraceparent()` to get the header value for non-instrumented clients:

  ```ts
  test("order API", async ({ useTraceparent, request }) => {
    const { traceparent } = useTraceparent();
    await request.post("/api/orders", { headers: { traceparent } });
  });
  ```

  Both modes compose freely — the same `traceparent` string works for both automatic and manual propagation.

  Also re-exports `startWorkerSdk` and `WorkerSdkOptions` from `@playwright-labs/otel-core`.

### Patch Changes

- Updated dependencies [a80f334]
- Updated dependencies [b32d9ba]
  - @playwright-labs/otel-core@1.1.0

## 1.0.1

### Patch Changes

- 0ed8282: Add README documenting all fixtures (`useCounter`, `useHistogram`, `useUpDownCounter`, `useSpan`), the `withSpan` callback helper, `using` keyword lifecycle, and all custom expect matchers (`toBeOtelMetricCollected`, `toHaveOtelCallCount`, `toHaveOtelMinCallCount`, `toBeOtelSpanEnded`).
- Updated dependencies [0ed8282]
  - @playwright-labs/otel-core@1.0.1

## 1.0.0

### Major Changes

- 7d6ee21: Introduce `@playwright-labs/fixture-otel` — extended `test` and `expect` for Playwright with OTel metric fixtures, a span helper, and custom matchers.

  Provides `useCounter`, `useHistogram`, `useUpDownCounter`, and `useSpan` fixtures that automatically flush/end on test teardown. Includes the `withSpan` callback helper for pairing with `test.step`, and custom expect matchers (`toBeOtelMetricCollected`, `toHaveOtelCallCount`, `toHaveOtelMinCallCount`, `toBeOtelSpanEnded`).

  Basic usage:

  ```ts
  import { test, expect, withSpan } from "@playwright-labs/fixture-otel";

  test("checkout flow", async ({ useCounter, useSpan, page }) => {
    const requests = useCounter("api_requests", { unit: "requests" });

    await test.step("add to cart", () =>
      withSpan("cart.add", (span) => {
        span.setAttribute("product.id", "abc-123");
        requests.add(1, { endpoint: "/cart" });
        return page.click('[data-testid="add-to-cart"]');
      }));

    expect(requests).toHaveOtelCallCount(1);
  });
  ```

### Patch Changes

- Updated dependencies [7d6ee21]
  - @playwright-labs/otel-core@1.0.0
