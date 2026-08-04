import { test, expect } from "@playwright/test";
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from "@playwright/test/reporter";
import WebhookReporter from "../src/reporter";
import type { WebhookEvent, WebhookOptions } from "../src/types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

function makeConfig(): FullConfig {
  return {
    rootDir: "/repo",
    workers: 4,
    version: "1.57.0",
    projects: [{ name: "chromium" }, { name: "firefox" }],
  } as unknown as FullConfig;
}

function makeSuite(testCount = 2): Suite {
  const tests = Array.from({ length: testCount }, (_, i) => ({ id: `t-${i}` }));
  return {
    title: "root",
    allTests: () => tests,
  } as unknown as Suite;
}

function makeTestCase(title: string): TestCase {
  return {
    id: `id-${title}`,
    title,
    titlePath: () => ["Suite", title],
    location: { file: "tests/example.spec.ts", line: 3, column: 1 },
    timeout: 30_000,
    retries: 1,
    tags: ["@smoke"],
  } as unknown as TestCase;
}

function makeTestResult(
  status: TestResult["status"] = "passed",
): TestResult {
  return {
    status,
    duration: 1234,
    retry: 0,
    errors: status === "failed" ? [{ message: "boom" }] : [],
    attachments: status === "failed" ? [{ name: "screenshot" }] : [],
  } as unknown as TestResult;
}

function makeTestError(): TestError {
  return {
    message: "global setup exploded",
    stack: "Error: global setup exploded\n    at setup.ts:10",
    location: { file: "global.setup.ts", line: 10, column: 5 },
    snippet: "throw new Error('global setup exploded')",
  } as unknown as TestError;
}

const passedRun: FullResult = {
  status: "passed",
  startTime: new Date("2026-01-01T00:00:00Z"),
  duration: 5000,
};

// ---------------------------------------------------------------------------
// fetch stub
// ---------------------------------------------------------------------------

type CapturedRequest = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

function stubFetch(response: Partial<Response> = {}) {
  const requests: CapturedRequest[] = [];
  const original = global.fetch;
  global.fetch = (async (url: string | URL, init?: RequestInit) => {
    requests.push({
      url: url.toString(),
      headers: Object.fromEntries(
        Object.entries(init?.headers ?? {}).map(([k, v]) => [
          k.toLowerCase(),
          v as string,
        ]),
      ),
      body: JSON.parse(init?.body as string),
    });
    return { ok: true, status: 200, ...response } as Response;
  }) as typeof fetch;
  return {
    requests,
    restore: () => {
      global.fetch = original;
    },
  };
}

function makeReporter(options: Partial<WebhookOptions> = {}) {
  return new WebhookReporter({
    url: "https://hooks.example.com/wh",
    ...options,
  });
}

// ---------------------------------------------------------------------------
// events option
// ---------------------------------------------------------------------------

test.describe("events option", () => {
  test("by default sends begin, test.begin, test.end, error and end", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter();
      reporter.onBegin(makeConfig(), makeSuite());
      reporter.onTestBegin(makeTestCase("a"), makeTestResult());
      reporter.onTestEnd(makeTestCase("a"), makeTestResult());
      reporter.onError(makeTestError());
      await reporter.onEnd(passedRun);

      expect(stub.requests.map((r) => (r.body as WebhookEvent).event)).toEqual([
        "begin",
        "test.begin",
        "test.end",
        "error",
        "end",
      ]);
    } finally {
      stub.restore();
    }
  });

  test("sends only the listed events", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["begin", "end"] });
      reporter.onBegin(makeConfig(), makeSuite());
      reporter.onTestBegin(makeTestCase("a"), makeTestResult());
      reporter.onTestEnd(makeTestCase("a"), makeTestResult());
      await reporter.onEnd(passedRun);

      expect(stub.requests.map((r) => (r.body as WebhookEvent).event)).toEqual([
        "begin",
        "end",
      ]);
    } finally {
      stub.restore();
    }
  });

  test("empty events list sends nothing", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: [] });
      reporter.onBegin(makeConfig(), makeSuite());
      reporter.onTestEnd(makeTestCase("a"), makeTestResult());
      await reporter.onEnd(passedRun);

      expect(stub.requests).toHaveLength(0);
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// payloads
// ---------------------------------------------------------------------------

test.describe("payloads", () => {
  test("begin carries config and suite summaries", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["begin"] });
      reporter.onBegin(makeConfig(), makeSuite(3));
      await reporter.onEnd(passedRun);

      expect(stub.requests).toHaveLength(1);
      expect(stub.requests[0].body).toEqual({
        event: "begin",
        data: {
          config: {
            rootDir: "/repo",
            workers: 4,
            version: "1.57.0",
            projects: ["chromium", "firefox"],
          },
          suite: { title: "root", totalTests: 3 },
        },
      });
    } finally {
      stub.restore();
    }
  });

  test("test.begin / test.end carry test and result summaries", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["test.begin", "test.end"] });
      reporter.onTestBegin(makeTestCase("my test"), makeTestResult("passed"));
      reporter.onTestEnd(makeTestCase("my test"), makeTestResult("failed"));
      await reporter.onEnd(passedRun);

      const expectedTest = {
        id: "id-my test",
        title: "my test",
        titlePath: ["Suite", "my test"],
        location: { file: "tests/example.spec.ts", line: 3, column: 1 },
        timeout: 30_000,
        retries: 1,
        tags: ["@smoke"],
      };
      expect(stub.requests[0].body).toEqual({
        event: "test.begin",
        data: {
          test: expectedTest,
          result: {
            status: "passed",
            duration: 1234,
            retry: 0,
            errors: [],
            attachments: 0,
          },
        },
      });
      expect(stub.requests[1].body).toEqual({
        event: "test.end",
        data: {
          test: expectedTest,
          result: {
            status: "failed",
            duration: 1234,
            retry: 0,
            errors: ["boom"],
            attachments: 1,
          },
        },
      });
    } finally {
      stub.restore();
    }
  });

  test("end carries run result and accumulated status counts", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["end"] });
      reporter.onTestEnd(makeTestCase("a"), makeTestResult("passed"));
      reporter.onTestEnd(makeTestCase("b"), makeTestResult("failed"));
      reporter.onTestEnd(makeTestCase("c"), makeTestResult("skipped"));
      await reporter.onEnd(passedRun);

      expect(stub.requests).toHaveLength(1);
      expect(stub.requests[0].body).toEqual({
        event: "end",
        data: {
          result: {
            status: "passed",
            startTime: "2026-01-01T00:00:00.000Z",
            duration: 5000,
          },
          counts: {
            passed: 1,
            failed: 1,
            timedOut: 0,
            skipped: 1,
            interrupted: 0,
          },
        },
      });
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// request shape
// ---------------------------------------------------------------------------

test.describe("request shape", () => {
  test("POSTs JSON to the given URL", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["end"] });
      await reporter.onEnd(passedRun);

      expect(stub.requests[0].url).toBe("https://hooks.example.com/wh");
      expect(stub.requests[0].headers["content-type"]).toBe("application/json");
    } finally {
      stub.restore();
    }
  });

  test("accepts a URL instance", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        url: new URL("https://hooks.example.com/from-url"),
      });
      await reporter.onEnd(passedRun);

      expect(stub.requests[0].url).toBe("https://hooks.example.com/from-url");
    } finally {
      stub.restore();
    }
  });

  test("merges custom headers", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        headers: { Authorization: "Bearer token" },
      });
      await reporter.onEnd(passedRun);

      expect(stub.requests[0].headers["authorization"]).toBe("Bearer token");
      expect(stub.requests[0].headers["content-type"]).toBe("application/json");
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// body option
// ---------------------------------------------------------------------------

test.describe("body option", () => {
  test("replaces the payload and receives the event", async () => {
    const stub = stubFetch();
    const received: WebhookEvent[] = [];
    try {
      const reporter = makeReporter({
        events: ["end"],
        body: (event) => {
          received.push(event);
          return { custom: event.event };
        },
      });
      await reporter.onEnd(passedRun);

      expect(stub.requests[0].body).toEqual({ custom: "end" });
      expect(received).toHaveLength(1);
      expect(received[0].event).toBe("end");
    } finally {
      stub.restore();
    }
  });

  test("async body callback is awaited", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        body: async (event) => ({ wrapped: event }),
      });
      await reporter.onEnd(passedRun);

      const body = stub.requests[0].body as { wrapped: WebhookEvent };
      expect(body.wrapped.event).toBe("end");
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// error handling
// ---------------------------------------------------------------------------

test.describe("error handling", () => {
  test("onEnd rejects when the webhook responds with non-ok status", async () => {
    const stub = stubFetch({
      ok: false,
      status: 500,
      text: async () => "server exploded",
    } as Partial<Response>);
    try {
      const reporter = makeReporter({ events: ["end"] });
      await expect(reporter.onEnd(passedRun)).rejects.toThrow(
        'event "end" failed (500): "server exploded"',
      );
    } finally {
      stub.restore();
    }
  });

  test("failures from earlier hooks surface in onEnd", async () => {
    const stub = stubFetch({ ok: false, status: 503, text: async () => "" });
    try {
      const reporter = makeReporter({ events: ["test.end"] });
      reporter.onTestEnd(makeTestCase("a"), makeTestResult("passed"));
      await expect(reporter.onEnd(passedRun)).rejects.toThrow(
        'event "test.end" failed (503)',
      );
    } finally {
      stub.restore();
    }
  });

  test("network errors surface in onEnd", async () => {
    const original = global.fetch;
    global.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    try {
      const reporter = makeReporter({ events: ["begin", "end"] });
      reporter.onBegin(makeConfig(), makeSuite());
      await expect(reporter.onEnd(passedRun)).rejects.toThrow();
    } finally {
      global.fetch = original;
    }
  });
});

// ---------------------------------------------------------------------------
// BaseReporter integration
// ---------------------------------------------------------------------------

test("printsToStdio is false", () => {
  expect(makeReporter().printsToStdio()).toBe(false);
});

// ---------------------------------------------------------------------------
// eventPrefix option
// ---------------------------------------------------------------------------

test.describe("eventPrefix option", () => {
  test("string prefix is joined with a dot", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ eventPrefix: "webhookReporter" });
      reporter.onBegin(makeConfig(), makeSuite());
      reporter.onTestEnd(makeTestCase("a"), makeTestResult());
      await reporter.onEnd(passedRun);

      expect(stub.requests.map((r) => (r.body as WebhookEvent).event)).toEqual([
        "webhookReporter.begin",
        "webhookReporter.test.end",
        "webhookReporter.end",
      ]);
    } finally {
      stub.restore();
    }
  });

  test("object prefix without separator defaults to a dot", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        eventPrefix: { name: "wh" },
      });
      await reporter.onEnd(passedRun);

      expect((stub.requests[0].body as WebhookEvent).event).toBe("wh.end");
    } finally {
      stub.restore();
    }
  });

  test("object prefix with custom separator", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        eventPrefix: { name: "wh", separator: ":" },
      });
      await reporter.onEnd(passedRun);

      expect((stub.requests[0].body as WebhookEvent).event).toBe("wh:end");
    } finally {
      stub.restore();
    }
  });

  test("events filter keeps using canonical names when prefix is set", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({
        events: ["end"],
        eventPrefix: "wh",
      });
      reporter.onBegin(makeConfig(), makeSuite());
      reporter.onTestEnd(makeTestCase("a"), makeTestResult());
      await reporter.onEnd(passedRun);

      expect(stub.requests).toHaveLength(1);
      expect((stub.requests[0].body as WebhookEvent).event).toBe("wh.end");
    } finally {
      stub.restore();
    }
  });

  test("body callback receives the canonical event name", async () => {
    const stub = stubFetch();
    const received: WebhookEvent[] = [];
    try {
      const reporter = makeReporter({
        events: ["end"],
        eventPrefix: "wh",
        body: (event) => {
          received.push(event);
          return event;
        },
      });
      await reporter.onEnd(passedRun);

      expect(received[0].event).toBe("end");
      expect((stub.requests[0].body as WebhookEvent).event).toBe("end");
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// error event
// ---------------------------------------------------------------------------

test.describe("error event", () => {
  test("carries the error summary with location", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: ["error"] });
      reporter.onError(makeTestError());
      await reporter.onEnd(passedRun);

      expect(stub.requests).toHaveLength(1);
      expect(stub.requests[0].body).toEqual({
        event: "error",
        data: {
          error: {
            message: "global setup exploded",
            stack: "Error: global setup exploded\n    at setup.ts:10",
            location: { file: "global.setup.ts", line: 10, column: 5 },
            snippet: "throw new Error('global setup exploded')",
          },
        },
      });
    } finally {
      stub.restore();
    }
  });

  test("onError does not throw without external error listeners", async () => {
    const stub = stubFetch();
    try {
      const reporter = makeReporter({ events: [] });
      expect(() => reporter.onError(makeTestError())).not.toThrow();
      await reporter.onEnd(passedRun);
    } finally {
      stub.restore();
    }
  });
});
