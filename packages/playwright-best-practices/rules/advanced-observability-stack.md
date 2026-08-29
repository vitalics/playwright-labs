---
title: Stand Up a Full Local Observability Stack for Tests with Docker Compose, Jaeger, Prometheus, and Grafana
impact: LOW
impactDescription: turns opaque CI failures into queryable traces and metrics without changing a single test
tags: observability, opentelemetry, prometheus, grafana, jaeger, docker-compose, global-setup, debugging, ci
---

## Stand Up a Full Local Observability Stack for Tests with Docker Compose, Jaeger, Prometheus, and Grafana

**Impact: LOW (turns opaque CI failures into queryable traces and metrics without changing a single test)**

Individual reporters and fixtures (`reporter-otel`, `reporter-prometheus-remote-write`, `fixture-otel`, `fixture-prometheus`) emit traces and metrics, but they are only useful when something is listening on the other end. The missing piece is infrastructure: an OTel Collector that receives OTLP data, Jaeger for trace storage and visualization, Prometheus for metrics, and Grafana as a unified dashboard. Running this stack locally via Docker Compose — started from Playwright's `globalSetup` and stopped in `globalTeardown` — gives every engineer the same debugging environment that production services enjoy. The full working setups live in `examples/otel-stack` and `examples/grafana-stack`.

## When to Use

- **Use the full OTel stack** (`examples/otel-stack`: collector + Jaeger + Prometheus + Grafana) when: You want both distributed traces *and* metrics from the same run — the collector fans out OTLP to both backends
- **Use the lighter Grafana stack** (`examples/grafana-stack`: Prometheus + Grafana only) when: You only need metrics — `reporter-prometheus-remote-write` pushes straight into Prometheus's remote-write endpoint, no collector needed
- **Stand the stack up when**: Debugging flaky or slow tests that the HTML report cannot explain, establishing performance baselines (test/step duration trends), or building dashboards for suite health over time
- **Skip the stack when**: Your suite is small and stable, or you only need pass/fail notifications — use `reporter-slack` / `reporter-email` instead
- **Required for**: Teams running suites large enough that "which test got slower last month?" or "what exactly happened inside this flaky test?" are recurring questions

## Guidelines

### Do

- Start the stack in `globalSetup` with `docker compose up -d --wait` and poll each service's health endpoint before letting tests run — containers report "up" before they can actually accept data
- Stop (or intentionally keep) the stack in `globalTeardown` — keeping it up after the run lets engineers explore the UIs
- Provision Grafana datasources and dashboards as code (`grafana/provisioning/`, `grafana/dashboards/`) so the stack is useful immediately after `docker compose up` with no manual clicking
- Enable anonymous, no-login access for local Grafana (`GF_AUTH_ANONYMOUS_ENABLED=true`) — this is a throwaway local stack, not production
- Run the OTLP pipeline on the default ports (collector `4318`, Jaeger UI `16686`, Prometheus `9090`, Grafana `3000`) so configs stay copy-pasteable between projects
- Add a `verify` Playwright project with `dependencies: ["generate"]` that queries the Jaeger/Prometheus HTTP APIs to prove the pipeline works end-to-end — this catches "stack up but misconfigured" failures in CI

### Don't

- Don't run the observability stack in CI unless you archive dashboards or export data — containers disappear with the runner; for CI, point the same reporters at a central collector or use the HTML report
- Don't duplicate per-package configuration details here — fixture APIs (`useSpan`, `useCounter`, `useCounterMetric`, `useGaugeMetric`) and reporter options are covered by their own rules; this rule is about the *infrastructure* they talk to
- Don't hand-build Grafana dashboards through the UI — they vanish with the container volume; define them as JSON and provision them
- Don't hardcode `sleep` delays after `docker compose up` — poll health endpoints (`/api/health`, `/-/ready`) instead
- Don't expose these ports publicly or reuse the stack for application monitoring — it is ephemeral test infrastructure

### Tool Usage Patterns

- **Traces + metrics (full stack)**: `docker-compose.yml` with `otel/opentelemetry-collector-contrib` (OTLP/HTTP receiver on `4318`, Prometheus exporter on `8889`), `jaegertracing/all-in-one`, `prom/prometheus`, `grafana/grafana` — Playwright sends OTLP to the collector, which fans out to Jaeger and Prometheus
- **Metrics only (light stack)**: `prom/prometheus` started with `--enable-feature=remote-write-receiver` plus `grafana/grafana` — `reporter-prometheus-remote-write` POSTs to `/api/v1/write` directly
- **Reporter side**: `["@playwright-labs/reporter-otel", { host: "localhost", port: 4318, exportIntervalMillis: 5_000 }]` or `["@playwright-labs/reporter-prometheus-remote-write", { serverUrl: "http://localhost:9090/api/v1/write" }]`
- **Fixture side**: `fixture-otel` / `fixture-prometheus` in test workers emit JSON to stdout; the reporter's `onStdOut` bridges it into the OTel meter/tracer or Prometheus registry — no extra wiring needed
- **Configuration**: `globalSetup` / `globalTeardown` in `playwright.config.ts` own the container lifecycle
- **Helper utilities**: a `waitForUrl(url, timeoutMs)` polling helper in `global-setup.ts` (see `examples/otel-stack/global-setup.ts`)

## Edge Cases and Constraints

### Limitations

- Requires Docker with the Compose plugin on every machine that runs the suite — a hard prerequisite, not an optional convenience
- The OTel Collector image is distroless: no shell or `wget`, so Docker-level `healthcheck` blocks don't work — readiness must be polled from `global-setup.ts` via the collector's HTTP health port (`13133`)
- Metrics are scraped/pushed on an interval — very short runs may end before the first scrape; use a short `exportIntervalMillis` and verify with a `verify` project rather than assuming data arrived
- Prometheus is ephemeral unless you add a volume — container restart wipes metric history (usually fine for local debugging)

### Edge Cases

1. **Port collisions**: `3000`, `9090`, or `16686` already in use by another local service. Handling: remap host ports in `docker-compose.yml` and update reporter options and health-check URLs together.
2. **Stack left running**: `globalTeardown` skips teardown so engineers can explore UIs; the next run's `docker compose up -d` reuses it — safe, but document `infra:down` script for cleanup.
3. **CI runners without Docker**: `docker compose up` fails inside `globalSetup`, failing the whole run before any test executes. Handling: gate the stack behind an env flag and fall back to a stdout/html reporter when unset.
4. **Traces arrive but metrics don't** (or vice versa): the collector pipelines are independent — check `otel-collector-config.yaml` for both exporters, and confirm Prometheus actually scrapes the collector's `8889` endpoint.

### What Breaks If Ignored

- **Without health polling**: the first tests' spans and metrics are silently dropped while containers are still booting — Jaeger shows a partial trace list and Prometheus shows gaps
- **Without provisioning as code**: every engineer rebuilds datasources and dashboards by hand; dashboards drift between machines and are lost on `docker compose down -v`
- **Without the stack entirely**: reporter/fixture instrumentation has nowhere to go — you get the HTML report only, and slow-test or flaky-test investigations revert to guesswork and `console.log`

**Incorrect (no readiness checks, manual dashboards, no verification):**

```typescript
// global-setup.ts
import { execSync } from "node:child_process";

export default async function globalSetup() {
  execSync("docker compose up -d", { stdio: "inherit" });
  // ❌ Containers report "up" before they can accept data
  await new Promise((r) => setTimeout(r, 10_000)); // ❌ blind sleep — too short on cold pulls, wasted time otherwise
}
```

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: "./global-setup.ts",
  reporter: [
    ["@playwright-labs/reporter-otel", { host: "localhost", port: 4318 }],
    // ❌ no verify project — a misconfigured collector fails silently;
    //    you find out only when Jaeger is empty
  ],
});
```

**Why this fails:**
- Early spans/metrics are dropped while the collector, Jaeger, and Prometheus are still starting
- A 10s sleep is both flaky (cold image pulls take minutes) and wasteful (warm starts take 2s)
- Nothing asserts the pipeline works, so "the stack is running" is confused with "data is flowing"
- Grafana is a blank page until someone manually wires datasources

**Correct (compose lifecycle in global setup/teardown with health polling):**

```typescript
// global-setup.ts — adapted from examples/otel-stack
import { execSync } from "node:child_process";
import path from "node:path";

const EXAMPLE_DIR = path.resolve(import.meta.dirname);

async function waitForUrl(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status < 500) return;
    } catch { /* not ready yet */ }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
}

export default async function globalSetup() {
  // ✅ --wait blocks until healthchecks pass where available
  execSync("docker compose up -d --wait", { cwd: EXAMPLE_DIR, stdio: "inherit" });

  // ✅ Poll real health endpoints — works even for distroless images
  await waitForUrl("http://localhost:13133/");            // OTel Collector
  await waitForUrl("http://localhost:16686/");            // Jaeger UI
  await waitForUrl("http://localhost:9090/-/ready");      // Prometheus
  await waitForUrl("http://localhost:3000/api/health");   // Grafana
}
```

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-otel",
      {
        host: "localhost",
        port: 4318,
        // ✅ Short interval so metrics are visible during/soon after the run
        exportIntervalMillis: 5_000,
      },
    ],
  ],
  projects: [
    { name: "generate", testMatch: "tests/sample.spec.ts" },
    // ✅ Prove the pipeline end-to-end: query Jaeger + Prometheus HTTP APIs
    { name: "verify", testMatch: "tests/verify.spec.ts", dependencies: ["generate"] },
  ],
});
```

**Why this works:**
- `docker compose up -d --wait` plus per-service health polling guarantees backends accept data before the first test starts
- Provisioned Grafana datasources (`grafana/provisioning/datasources/`) and dashboards (`grafana/dashboards/`) make the stack useful the moment it boots — no manual setup
- The `verify` project turns observability itself into a tested contract: if the collector config breaks, CI fails loudly instead of silently losing data
- The same `docker-compose.yml` works on every engineer's machine, so "works on my machine" debugging sessions share one source of truth

## Common Mistakes

### Mistake 1: Scraping the Playwright process directly with Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: playwright
    static_configs:
      - targets: ["host.docker.internal:9464"] # ❌ no such endpoint exists
```

**Why this is wrong**: Neither `reporter-otel` nor `reporter-prometheus-remote-write` exposes a scrape endpoint on the Playwright process. Metrics reach Prometheus either through the OTel Collector's Prometheus exporter (`:8889`) or via remote write to `/api/v1/write` (which requires `--enable-feature=remote-write-receiver`).

**How to fix**:

```yaml
# prometheus.yml — scrape the collector's exporter, not Playwright
scrape_configs:
  - job_name: otel-collector
    static_configs:
      - targets: ["otel-collector:8889"] # ✅ collector fans out OTLP metrics here
```

### Mistake 2: Tearing the stack down before anyone can look at it

```typescript
// global-teardown.ts
export default async function globalTeardown() {
  execSync("docker compose down -v", { stdio: "inherit" }); // ❌ always
}
```

**Why this is wrong**: The main value of a local stack is post-run exploration. Unconditional teardown (especially with `-v`, which wipes Prometheus data) means Jaeger and Grafana are gone exactly when an engineer wants to inspect a failure.

**How to fix**: Make teardown opt-out (e.g. skip when `KEEP_INFRA=1`) and provide explicit `infra:up` / `infra:down` package scripts, as the examples do:

```json
{
  "scripts": {
    "infra:up": "docker compose up -d --wait",
    "infra:down": "docker compose down"
  }
}
```

## Integration with Other Best Practices

- **reporter-otel / reporter-prometheus-remote-write rules**: Those rules cover reporter options and emitted metric names; this rule provides the infrastructure they export to. Configure the reporter per its rule, then stand up the matching stack from this one.
- **fixture-otel / fixture-prometheus rules**: Custom spans, counters, and gauges created in tests flow through the same pipeline — worker stdout → reporter → collector/Prometheus. Instrument tests with the fixtures; the stack makes the data visible in Jaeger/Grafana.
- **Global setup/teardown patterns**: The stack lifecycle is a standard Playwright `globalSetup`/`globalTeardown` concern — the same pattern used for seeding databases or starting test servers.
- **Scale considerations**: At 500+ tests, keep `exportIntervalMillis` small enough to see progress live but avoid per-step custom metrics with unbounded label cardinality (test titles as labels) — Prometheus memory grows with unique label sets.

Reference: [examples/otel-stack and examples/grafana-stack](https://github.com/vitalics/playwright-labs/tree/main/examples)
