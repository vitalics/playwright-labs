# @playwright-labs/fixture-prometheus

Prometheus metric fixtures (`useCounterMetric`, `useGaugeMetric`) for [`@playwright/test`](https://playwright.dev).

Pair with `@playwright-labs/reporter-prometheus-remote-write` so that metrics recorded in test workers are collected and pushed to Prometheus (or any remote-write compatible backend, e.g. Grafana Mimir).

## Requirements

- Playwright >= 1.13.0
- Node.js >= 18
- `@playwright-labs/reporter-prometheus-remote-write` configured in `playwright.config.ts`

## Installation

```bash
npm install @playwright-labs/fixture-prometheus
# also install the reporter if you haven't already
npm install @playwright-labs/reporter-prometheus-remote-write
```

## Setup

Configure the reporter in `playwright.config.ts`, then import `test` and `expect` from this package:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-prometheus-remote-write",
      { serverUrl: "http://localhost:9090/api/v1/write" },
    ],
  ],
});
```

```typescript
// tests/fixtures.ts — re-export for your test files
export { test, expect } from "@playwright-labs/fixture-prometheus";
```

## Fixtures

| Fixture | Returns | Purpose |
|---|---|---|
| `useCounterMetric(name, labels?)` | `Counter` | Monotonically increasing counter metric |
| `useGaugeMetric(name, labels?)` | `Gauge` | Value that can go up or down |

> **Note:** metrics are **not** collected automatically on fixture teardown — call `.collect()` explicitly to emit them (or use the `using` keyword, which collects on scope exit via `Symbol.dispose`).

### `useCounterMetric`

Creates a Prometheus **Counter** — a monotonically increasing value. Initial value is `0`.

```typescript
test("track API request count", async ({ useCounterMetric, page }) => {
  // Create a counter metric for API requests
  const apiRequestCounter = useCounterMetric("api_requests", {
    endpoint: "/users", // endpoint is a custom label
  });

  // Increment counter when API is called
  await page.goto("/users");
  apiRequestCounter.inc();

  // Increment by specific amount
  await page.click(".load-more-users");
  apiRequestCounter.inc(5);

  // Add additional labels and collect metrics
  apiRequestCounter.labels({ status: "success" }).collect();
});
```

### `useGaugeMetric`

Creates a Prometheus **Gauge** — a value that can go up and down.

```typescript
test("track active users", async ({ useGaugeMetric, page }) => {
  // Create a gauge metric for active users
  const activeUsersGauge = useGaugeMetric("active_users", { region: "us-east" });

  // Set gauge to initial value
  activeUsersGauge.set(10);

  // Increment gauge when users log in
  await page.goto("/login");
  await page.fill("#username", "testuser");
  await page.fill("#password", "password");
  await page.click("#login-button");
  activeUsersGauge.inc();

  // Decrement gauge when users log out
  await page.click("#logout-button");
  activeUsersGauge.dec();

  // Reset to zero and collect metrics
  activeUsersGauge.zero().collect();
});
```

## How it works

The fixture system uses a **stdout event bridge** between Playwright workers and the reporter:

1. When `collect()` is called on a metric, its timeseries (labels + samples) is serialized as a single JSON event — `{ name: "prometheus-remote-writer", payload: ... }` — and written to `process.stdout`.
2. The reporter's `onStdOut` hook intercepts these events and pushes the collected timeseries to the configured Prometheus remote-write endpoint.

This works seamlessly across Playwright's multi-worker architecture without any additional network setup.

## License

MIT
