---
"@playwright-labs/reporter-core": minor
"@playwright-labs/reporter-otel": minor
"@playwright-labs/reporter-prometheus-remote-write": minor
---

Feature: auto-instrumented `expect.poll` / `expect().toPass()` metrics in both reporters.

Playwright reports a poll as an `expect`-category step whose children are the individual poll attempts — so occurrence, attempt counts, total duration, and outcome are all available to the reporter with zero test-code changes.

New metrics (same names in both reporters, `pw_` prefix):

- `expect_poll_total` (counter, `outcome=pass|timeout`) — how many polls ran and how they ended
- `expect_poll_attempts` — attempts per poll (child steps when reported; 1 for `toPass`)
- `expect_poll_duration` — total polling time per assertion (ms)

`reporter-core` exports the shared detectors used by both reporters:

```ts
import { isExpectPollStep, getExpectPollInfo } from "@playwright-labs/reporter-core";

getExpectPollInfo(step); // { attempts: 3, outcome: "pass" } | null
```
