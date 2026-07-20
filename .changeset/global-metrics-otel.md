---
"@playwright-labs/fixture-otel": minor
---

Feature: global metric fixtures — `useGlobalCounter` and `useGlobalHistogram`.

Unlike the per-test `useCounter` / `useHistogram`, the global fixtures return a **shared instance per worker process**: every test that asks for the same metric name gets the same object, values accumulate across the whole run, and the metrics are flushed automatically at every test teardown (drained, so untouched metrics are no-ops). Requesting the same name with a different kind throws an error.

```ts
import { test } from "@playwright-labs/fixture-otel";

test("first", async ({ page, useGlobalCounter }) => {
  const urlCalls = useGlobalCounter("url_calls", { unit: "calls" });
  await page.goto("https://playwright.dev");
  urlCalls.add(1, { url: "playwright.dev" });
});

test("second", async ({ page, useGlobalCounter }) => {
  const urlCalls = useGlobalCounter("url_calls"); // same instance
  urlCalls.add(1, { url: "playwright.dev" }); // url_calls_total = 2
});

test("durations", async ({ useGlobalHistogram }) => {
  const stepMs = useGlobalHistogram("step_duration_ms", { unit: "ms" });
  stepMs.record(120, { step: "checkout" });
});
```

Note: each Playwright worker is a separate process, so the registry is per-worker; metric options apply only at first creation.
