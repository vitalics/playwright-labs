---
"@playwright-labs/otel-core": minor
"@playwright-labs/fixture-otel": minor
"@playwright-labs/reporter-otel": minor
---

Silence the `__pw_otel__` transport lines in console output.

Metric and span events emitted inside a test now travel from workers to the
reporter via `testInfo.attachments` instead of stdout, so terminal reporters
(`list`, `line`, `dot`) no longer echo raw `__pw_otel__{...}` JSON lines.

- **`@playwright-labs/otel-core`** — `OtelEvent` gains a pluggable writer
  (`OtelEvent.setWriter`), an attachment decoder (`OtelEvent.fromAttachment`)
  and the `OTEL_ATTACHMENT_NAME` constant. Without an installed writer,
  `emit()` still falls back to prefixed stdout lines, so events emitted
  outside a test context keep working.
- **`@playwright-labs/fixture-otel`** — an internal auto fixture installs the
  attachment writer for the duration of every test; all public fixtures
  depend on it so teardown flushes stay on the silent channel.
- **`@playwright-labs/reporter-otel`** — decodes transport attachments in
  `onTestEnd` (the `onStdOut` path is kept for backward compatibility) and
  excludes them from `test.attachments_count` and attachment metrics.
