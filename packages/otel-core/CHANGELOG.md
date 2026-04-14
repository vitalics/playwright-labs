# @playwright-labs/otel-core

## 1.0.0

### Major Changes

- 7d6ee21: Introduce `@playwright-labs/otel-core` — the shared OTel primitives used by the reporter and fixture packages.

  Exports `Counter`, `Histogram`, `UpDownCounter`, and `Span` classes. Each class serializes its data as a `__pw_otel__`-prefixed JSON line written to `process.stdout`, allowing Playwright workers to forward metric and trace data to the reporter process without additional network setup.

  Basic usage:

  ```ts
  import { Counter, Span } from "@playwright-labs/otel-core";

  const counter = new Counter("api_requests", { unit: "requests" });
  counter.add(1, { endpoint: "/users" });
  counter.collect(); // emits to stdout → picked up by reporter

  const span = new Span("db.query");
  span.setAttribute("db.table", "users");
  span.end(); // emits to stdout → recorded as a child span
  ```
