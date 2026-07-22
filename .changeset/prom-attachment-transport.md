---
"@playwright-labs/prometheus-core": minor
"@playwright-labs/fixture-prometheus": minor
"@playwright-labs/reporter-prometheus-remote-write": minor
---

Silence the `prometheus-remote-writer` transport lines in console output.

Metric events emitted inside a test now travel from workers to the reporter
via `testInfo.attachments` instead of stdout, so terminal reporters (`list`,
`line`, `dot`) no longer echo raw single-line JSON events.

- **`@playwright-labs/prometheus-core`** — `Event` gains a pluggable writer
  (`Event.setWriter`), an attachment decoder (`Event.fromAttachment`) and the
  `PROM_ATTACHMENT_NAME` constant; `Metric.collect()` now emits through
  `Event.emit()`. Without an installed writer, `emit()` still falls back to
  single-line JSON on stdout, so events emitted outside a test context keep
  working.
- **`@playwright-labs/fixture-prometheus`** — an internal auto fixture
  installs the attachment writer for the duration of every test; all public
  fixtures depend on it so teardown flushes stay on the silent channel.
- **`@playwright-labs/reporter-prometheus-remote-write`** — decodes transport
  attachments in `onTestEnd` and forwards them to the remote-write endpoint
  (the `onStdOut` path is kept for backward compatibility); transport
  attachments are excluded from `pw_test_attachment_*` series and the
  `attachmentsCount` label.
