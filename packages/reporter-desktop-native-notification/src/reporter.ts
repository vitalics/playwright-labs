import type { FullResult, TestError } from "@playwright/test/reporter";
import {
  BaseReporter,
  type Template,
} from "@playwright-labs/reporter-core";

export type DesktopNotificationOptions = {
  /** When to send the run summary notification. @default 'always' */
  notifyOn?: "always" | "success" | "failure";
  /** Notification title. @default derived from run status, e.g. "Playwright — Failed" */
  title?: string;
  /**
   * Notification body: a static string or a template called with
   * `(result, testCases)` — same contract as reporter-email's `text`/`html`.
   * @default built-in counts summary, e.g. "✓ 12 passed, ✗ 2 failed in 45.3s"
   * @example
   * (result, testCases) =>
 *   `${result.status}: ${testCases.filter(([, r]) => r.status === 'failed').map(([t]) => t.title).join(', ')}`
   */
  message?: Template;
  /** Play the default notification sound. @default false */
  sound?: boolean;
  /** Path to a custom app icon. */
  icon?: string;
  /** Wait for the user to dismiss/click the notification. @default false */
  wait?: boolean;
  /** Seconds before the notification expires. @default 10 */
  timeout?: number;
  /** Send notifications when running in CI (process.env.CI is set). @default false */
  ci?: boolean;
  /** Also fire an immediate notification for each global onError. @default false */
  notifyOnError?: boolean;
};

export type NotificationPayload = {
  title: string;
  message: string;
  sound: boolean;
  wait: boolean;
  timeout: number;
  icon?: string;
};

type ResolvedOptions = Required<
  Omit<DesktopNotificationOptions, "title" | "message" | "icon">
> &
  Pick<DesktopNotificationOptions, "title" | "message" | "icon">;

const ERROR_MESSAGE_MAX_LENGTH = 200;

function statusLabel(status: string): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "flaky":
      return "Flaky";
    case "timedout":
      return "Timed out";
    case "interrupted":
      return "Interrupted";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export default class DesktopNotificationReporter extends BaseReporter {
  private readonly options: ResolvedOptions;

  constructor(options: DesktopNotificationOptions = {}) {
    super();
    this.options = {
      notifyOn: options.notifyOn ?? "always",
      title: options.title,
      message: options.message,
      sound: options.sound ?? false,
      icon: options.icon,
      wait: options.wait ?? false,
      timeout: options.timeout ?? 10,
      ci: options.ci ?? false,
      notifyOnError: options.notifyOnError ?? false,
    };
  }

  async onEnd(result: FullResult): Promise<void> {
    if (this.isCiBlocked()) return;
    if (!this.shouldNotifyFor(result.status)) return;

    const message =
      (await this.resolveTemplate(this.options.message, result)) ??
      this.buildSummaryMessage(result);

    await this.notify({
      title: this.options.title ?? `Playwright — ${statusLabel(result.status)}`,
      message,
      sound: this.options.sound,
      wait: this.options.wait,
      timeout: this.options.timeout,
      ...(this.options.icon ? { icon: this.options.icon } : {}),
    });
  }

  async onError(error: TestError): Promise<void> {
    if (!this.options.notifyOnError) return;
    if (this.isCiBlocked()) return;

    const raw = error.message ?? "";
    const message =
      raw.length > ERROR_MESSAGE_MAX_LENGTH
        ? raw.slice(0, ERROR_MESSAGE_MAX_LENGTH)
        : raw;

    await this.notify({
      title: "Playwright — Error",
      message,
      sound: this.options.sound,
      wait: this.options.wait,
      timeout: this.options.timeout,
      ...(this.options.icon ? { icon: this.options.icon } : {}),
    });
  }

  /**
   * The only place that touches node-notifier. Every error is swallowed — a
   * notification failure must never fail the test run.
   */
  protected async notify(payload: NotificationPayload): Promise<void> {
    const { title, message, sound, wait, timeout, icon } = payload;
    try {
      const { default: notifier } = await import("node-notifier");
      notifier.notify({
        title,
        message,
        sound,
        wait,
        timeout,
        ...(icon && { icon }),
      });
    } catch (error) {
      console.warn(
        `[reporter-desktop-native-notification] failed to send notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private isCiBlocked(): boolean {
    return process.env.CI !== undefined && !this.options.ci;
  }

  private shouldNotifyFor(status: FullResult["status"]): boolean {
    switch (this.options.notifyOn) {
      case "failure":
        return status !== "passed";
      case "success":
        return status === "passed";
      case "always":
      default:
        return true;
    }
  }

  private buildSummaryMessage(result: FullResult): string {
    const seconds = (result.duration / 1000).toFixed(1);
    const total =
      this.counts.passed +
      this.counts.failed +
      this.counts.timedOut +
      this.counts.skipped +
      this.counts.interrupted;
    if (total === 0) {
      return `No tests run in ${seconds}s`;
    }
    const parts = [`✓ ${this.counts.passed} passed`];
    if (this.counts.failed > 0) parts.push(`✗ ${this.counts.failed} failed`);
    if (this.counts.timedOut > 0)
      parts.push(`⏱ ${this.counts.timedOut} timed out`);
    if (this.counts.skipped > 0)
      parts.push(`⊘ ${this.counts.skipped} skipped`);
    if (this.counts.interrupted > 0)
      parts.push(`⚠ ${this.counts.interrupted} interrupted`);
    return `${parts.join(", ")} in ${seconds}s`;
  }
}
