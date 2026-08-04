import { BaseReporter } from "@playwright-labs/reporter-core";
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

type MaybePromise<T> = Awaited<T> | Promise<Awaited<T>>;

export type InlineReporterOptions = {
  onBegin?: (config: FullConfig, suite: Suite) => MaybePromise<void>;
  /**
   * Playwright awaits the returned value — return `{ status }` to override
   * the run status, like a class reporter's `onEnd` can.
   */
  onEnd?: (
    result: FullResult,
  ) => MaybePromise<{ status?: FullResult["status"] } | undefined | void>;
  onError?: (error: TestError) => MaybePromise<void>;
  onExit?: () => MaybePromise<void>;
  onStepBegin?: (
    test: TestCase,
    result: TestResult,
    step: TestStep,
  ) => MaybePromise<void>;
  onStepEnd?: (
    test: TestCase,
    result: TestResult,
    step: TestStep,
  ) => MaybePromise<void>;
  onTestBegin?: (test: TestCase, result: TestResult) => MaybePromise<void>;
  onTestEnd?: (test: TestCase, result: TestResult) => MaybePromise<void>;
  onStdErr?: (
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ) => MaybePromise<void>;
  onStdOut?: (
    chunk: string | Buffer,
    test: void | TestCase,
    result: void | TestResult,
  ) => MaybePromise<void>;
  /** Whether this reporter uses stdio for reporting.
   *  When it does not, Playwright Test could add some output to enhance user experience.
   * If your reporter does not print to the terminal, it is strongly recommended to return `false`.
   */
  printsToStdio?: () => boolean;
  /**
   * Passed through to the underlying `EventEmitter`: routes async listener
   * rejections to the `error` event instead of crashing the process.
   * @default false
   */
  captureRejections?: boolean;
};

const noop = (...args: readonly any[]) => void 0;

/**
 * Build a Playwright reporter from plain callbacks instead of writing a
 * class — pass any subset of the lifecycle hooks as options.
 *
 * Most hooks are wired as listeners on the {@link BaseReporter} event
 * emitter. `onEnd` and `onExit` are real method overrides, because only
 * their results matter to Playwright: `onEnd` may return `{ status }` to
 * override the run status, and `onExit` is awaited.
 */
export default class InlineReporter extends BaseReporter implements Reporter {
  readonly #options: InlineReporterOptions;

  constructor(options: InlineReporterOptions = {}) {
    super({ captureRejections: options.captureRejections ?? false }, options);
    this.#options = options;
    this.on("begin", options.onBegin ?? noop);
    this.on("step.begin", options.onStepBegin ?? noop);
    this.on("step.end", options.onStepEnd ?? noop);
    this.on("stdErr", options.onStdErr ?? noop);
    this.on("stdOut", options.onStdOut ?? noop);
    this.on("test.begin", options.onTestBegin ?? noop);
    this.on("test.end", options.onTestEnd ?? noop);
    this.on("error", options.onError ?? noop);
  }

  override onEnd(
    result: FullResult,
  ): Promise<{ status?: FullResult["status"] } | undefined | void> | void {
    super.onEnd(result);
    return this.#options.onEnd?.(result) as
      | Promise<{ status?: FullResult["status"] } | undefined | void>
      | void;
  }

  override async onExit(): Promise<void> {
    await super.onExit();
    await this.#options.onExit?.();
  }

  printsToStdio(): boolean {
    return this.#options.printsToStdio?.() ?? false;
  }
}
