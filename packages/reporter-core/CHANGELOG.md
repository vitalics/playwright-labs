# @playwright-labs/reporter-core

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
