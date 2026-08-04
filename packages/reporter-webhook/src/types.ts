import type { StatusCounts } from "@playwright-labs/reporter-core";
import type {
  FullResult,
  Location,
  TestResult,
} from "@playwright/test/reporter";

/** Lifecycle events the reporter can send to the webhook. */
export type WebhookEventName =
  | "begin"
  | "end"
  | "test.begin"
  | "test.end"
  | "error";

/** JSON-safe summary of the resolved Playwright config. */
export type ConfigSummary = {
  rootDir: string;
  workers: number;
  version: string;
  projects: string[];
};

/** JSON-safe summary of the root suite. */
export type SuiteSummary = {
  title: string;
  totalTests: number;
};

/** JSON-safe summary of a test case. */
export type TestSummary = {
  id: string;
  title: string;
  titlePath: string[];
  location?: Location;
  timeout: number;
  retries: number;
  tags: string[];
};

/** JSON-safe summary of a test result. */
export type ResultSummary = {
  status: TestResult["status"];
  duration: number;
  retry: number;
  errors: (string | undefined)[];
  attachments: number;
};

/** JSON-safe summary of the whole run. */
export type RunSummary = {
  status: FullResult["status"];
  startTime: Date;
  duration: number;
};

/**
 * JSON-safe summary of an error raised outside a test (global setup,
 * fixtures, worker teardown, …). `location` points at the source file
 * when Playwright could attribute it.
 */
export type ErrorSummary = {
  message?: string;
  stack?: string;
  location?: Location;
  snippet?: string;
};

/**
 * A single webhook delivery: `{ event, data }` — the JSON body POSTed to the
 * webhook URL (unless overridden via {@link WebhookOptions.body}).
 */
export type WebhookEvent =
  | { event: "begin"; data: { config: ConfigSummary; suite: SuiteSummary } }
  | { event: "end"; data: { result: RunSummary; counts: StatusCounts } }
  | { event: "test.begin"; data: { test: TestSummary; result: ResultSummary } }
  | { event: "test.end"; data: { test: TestSummary; result: ResultSummary } }
  | { event: "error"; data: { error: ErrorSummary } };

export type WebhookOptions = {
  /** Webhook URL — every enabled event is POSTed here as JSON. */
  url: string | URL;
  /** Events to send. Defaults to all: begin, end, test.begin, test.end. */
  events?: WebhookEventName[];
  /**
   * custom prefix for every event. Automatically adds `.`(dot) to separate or pass the object with custom separator
   * @default ''
   * @example
   * {eventPrefix: 'webhookReporter'} => {event: 'webhookReporter.test.end'}
   */
  eventPrefix?: string | { name: string; separator?: string };
  /** Extra headers merged into every request (after Content-Type). */
  headers?: Record<string, string>;
  /**
   * Maps an event to the request body. Return value is JSON-stringified
   * as-is. Defaults to sending the {@link WebhookEvent} itself.
   */
  body?: (event: WebhookEvent) => unknown | Promise<unknown>;
  /**
   * It enables automatic capturing of promise rejection.
   * @default false
   */
  captureRejections?: boolean;
};
