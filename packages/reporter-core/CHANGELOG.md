# @playwright-labs/reporter-core

## 1.1.0

### Minor Changes

- 2c8022d: Feature: auto-instrumented `expect.poll` / `expect().toPass()` metrics in both reporters.

  Playwright reports a poll as an `expect`-category step whose children are the individual poll attempts — so occurrence, attempt counts, total duration, and outcome are all available to the reporter with zero test-code changes.

  New metrics (same names in both reporters, `pw_` prefix):
  - `expect_poll_total` (counter, `outcome=pass|timeout`) — how many polls ran and how they ended
  - `expect_poll_attempts` — attempts per poll (child steps when reported; 1 for `toPass`)
  - `expect_poll_duration` — total polling time per assertion (ms)

  `reporter-core` exports the shared detectors used by both reporters:

  ```ts
  import {
    isExpectPollStep,
    getExpectPollInfo,
  } from "@playwright-labs/reporter-core";

  getExpectPollInfo(step); // { attempts: 3, outcome: "pass" } | null
  ```

## 1.0.0

### Major Changes

- e5fb985: First release of `@playwright-labs/reporter-core` — the unified base for all `@playwright-labs/reporter-*` packages.
  - `BaseReporter` — accumulates `TestCases` (`[test, result][]`) in `onTestEnd`, keeps per-status `counts`, stores `config`, resolves `Template` options (`T | ((result, testCases) => T | Promise<T>)`, the same `(result, testCases)` contract that reporter-email/reporter-slack templates use), `printsToStdio() === false`.
  - All reporter packages now extend `BaseReporter` instead of re-implementing accumulation (internal refactor — `NodemailerTestCases`/`SlackTestCases` remain as aliases of `TestCases`; no behavior changes).
  - `reporter-desktop-native-notification`: new `message` option — static string or a `(result, testCases)` template, overriding the built-in counts summary.

  ```ts
  import { BaseReporter, type Template } from "@playwright-labs/reporter-core";

  export default class MyReporter extends BaseReporter {
    override onTestEnd(test, result) {
      super.onTestEnd(test, result); // keep the accumulation working
      // …your per-test logic
    }

    async onEnd(result) {
      const text = await this.resolveTemplate(this.options.text, result);
      // …send
    }
  }
  ```
