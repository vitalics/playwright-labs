---
title: "OTel Core"
description: "API reference for @playwright-labs/otel-core."
---

Source files: [`packages/otel-core/src/index.ts`](/workspace/home/playwright-labs/packages/otel-core/src/index.ts), [`packages/otel-core/src/events.ts`](/workspace/home/playwright-labs/packages/otel-core/src/events.ts), [`packages/otel-core/src/metrics.ts`](/workspace/home/playwright-labs/packages/otel-core/src/metrics.ts), [`packages/otel-core/src/span.ts`](/workspace/home/playwright-labs/packages/otel-core/src/span.ts), [`packages/otel-core/src/sdk.ts`](/workspace/home/playwright-labs/packages/otel-core/src/sdk.ts).

## Imports

```ts
import {
  OtelEvent,
  TRACEPARENT_ANNOTATION,
  Counter,
  Histogram,
  UpDownCounter,
  Span,
  resolveOtelConfig,
  createOtelSdk,
  startWorkerSdk,
} from "@playwright-labs/otel-core";
```

## Configuration

```ts
export type OtelCoreOptions = {
  host?: string;
  port?: number;
  protocol?: "http" | "https";
  headers?: Record<string, string>;
  auth?: { username?: string; password?: string };
  prefix?: string;
  resourceAttributes?: Record<string, string | number | boolean>;
  env?: Record<string, string | undefined>;
  exportIntervalMillis?: number;
};
```

| Option | Default | Description |
|---|---|---|
| `host` | `"localhost"` | OTLP collector host. |
| `port` | `4318` | OTLP/HTTP port. |
| `protocol` | `"http"` | Transport protocol. |
| `headers` | `{}` | Extra export headers. |
| `auth` | — | Basic auth credentials encoded into `Authorization`. |
| `prefix` | `"pw_"` | Built-in metric prefix. |
| `resourceAttributes` | `{}` | Extra trace and metric attributes. |
| `env` | `{}` | Selected env vars exposed as `env.<key>`. |
| `exportIntervalMillis` | `60000` | Metric push interval. |

## Metrics and Spans

```ts
class Counter extends BaseMetric {
  add(value: number, attributes?: Record<string, string | number | boolean>): this;
}

class Histogram extends BaseMetric {
  record(value: number, attributes?: Record<string, string | number | boolean>): this;
}

class UpDownCounter extends BaseMetric {
  add(value: number, attributes?: Record<string, string | number | boolean>): this;
}

class Span {
  constructor(name: string, parent?: Span);
  setAttribute(key: string, value: string | number | boolean): this;
  setAttributes(attributes: Record<string, string | number | boolean>): this;
  setStatus(status: "ok" | "error", message?: string): this;
  get ended(): boolean;
  end(): void;
}
```

All of these are worker-side wrappers. They buffer data until `collect()` or `end()` emits an `OtelEvent` line to stdout.

## Event Bridge

```ts
class OtelEvent {
  static readonly PREFIX: "__pw_otel__";
  static emit(payload: OtelPayload): void;
  static parse(line: string): OtelPayload | null;
}
```

## SDK Helpers

```ts
export function resolveOtelConfig(options?: OtelCoreOptions): ResolvedOtelConfig;
export function createOtelSdk(
  resource: Resource,
  config: Pick<ResolvedOtelConfig, "baseUrl" | "headers" | "exportIntervalMillis">,
): NodeSDK;
export function startWorkerSdk(options?: WorkerSdkOptions): void;
```

Use `startWorkerSdk()` when you want worker-side auto-instrumented HTTP activity to share the same trace context as `fixture-otel`.
