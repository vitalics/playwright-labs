# @playwright-labs/reporter-core

Base reporter class and shared types for the `@playwright-labs/reporter-*` packages — one unified API instead of every reporter re-implementing test-case accumulation and static-or-template option resolution.

> You usually don't need this package directly. It is a dependency of the reporter packages — install the reporter you want ([reporter-otel](https://www.npmjs.com/package/@playwright-labs/reporter-otel), [reporter-slack](https://www.npmjs.com/package/@playwright-labs/reporter-slack), [reporter-email](https://www.npmjs.com/package/@playwright-labs/reporter-email), …) and it comes along. Use it directly when **writing your own reporter**.

## Install

```bash
npm i -D @playwright-labs/reporter-core
```

## What it provides

| Export | Purpose |
|---|---|
| `BaseReporter` | Abstract `Reporter` implementation: accumulates `TestCases` in `onTestEnd`, keeps per-status `counts`, stores `config`, resolves `Template` options, `printsToStdio() === false` |
| `TestCases` | `[test: TestCase, result: TestResult][]` — every finished test with its result, in execution order |
| `Template<T>` | `T \| ((result: FullResult, testCases: TestCases) => T \| Promise<T>)` — static value or dynamic template |
| `StatusCounts` | `{ passed, failed, timedOut, skipped, interrupted }` |
| `isExpectPollStep` | Detects `expect.poll` / `toPass` steps (by title or by expect-category child attempt steps) |
| `getExpectPollInfo` | Returns `{ attempts, outcome: "pass" \| "timeout" }` for a poll step, `null` otherwise — used by reporters to export `expect_poll_*` metrics |

## Writing your own reporter

```ts
import { BaseReporter, type Template } from "@playwright-labs/reporter-core";
import type { FullConfig, FullResult, Suite, TestCase, TestResult } from "@playwright/test/reporter";

type Options = {
  webhookUrl: string;
  /** static text or a dynamic template */
  text?: Template;
};

export default class MyReporter extends BaseReporter {
  constructor(private readonly options: Options) {
    super();
  }

  // Always call the super hooks when overriding — accumulation depends on them.
  override onBegin(config: FullConfig, suite: Suite): void {
    super.onBegin(config, suite);
    // your setup (SDKs, connections, …)
  }

  override onTestEnd(test: TestCase, result: TestResult): void {
    super.onTestEnd(test, result);
    // your per-test logic (metrics, spans, …)
  }

  async onEnd(result: FullResult): Promise<void> {
    const text = await this.resolveTemplate(this.options.text, result);
    await fetch(this.options.webhookUrl, {
      method: "POST",
      body: JSON.stringify({
        text: text ?? `${this.counts.passed} passed, ${this.counts.failed} failed`,
      }),
    });
  }
}
```

`resolveTemplate(value, result)` calls `value(result, this.testCases)` when the option is a function (awaiting promises) and returns it unchanged otherwise — the same `(result, testCases)` contract that `reporter-email` and `reporter-slack` use for their `html`/`text`/`blocks` templates.

## License

MIT
