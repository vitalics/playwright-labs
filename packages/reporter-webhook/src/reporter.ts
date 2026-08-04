import { BaseReporter } from "@playwright-labs/reporter-core";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from "@playwright/test/reporter";
import type {
  ConfigSummary,
  ErrorSummary,
  ResultSummary,
  TestSummary,
  WebhookEvent,
  WebhookEventName,
  WebhookOptions,
} from "./types.js";

const ALL_EVENTS: readonly WebhookEventName[] = [
  "begin",
  "end",
  "test.begin",
  "test.end",
  "error",
];

function summarizeConfig(config: FullConfig): ConfigSummary {
  return {
    rootDir: config.rootDir,
    workers: config.workers,
    version: config.version,
    projects: config.projects.map((project) => project.name),
  };
}

function summarizeTest(test: TestCase): TestSummary {
  return {
    id: test.id,
    title: test.title,
    titlePath: test.titlePath(),
    location: test.location,
    timeout: test.timeout,
    retries: test.retries,
    tags: test.tags,
  };
}

function summarizeResult(result: TestResult): ResultSummary {
  return {
    status: result.status,
    duration: result.duration,
    retry: result.retry,
    errors: result.errors.map((error) => error.message),
    attachments: result.attachments.length,
  };
}

function summarizeError(error: TestError): ErrorSummary {
  return {
    message: error.message,
    stack: error.stack,
    location: error.location,
    snippet: error.snippet,
  };
}

type CustomEvents = {
  request: [
    {
      url: string | URL;
      headers: Record<string, string>;
      method: string;
    },
  ];
  response: [
    {
      headers: Headers;
      ok: boolean;
      body: ReadableStream<any> | null;
      status: number;
      statusText: string;
    },
  ];
};

/**
 * Playwright reporter that POSTs lifecycle events to a webhook as JSON
 * `{ event, data }` bodies.
 *
 * Playwright only awaits `onEnd`, so sends from the earlier hooks are
 * fire-and-forget: their promises are tracked and awaited in `onEnd`, where
 * any delivery failure is rethrown.
 */
export default class WebhookReporter
  extends BaseReporter<CustomEvents>
  implements Reporter
{
  readonly #options: Readonly<WebhookOptions>;
  readonly #events: ReadonlySet<WebhookEventName>;
  readonly #pending: Promise<void>[] = [];
  readonly #failures: Error[] = [];

  constructor(options: WebhookOptions) {
    super();
    this.#options = options;
    this.#events = new Set(options.events ?? ALL_EVENTS);
    // EventEmitter throws when "error" is emitted without a listener —
    // guarantee one exists so onError can never crash the run.
    this.on("error", () => {});
  }

  onBegin(config: FullConfig, suite: Suite): void {
    super.onBegin(config, suite);
    this.#emit({
      event: "begin",
      data: {
        config: summarizeConfig(config),
        suite: { title: suite.title, totalTests: suite.allTests().length },
      },
    });
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    this.#emit({
      event: "test.begin",
      data: { test: summarizeTest(test), result: summarizeResult(result) },
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    super.onTestEnd(test, result);
    this.#emit({
      event: "test.end",
      data: { test: summarizeTest(test), result: summarizeResult(result) },
    });
  }

  onError(error: TestError): void {
    super.onError(error);
    this.#emit({ event: "error", data: { error: summarizeError(error) } });
  }

  async onEnd(result: FullResult): Promise<void> {
    this.#emit({
      event: "end",
      data: {
        result: {
          status: result.status,
          startTime: result.startTime,
          duration: result.duration,
        },
        counts: { ...this.counts },
      },
    });

    await Promise.all(this.#pending);

    if (this.#failures.length === 1) throw this.#failures[0];
    if (this.#failures.length > 1) {
      throw new AggregateError(
        this.#failures,
        `${this.#failures.length} webhook requests failed`,
      );
    }
  }

  #emit(event: WebhookEvent): void {
    if (!this.#events.has(event.event)) return;
    super.emit(event.event, ...(Object.values(event.data) as any));
    this.#pending.push(
      this.#post(event).catch((error: unknown) => {
        this.#failures.push(
          error instanceof Error ? error : new Error(String(error)),
        );
      }),
    );
  }

  #prefixedName(name: WebhookEventName): string {
    const prefix = this.#options.eventPrefix;
    if (!prefix) return name;
    if (typeof prefix === "string") return `${prefix}.${name}`;
    return `${prefix.name}${prefix.separator ?? "."}${name}`;
  }

  async #post(event: WebhookEvent): Promise<void> {
    const body = this.#options.body
      ? await this.#options.body(event)
      : { ...event, event: this.#prefixedName(event.event) };

    const headers = {
      "Content-Type": "application/json",
      ...this.#options.headers,
    };
    this.emit("request", {
      url: this.#options.url,
      method: "POST",
      headers: headers,
    });
    const response = await fetch(this.#options.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    this.emit("response", {
      ok: response.ok,
      headers: response.headers,
      body: response.body,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const text = await response.text().catch((reason) => reason);
      throw new Error(
        `Webhook request for event "${event.event}" failed (${response.status}): ${JSON.stringify(text)}`,
      );
    }
  }
}
