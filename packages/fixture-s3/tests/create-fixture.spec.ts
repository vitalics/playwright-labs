/**
 * createFixture() — option validation, deferred/immediate modes, AbortSignal.
 *
 * Immediate mode is tested against a mocked global fetch: the fixture builds
 * a real S3Client, so intercepting fetch verifies the whole chain
 * (ensureBucket → putObject → s3-ref attachment) without infrastructure.
 */
import { Readable } from "node:stream";
import { test as baseTest, expect } from "@playwright/test";

import {
  createFixture,
  S3_REF_CONTENT_TYPE,
  type CreateFixtureOptions,
} from "../src/fixture";

// ─────────────────────────────────────────────────────────────────────────────
// Option validation — plain synchronous checks
// ─────────────────────────────────────────────────────────────────────────────

baseTest.describe("createFixture validation", () => {
  baseTest("deferred rejects immediate-only options", () => {
    for (const options of [
      { endpoint: "http://localhost:9000" },
      { prefix: "runs" },
      { http: { retries: 1 } },
      { acl: "private" },
      { createBucket: false },
    ] satisfies CreateFixtureOptions[]) {
      expect(() => createFixture(options)).toThrow(TypeError);
      expect(() => createFixture(options)).toThrow(/only valid in immediate mode/);
    }
  });

  baseTest("deferred accepts mode and bucket", () => {
    expect(() => createFixture()).not.toThrow();
    expect(() => createFixture({ bucket: "b" })).not.toThrow();
    expect(() => createFixture({ mode: "deferred", bucket: "b" })).not.toThrow();
  });

  baseTest("unknown mode rejects", () => {
    expect(() =>
      createFixture({ mode: "lazy" as never }),
    ).toThrow(/unknown mode/);
  });

  baseTest("immediate accepts connection options", () => {
    expect(() =>
      createFixture({
        mode: "immediate",
        endpoint: "http://localhost:9000",
        accessKeyId: "a",
        secretAccessKey: "b",
        prefix: "runs",
        http: { timeoutMs: 1000, retries: 2 },
      }),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Deferred mode — default bucket, PutResult without key
// ─────────────────────────────────────────────────────────────────────────────

const deferred = createFixture({ bucket: "default-bucket" });

deferred.test.describe("deferred mode", () => {
  deferred.test("useBucket() without argument uses the default bucket", async ({
    useBucket,
  }, testInfo) => {
    const result = await useBucket().put("x");
    expect(result).toEqual({ bucket: "default-bucket", name: "data" });
    expect(testInfo.attachments.at(-1)!.name).toBe("s3:default-bucket:data");
  });

  deferred.test("explicit bucket beats the default", async ({ useBucket }) => {
    const result = await useBucket("other").put("x", { name: "n.txt" });
    expect(result).toEqual({ bucket: "other", name: "n.txt" });
  });

  deferred.test("PutResult has no key — reporter assigns it later", async ({
    useBucket,
  }) => {
    const result = await useBucket().putFile(Buffer.from("x"), { name: "f.bin" });
    expect(result.key).toBeUndefined();
  });

  deferred.test("putFile accepts a Readable stream", async ({
    useBucket,
  }, testInfo) => {
    const result = await useBucket().putFile(Readable.from(["str", "eam"]), {
      name: "s.txt",
      contentType: "text/plain",
    });
    expect(result).toEqual({ bucket: "default-bucket", name: "s.txt" });
    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:default-bucket:s.txt");
    expect(attachment.body?.toString("utf8")).toBe("stream");
    expect(attachment.contentType).toBe("text/plain");
  });

  deferred.test("createWriteStream buffers into a marker attachment", async ({
    useBucket,
  }, testInfo) => {
    const stream = useBucket("logs").createWriteStream({
      name: "run.log",
      contentType: "text/plain",
    });
    stream.write("line 1\n");
    stream.end("line 2\n");
    const result = await stream.done;

    expect(result).toEqual({ bucket: "logs", name: "run.log" });
    const attachment = testInfo.attachments.at(-1)!;
    expect(attachment.name).toBe("s3:logs:run.log");
    expect(attachment.body?.toString("utf8")).toBe("line 1\nline 2\n");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Immediate mode — mocked fetch
// ─────────────────────────────────────────────────────────────────────────────

type Captured = {
  url: URL;
  method: string;
  body: Buffer | null;
  contentType: string | undefined;
  signal: AbortSignal | undefined;
};

function mockFetch(status: (req: Captured) => number = () => 200) {
  const calls: Captured[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const rawBody = init?.body as Uint8Array | undefined;
    const captured: Captured = {
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      body: rawBody ? Buffer.from(rawBody) : null,
      contentType: headers["content-type"],
      signal: init?.signal ?? undefined,
    };
    calls.push(captured);
    if (captured.signal?.aborted) {
      throw new DOMException("This operation was aborted", "AbortError");
    }
    return new Response(null, { status: status(captured) });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const immediate = createFixture({
  mode: "immediate",
  endpoint: "http://localhost:9000",
  accessKeyId: "AKIATEST",
  secretAccessKey: "secret",
  bucket: "live-bucket",
  prefix: "runs/spec",
});

immediate.test.describe("immediate mode", () => {
  immediate.test("put uploads during the test and returns the key", async ({
    useBucket,
  }, testInfo) => {
    const mock = mockFetch();
    try {
      const result = await useBucket().put(
        { ok: true },
        { name: "report.json" },
      );

      expect(result.bucket).toBe("live-bucket");
      expect(result.name).toBe("report.json");
      expect(result.key).toBe(
        `runs/spec/${testInfo.testId}/${testInfo.retry}-0-report.json`,
      );

      // HEAD (bucket exists) → PUT (object)
      expect(mock.calls.map((c) => c.method)).toEqual(["HEAD", "PUT"]);
      const put = mock.calls[1];
      expect(put.url.pathname).toBe(`/live-bucket/${result.key}`);
      expect(put.body?.toString("utf8")).toBe('{"ok":true}');
      expect(put.contentType).toBe("application/json");
    } finally {
      mock.restore();
    }
  });

  immediate.test("leaves an s3-ref attachment as the report trace", async ({
    useBucket,
  }, testInfo) => {
    const mock = mockFetch();
    try {
      const result = await useBucket("refs").put("x", { name: "n.txt" });
      const attachment = testInfo.attachments.at(-1)!;
      expect(attachment.name).toBe("s3-ref:refs:n.txt");
      expect(attachment.contentType).toBe(S3_REF_CONTENT_TYPE);
      expect(JSON.parse(attachment.body!.toString("utf8"))).toEqual({
        bucket: "refs",
        key: result.key,
      });
    } finally {
      mock.restore();
    }
  });

  immediate.test("bucket is ensured once, upload index grows", async ({
    useBucket,
  }) => {
    const mock = mockFetch();
    try {
      const bucket = useBucket();
      const first = await bucket.put("1");
      const second = await bucket.put("2");
      expect(mock.calls.map((c) => c.method)).toEqual(["HEAD", "PUT", "PUT"]);
      expect(first.key).toContain("-0-data");
      expect(second.key).toContain("-1-data");
    } finally {
      mock.restore();
    }
  });

  immediate.test("missing bucket is created (HEAD 404 → PUT bucket)", async ({
    useBucket,
  }) => {
    const mock = mockFetch((req) => (req.method === "HEAD" ? 404 : 200));
    try {
      await useBucket("fresh").put("x");
      expect(mock.calls.map((c) => c.method)).toEqual(["HEAD", "PUT", "PUT"]);
      expect(mock.calls[1].url.pathname).toBe("/fresh"); // createBucket
    } finally {
      mock.restore();
    }
  });

  immediate.test("signal is forwarded to every HTTP call", async ({
    useBucket,
  }) => {
    const mock = mockFetch();
    try {
      const controller = new AbortController();
      await useBucket().put("x", { signal: controller.signal });
      expect(mock.calls.length).toBeGreaterThan(0);
      for (const call of mock.calls) {
        expect(call.signal).toBe(controller.signal);
      }
    } finally {
      mock.restore();
    }
  });

  immediate.test("pre-aborted signal rejects and skips the s3-ref", async ({
    useBucket,
  }, testInfo) => {
    const mock = mockFetch();
    try {
      const controller = new AbortController();
      controller.abort();
      const before = testInfo.attachments.length;
      await expect(
        useBucket().put("x", { signal: controller.signal }),
      ).rejects.toThrow(/abort/i);
      expect(testInfo.attachments.length).toBe(before);
    } finally {
      mock.restore();
    }
  });

  immediate.test("putFile accepts a Readable stream", async ({
    useBucket,
  }) => {
    const mock = mockFetch();
    try {
      const result = await useBucket().putFile(Readable.from(["a", "b"]), {
        name: "s.bin",
      });
      expect(result.key).toContain("s.bin");
      const put = mock.calls.find((c) => c.method === "PUT")!;
      expect(put.body?.toString("utf8")).toBe("ab");
      expect(put.contentType).toBe("application/octet-stream");
    } finally {
      mock.restore();
    }
  });

  immediate.test("createWriteStream uploads on end and leaves an s3-ref", async ({
    useBucket,
  }, testInfo) => {
    const mock = mockFetch();
    try {
      const stream = useBucket("stream-bucket").createWriteStream({
        name: "run.log",
        contentType: "text/plain",
      });
      stream.write("line 1\n");
      expect(mock.calls).toHaveLength(0); // nothing sent before end()
      stream.end("line 2\n");
      const result = await stream.done;

      expect(result.bucket).toBe("stream-bucket");
      expect(result.key).toContain("run.log");
      const put = mock.calls.find(
        (c) => c.method === "PUT" && c.url.pathname.includes("run.log"),
      )!;
      expect(put.body?.toString("utf8")).toBe("line 1\nline 2\n");
      expect(put.contentType).toBe("text/plain");

      const attachment = testInfo.attachments.at(-1)!;
      expect(attachment.name).toBe("s3-ref:stream-bucket:run.log");
      expect(attachment.contentType).toBe(S3_REF_CONTENT_TYPE);
    } finally {
      mock.restore();
    }
  });

  immediate.test("createWriteStream abort rejects done without uploading", async ({
    useBucket,
  }) => {
    const mock = mockFetch();
    try {
      const controller = new AbortController();
      const stream = useBucket().createWriteStream({
        name: "never.log",
        signal: controller.signal,
      });
      stream.write("x");
      controller.abort();
      await expect(stream.done).rejects.toThrow(/abort/i);
      expect(mock.calls).toHaveLength(0);
    } finally {
      mock.restore();
    }
  });

  immediate.test("sanitizes names but keeps slashes", async ({
    useBucket,
  }) => {
    const mock = mockFetch();
    try {
      const result = await useBucket().put("x", { name: "dir/my file!.txt" });
      expect(result.key).toContain("dir/my_file_.txt");
    } finally {
      mock.restore();
    }
  });
});

// Missing connection settings — lazy failure at first upload, not at import.
const misconfigured = createFixture({ mode: "immediate", bucket: "b" });

misconfigured.test.describe("immediate mode misconfiguration", () => {
  misconfigured.test("missing endpoint fails at first upload", async ({
    useBucket,
  }) => {
    misconfigured.test.skip(
      !!process.env.AWS_S3_URL,
      "AWS_S3_URL is set in this environment",
    );
    await expect(useBucket().put("x")).rejects.toThrow(/endpoint is required/);
  });
});
