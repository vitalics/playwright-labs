# reporter-otel — Full Example

A complete, runnable example showing how `@playwright-labs/reporter-otel` and
`@playwright-labs/fixture-otel` integrate with a real OpenTelemetry stack.

## Infrastructure

| Service | Purpose | UI |
|---------|---------|-----|
| **OTel Collector** | Receives OTLP from Playwright, fans out to Jaeger + Prometheus | — |
| **Jaeger** | Stores and visualises **traces** | http://localhost:16686 |
| **Prometheus** | Scrapes and stores **metrics** | http://localhost:9090 |
| **Grafana** | Unified dashboard — metrics + traces (no login) | http://localhost:3000 |

## Quick start

```sh
# From this directory:
pnpm install
pnpm test:e2e
```

This single command:

1. Pulls and starts the full OTel stack via Docker Compose
2. Runs the **generate** Playwright project — sends real spans and metrics
3. Runs the **verify** project — asserts data arrived in Jaeger and Prometheus
4. Tears down the Docker stack

Requires [Docker](https://www.docker.com/) with the Compose plugin.

## Explore results

Keep the stack running during a test run:

```sh
pnpm infra:up   # start stack in the background
pnpm test:e2e   # run tests (stack stays up)
# open UIs below…
pnpm infra:down # stop stack when done
```

### Jaeger — traces

**http://localhost:16686**

1. Open the service dropdown → select **playwright**
2. Click **Find Traces**

You will see one trace per test with nested step spans. Spans created via
`useSpan()` appear as children of the test span. Error spans are highlighted.

![Jaeger trace list showing playwright service tests](https://www.jaegertracing.io/img/trace-detail-ss.png)

### Prometheus — metrics

**http://localhost:9090**

Open the Graph tab and try these queries:

| Query | What it shows |
|-------|--------------|
| `pw_tests_total` | Total tests by status (passed / failed / skipped) |
| `rate(pw_tests_total[1m])` | Test throughput |
| `pw_test_duration_sum / pw_test_duration_count` | Average test duration |
| `pw_process_memory_heap_used` | Node.js heap during the run |
| `e2e_api_requests_total` | Custom counter from the sample test |
| `e2e_page_load_ms_bucket` | Custom histogram buckets |

### Grafana — unified view

**http://localhost:3000** — anonymous access, no login required.

Two datasources are pre-configured:

**Metrics (Prometheus)**

1. Click **Explore** (compass icon in the sidebar)
2. Select **Prometheus** from the datasource dropdown
3. Run a PromQL query, e.g. `pw_tests_total`

**Traces (Jaeger)**

1. Click **Explore**
2. Select **Jaeger** from the datasource dropdown
3. Set **Service** to `playwright` → click **Find Traces**

## Project structure

```
example/
├── tests/
│   ├── sample.spec.ts        # generates OTel data (counters, histograms, spans)
│   └── verify.spec.ts        # asserts data arrived in Jaeger + Prometheus
├── playwright.config.ts      # two-project setup: generate → verify
├── global-setup.ts           # starts the Docker Compose stack
├── global-teardown.ts        # stops the Docker Compose stack
├── docker-compose.yml        # OTel Collector + Jaeger + Prometheus + Grafana
├── otel-collector-config.yaml
├── prometheus.yml
└── grafana/
    └── provisioning/
        └── datasources/
            └── datasources.yaml  # Prometheus + Jaeger datasources
```

## How it works

```
Playwright (main process)
  └─ @playwright-labs/reporter-otel
       └─ NodeSDK → OTLP/HTTP ──────► OTel Collector :4318
                                           │
                                    ┌──────┴──────┐
                                    ▼             ▼
                                 Jaeger       Prometheus
                               (traces)       exporter
                                 :16686         :8889
                                    │             │
                                    └──────┬──────┘
                                           ▼
                                        Grafana
                                         :3000

Playwright workers (test code)
  └─ @playwright-labs/fixture-otel
       ├─ useCounter / useHistogram / useUpDownCounter
       │    └─ emits JSON to stdout ──► reporter.onStdOut ──► OTel meter
       └─ useSpan
            └─ emits JSON to stdout ──► reporter.onStdOut ──► OTel tracer
```
