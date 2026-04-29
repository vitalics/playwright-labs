import { test, expect } from "@playwright/test";
import type { FullResult, TestCase, TestResult } from "@playwright/test/reporter";
import SlackReporter from "../src/reporter";
import type { SlackReporterOptions, SlackSendResponse } from "../src/types";
import { header, divider, section } from "@playwright-labs/slack-buildkit";

const mockResult: FullResult = {
  status: "failed",
  duration: 5000,
  startTime: new Date(),
};

const passedResult: FullResult = { ...mockResult, status: "passed" };

function makeReporter(
  options: Partial<SlackReporterOptions>,
  extra: { webhookUrl?: string; token?: string; channel?: string } = {},
) {
  return new SlackReporter({
    webhookUrl: extra.webhookUrl ?? "https://hooks.slack.com/stub",
    blocks: [header("Test"), divider()],
    ...options,
  } as SlackReporterOptions);
}

/** Subclass that stubs HTTP calls — records what payload was sent */
class StubReporter extends SlackReporter {
  readonly sentPayloads: object[] = [];
  readonly sendResponses: SlackSendResponse[] = [];

  // Access private method via prototype patching at construction time
  constructor(options: SlackReporterOptions) {
    super(options);
    // Override the private #send by patching the prototype method exposed via the closure
    (this as any)._stubSend = async (payload: object): Promise<SlackSendResponse> => {
      this.sentPayloads.push(payload);
      const resp: SlackSendResponse = { ok: true };
      this.sendResponses.push(resp);
      return resp;
    };
  }
}

/**
 * Reporter that overrides the actual fetch calls by replacing the internal
 * transport methods on the instance via a subclass trick.
 */
class FetchStubReporter extends SlackReporter {
  readonly capturedBodies: object[] = [];
  readonly capturedUrls: string[] = [];
  #onSendCalled = false;

  get onSendCalled() {
    return this.#onSendCalled;
  }

  protected async sendWebhook(url: string, payload: object): Promise<SlackSendResponse> {
    this.capturedUrls.push(url);
    this.capturedBodies.push(payload);
    return { ok: true };
  }

  protected async sendWebApi(_token: string, _channel: string, payload: object): Promise<SlackSendResponse> {
    this.capturedBodies.push(payload);
    return { ok: true, ts: "111.222", channel: "C123" };
  }
}

// ---------------------------------------------------------------------------
// Helper to build a realistic test case pair
// ---------------------------------------------------------------------------

function makeTestCase(
  title: string,
  status: TestResult["status"] = "failed",
): [TestCase, TestResult] {
  return [
    {
      id: title,
      title,
      titlePath: () => ["Suite", title],
      titleWithRetries: () => title,
    } as unknown as TestCase,
    {
      status,
      duration: 1234,
      errors: status === "failed" ? [{ message: `Expected true but got false` }] : [],
      retry: 0,
      startTime: new Date(),
      attachments: [],
      steps: [],
      workerIndex: 0,
      parallelIndex: 0,
      stderr: [],
      stdout: [],
    } as unknown as TestResult,
  ];
}

// ---------------------------------------------------------------------------
// send option
// ---------------------------------------------------------------------------

test.describe("send option", () => {
  test("never — onEnd does nothing", async () => {
    let called = false;
    const reporter = makeReporter({ send: "never", onSend: () => { called = true; } });
    await reporter.onEnd(mockResult);
    expect(called).toBe(false);
  });

  test("on-failure (default) — skips when status is passed", async () => {
    let called = false;
    const reporter = makeReporter({ onSend: () => { called = true; } });
    await reporter.onEnd(passedResult);
    expect(called).toBe(false);
  });

  test("on-failure — fires when status is failed", async () => {
    let called = false;
    const reporter = makeReporter({ send: "on-failure", onSend: () => { called = true; } });

    // intercept fetch at global level
    const original = global.fetch;
    global.fetch = async () => ({ ok: true, text: async () => "ok" } as Response);
    try {
      await reporter.onEnd(mockResult);
      expect(called).toBe(true);
    } finally {
      global.fetch = original;
    }
  });

  test("always — fires even when status is passed", async () => {
    let called = false;
    const reporter = makeReporter({ send: "always", onSend: () => { called = true; } });

    const original = global.fetch;
    global.fetch = async () => ({ ok: true, text: async () => "ok" } as Response);
    try {
      await reporter.onEnd(passedResult);
      expect(called).toBe(true);
    } finally {
      global.fetch = original;
    }
  });
});

// ---------------------------------------------------------------------------
// blocks resolution
// ---------------------------------------------------------------------------

test.describe("blocks resolution", () => {
  test("static block array becomes message payload", async () => {
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: [header("Hi"), divider()],
      send: "always",
    });

    let captured: object | null = null;
    const original = global.fetch;
    global.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect((captured as any).blocks).toHaveLength(2);
    expect((captured as any).blocks[0].type).toBe("header");
  });

  test("function blocks are called with result and testCases", async () => {
    const received: any[] = [];
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: (result, testCases) => {
        received.push({ result, testCases });
        return [section(`Status: ${result.status}`)];
      },
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async () => ({ ok: true, text: async () => "ok" } as Response);
    try {
      reporter.onTestEnd(...makeTestCase("my test", "passed"));
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(received).toHaveLength(1);
    expect(received[0].result.status).toBe("passed");
    expect(received[0].testCases).toHaveLength(1);
  });

  test("async function blocks are awaited", async () => {
    let captured: object | null = null;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: async () => [header("Async header")],
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect((captured as any).blocks[0].text.text).toBe("Async header");
  });

  test("SlackMessage payload is preserved and blocks are rendered", async () => {
    let captured: object | null = null;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: { blocks: [header("From message")], text: "fallback" },
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect((captured as any).text).toBe("fallback");
    expect((captured as any).blocks[0].type).toBe("header");
  });
});

// ---------------------------------------------------------------------------
// text option
// ---------------------------------------------------------------------------

test.describe("text option", () => {
  test("static text is added to payload", async () => {
    let captured: any = null;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: [divider()],
      text: "Playwright report",
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(captured.text).toBe("Playwright report");
  });

  test("function text is called with result", async () => {
    let captured: any = null;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: [divider()],
      text: (r) => `Status: ${r.status}`,
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(mockResult);
    } finally {
      global.fetch = original;
    }

    expect(captured.text).toBe("Status: failed");
  });
});

// ---------------------------------------------------------------------------
// Transport: webhook vs Web API
// ---------------------------------------------------------------------------

test.describe("webhook transport", () => {
  test("POSTs to webhookUrl with JSON body", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/my-hook",
      blocks: [header("Hi")],
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedHeaders = Object.fromEntries(
        Object.entries(init?.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
      );
      return { ok: true, text: async () => "ok" } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(capturedUrl).toBe("https://hooks.slack.com/my-hook");
    expect(capturedHeaders["content-type"]).toBe("application/json");
  });

  test("throws when webhook returns non-ok status", async () => {
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/bad",
      blocks: [divider()],
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async () =>
      ({ ok: false, status: 403, text: async () => "no_permission" } as unknown as Response);
    try {
      await expect(reporter.onEnd(passedResult)).rejects.toThrow("403");
    } finally {
      global.fetch = original;
    }
  });
});

test.describe("Web API transport", () => {
  test("POSTs to chat.postMessage with Authorization header", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    let capturedBody: any = null;

    const reporter = new SlackReporter({
      token: "xoxb-test-token",
      channel: "C12345",
      blocks: [header("Web API test")],
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedAuth = (init?.headers as Record<string, string>)?.["Authorization"] ?? "";
      capturedBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        json: async () => ({ ok: true, ts: "123.456", channel: "C12345" }),
      } as Response;
    };
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(capturedUrl).toBe("https://slack.com/api/chat.postMessage");
    expect(capturedAuth).toBe("Bearer xoxb-test-token");
    expect(capturedBody.channel).toBe("C12345");
    expect(capturedBody.blocks[0].type).toBe("header");
  });

  test("throws when Web API returns ok: false", async () => {
    const reporter = new SlackReporter({
      token: "xoxb-bad",
      channel: "C1",
      blocks: [divider()],
      send: "always",
    });

    const original = global.fetch;
    global.fetch = async () =>
      ({
        ok: true,
        json: async () => ({ ok: false, error: "channel_not_found" }),
      } as unknown as Response);
    try {
      await expect(reporter.onEnd(passedResult)).rejects.toThrow("channel_not_found");
    } finally {
      global.fetch = original;
    }
  });
});

// ---------------------------------------------------------------------------
// onTestEnd accumulates test cases
// ---------------------------------------------------------------------------

test.describe("onTestEnd", () => {
  test("accumulates test cases passed to blocks function", async () => {
    let capturedCount = 0;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: (_r, testCases) => {
        capturedCount = testCases.length;
        return [divider()];
      },
      send: "always",
    });

    reporter.onTestEnd(...makeTestCase("test-1", "passed"));
    reporter.onTestEnd(...makeTestCase("test-2", "failed"));
    reporter.onTestEnd(...makeTestCase("test-3", "skipped"));

    const original = global.fetch;
    global.fetch = async () => ({ ok: true, text: async () => "ok" } as Response);
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(capturedCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// onSend callback
// ---------------------------------------------------------------------------

test.describe("onSend callback", () => {
  test("receives send response", async () => {
    let received: SlackSendResponse | null = null;
    const reporter = new SlackReporter({
      webhookUrl: "https://hooks.slack.com/stub",
      blocks: [divider()],
      send: "always",
      onSend: (resp) => { received = resp; },
    });

    const original = global.fetch;
    global.fetch = async () => ({ ok: true, text: async () => "ok" } as Response);
    try {
      await reporter.onEnd(passedResult);
    } finally {
      global.fetch = original;
    }

    expect(received).not.toBeNull();
    expect((received as any).ok).toBe(true);
  });
});
