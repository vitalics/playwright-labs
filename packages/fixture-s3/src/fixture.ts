import { readFile } from "node:fs/promises";
import type { Readable } from "node:stream";
import { test as baseTest, expect, type TestInfo } from "@playwright/test";
import {
  S3Client,
  S3WriteStream,
  collectBody,
  formatS3AttachmentName,
  type HttpOptions,
} from "@playwright-labs/s3-core";

/** File content acceptable by `putFile` — streams are buffered in memory. */
export type FileInput = string | Buffer | Readable | ReadableStream<Uint8Array>;

export type PutOptions = {
  /** Object name inside the bucket. @default "data" / file basename */
  name?: string;
  /** Overrides the auto-detected content type. */
  contentType?: string;
  /** Cancels the upload (immediate mode) when aborted. */
  signal?: AbortSignal;
};

/** Reference to an uploaded object. */
export type PutResult = {
  bucket: string;
  name: string;
  /**
   * Full object key — immediate mode only. In deferred mode the key is
   * assigned by `@playwright-labs/reporter-s3` at run end and is unknown here.
   */
  key?: string;
};

export type Bucket = {
  /**
   * Uploads a value:
   * - `Buffer`/`Uint8Array` → as-is (`application/octet-stream`)
   * - `string` → UTF-8 (`text/plain`)
   * - anything else → `JSON.stringify` (`application/json`)
   */
  put(data: unknown, options?: PutOptions): Promise<PutResult>;
  /**
   * Uploads a file by path, content as a `Buffer`, or a stream
   * (`Readable` / web `ReadableStream` — buffered in memory).
   */
  putFile(file: FileInput, options?: PutOptions): Promise<PutResult>;
  /**
   * Writable stream: write chunks during the test, the upload happens on
   * `end()`. Await `.done` for the {@link PutResult}.
   *
   * ```ts
   * const log = useBucket().createWriteStream({ name: "run.log", contentType: "text/plain" });
   * log.write("step 1\n");
   * log.end("step 2\n");
   * await log.done;
   * ```
   */
  createWriteStream(options?: PutOptions): S3WriteStream<PutResult>;
};

export type Fixture = {
  /**
   * Returns a {@link Bucket} handle. Without an argument the default
   * `bucket` from {@link CreateFixtureOptions} is used.
   *
   * Deferred mode (default): uploads are stored as test attachments (named
   * `s3:<bucket>:<name>`) and shipped by `@playwright-labs/reporter-s3`
   * when the run ends — the reporter is REQUIRED in `config.reporter`.
   *
   * Immediate mode: uploads go straight to S3 during the test.
   */
  useBucket(bucket?: string): Bucket;
};

export type CreateFixtureOptions = {
  /**
   * - `"deferred"` (default) — uploads become marker attachments, shipped
   *   to S3 by `@playwright-labs/reporter-s3` at run end.
   * - `"immediate"` — the fixture uploads directly during the test via
   *   `@playwright-labs/s3-core`; no reporter required.
   */
  mode?: "deferred" | "immediate";
  /** Default bucket — `useBucket()` may then be called without an argument. */
  bucket?: string;

  // ── immediate mode only ────────────────────────────────────────────────
  /** S3-compatible endpoint. @default process.env.AWS_S3_URL */
  endpoint?: string;
  /** @default process.env.AWS_REGION ?? "us-east-1" */
  region?: string;
  /** @default process.env.AWS_ACCESS_KEY_ID */
  accessKeyId?: string;
  /** @default process.env.AWS_SECRET_ACCESS_KEY */
  secretAccessKey?: string;
  /** Path-style URLs (MinIO etc.). @default true */
  forcePathStyle?: boolean;
  /**
   * Key prefix for uploaded objects — a string or a per-test resolver.
   * Keys are `[<prefix>/]<testId>/<retry>-<index>-<name>`.
   */
  prefix?: string | ((testInfo: TestInfo) => string);
  /** Create used buckets when they do not exist. @default true */
  createBucket?: boolean;
  /** Canned ACL for uploaded objects, e.g. `private`. */
  acl?: string;
  /** Timeout and retry behaviour for every HTTP call. */
  http?: HttpOptions;
};

const IMMEDIATE_ONLY_OPTIONS = [
  "endpoint",
  "region",
  "accessKeyId",
  "secretAccessKey",
  "forcePathStyle",
  "prefix",
  "createBucket",
  "acl",
  "http",
] as const satisfies readonly (keyof CreateFixtureOptions)[];

/** Attachment content type marking an immediate-mode upload reference. */
export const S3_REF_CONTENT_TYPE =
  "application/vnd.playwright-labs.s3-ref+json";

function serialize(
  data: unknown,
  options?: PutOptions,
): { body: Buffer; contentType: string } {
  if (Buffer.isBuffer(data) || data instanceof Uint8Array) {
    return {
      body: Buffer.isBuffer(data) ? data : Buffer.from(data),
      contentType: options?.contentType ?? "application/octet-stream",
    };
  }
  if (typeof data === "string") {
    return {
      body: Buffer.from(data, "utf8"),
      contentType: options?.contentType ?? "text/plain",
    };
  }
  return {
    body: Buffer.from(JSON.stringify(data), "utf8"),
    contentType: options?.contentType ?? "application/json",
  };
}

/** Keep word chars, dots, dashes and slashes; collapse the rest. */
function sanitizeKeyName(name: string): string {
  return name.replace(/[^\w.\-/]+/g, "_");
}

function resolveBucket(
  bucket: string | undefined,
  defaultBucket: string | undefined,
): string {
  const resolved = bucket ?? defaultBucket;
  if (!resolved) {
    throw new TypeError(
      "useBucket: bucket name is required (argument or `bucket` in createFixture options)",
    );
  }
  return resolved;
}

function deferredUseBucket(
  options: CreateFixtureOptions,
  testInfo: TestInfo,
): Fixture["useBucket"] {
  const hasS3Reporter = testInfo.config.reporter.some(([name]) =>
    /reporter-s3/.test(String(name)),
  );
  if (!hasS3Reporter) {
    throw new Error(
      "fixture-s3: `useBucket` requires @playwright-labs/reporter-s3 in `config.reporter` — " +
        "the fixture stores uploads as attachments and the reporter ships them to S3; " +
        "without it the data has nowhere to go. " +
        "(Or use createFixture({ mode: 'immediate', ... }) to upload without a reporter.)",
    );
  }

  return (bucketName) => {
    const bucket = resolveBucket(bucketName, options.bucket);

    const attachBody = async (
      name: string,
      body: Buffer,
      contentType: string,
    ): Promise<PutResult> => {
      await testInfo.attach(formatS3AttachmentName(bucket, name), {
        body,
        contentType,
      });
      return { bucket, name };
    };

    return {
      async put(data, putOptions) {
        const { body, contentType } = serialize(data, putOptions);
        return attachBody(putOptions?.name ?? "data", body, contentType);
      },

      async putFile(file, putOptions) {
        if (typeof file === "string") {
          const name =
            putOptions?.name ?? file.split(/[\\/]/).pop() ?? "file";
          await testInfo.attach(formatS3AttachmentName(bucket, name), {
            path: file,
            contentType: putOptions?.contentType,
          });
          return { bucket, name };
        }
        return attachBody(
          putOptions?.name ?? "file",
          await collectBody(file),
          putOptions?.contentType ?? "application/octet-stream",
        );
      },

      createWriteStream(putOptions) {
        const name = putOptions?.name ?? "data";
        return new S3WriteStream<PutResult>(
          (body) =>
            attachBody(
              name,
              body,
              putOptions?.contentType ?? "application/octet-stream",
            ),
          putOptions?.signal,
        );
      },
    };
  };
}

function immediateUseBucket(
  options: CreateFixtureOptions,
  testInfo: TestInfo,
): Fixture["useBucket"] {
  let client: S3Client | undefined;
  const ensuredBuckets = new Set<string>();
  let uploadIndex = 0;

  const getClient = (): S3Client => {
    if (client) return client;
    const endpoint = options.endpoint ?? process.env.AWS_S3_URL;
    const accessKeyId = options.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      options.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;
    if (!endpoint) {
      throw new TypeError(
        "fixture-s3 (immediate): endpoint is required (option `endpoint` or env AWS_S3_URL)",
      );
    }
    if (!accessKeyId || !secretAccessKey) {
      throw new TypeError(
        "fixture-s3 (immediate): credentials are required " +
          "(options `accessKeyId`/`secretAccessKey` or env AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)",
      );
    }
    client = new S3Client({
      endpoint,
      region: options.region ?? process.env.AWS_REGION,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: options.forcePathStyle,
      http: options.http,
    });
    return client;
  };

  const buildKey = (name: string): string => {
    const prefix =
      typeof options.prefix === "function"
        ? options.prefix(testInfo)
        : options.prefix;
    const base = `${testInfo.testId}/${testInfo.retry}-${uploadIndex++}-${sanitizeKeyName(name)}`;
    return prefix ? `${prefix.replace(/\/+$/, "")}/${base}` : base;
  };

  const upload = async (
    bucket: string,
    name: string,
    body: Buffer | Uint8Array,
    contentType: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<PutResult> => {
    const s3 = getClient();
    if ((options.createBucket ?? true) && !ensuredBuckets.has(bucket)) {
      await s3.ensureBucket(bucket, { signal });
      ensuredBuckets.add(bucket);
    }
    const key = buildKey(name);
    await s3.putObject(bucket, key, body, {
      contentType,
      acl: options.acl,
      signal,
    });
    // leave a trace in the report — a small JSON ref, not the data itself
    await testInfo.attach(`s3-ref:${bucket}:${name}`, {
      body: JSON.stringify({ bucket, key }),
      contentType: S3_REF_CONTENT_TYPE,
    });
    return { bucket, name, key };
  };

  return (bucketName) => {
    const bucket = resolveBucket(bucketName, options.bucket);
    return {
      async put(data, putOptions) {
        const { body, contentType } = serialize(data, putOptions);
        const name = putOptions?.name ?? "data";
        return upload(bucket, name, body, contentType, putOptions?.signal);
      },

      async putFile(file, putOptions) {
        const body =
          typeof file === "string" ? await readFile(file) : await collectBody(file);
        const name =
          putOptions?.name ??
          (typeof file === "string"
            ? file.split(/[\\/]/).pop() ?? "file"
            : "file");
        return upload(
          bucket,
          name,
          body,
          putOptions?.contentType ?? "application/octet-stream",
          putOptions?.signal,
        );
      },

      createWriteStream(putOptions) {
        const name = putOptions?.name ?? "data";
        return new S3WriteStream<PutResult>(
          (body) =>
            upload(
              bucket,
              name,
              body,
              putOptions?.contentType ?? "application/octet-stream",
              putOptions?.signal,
            ),
          putOptions?.signal,
        );
      },
    };
  };
}

/**
 * Builds a configured `test` with the {@link Fixture} fixtures.
 *
 * ```ts
 * // deferred (default) — attachments shipped by reporter-s3 at run end
 * const { test, expect } = createFixture({ bucket: "pw-data" });
 *
 * // immediate — uploads go to S3 during the test, no reporter needed
 * const { test, expect } = createFixture({
 *   mode: "immediate",
 *   endpoint: "http://localhost:9000",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   bucket: "pw-data",
 *   http: { timeoutMs: 30_000, retries: 2 },
 * });
 * ```
 */
export function createFixture(options: CreateFixtureOptions = {}) {
  const mode = options.mode ?? "deferred";
  if (mode !== "deferred" && mode !== "immediate") {
    throw new TypeError(
      `createFixture: unknown mode "${String(mode)}" — expected "deferred" or "immediate"`,
    );
  }
  if (mode === "deferred") {
    const stray = IMMEDIATE_ONLY_OPTIONS.filter(
      (key) => options[key] !== undefined,
    );
    if (stray.length > 0) {
      throw new TypeError(
        `createFixture: option(s) ${stray.join(", ")} are only valid in immediate mode — ` +
          "in deferred mode the S3 connection belongs to @playwright-labs/reporter-s3. " +
          "Pass { mode: 'immediate' } to upload from the fixture directly.",
      );
    }
  }

  const test = baseTest.extend<Fixture>({
    useBucket: async ({}, use, testInfo) => {
      await use(
        mode === "immediate"
          ? immediateUseBucket(options, testInfo)
          : deferredUseBucket(options, testInfo),
      );
    },
  });

  return { test, expect };
}

/** Zero-config deferred fixture — equivalent to `createFixture().test`. */
export const test = createFixture().test;

export { expect } from "@playwright/test";
