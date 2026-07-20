# @playwright-labs/prometheus-core

Core Prometheus remote-write primitives used internally by [`@playwright-labs/reporter-prometheus-remote-write`](../reporter-prometheus-remote-write) and [`@playwright-labs/fixture-prometheus`](../fixture-prometheus).

> **Note:** You typically do not need to install this package directly. Install `@playwright-labs/reporter-prometheus-remote-write` and/or `@playwright-labs/fixture-prometheus` instead — they re-export everything you need.

## Installation

```bash
npm i @playwright-labs/prometheus-core
```

## What's inside

| Export | Description |
|--------|-------------|
| `Counter` | Monotonically increasing metric (`inc()`) |
| `Gauge` | Metric that can go up and down (`inc()` / `dec()` / `set()` / `zero()`) |
| `Histogram` | Multi-series distribution metric (`observe()`) — composed of `${name}_bucket` / `${name}_sum` / `${name}_count` counters |
| `DEFAULT_BUCKETS` | Default histogram bucket bounds: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` |
| `Metric` | Abstract base class shared by `Counter` and `Gauge` |
| `Event` | Stdout event bridge — `collect()` in workers, `Event.is()` in the reporter |
| `Timeseries` | Re-exported type from `prometheus-remote-write` |

## How the stdout bridge works

Playwright runs tests in worker processes isolated from the reporter process. `prometheus-core` bridges this gap without any extra network setup:

```
Worker process                         Reporter process
─────────────────────────────────────────────────────────
counter.collect()
  └─ process.stdout.write(           onStdOut(line)
       JSON.stringify(event) + "\n"   └─ Event.is(JSON.parse(line))
     )                                     └─ remote-write to Prometheus
```

A call to `collect()` writes a newline-terminated single-line JSON event (`{ name: "prometheus-remote-writer", payload: <timeseries> }`) to the worker's stdout. Events are newline-delimited, so several back-to-back events (e.g. a `Histogram` flush, which emits one event per child series) can be split into individual lines by the reporter. The reporter reads stdout lines from all workers, keeps the ones where `Event.is()` returns `true`, and pushes their payloads to Prometheus via remote write.

`collect()` flushes only the samples recorded since the previous flush — repeated calls without new samples write nothing. This keeps the remote-write protocol safe on Prometheus 3.x, which rejects requests that re-send already-pushed samples ("out of order sample"). Sample timestamps are always strictly increasing, so several `inc()` calls within the same millisecond are not lost either.

## Usage

```typescript
import { Counter, Gauge, Histogram } from "@playwright-labs/prometheus-core";

// Counter — monotonically increasing
const requests = new Counter({ name: "api_requests", job: "e2e" });
requests.labels({ endpoint: "/users", method: "GET" });
requests.inc();
requests.inc(5);
requests.collect(); // flush to the reporter via stdout

// Gauge — can go up and down
const inFlight = new Gauge({ name: "http_in_flight" });
inFlight.inc();   // request started
inFlight.dec();   // request finished
inFlight.set(10); // or set an absolute value
inFlight.zero();  // back to 0
inFlight.collect();

// Histogram — distribution of observed values
const duration = new Histogram({
  name: "page_load_seconds",
  buckets: [0.1, 0.5, 1, 2.5, 5], // optional, defaults to DEFAULT_BUCKETS
  route: "/dashboard", // extra labels are spread onto every child series
});
duration.observe(0.3);
duration.observe(1.2);
duration.collect(); // flushes ${name}_bucket{le=...}, ${name}_sum and ${name}_count series
```

A `Histogram` is a composition of counters, one series per bucket bound
(`${name}_bucket` with an `le` label, including `le="+Inf"`) plus `${name}_sum`
and `${name}_count`. Buckets are cumulative: `observe(value)` increments every
bucket whose bound is `>= value`. The child counters are exposed as
`histogram.buckets`, `histogram.sum` and `histogram.count`.

### `using` keyword (TypeScript 5.2+)

All metrics implement `Disposable` — `collect()` is called automatically when the `using` block exits:

```typescript
{
  using requests = new Counter({ name: "api_requests" });
  requests.inc();
} // collect() called here
```

## Event

Low-level event bridge. You should not need this unless you are building a custom reporter or integration.

```typescript
import { Event } from "@playwright-labs/prometheus-core";

// In the reporter — check a parsed stdout line
const parsed = JSON.parse(line);
if (Event.is(parsed)) {
  // parsed.payload is a Timeseries ready for remote write
}
```

## License

MIT
