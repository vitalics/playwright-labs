import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

/**
 * Array of test cases with their results, collected over the run.
 * This is an array of tuples so it is easy to build tables from it.
 */
export type TestCases = [test: TestCase, result: TestResult][];

/**
 * A static value or a template function producing it dynamically from the
 * run result and all collected {@link TestCases}.
 *
 * @example
 * ```ts
 * const subject: Template = (result) => `Playwright report — ${result.status}`;
 * const table: Template = (result, testCases) =>
 *   testCases.map(([test, r]) => `${test.title}: ${r.status}`).join("\n");
 * ```
 */
export type Template<T = string> =
  | T
  | ((result: FullResult, testCases: TestCases) => T | Promise<T>);

/** Per-status test counters accumulated by {@link BaseReporter}. */
export type StatusCounts = {
  passed: number;
  failed: number;
  timedOut: number;
  skipped: number;
  interrupted: number;
};

/**
 * Base class for Playwright reporters — the unified API shared by all
 * `@playwright-labs/reporter-*` packages.
 *
 * It implements the boilerplate every reporter needs:
 *
 * - accumulates {@link TestCases} in `onTestEnd` (available to template
 *   callbacks via {@link BaseReporter.testCases})
 * - counts per-status results in {@link BaseReporter.counts}
 * - stores the {@link FullConfig} in {@link BaseReporter.config}
 * - resolves static-or-template option values via {@link BaseReporter.resolveTemplate}
 * - returns `false` from `printsToStdio()`
 *
 * Subclasses MUST call `super.onBegin(config, suite)` and
 * `super.onTestEnd(test, result)` when overriding those hooks,
 * otherwise the accumulation silently stops working.
 *
 * @example
 * ```ts
 * export default class MyReporter extends BaseReporter {
 *   async onEnd(result: FullResult) {
 *     const text = await this.resolveTemplate(this.options.text, result);
 *     await send({ text });
 *   }
 * }
 * ```
 */
export abstract class BaseReporter implements Reporter {
  /** Every finished test with its result, in execution order. */
  protected readonly testCases: TestCases = [];
  /** Per-status counters, updated in `onTestEnd`. */
  protected readonly counts: StatusCounts = {
    passed: 0,
    failed: 0,
    timedOut: 0,
    skipped: 0,
    interrupted: 0,
  };
  /** The resolved Playwright config, available after `onBegin`. */
  protected config: FullConfig | undefined;

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.testCases.length = 0;
    this.counts.passed = 0;
    this.counts.failed = 0;
    this.counts.timedOut = 0;
    this.counts.skipped = 0;
    this.counts.interrupted = 0;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.testCases.push([test, result]);
    switch (result.status) {
      case "passed":
        this.counts.passed++;
        break;
      case "failed":
        this.counts.failed++;
        break;
      case "timedOut":
        this.counts.timedOut++;
        break;
      case "skipped":
        this.counts.skipped++;
        break;
      case "interrupted":
        this.counts.interrupted++;
        break;
    }
  }

  /**
   * Resolves a {@link Template} option: calls it with `(result, testCases)`
   * when it is a function (awaiting promises), returns it as-is otherwise.
   * `undefined` passes through.
   */
  protected async resolveTemplate<T>(
    value: Template<T> | undefined,
    result: FullResult,
  ): Promise<T | undefined> {
    if (value === undefined) return undefined;
    if (typeof value === "function") {
      return (value as (result: FullResult, testCases: TestCases) => T | Promise<T>)(
        result,
        this.testCases,
      );
    }
    return value;
  }

  printsToStdio(): boolean {
    return false;
  }
}
