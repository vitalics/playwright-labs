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
       JSON.stringify(event)          └─ Event.is(JSON.parse(line))
     )                                     └─ remote-write to Prometheus
```

A call to `collect()` writes a single-line JSON event (`{ name: "prometheus-remote-writer", payload: <timeseries> }`) to the worker's stdout. The reporter reads stdout lines from all workers, keeps the ones where `Event.is()` returns `true`, and pushes their payloads to Prometheus via remote write.

`collect()` flushes only the samples recorded since the previous flush — repeated calls without new samples write nothing. This keeps the remote-write protocol safe on Prometheus 3.x, which rejects requests that re-send already-pushed samples ("out of order sample"). Sample timestamps are always strictly increasing, so several `inc()` calls within the same millisecond are not lost either.

## Usage

```typescript
import { Counter, Gauge } from "@playwright-labs/prometheus-core";

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
```

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
