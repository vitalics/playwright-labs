# @playwright-labs/reporter-inline

Build a Playwright reporter from plain callbacks — no class, no boilerplate. Pass any subset of the lifecycle hooks as options and get a fully valid reporter.

Built on top of [`@playwright-labs/reporter-core`](../reporter-core).

---

## Installation

```bash
pnpm add @playwright-labs/reporter-inline
```

---

## Quick start

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["@playwright-labs/reporter-inline", {
      onEnd: (result) => {
        console.log(`Run finished: ${result.status}`);
      },
      onTestEnd: (test, result) => {
        if (result.status === "failed") {
          console.log(`❌ ${test.titlePath().join(" › ")}`);
        }
      },
    }],
  ],
});
```

Async callbacks are supported everywhere; only `onEnd`'s return value and `onExit`'s promise are awaited by Playwright (same as a class reporter).

### Override the run status

```typescript
["@playwright-labs/reporter-inline", {
  onEnd: (result) => {
    // don't fail CI on flaky quarantine tests, for example
    if (result.status === "interrupted") return { status: "failed" };
  },
}],
```

---

## Configuration

```typescript
import type { ReporterOptions } from "@playwright-labs/reporter-inline";
```

| Option | Signature | Description |
|--------|-----------|-------------|
| `onBegin` | `(config, suite) => void` | Run started |
| `onTestBegin` | `(test, result) => void` | Test started |
| `onStepBegin` | `(test, result, step) => void` | Step started |
| `onStepEnd` | `(test, result, step) => void` | Step finished |
| `onTestEnd` | `(test, result) => void` | Test finished |
| `onStdOut` / `onStdErr` | `(chunk, test?, result?) => void` | Test wrote to stdout/stderr |
| `onError` | `(error) => void` | Error outside a test |
| `onEnd` | `(result) => { status? } \| void` | Run finished — return `{ status }` to override |
| `onExit` | `() => Promise<void>` | Called before the process exits; awaited |
| `printsToStdio` | `() => boolean` | Whether the reporter prints to the terminal (default `false`) |
| `captureRejections` | `boolean` | Route async listener rejections to the `error` event (default `false`) |

All callbacks may be async (`MaybePromise<void>`).

---

## Escape hatch: the event emitter

`InlineReporter` extends `BaseReporter`, which is a typed `EventEmitter` — so besides the options you can subscribe to events directly, e.g. from a fixture or a shared setup module:

```typescript
reporter.on("test.end", (test, result) => { /* ... */ });
```

---

## License

MIT
