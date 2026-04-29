import type { SlackBlock, SlackMessage } from "@playwright-labs/slack-buildkit";
import { render } from "@playwright-labs/slack-buildkit";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import type { SlackReporterOptions, SlackSendResponse, SlackTestCases } from "./types.js";

function isSlackMessage(value: SlackBlock[] | SlackMessage): value is SlackMessage {
  return !Array.isArray(value) && typeof value === "object" && "blocks" in value;
}

export default class SlackReporter implements Reporter {
  readonly #options: Readonly<SlackReporterOptions>;
  readonly #testCases: SlackTestCases = [];

  constructor(options: SlackReporterOptions) {
    this.#options = options;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.#testCases.push([test, result]);
  }

  async onEnd(result: FullResult): Promise<void> {
    const send = this.#options.send ?? "on-failure";
    if (send === "never") return;
    if (send === "on-failure" && result.status !== "failed") return;

    const payload = await this.#resolvePayload(result);
    const text = await this.#resolveText(result);
    if (text) payload.text = payload.text ?? text;

    const response = await this.#send(payload);

    if (this.#options.onSend) {
      await this.#options.onSend(response);
    }
  }

  async #resolvePayload(result: FullResult): Promise<SlackMessage> {
    const raw =
      typeof this.#options.blocks === "function"
        ? await this.#options.blocks(result, this.#testCases)
        : this.#options.blocks;

    if (isSlackMessage(raw)) {
      return { ...raw, blocks: render(raw.blocks ?? []) };
    }

    return { blocks: render(raw) };
  }

  async #resolveText(result: FullResult): Promise<string | undefined> {
    if (!this.#options.text) return undefined;
    if (typeof this.#options.text === "function") {
      return this.#options.text(result, this.#testCases);
    }
    return this.#options.text;
  }

  async #send(payload: SlackMessage): Promise<SlackSendResponse> {
    if ("webhookUrl" in this.#options) {
      return this.#sendWebhook(this.#options.webhookUrl, payload);
    }
    return this.#sendWebApi(this.#options.token, this.#options.channel, payload);
  }

  async #sendWebhook(url: string, payload: SlackMessage): Promise<SlackSendResponse> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Slack webhook request failed (${res.status}): ${body}`);
    }

    return { ok: true };
  }

  async #sendWebApi(
    token: string,
    channel: string,
    payload: SlackMessage,
  ): Promise<SlackSendResponse> {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...payload, channel }),
    });

    const data = (await res.json()) as { ok: boolean; ts?: string; channel?: string; error?: string };

    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
    }

    return { ok: true, ts: data.ts, channel: data.channel };
  }
}
