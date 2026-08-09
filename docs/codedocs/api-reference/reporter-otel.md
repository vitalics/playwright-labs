---
title: "Reporter OTel"
description: "API reference for @playwright-labs/reporter-otel."
---

Source files: [`packages/reporter-otel/src/index.ts`](/workspace/home/playwright-labs/packages/reporter-otel/src/index.ts), [`packages/reporter-otel/src/reporter.ts`](/workspace/home/playwright-labs/packages/reporter-otel/src/reporter.ts).

## Imports

```ts
import Reporter, {
  annotationLabel,
  ANNOTATION_PREFIX,
  TRACEPARENT_ANNOTATION,
  parseTraceparent,
  type OtelReporterOptions,
} from "@playwright-labs/reporter-otel";
```

## Options

```ts
export type OtelReporterOptions = OtelCoreOptions;
```

The reporter inherits the same configuration surface as `otel-core`, so collector host, headers, auth, metric prefix, resource attributes, env exposure, and export interval are configured in one place.

## Helper Exports

```ts
export const ANNOTATION_PREFIX = "pw_otel.";
export function annotationLabel(label: string): string;
export function parseTraceparent(traceparent: string): SpanContext | undefined;
```

`annotationLabel("feature")` returns `pw_otel.feature`, which `OtelReporter` forwards to span attributes at test end.

## Reporter Class

```ts
export default class OtelReporter implements Reporter {
  constructor(options?: OtelReporterOptions);
  onBegin(config: FullConfig, suite: Suite): void;
  onTestBegin(test: TestCase, result: TestResult): void;
  onTestEnd(test: TestCase, result: TestResult): void;
  onEnd(result: FullResult): Promise<void> | void;
}
```

Internally, the class:

- exposes collector connection info to workers through `PLAYWRIGHT_OTEL_BASE_URL` and `PLAYWRIGHT_OTEL_HEADERS`
- starts a `NodeSDK` in `onBegin`
- buffers worker spans until `onTestEnd` so annotations are available
- creates built-in metrics for totals, durations, retries, errors, and attachment counts

## Example

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-otel",
      { host: "otel-collector", port: 4318, prefix: "pw_" },
    ],
  ],
});
```
