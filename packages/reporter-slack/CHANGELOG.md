# @playwright-labs/reporter-slack

## 1.0.2

### Patch Changes

- Updated dependencies [2c8022d]
  - @playwright-labs/reporter-core@1.1.0

## 1.0.1

### Patch Changes

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

- Updated dependencies [e5fb985]
  - @playwright-labs/reporter-core@1.0.0

## 1.0.0

### Major Changes

- ef1c638: First release of `@playwright-labs/reporter-slack`.

  A Playwright reporter that sends rich, interactive Slack notifications at the end of every test run. Built on top of `@playwright-labs/slack-buildkit` — messages are composed as JSX and serialised to Block Kit JSON.

  **Reporter** (`import SlackReporter from "@playwright-labs/reporter-slack"`):
  - Plug-and-play Playwright reporter: add to `playwright.config.ts` under `reporter`
  - Supports **Incoming Webhook** and **Web API** (`chat.postMessage`) transports — auto-detected from config shape
  - Accepts a static Block Kit payload, a synchronous template function, or an async factory for full control over message content

  **Built-in templates** (`import { ... } from "@playwright-labs/reporter-slack/templates"`):
  - **`BaseTemplate`** — header with run status emoji, failed-test list (up to 10), optional "View Report" button, and a context footer
  - **`WithOptionsTemplate`** — groups tests by status (failed / timed-out / skipped / passed) with per-group counts and inline error messages; includes an interactive `static_select` filter and an optional "View Report" button; configurable via `show`, `maxPerStatus`, and `showTestNames`
  - **`WithTableTemplate`** — renders a `Record<string, string | undefined>` of environment variables as a GFM markdown table using `<Table>/<Tr>/<Th>/<Td>`; sensitive keys (TOKEN, SECRET, PASSWORD, API_KEY, AUTH, CREDENTIAL …) are auto-masked by default; supports custom mask lists and per-chunk row limits

### Patch Changes

- Updated dependencies [ef1c638]
  - @playwright-labs/slack-buildkit@1.0.0
