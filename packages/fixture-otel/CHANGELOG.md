# @playwright-labs/fixture-otel

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
