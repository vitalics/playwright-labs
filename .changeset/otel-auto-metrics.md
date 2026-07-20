---
"@playwright-labs/reporter-otel": minor
---

Feature: broader auto-instrumentation — parity with the Prometheus remote-write reporter.

New built-in metrics (no code changes required in tests):

- `pw_test_step_count` (counter, attrs `test.step.category`, `test.suite`, project/browser) and `pw_test_step_duration` (histogram, ms) — recorded for every Playwright step, nested steps included.
- `pw_test_annotation_count` (counter, attrs `annotation.type`, `test.suite`) — one series per annotation.
- `pw_run_duration` (histogram, ms) — wall-clock duration of the whole run, recorded at `onEnd`.

New resource attributes on every signal (traces + metrics):

- `nodejs.versions.*` — full Node.js component versions (`nodejs.versions.node`, `nodejs.versions.v8`, `nodejs.versions.openssl`, …), alongside the existing `process.runtime.version`.

Reminder of what was already auto-collected: `pw_tests_total` (per status/result/suite/project), `pw_test_duration`, `pw_test_retries`, `pw_test_attachment_count` / `pw_test_attachment_size`, `pw_test_error_count`, Node.js memory/CPU gauges, OS/host/playwright-config resource attributes, and opt-in `env.<key>` attributes via the `env` option.
