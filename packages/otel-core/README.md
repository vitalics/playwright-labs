# @playwright-labs/otel-core

Shared OpenTelemetry primitives used internally by [`@playwright-labs/reporter-otel`](../reporter-otel) and [`@playwright-labs/fixture-otel`](../fixture-otel).

> **Note:** You typically do not need to install this package directly. Install `@playwright-labs/reporter-otel` and/or `@playwright-labs/fixture-otel` instead — they re-export everything you need.

## What's inside

| Export | Description |
|--------|-------------|
| `Counter` | Monotonically increasing metric (calls forwarded to OTel `Counter`) |
| `Histogram` | Distribution of values (calls forwarded to OTel `Histogram`) |
| `UpDownCounter` | Value that can increase or decrease (queue depths, in-flight ops) |
| `Span` | Named unit of work forwarded as a child span of the test span |
| `OtelEvent` | Stdout event bridge — `emit()` in workers, `parse()` in reporter |
| `resolveOtelConfig` | Normalises `OtelCoreOptions` into a flat config with defaults applied |
| `createOtelSdk` | Builds a `NodeSDK` with OTLP/HTTP trace + metric exporters |

## How the stdout bridge works

Playwright runs tests in worker processes isolated from the reporter process. `otel-core` bridges this gap without any extra network setup:

```
Worker process                         Reporter process
─────────────────────────────────────────────────────────
Counter.collect() / Span.end()
  └─ OtelEvent.emit(payload)           onStdOut(line)
       └─ process.stdout.write(        └─ OtelEvent.parse(line)
            "__pw_otel__" + JSON          └─ records via OTel SDK
          )
```

Every call to `collect()` (metrics) or `end()` (spans) writes a single-line JSON event prefixed with `__pw_otel__` to the worker's stdout. The reporter reads all stdout lines from all workers and feeds matching lines into the shared OTel SDK.

## Metrics

All three metric classes share the same lifecycle:

1. Create with a name and optional `{ description, unit }`
2. Record values (`add` / `record`)
3. Call `collect()` — or use the `using` keyword — to flush to the reporter

```typescript
import { Counter, Histogram, UpDownCounter } from "@playwright-labs/otel-core";

// Counter — monotonically increasing
const requests = new Counter("api_requests", { unit: "requests" });
requests.add(1, { endpoint: "/users", method: "GET" });
requests.collect();

// Histogram — distribution of values
const duration = new Histogram("page_load_ms", { unit: "ms" });
duration.record(143, { route: "/dashboard" });
duration.collect();

// UpDownCounter — can go up or down
const inFlight = new UpDownCounter("http_in_flight");
inFlight.add(1);   // request started
inFlight.add(-1);  // request finished
inFlight.collect();
```

### `using` keyword (TypeScript 5.2+)

All metrics implement `Disposable` — `collect()` is called automatically when the `using` block exits:

```typescript
{
  using requests = new Counter("api_requests");
  requests.add(1);
} // collect() called here
```

### `callCount`

Tracks how many times a value was recorded. Does not reset after `collect()`:

```typescript
const counter = new Counter("clicks");
counter.add(1);
counter.add(1);
console.log(counter.callCount); // 2
counter.collect();
console.log(counter.callCount); // still 2
```

## Span

A `Span` represents a named unit of work. It captures start/end timestamps, arbitrary attributes, and an optional status.

```typescript
import { Span } from "@playwright-labs/otel-core";

const span = new Span("db.users.find");
span.setAttribute("db.table", "users");
span.setAttribute("db.rows_returned", 5);
span.setStatus("ok");
span.end(); // serialises and emits to stdout
```

Methods support chaining:

```typescript
new Span("http.request")
  .setAttribute("http.method", "POST")
  .setAttribute("http.status_code", 201)
  .setAttributes({ "http.url": "/api/orders", "http.flavor": "1.1" })
  .setStatus("ok")
  .end();
```

Error status:

```typescript
const span = new Span("payment.charge");
try {
  await chargeCard(card);
} catch (err) {
  span.setStatus("error", err.message);
  throw err;
} finally {
  span.end();
}
```

`end()` is idempotent — subsequent calls are no-ops. `Span` also implements `Disposable`:

```typescript
{
  using span = new Span("search.query");
  span.setAttribute("query", "shoes");
} // span.end() called automatically
```

## SDK factory

`createOtelSdk` and `resolveOtelConfig` are used by the reporter to initialise the OTel SDK. They are exported for advanced use cases such as custom reporters or testing.

```typescript
import { resolveOtelConfig, createOtelSdk } from "@playwright-labs/otel-core";
import { resourceFromAttributes } from "@opentelemetry/resources";

const config = resolveOtelConfig({
  host: "otel-collector.internal",
  port: 4318,
  protocol: "https",
  auth: { username: "user", password: "secret" },
  prefix: "e2e_",
  exportIntervalMillis: 30_000,
});

const resource = resourceFromAttributes({ "service.name": "playwright" });
const sdk = createOtelSdk(resource, config);

sdk.start();
// ...
await sdk.shutdown();
```

### `resolveOtelConfig` defaults

| Option | Default |
|--------|---------|
| `host` | `'localhost'` |
| `port` | `4318` |
| `protocol` | `'http'` |
| `prefix` | `'pw_'` |
| `exportIntervalMillis` | `60000` |

## OtelEvent

Low-level event bridge. You should not need this unless you are building a custom reporter or integration.

```typescript
import { OtelEvent } from "@playwright-labs/otel-core";

// In a worker — emit a payload
OtelEvent.emit({ kind: "metric", type: "counter", name: "my_counter", dataPoints: [{ value: 1 }] });

// In the reporter — parse a stdout line
const payload = OtelEvent.parse(line); // null if not an OTel event
if (payload?.kind === "metric") { /* ... */ }
```

## License

MIT
