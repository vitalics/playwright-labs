import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import EventEmitter from "node:events";

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
  T | ((result: FullResult, testCases: TestCases) => T | Promise<T>);

/** Per-status test counters accumulated by {@link BaseReporter}. */
export type StatusCounts = {
  passed: number;
  failed: number;
  timedOut: number;
  skipped: number;
  interrupted: number;
};

type PickFromReporter<Method extends keyof Reporter> = Required<
  Pick<Reporter, Method>
>;

type ReporterEvents = {
  begin: [config: FullConfig, _suite: Suite];
  "test.begin": [test: TestCase, result: TestResult];
  "step.begin": [test: TestCase, result: TestResult, step: TestStep];
  "step.end": [test: TestCase, result: TestResult, step: TestStep];
  "test.end": [test: TestCase, result: TestResult];
  "reporter.init": [...args: readonly any[]];
  "reporter.dispose": [];
  result: [FullResult];
  error: [error: TestError];
  exit: [];
  stdErr: [
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ];
  stdOut: [
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ];
  end: [result: FullResult];
};

type BaseReporterOptions = {
  captureRejections: boolean;
};

type EMPTY_OBJECT = {};
type IsEmptyObject<T> = [keyof T] extends [keyof EMPTY_OBJECT] ? true : false;

type EventMap<T> = Record<keyof T, any[]>;
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
 * @extends EventEmitter
 *
 * Extends node.js `EventEmitter`, so you can pass own object for `reporter.init` arguments
 * @example
 * ```ts
 * // filename: demo.ts
 * export default class MyReporter extends BaseReporter {
 *   async onEnd(result: FullResult) {
 *     const text = await this.resolveTemplate(this.options.text, result);
 *     await send({ text });
 *   }
 * }
 * ```
 *  @example
 * ```ts
 * // filename: custom-expose.ts
 * type OwnOptions = {someProp: boolean}
 * export default class MyReporter extends BaseReporter {
 *   constructor(options: OwnOptions) {
 *     super({captureRejections: false}, options) // note: options will appear in `reporter.init` event
 *   }
 * }
 * ```
 */
export abstract class BaseReporter<
  const AdditionalEvents extends Record<string | symbol, readonly unknown[]> =
    {},
  const Merged extends Record<string | symbol, readonly unknown[]> =
    AdditionalEvents & ReporterEvents,
>
  extends EventEmitter<
    EventMap<Omit<AdditionalEvents, keyof ReporterEvents> & ReporterEvents>
  >
  implements Reporter
{
  /** typescript type, not a real prop */
  _mergedEvents!: Merged;
  /** typescript type, not a real prop */
  _additionalEvents!: AdditionalEvents;
  /** typescript type, not a real prop */
  _reporterEvents!: ReporterEvents;
  // @ts-expect-error fix later
  override emit<const K extends string | symbol | keyof Merged = keyof Merged>(
    eventName: K,
    ...args: Merged[K] extends unknown[] ? Merged[K] : [Merged[K]]
  ): boolean {
    return super.emit(eventName as string, ...(args as never));
  }
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

  constructor(options?: BaseReporterOptions, ...args: any[]) {
    super({ captureRejections: options?.captureRejections ?? false });
    // @ts-expect-error fix later
    this.emit("reporter.init", args);
  }

  [Symbol.dispose]() {
    // @ts-expect-error fix later
    this.emit("reporter.dispose");
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.testCases.length = 0;
    this.counts.passed = 0;
    this.counts.failed = 0;
    this.counts.timedOut = 0;
    this.counts.skipped = 0;
    this.counts.interrupted = 0;
    // @ts-expect-error fix later
    this.emit("begin", config, _suite);
  }

  onEnd(
    result: FullResult,
  ): Promise<{ status?: FullResult["status"] } | undefined | void> | void {
    // @ts-expect-error fix later
    this.emit("end", result);
  }
  onError(error: TestError): void {
    // @ts-expect-error fix later
    this.emit("error", error);
  }
  async onExit(): Promise<void> {
    // @ts-expect-error fix later
    this.emit("exit");
  }
  onStdErr(
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ): void {
    // @ts-expect-error fix later
    this.emit("stdErr", chunk, test, result);
  }
  onStdOut(
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ): void {
    // @ts-expect-error fix later
    this.emit("stdOut", chunk, test, result);
  }
  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    // @ts-expect-error fix later
    this.emit("step.begin", test, result, step);
  }
  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    // @ts-expect-error fix later
    this.emit("step.end", test, result, step);
  }
  onTestBegin(test: TestCase, result: TestResult): void {
    // @ts-expect-error fix later
    this.emit("test.begin", test, result);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // @ts-expect-error fix later
    this.emit("test.end", test, result);
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
      return (
        value as (result: FullResult, testCases: TestCases) => T | Promise<T>
      )(result, this.testCases);
    }
    return value;
  }

  printsToStdio(): boolean {
    return false;
  }
}
