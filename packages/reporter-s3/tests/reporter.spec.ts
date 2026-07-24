import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type {
  FullConfig,
  FullResult,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import S3Reporter, { type S3ReporterOptions } from "../src/reporter.js";

type Captured = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
};

function mockFetch(
  responder: (req: Captured) => { status?: number; body?: string } | undefined,
) {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = new URL(String(input));
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(
      (init?.headers ?? {}) as Record<string, string>,
    )) {
      headers[key.toLowerCase()] = String(value);
    }
    const rawBody = init?.body as Uint8Array | undefined;
    const captured: Captured = {
      url,
      method: init?.method ?? "GET",
      headers,
      body: rawBody ? Buffer.from(rawBody) : null,
    };
    calls.push(captured);
    const r = responder(captured) ?? {};
    const status = r.status ?? 200;
    return new Response(r.body && status !== 204 ? r.body : null, { status });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

/** HEAD bucket → 404 (bucket missing), everything else → 200. */
const bucketMissingResponder = (req: Captured) =>
  req.method === "HEAD" ? { status: 404 } : {};

function makeTest(id: string, title: string): TestCase {
  return {
    id,
    titlePath: () => ["", "chromium", "file.spec.ts", title],
  } as unknown as TestCase;
}

function makeResult(overrides?: Partial<TestResult>): TestResult {
  return {
    status: "passed",
    duration: 42,
    retry: 0,
    errors: [],
    attachments: [],
    ...overrides,
  } as unknown as TestResult;
}

const fullResult: FullResult = {
  status: "passed",
  startTime: new Date("2026-07-23T10:00:00.000Z"),
  duration: 1234,
} as FullResult;

const baseOptions: S3ReporterOptions = {
  endpoint: "http://localhost:9000",
  accessKeyId: "key",
  secretAccessKey: "secret",
  bucket: "reports",
  prefix: "run-1",
};

async function run(
  options: S3ReporterOptions,
  cases: Array<[TestCase, TestResult]>,
) {
  const reporter = new S3Reporter(options);
  reporter.onBegin({} as FullConfig, {} as Suite);
  for (const [t, r] of cases) reporter.onTestEnd(t, r);
  await reporter.onEnd(fullResult);
}

function putsOf(calls: Captured[]): Captured[] {
  return calls.filter((c) => c.method === "PUT");
}

function summaryOf(calls: Captured[]): {
  call: Captured;
  json: {
    status: string;
    counts: Record<string, number>;
    tests: Array<{
      id: string;
      status: string;
      attachments: Array<{ bucket: string; key: string }>;
    }>;
  };
} {
  const call = calls.find((c) => c.url.pathname.endsWith("/summary.json"));
  if (!call) throw new Error("summary.json was not uploaded");
  return { call, json: JSON.parse(call.body!.toString("utf8")) };
}

test.describe("option validation", () => {
  // wipe env fallbacks so validation actually triggers
  async function withCleanEnv(fn: () => Promise<void>) {
    const saved = {
      AWS_S3_URL: process.env.AWS_S3_URL,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };
    delete process.env.AWS_S3_URL;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  }

  test("missing endpoint rejects", async () => {
    await withCleanEnv(async () => {
      await expect(
        run({ ...baseOptions, endpoint: undefined }, []),
      ).rejects.toThrow(/endpoint is required/);
    });
  });

  test("missing credentials rejects", async () => {
    await withCleanEnv(async () => {
      await expect(
        run({ ...baseOptions, accessKeyId: undefined }, []),
      ).rejects.toThrow(/credentials are required/);
    });
  });

  test("missing bucket rejects", async () => {
    await withCleanEnv(async () => {
      await expect(
        run({ ...baseOptions, bucket: "" as never }, []),
      ).rejects.toThrow(/bucket is required/);
    });
  });

  test("env variables act as fallbacks", async () => {
    await withCleanEnv(async () => {
      process.env.AWS_S3_URL = "http://localhost:9000";
      process.env.AWS_ACCESS_KEY_ID = "env-key";
      process.env.AWS_SECRET_ACCESS_KEY = "env-secret";
      const mock = mockFetch(bucketMissingResponder);
      try {
        await run(
          {
            bucket: "reports",
            prefix: "run-1",
            accessKeyId: undefined,
            secretAccessKey: undefined,
          },
          [],
        );
        expect(mock.calls.length).toBeGreaterThan(0);
        expect(
          mock.calls.at(-1)!.headers.authorization,
        ).toContain("Credential=env-key/");
      } finally {
        mock.restore();
      }
    });
  });
});

test.describe("upload flow", () => {
  test("happy path: ensure bucket, upload attachment and summary", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(baseOptions, [
        [
          makeTest("t1", "uploads"),
          makeResult({
            attachments: [
              {
                name: "screenshot",
                contentType: "image/png",
                body: Buffer.from("png-bytes"),
              },
            ],
          } as never),
        ],
      ]);

      expect(mock.calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
        "HEAD /reports",
        "PUT /reports",
        "PUT /reports/run-1/attachments/t1/0-0-screenshot",
        "PUT /reports/run-1/summary.json",
      ]);

      const { call, json } = summaryOf(mock.calls);
      expect(call.headers["content-type"]).toBe("application/json");
      expect(json.status).toBe("passed");
      expect(json.counts.passed).toBe(1);
      expect(json.tests[0].attachments).toEqual([
        { bucket: "reports", key: "run-1/attachments/t1/0-0-screenshot" },
      ]);
    } finally {
      mock.restore();
    }
  });

  test("path attachment is read from disk", async ({}, testInfo) => {
    const filePath = testInfo.outputPath("trace.zip");
    await writeFile(filePath, "trace-content");
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(baseOptions, [
        [
          makeTest("t1", "path"),
          makeResult({
            attachments: [
              { name: "trace", contentType: "application/zip", path: filePath },
            ],
          } as never),
        ],
      ]);
      const upload = putsOf(mock.calls).find((c) =>
        c.url.pathname.includes("/attachments/"),
      );
      expect(upload?.body?.toString("utf8")).toBe("trace-content");
    } finally {
      mock.restore();
    }
  });

  test("vanished file and empty attachments are skipped", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(baseOptions, [
        [
          makeTest("t1", "skips"),
          makeResult({
            attachments: [
              {
                name: "gone",
                contentType: "image/png",
                path: "/does/not/exist.png",
              },
              { name: "empty", contentType: "text/plain" }, // no body, no path
            ],
          } as never),
        ],
      ]);
      const uploads = putsOf(mock.calls).filter((c) =>
        c.url.pathname.includes("/attachments/"),
      );
      expect(uploads).toHaveLength(0);
      expect(summaryOf(mock.calls).json.tests[0].attachments).toEqual([]);
    } finally {
      mock.restore();
    }
  });

  test("attachment names are sanitized in keys", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(baseOptions, [
        [
          makeTest("t1", "sanitize"),
          makeResult({
            attachments: [
              {
                name: "my file (1) — final.png",
                contentType: "image/png",
                body: Buffer.from("x"),
              },
            ],
          } as never),
        ],
      ]);
      const upload = putsOf(mock.calls).find((c) =>
        c.url.pathname.includes("/attachments/"),
      );
      expect(decodeURIComponent(upload!.url.pathname)).toBe(
        "/reports/run-1/attachments/t1/0-0-my_file_1_final.png",
      );
    } finally {
      mock.restore();
    }
  });

  test("retry lands in the key", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(baseOptions, [
        [
          makeTest("t1", "retry"),
          makeResult({
            retry: 2,
            attachments: [
              { name: "a", contentType: "text/plain", body: Buffer.from("x") },
            ],
          } as never),
        ],
      ]);
      expect(
        putsOf(mock.calls).some((c) =>
          c.url.pathname.endsWith("/attachments/t1/2-0-a"),
        ),
      ).toBe(true);
    } finally {
      mock.restore();
    }
  });
});

test.describe("bucket routing", () => {
  const attachment = {
    name: "shot",
    contentType: "image/png",
    body: Buffer.from("x"),
  };

  test("attachmentBucket as string routes all attachments", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, attachmentBucket: "artifacts" }, [
        [makeTest("t1", "route"), makeResult({ attachments: [attachment] } as never)],
      ]);
      const upload = putsOf(mock.calls).find((c) =>
        c.url.pathname.includes("/attachments/"),
      );
      expect(upload!.url.pathname.startsWith("/artifacts/")).toBe(true);
      // both buckets get ensured
      const heads = mock.calls.filter((c) => c.method === "HEAD");
      expect(heads.map((c) => c.url.pathname).sort()).toEqual([
        "/artifacts",
        "/reports",
      ]);
      // summary references the routed bucket
      expect(summaryOf(mock.calls).json.tests[0].attachments[0].bucket).toBe(
        "artifacts",
      );
    } finally {
      mock.restore();
    }
  });

  test("resolver routes per attachment; undefined falls back", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run(
        {
          ...baseOptions,
          attachmentBucket: ({ contentType }) =>
            contentType.startsWith("video/") ? "videos" : undefined,
        },
        [
          [
            makeTest("t1", "resolve"),
            makeResult({
              attachments: [
                { name: "v", contentType: "video/webm", body: Buffer.from("v") },
                { name: "i", contentType: "image/png", body: Buffer.from("i") },
              ],
            } as never),
          ],
        ],
      );
      const refs = summaryOf(mock.calls).json.tests[0].attachments;
      expect(refs.map((r) => r.bucket)).toEqual(["videos", "reports"]);
    } finally {
      mock.restore();
    }
  });

  test("fixture-s3 marker beats the resolver", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, attachmentBucket: () => "resolver-bucket" }, [
        [
          makeTest("t1", "marker"),
          makeResult({
            attachments: [
              {
                name: "s3:fixture-bucket:payload.json",
                contentType: "application/json",
                body: Buffer.from("{}"),
              },
            ],
          } as never),
        ],
      ]);
      const ref = summaryOf(mock.calls).json.tests[0].attachments[0];
      expect(ref.bucket).toBe("fixture-bucket");
      expect(ref.key).toBe("run-1/attachments/t1/0-0-payload.json");
    } finally {
      mock.restore();
    }
  });
});

test.describe("toggles", () => {
  test("createBucket=false skips HEAD/PUT bucket", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await run({ ...baseOptions, createBucket: false }, []);
      expect(mock.calls.some((c) => c.method === "HEAD")).toBe(false);
      expect(mock.calls.map((c) => c.url.pathname)).toEqual([
        "/reports/run-1/summary.json",
      ]);
    } finally {
      mock.restore();
    }
  });

  test("uploadSummary=false skips summary", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, uploadSummary: false }, []);
      expect(
        mock.calls.some((c) => c.url.pathname.endsWith("summary.json")),
      ).toBe(false);
    } finally {
      mock.restore();
    }
  });

  test("uploadAttachments=false skips attachments but keeps summary", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, uploadAttachments: false }, [
        [
          makeTest("t1", "off"),
          makeResult({
            attachments: [
              { name: "a", contentType: "text/plain", body: Buffer.from("x") },
            ],
          } as never),
        ],
      ]);
      expect(
        mock.calls.some((c) => c.url.pathname.includes("/attachments/")),
      ).toBe(false);
      expect(summaryOf(mock.calls).json.tests[0].attachments).toEqual([]);
    } finally {
      mock.restore();
    }
  });

  test("acl option is forwarded to uploads", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, acl: "private" }, []);
      const summary = summaryOf(mock.calls);
      expect(summary.call.headers["x-amz-acl"]).toBe("private");
    } finally {
      mock.restore();
    }
  });

  test("default prefix derives from run start time", async () => {
    const mock = mockFetch(bucketMissingResponder);
    try {
      await run({ ...baseOptions, prefix: undefined }, []);
      const summary = mock.calls.find((c) =>
        c.url.pathname.endsWith("summary.json"),
      );
      expect(summary!.url.pathname).toBe(
        "/reports/runs/2026-07-23T10-00-00-000Z/summary.json",
      );
    } finally {
      mock.restore();
    }
  });
});
