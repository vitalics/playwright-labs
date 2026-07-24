import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";

import {
  S3Client,
  S3Error,
  S3Event,
  S3_ATTACHMENT_PREFIX,
  collectBody,
  formatS3AttachmentName,
  parseS3AttachmentName,
  type S3AbortEvent,
  type S3RequestEvent,
} from "../src/index.js";

type Captured = {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: Buffer | null;
  signal: AbortSignal | undefined;
};

type MockResponse = { status?: number; body?: string; delayMs?: number };

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException("This operation was aborted", "AbortError");
}

/** Replaces global fetch; honors `init.signal`; restore in finally. */
function mockFetch(
  responder: (req: Captured, index: number) => MockResponse | undefined,
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
    const signal = init?.signal ?? undefined;
    const captured: Captured = {
      url,
      method: init?.method ?? "GET",
      headers,
      body: rawBody ? Buffer.from(rawBody) : null,
      signal,
    };
    calls.push(captured);
    if (signal?.aborted) throw abortError(signal);
    const r = responder(captured, calls.length - 1) ?? {};
    if (r.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, r.delayMs);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(abortError(signal));
          },
          { once: true },
        );
      });
    }
    const status = r.status ?? 200;
    const body = r.body && status !== 204 ? r.body : null;
    return new Response(body, { status });
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

function client(overrides?: Partial<ConstructorParameters<typeof S3Client>[0]>) {
  return new S3Client({
    endpoint: "http://localhost:9000",
    accessKeyId: "AKIATEST",
    secretAccessKey: "secret",
    ...overrides,
  });
}

function sha256hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test.describe("S3Client constructor", () => {
  test("throws without endpoint", () => {
    expect(
      () =>
        new S3Client({
          endpoint: "",
          accessKeyId: "a",
          secretAccessKey: "b",
        }),
    ).toThrow(TypeError);
  });

  test("throws without credentials", () => {
    expect(
      () =>
        new S3Client({
          endpoint: "http://localhost:9000",
          accessKeyId: "",
          secretAccessKey: "b",
        }),
    ).toThrow(TypeError);
  });

  test("strips trailing slashes from endpoint", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client({ endpoint: "http://localhost:9000///" }).putObject(
        "b",
        "k",
        "x",
      );
      expect(mock.calls[0].url.href).toBe("http://localhost:9000/b/k");
    } finally {
      mock.restore();
    }
  });
});

test.describe("putObject", () => {
  test("sends PUT with signed headers and payload hash", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().putObject("bucket", "key.txt", "hello");
      const call = mock.calls[0];

      expect(call.method).toBe("PUT");
      expect(call.url.pathname).toBe("/bucket/key.txt");
      expect(call.body?.toString("utf8")).toBe("hello");
      expect(call.headers["content-type"]).toBe("application/octet-stream");
      expect(call.headers["x-amz-content-sha256"]).toBe(sha256hex("hello"));
      expect(call.headers["x-amz-date"]).toMatch(/^\d{8}T\d{6}Z$/);
      // host must NOT be passed explicitly (fetch sets it itself)
      expect(call.headers.host).toBeUndefined();

      const auth = call.headers.authorization;
      expect(auth).toContain("AWS4-HMAC-SHA256 Credential=AKIATEST/");
      expect(auth).toContain("/us-east-1/s3/aws4_request");
      expect(auth).toContain(
        "SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date",
      );
      expect(auth).toMatch(/Signature=[0-9a-f]{64}$/);
    } finally {
      mock.restore();
    }
  });

  test("respects contentType and acl options", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().putObject("b", "k", "x", {
        contentType: "image/png",
        acl: "private",
      });
      expect(mock.calls[0].headers["content-type"]).toBe("image/png");
      expect(mock.calls[0].headers["x-amz-acl"]).toBe("private");
      expect(mock.calls[0].headers.authorization).toContain("x-amz-acl");
    } finally {
      mock.restore();
    }
  });

  test("accepts Buffer and Uint8Array bodies", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().putObject("b", "buf", Buffer.from([1, 2, 3]));
      await client().putObject("b", "u8", new Uint8Array([4, 5]));
      expect([...mock.calls[0].body!]).toEqual([1, 2, 3]);
      expect([...mock.calls[1].body!]).toEqual([4, 5]);
    } finally {
      mock.restore();
    }
  });

  test("encodes object keys per segment, keeping slashes", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().putObject("b", "dir/my file+(1)!.png", "x");
      expect(mock.calls[0].url.pathname).toBe(
        "/b/dir/my%20file%2B%281%29%21.png",
      );
    } finally {
      mock.restore();
    }
  });

  test("throws S3Error with status and body on failure", async () => {
    const mock = mockFetch(() => ({ status: 403, body: "AccessDenied" }));
    try {
      await expect(client().putObject("b", "k", "x")).rejects.toThrow(S3Error);
      await expect(client().putObject("b", "k", "x")).rejects.toThrow(
        /putObject failed with 403: AccessDenied/,
      );
    } finally {
      mock.restore();
    }
  });
});

test.describe("getObject / deleteObject", () => {
  test("getObject resolves with body Buffer", async () => {
    const mock = mockFetch(() => ({ body: "content" }));
    try {
      const result = await client().getObject("b", "k");
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString("utf8")).toBe("content");
      expect(mock.calls[0].method).toBe("GET");
      // empty payload must use the empty-string hash
      expect(mock.calls[0].headers["x-amz-content-sha256"]).toBe(EMPTY_SHA256);
    } finally {
      mock.restore();
    }
  });

  test("getObject 404 throws S3Error", async () => {
    const mock = mockFetch(() => ({ status: 404, body: "NoSuchKey" }));
    try {
      await expect(client().getObject("b", "k")).rejects.toThrow(
        /getObject failed with 404/,
      );
    } finally {
      mock.restore();
    }
  });

  test("deleteObject accepts 204", async () => {
    const mock = mockFetch(() => ({ status: 204 }));
    try {
      await expect(client().deleteObject("b", "k")).resolves.toBeUndefined();
      expect(mock.calls[0].method).toBe("DELETE");
    } finally {
      mock.restore();
    }
  });
});

test.describe("buckets", () => {
  test("bucketExists: 200 → true, 404 → false, 403 → throws", async () => {
    let status = 200;
    const mock = mockFetch(() => ({ status }));
    try {
      expect(await client().bucketExists("b")).toBe(true);
      status = 404;
      expect(await client().bucketExists("b")).toBe(false);
      status = 403;
      await expect(client().bucketExists("b")).rejects.toThrow(S3Error);
      expect(mock.calls[0].method).toBe("HEAD");
      expect(mock.calls[0].url.pathname).toBe("/b");
    } finally {
      mock.restore();
    }
  });

  test("createBucket sends empty body for us-east-1", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().createBucket("b");
      expect(mock.calls[0].body).toBeNull();
    } finally {
      mock.restore();
    }
  });

  test("createBucket sends LocationConstraint for other regions", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client({ region: "eu-west-1" }).createBucket("b");
      expect(mock.calls[0].body?.toString("utf8")).toContain(
        "<LocationConstraint>eu-west-1</LocationConstraint>",
      );
      expect(mock.calls[0].headers.authorization).toContain("/eu-west-1/s3/");
    } finally {
      mock.restore();
    }
  });

  test("createBucket treats 409 as success (already owned)", async () => {
    const mock = mockFetch(() => ({ status: 409, body: "owned" }));
    try {
      await expect(client().createBucket("b")).resolves.toBeUndefined();
    } finally {
      mock.restore();
    }
  });

  test("ensureBucket skips creation when bucket exists", async () => {
    const mock = mockFetch(() => ({ status: 200 }));
    try {
      await client().ensureBucket("b");
      expect(mock.calls).toHaveLength(1);
      expect(mock.calls[0].method).toBe("HEAD");
    } finally {
      mock.restore();
    }
  });

  test("ensureBucket creates missing bucket", async () => {
    const mock = mockFetch((req) =>
      req.method === "HEAD" ? { status: 404 } : {},
    );
    try {
      await client().ensureBucket("b");
      expect(mock.calls.map((c) => c.method)).toEqual(["HEAD", "PUT"]);
    } finally {
      mock.restore();
    }
  });
});

test.describe("virtual-host style", () => {
  test("forcePathStyle=false prefixes host with bucket", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client({ forcePathStyle: false }).putObject("bucket", "k", "x");
      expect(mock.calls[0].url.host).toBe("bucket.localhost:9000");
      expect(mock.calls[0].url.pathname).toBe("/k");
    } finally {
      mock.restore();
    }
  });
});

test.describe("stream bodies", () => {
  test("putObject accepts a node Readable", async () => {
    const mock = mockFetch(() => ({}));
    try {
      await client().putObject("b", "k", Readable.from(["hel", "lo"]));
      expect(mock.calls[0].body?.toString("utf8")).toBe("hello");
      expect(mock.calls[0].headers["x-amz-content-sha256"]).toBe(
        sha256hex("hello"),
      );
    } finally {
      mock.restore();
    }
  });

  test("putObject accepts a web ReadableStream", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("web-"));
          controller.enqueue(new TextEncoder().encode("chunks"));
          controller.close();
        },
      });
      await client().putObject("b", "k", stream);
      expect(mock.calls[0].body?.toString("utf8")).toBe("web-chunks");
    } finally {
      mock.restore();
    }
  });

  test("collectBody handles every input type", async () => {
    expect((await collectBody("s")).toString()).toBe("s");
    expect((await collectBody(Buffer.from([1]))).toJSON().data).toEqual([1]);
    expect((await collectBody(new Uint8Array([2]))).toJSON().data).toEqual([2]);
    expect((await collectBody(Readable.from(["a", "b"]))).toString()).toBe("ab");
  });
});

test.describe("createWriteStream", () => {
  test("uploads concatenated chunks on end; done resolves after the PUT", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const stream = client().createWriteStream("b", "run.log", {
        contentType: "text/plain",
      });
      stream.write("line 1\n");
      stream.write(Buffer.from("line 2\n"));
      stream.end("line 3\n");
      await stream.done;

      expect(mock.calls).toHaveLength(1);
      const call = mock.calls[0];
      expect(call.method).toBe("PUT");
      expect(call.url.pathname).toBe("/b/run.log");
      expect(call.body?.toString("utf8")).toBe("line 1\nline 2\nline 3\n");
      expect(call.headers["content-type"]).toBe("text/plain");
    } finally {
      mock.restore();
    }
  });

  test("nothing is sent before end()", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const stream = client().createWriteStream("b", "k");
      stream.write("data");
      expect(mock.calls).toHaveLength(0);
      stream.end();
      await stream.done;
      expect(mock.calls).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });

  test("failed upload rejects done and emits error", async () => {
    const mock = mockFetch(() => ({ status: 500, body: "boom" }));
    try {
      const stream = client().createWriteStream("b", "k");
      const errorEvent = new Promise((resolve) => stream.once("error", resolve));
      stream.end("x");
      await expect(stream.done).rejects.toThrow(/putObject failed with 500/);
      await expect(errorEvent).resolves.toBeInstanceOf(S3Error);
    } finally {
      mock.restore();
    }
  });

  test("abort destroys the stream before upload", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const controller = new AbortController();
      const stream = client().createWriteStream("b", "k", {
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
});

test.describe("AbortSignal", () => {
  test("per-call signal is forwarded to fetch on every method", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const c = client();
      const controller = new AbortController();
      const signal = controller.signal;

      await c.putObject("b", "k", "x", { signal });
      await c.getObject("b", "k", { signal });
      await c.deleteObject("b", "k", { signal });
      await c.bucketExists("b", { signal });
      await c.createBucket("b", { signal });

      expect(mock.calls).toHaveLength(5);
      for (const call of mock.calls) {
        expect(call.signal).toBe(signal);
      }
    } finally {
      mock.restore();
    }
  });

  test("pre-aborted signal rejects without retrying", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const controller = new AbortController();
      controller.abort();
      await expect(
        client({ http: { retries: 3 } }).putObject("b", "k", "x", {
          signal: controller.signal,
        }),
      ).rejects.toThrow(/abort/i);
      expect(mock.calls).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });

  test("abort mid-flight rejects the request", async () => {
    const mock = mockFetch(() => ({ delayMs: 5_000 }));
    try {
      const controller = new AbortController();
      const promise = client().getObject("b", "k", {
        signal: controller.signal,
      });
      controller.abort();
      await expect(promise).rejects.toThrow(/abort/i);
    } finally {
      mock.restore();
    }
  });
});

test.describe("http options", () => {
  test("timeoutMs aborts a slow request", async () => {
    const mock = mockFetch(() => ({ delayMs: 5_000 }));
    try {
      await expect(
        client({ http: { timeoutMs: 50 } }).getObject("b", "k"),
      ).rejects.toThrow(/abort|timeout/i);
      expect(mock.calls).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });

  test("retries recover from 5xx", async () => {
    const mock = mockFetch((_req, index) =>
      index === 0 ? { status: 503, body: "SlowDown" } : {},
    );
    try {
      await client({ http: { retries: 1 } }).putObject("b", "k", "x");
      expect(mock.calls).toHaveLength(2);
    } finally {
      mock.restore();
    }
  });

  test("retries recover from network errors", async () => {
    let first = true;
    const original = globalThis.fetch;
    const mock = mockFetch(() => ({}));
    const failingOnce = globalThis.fetch;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      if (first) {
        first = false;
        throw new TypeError("fetch failed");
      }
      return failingOnce(...args);
    }) as typeof fetch;
    try {
      await client({ http: { retries: 1 } }).getObject("b", "k");
      expect(mock.calls).toHaveLength(1); // only the successful attempt reached the responder
    } finally {
      globalThis.fetch = original;
      mock.restore();
    }
  });

  test("exhausted retries surface the S3Error", async () => {
    const mock = mockFetch(() => ({ status: 500, body: "InternalError" }));
    try {
      await expect(
        client({ http: { retries: 2 } }).putObject("b", "k", "x"),
      ).rejects.toThrow(/putObject failed with 500/);
      expect(mock.calls).toHaveLength(3);
    } finally {
      mock.restore();
    }
  });

  test("4xx is not retried", async () => {
    const mock = mockFetch(() => ({ status: 403, body: "AccessDenied" }));
    try {
      await expect(
        client({ http: { retries: 3 } }).putObject("b", "k", "x"),
      ).rejects.toThrow(S3Error);
      expect(mock.calls).toHaveLength(1);
    } finally {
      mock.restore();
    }
  });
});

test.describe("attachment name marker", () => {
  test("format → parse roundtrip", () => {
    const name = formatS3AttachmentName("my-bucket", "dir/file.txt");
    expect(name).toBe("s3:my-bucket:dir/file.txt");
    expect(parseS3AttachmentName(name)).toEqual({
      bucket: "my-bucket",
      name: "dir/file.txt",
    });
  });

  test("name may contain colons — bucket is up to the first one", () => {
    expect(parseS3AttachmentName("s3:b:a:b:c")).toEqual({
      bucket: "b",
      name: "a:b:c",
    });
  });

  test("prefix constant matches format output", () => {
    expect(formatS3AttachmentName("b", "n").startsWith(S3_ATTACHMENT_PREFIX)).toBe(
      true,
    );
  });

  test("invalid inputs → null", () => {
    expect(parseS3AttachmentName("screenshot.png")).toBeNull();
    expect(parseS3AttachmentName("s3:bucket")).toBeNull(); // no name separator
    expect(parseS3AttachmentName("s3:bucket:")).toBeNull(); // empty name
    expect(parseS3AttachmentName("s3::name")).toBeNull(); // empty bucket
    expect(parseS3AttachmentName("")).toBeNull();
  });
});

test.describe("events", () => {
  test("requestSend carries attempt info and strips authorization", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const c = client();
      const events: S3RequestEvent[] = [];
      c.on(S3Event.requestSend, (event) => events.push(event));

      await c.putObject("b", "k", "payload");

      expect(events).toHaveLength(1);
      const [event] = events;
      expect(event.method).toBe("PUT");
      expect(event.url).toBeInstanceOf(URL);
      expect(event.url.pathname).toBe("/b/k");
      expect(event.attempt).toBe(1);
      expect(event.maxAttempts).toBe(1);
      expect(event.bodyLength).toBe("payload".length);
      // signature must not leak into listeners
      expect(event.headers.authorization).toBeUndefined();
      expect(event.headers["x-amz-date"]).toBeDefined();
      // ...but the actual request still carries it
      expect(mock.calls[0].headers.authorization).toContain("AWS4-HMAC-SHA256");
    } finally {
      mock.restore();
    }
  });

  test("retries emit requestSend per attempt with growing counter", async () => {
    const mock = mockFetch((_req, index) =>
      index === 0 ? { status: 500 } : {},
    );
    try {
      const c = client({ http: { retries: 1 } });
      const attempts: number[] = [];
      c.on(S3Event.requestSend, (event) => attempts.push(event.attempt));

      await c.putObject("b", "k", "x");

      expect(attempts).toEqual([1, 2]);
      expect(mock.calls).toHaveLength(2);
    } finally {
      mock.restore();
    }
  });

  test("failure emits requestReject and symbol error with the thrown S3Error", async () => {
    const mock = mockFetch(() => ({ status: 403, body: "AccessDenied" }));
    try {
      const c = client();
      const rejected: S3Error[] = [];
      const errored: S3Error[] = [];
      c.on(S3Event.requestReject, (error) => rejected.push(error));
      c.on(S3Event.error, (error) => errored.push(error));

      const thrown = await c.putObject("b", "k", "x").catch((e: S3Error) => e);

      expect(rejected).toHaveLength(1);
      expect(errored).toHaveLength(1);
      expect(rejected[0]).toBe(thrown); // same instance everywhere
      expect(errored[0]).toBe(thrown);
      expect(rejected[0].status).toBe(403);
    } finally {
      mock.restore();
    }
  });

  test('string "error" fires only when listened to — no listener, no crash', async () => {
    const mock = mockFetch(() => ({ status: 500, body: "boom" }));
    try {
      // no "error" listener: must reject the promise, not crash the process
      await expect(client().putObject("b", "k", "x")).rejects.toThrow(S3Error);

      // with a listener: the same error arrives via the event too
      const c = client();
      const viaEvent: S3Error[] = [];
      c.on("error", (error) => viaEvent.push(error));
      await expect(c.putObject("b", "k", "x")).rejects.toThrow(S3Error);
      expect(viaEvent).toHaveLength(1);
      expect(viaEvent[0].status).toBe(500);
    } finally {
      mock.restore();
    }
  });

  test("caller abort emits requestAbort with the signal reason", async () => {
    const mock = mockFetch(() => ({}));
    try {
      const c = client();
      const aborts: S3AbortEvent[] = [];
      c.on(S3Event.requestAbort, (event) => aborts.push(event));

      const controller = new AbortController();
      controller.abort(new Error("user cancelled"));

      await expect(
        c.putObject("b", "k", "x", { signal: controller.signal }),
      ).rejects.toThrow();

      expect(aborts).toHaveLength(1);
      expect(aborts[0].method).toBe("PUT");
      expect((aborts[0].reason as Error).message).toBe("user cancelled");
    } finally {
      mock.restore();
    }
  });

  test("events on getObject and bucketExists failures too", async () => {
    const mock = mockFetch(() => ({ status: 403, body: "denied" }));
    try {
      const c = client();
      let count = 0;
      c.on(S3Event.requestReject, () => count++);

      await expect(c.getObject("b", "k")).rejects.toThrow(S3Error);
      await expect(c.bucketExists("b")).rejects.toThrow(S3Error);

      expect(count).toBe(2);
    } finally {
      mock.restore();
    }
  });
});
