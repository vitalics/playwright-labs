# grafana-stack — Full Example

A complete, runnable example showing how
`@playwright-labs/reporter-prometheus-remote-write` and
`@playwright-labs/fixture-prometheus` integrate with a real Prometheus +
Grafana stack: the reporter pushes test metrics straight into Prometheus via
the remote-write endpoint, and Grafana visualises them.

## Infrastructure

| Service | Purpose | UI |
|---------|---------|-----|
| **Prometheus** | Receives and stores **metrics** pushed by the reporter via remote write (`--web.enable-remote-write-receiver`) | http://localhost:9090 |
| **Grafana** | Dashboards over the Prometheus datasource (no login) | http://localhost:3000 |

## Quick start

```sh
# From this directory:
pnpm install
pnpm test:e2e
```

This single command:

1. Pulls and starts the Prometheus + Grafana stack via Docker Compose
2. Runs the **generate** Playwright project — pushes real metrics via remote write
3. Runs the **verify** project — asserts the data arrived in Prometheus
4. Runs the **demo** project — intentional fail/timeout/retry scenarios
   (kept green via `test.fail()`)
5. Leaves the stack running so you can explore the UIs afterwards
   (`pnpm infra:down` to stop it)

Requires [Docker](https://www.docker.com/) with the Compose plugin.

## Explore results

Keep the stack running during a test run:

```sh
pnpm infra:up   # start stack in the background
pnpm test:e2e   # run tests (stack stays up)
# open UIs below…
pnpm infra:down # stop stack when done
```

### Prometheus — metrics

**http://localhost:9090**

Open the Graph tab and try these queries:

| Query | What it shows |
|-------|--------------|
| `pw_tests_total_count` | Total tests executed (flushed when the run finishes) |
| `pw_tests_passed_count` / `pw_tests_failed_count` | Pass / fail breakdown |
| `pw_tests_timed_out_count` | Tests that hit their timeout (see the `demo` project) |
| `pw_test_duration` | Per-test duration in ms (labels: `title`, `suite`, `actualStatus`, …) |
| `pw_test_step_duration` | Per-step duration, including every `test.step` |
| `pw_test_retry_count` | Retry attempts (the flaky test in the `demo` project) |
| `pw_node_memory_heap_used` | Node.js heap of the Playwright main process |
| `pw_test_annotation_count` | Annotations attached to tests |
| `pw_e2e_page_visits` | Custom standalone `Counter` from the sample test |
| `pw_e2e_api_requests` | Custom `useCounterMetric` counter from the sample test |
| `pw_e2e_active_users` | Custom `useGaugeMetric` gauge from the sample test |

> **Note:** every metric name is prefixed with `pw_` by the reporter
> (configurable via the `prefix` option). Run-level aggregates such as
> `pw_tests_total_count` are flushed once when the whole run finishes, so they
> appear in Prometheus right after `pnpm test:e2e` completes.

### Grafana — unified view

**http://localhost:3000** — anonymous access, no login required.

The Prometheus datasource is pre-configured:

1. Click **Explore** (compass icon in the sidebar)
2. Select **Prometheus** from the datasource dropdown
3. Run a PromQL query, e.g. `pw_tests_total_count`

## Dashboards

Two dashboards are auto-provisioned into the **Playwright** folder
(Grafana sidebar → Dashboards → Playwright) — no manual import needed:

- **Playwright Prometheus — Base** — the run at a glance: stat panels for
  tests run / passed / failed / skipped / timed out, pass rate, retries and
  average duration; result trends and a pass/fail pie chart; duration by
  suite; step counts and rate; `expect.poll` outcomes; Node.js memory/CPU of
  the Playwright process; and the Playwright config/projects tables.
- **Playwright Prometheus — Details** — the deep dive: slowest steps
  (top 10) and step errors, attachments and annotations, `expect.poll`
  attempts/duration per title, the error table, Node/OS/env info, and the
  custom example metrics (`pw_e2e_*`, including the step-duration
  histogram).

The dashboards are defined as JSON in `grafana/dashboards/` and loaded by the
file provider in `grafana/provisioning/dashboards/dashboards.yaml`. They use
the pre-configured Prometheus datasource directly (fixed uid `prometheus`)
and refresh every 10s.

## Project structure

```
grafana-stack/
├── tests/
│   ├── sample.spec.ts        # generates metrics (custom counters/gauges, attachments, annotations)
│   ├── verify.spec.ts        # asserts data arrived in Prometheus
│   └── edge-cases.spec.ts    # intentional fail/timeout/retry scenarios
├── playwright.config.ts      # three-project setup: generate → verify, demo
├── global-setup.ts           # starts the Docker Compose stack
├── global-teardown.ts        # stops the Docker Compose stack (disabled by default)
├── docker-compose.yml        # Prometheus (remote-write receiver) + Grafana
├── prometheus.yml            # self-scrape only — metrics arrive via remote write
└── grafana/
    ├── dashboards/
    │   ├── playwright-prometheus-base.json     # overview dashboard (auto-provisioned)
    │   └── playwright-prometheus-details.json  # deep-dive dashboard (auto-provisioned)
    └── provisioning/
        ├── dashboards/
        │   └── dashboards.yaml     # dashboard provider → "Playwright" folder
        └── datasources/
            └── datasources.yaml    # Prometheus datasource
```

## How it works

```
Playwright (main process)
  └─ @playwright-labs/reporter-prometheus-remote-write
       ├─ per-test metrics (pw_test_duration, pw_test_annotation_count, …)
       │    pushed on every test/step end
       ├─ run-level aggregates (pw_tests_total_count, pw_tests_failed_count, …)
       │    flushed once at onExit
       └─ Node.js process stats (pw_node_memory_heap_used, …)
            └─ remote write (HTTP POST /api/v1/write) ──► Prometheus :9090
                                                                ▲
Playwright workers (test code)                                  │
  └─ @playwright-labs/fixture-prometheus                        │
       ├─ useCounterMetric / useGaugeMetric                     │
       │    └─ .collect() → JSON to stdout ─► reporter.onStdOut ─┘
       └─ new Counter(...) from @playwright-labs/prometheus-core
            └─ .collect() → JSON to stdout ─► reporter.onStdOut ─┘

Grafana :3000 ── PromQL queries ──► Prometheus :9090
```
