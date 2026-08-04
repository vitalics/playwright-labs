# @playwright-labs/reporter-webhook

Playwright reporter that POSTs test-run lifecycle events to any webhook as JSON `{ event, data }` bodies — use it to feed CI dashboards, chat bots, ticket systems, or your own automation.

Built on top of [`@playwright-labs/reporter-core`](../reporter-core).

---

## Installation

```bash
pnpm add @playwright-labs/reporter-webhook
```

---

## Quick start

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["@playwright-labs/reporter-webhook", {
      url: process.env.WEBHOOK_URL,
    }],
  ],
});
```

Every lifecycle event is sent as a separate POST with `Content-Type: application/json`:

```json
{
  "event": "end",
  "data": {
    "result": { "status": "failed", "startTime": "2026-01-01T00:00:00.000Z", "duration": 5123 },
    "counts": { "passed": 41, "failed": 2, "timedOut": 0, "skipped": 1, "interrupted": 0 }
  }
}
```

---

## Configuration

```typescript
import type { ReporterOptions } from "@playwright-labs/reporter-webhook";
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string \| URL` | required | Webhook URL — every enabled event is POSTed here |
| `events` | `WebhookEventName[]` | all events | Which events to send: `"begin"`, `"end"`, `"test.begin"`, `"test.end"`, `"error"` |
| `eventPrefix` | `string \| { name, separator? }` | — | Prefix for every event name in the JSON body. String form joins with `.`; object form allows a custom `separator` (default `.`) |
| `headers` | `Record<string, string>` | — | Extra headers merged into every request (after `Content-Type`) |
| `body` | `(event) => unknown` | identity | Maps an event to the request body (can be async). Return value is JSON-stringified as-is |

---

## Events

| Event | Fired from | `data` |
|-------|-----------|--------|
| `begin` | `onBegin` | `{ config, suite }` — config summary (rootDir, workers, version, projects) and total test count |
| `test.begin` | `onTestBegin` | `{ test, result }` — per-test summaries |
| `test.end` | `onTestEnd` | `{ test, result }` — per-test summaries, `result.errors` is an array of messages |
| `error` | `onError` | `{ error }` — errors **outside** tests (global setup, fixtures, worker teardown): message, stack, `location`, snippet |
| `end` | `onEnd` | `{ result, counts }` — run status/duration and per-status counters |

Send only what you need:

```typescript
["@playwright-labs/reporter-webhook", {
  url: process.env.WEBHOOK_URL,
  events: ["begin", "end"],
}],
```

Namespace the event names with `eventPrefix` — useful when several tools share one webhook endpoint:

```typescript
["@playwright-labs/reporter-webhook", {
  url: process.env.WEBHOOK_URL,
  eventPrefix: "playwright",                          // => "playwright.end"
  // or with a custom separator:
  eventPrefix: { name: "pw", separator: ":" },        // => "pw:end"
}],
```

The prefix only changes the serialized JSON body — the `events` filter and the `body` callback always work with the canonical names (`"end"`, `"test.end"`, …).

Payloads are JSON-safe summaries, not raw Playwright objects — `Suite`/`TestCase` contain circular references and cannot be serialized directly.

---

## Custom body

Use `body` to reshape the payload for your receiver (Slack, Discord, n8n, …):

```typescript
["@playwright-labs/reporter-webhook", {
  url: process.env.DISCORD_WEBHOOK_URL,
  events: ["end"],
  headers: { Authorization: `Bearer ${process.env.WEBHOOK_TOKEN}` },
  body: (event) => {
    if (event.event !== "end") return event;
    const { status } = event.data.result;
    const { passed, failed } = event.data.counts;
    return { content: `${status === "passed" ? "✅" : "❌"} passed: ${passed}, failed: ${failed}` };
  },
}],
```

The callback receives the fully-typed `WebhookEvent` union, so narrowing on `event.event` gives you the matching `data` shape.

---

## Error handling

Playwright only awaits `onEnd`, so deliveries from earlier hooks are fire-and-forget: the reporter tracks them and awaits everything in `onEnd`. A non-OK response or network error does not interrupt the run — it is rethrown from `onEnd` (a single failure as-is, multiple failures as an `AggregateError`).

---

## Environment variables

The reporter reads no environment variables itself — pass secrets through your config:

```typescript
url: process.env.WEBHOOK_URL,
```

---

## License

MIT
