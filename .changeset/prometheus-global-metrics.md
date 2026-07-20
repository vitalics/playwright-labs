---
"@playwright-labs/prometheus-core": minor
"@playwright-labs/reporter-prometheus-remote-write": patch
"@playwright-labs/fixture-prometheus": minor
---

Feature: Prometheus `Histogram` and global metric fixtures — `useGlobalCounter` and `useGlobalHistogram`.

**`@playwright-labs/prometheus-core`** — new `Histogram` class: a real Prometheus histogram implemented as a composition of counters — cumulative `${name}_bucket{le="…"}` series (including `le="+Inf"`), `${name}_sum` and `${name}_count`. Bucket bounds are configurable and default to the classic Prometheus buckets (`DEFAULT_BUCKETS`).

```ts
import { Histogram } from "@playwright-labs/prometheus-core";

const stepDuration = new Histogram({
  name: "step_duration",
  buckets: [50, 100, 200, 500],
});
stepDuration.observe(120);
stepDuration.collect(); // flushes bucket/sum/count series to the reporter
```

Worker→reporter stdout events are now newline-delimited.

**`@playwright-labs/fixture-prometheus`** — new global fixtures. Unlike the per-test `useCounterMetric` / `useGaugeMetric`, they return a **shared instance per worker process**: every test that asks for the same metric name gets the same object, values accumulate across the whole run, and the metrics are flushed automatically at every test teardown. Requesting the same name with a different kind throws an error.

```ts
import { test } from "@playwright-labs/fixture-prometheus";

test("first", async ({ page, useGlobalCounter }) => {
  const urlCalls = useGlobalCounter("url_calls", { url: "playwright.dev" });
  urlCalls.inc();
});

test("second", async ({ useGlobalCounter }) => {
  useGlobalCounter("url_calls").inc(); // same instance → url_calls = 2
});

test("durations", async ({ useGlobalHistogram }) => {
  const stepMs = useGlobalHistogram("step_duration", {
    buckets: [50, 100, 200, 500],
  });
  stepMs.observe(120);
});
```

**`@playwright-labs/reporter-prometheus-remote-write`** — fix: `onStdOut` now parses newline-delimited events with a chunk buffer. Previously, several events arriving in a single stdout chunk (which happens with every histogram flush) could not be split and were silently lost.
