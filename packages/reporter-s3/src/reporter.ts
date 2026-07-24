import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type {
  FullResult,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { BaseReporter } from "@playwright-labs/reporter-core";
import {
  S3Client,
  parseS3AttachmentName,
  S3Event,
} from "@playwright-labs/s3-core";

export type Attachment = TestResult["attachments"][number];

/**
 * Routes an attachment to a bucket. Return `undefined` to fall back to the
 * default `bucket`.
 *
 * @example route by content type
 * ```ts
 * attachmentBucket: ({ contentType }) =>
 *   contentType.startsWith('video/') ? 'pw-videos'
 *   : contentType.startsWith('image/') ? 'pw-screenshots'
 *   : undefined // traces etc. go to the default bucket
 * ```
 */
export type AttachmentBucketResolver = (
  attachment: Attachment,
  test: TestCase,
  result: TestResult,
) => string | undefined;

export type S3ReporterOptions = {
  /** S3-compatible endpoint. @default process.env.AWS_S3_URL */
  endpoint?: string;
  /** @default process.env.AWS_REGION ?? "us-east-1" */
  region?: string;
  /** @default process.env.AWS_ACCESS_KEY_ID */
  accessKeyId?: string;
  /** @default process.env.AWS_SECRET_ACCESS_KEY */
  secretAccessKey?: string;
  /** Default bucket for all objects. Required. */
  bucket: string;
  /**
   * Per-attachment bucket routing: a fixed bucket name for all attachments,
   * or a resolver deciding per attachment (`undefined` → default `bucket`).
   */
  attachmentBucket?: string | AttachmentBucketResolver;
  /** Create used buckets when they do not exist. @default true */
  createBucket?: boolean;
  /**
   * Key prefix for all uploaded objects.
   * @default `runs/<ISO start timestamp>`
   */
  prefix?: string;
  /** Upload `summary.json` with the run outcome. @default true */
  uploadSummary?: boolean;
  /** Upload test attachments (screenshots, videos, traces). @default true */
  uploadAttachments?: boolean;
  /** Canned ACL for uploaded objects, e.g. `private`. */
  acl?: string;
  /** Path-style URLs (MinIO etc.). @default true */
  forcePathStyle?: boolean;
  /**
   * custom fetch client.
   * @default
   * globalThis.fetch
   */
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  /**
   * count of retries if HTTP request does not sended.
   * @default 0
   */
  retries?: number;
  /** Per-attempt timeout in milliseconds (via `AbortSignal.timeout`). */
  timeoutMs?: number;
  /**
   * Capture rejections from eventEmitter.
   * It's captures [automatic capturing of promise rejection](https://nodejs.org/docs/latest-v25.x/api/events.html#capture-rejections-of-promises).
   * @default false
   */
  captureRejections?: boolean;
};

function sanitizeKeySegment(segment: string): string {
  return segment.replace(/[^\w.\-]+/g, "_");
}

/**
 * Playwright reporter that uploads the run summary and test attachments
 * to any S3-compatible storage (AWS S3, MinIO, Cloudflare R2, ...).
 *
 * Object layout:
 *
 * ```
 * <prefix>/summary.json
 * <prefix>/attachments/<testId>/<retry>-<index>-<name>
 * ```
 */
export default class S3Reporter extends BaseReporter {
  #options: S3ReporterOptions;

  #client: S3Client;
  #ensuredBuckets = new Set<string>();

  constructor(options: S3ReporterOptions) {
    super();
    this.#options = options;
    const endpoint = options.endpoint ?? process.env.AWS_S3_URL;
    const accessKeyId = options.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      options.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;

    if (!endpoint) {
      throw new TypeError(
        "S3Reporter: endpoint is required (option `endpoint` or env AWS_S3_URL)",
      );
    }
    if (!accessKeyId || !secretAccessKey) {
      throw new TypeError(
        "S3Reporter: credentials are required (options `accessKeyId`/`secretAccessKey` or env AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)",
      );
    }
    if (!options.bucket) {
      throw new TypeError("S3Reporter: bucket is required");
    }

    this.#client = new S3Client({
      endpoint,
      region: options.region ?? process.env.AWS_REGION ?? "us-east-1",
      accessKeyId,
      secretAccessKey,
      forcePathStyle: options.forcePathStyle,
      fetch: this.#options.fetch ?? fetch,
      http: {
        retries: this.#options?.retries,
        timeoutMs: this.#options.timeoutMs,
      },
      captureRejections: this.#options.captureRejections,
    });
  }

  async #ensureBucket(bucket: string): Promise<void> {
    if (this.#ensuredBuckets.has(bucket)) return;
    if (this.#options.createBucket ?? true) {
      await this.#client.ensureBucket(bucket);
    }
    this.#ensuredBuckets.add(bucket);
  }

  #resolveAttachmentBucket(
    attachment: Attachment,
    test: TestCase,
    testResult: TestResult,
  ): string {
    const route = this.#options.attachmentBucket;
    if (typeof route === "function") {
      return route(attachment, test, testResult) ?? this.#options.bucket;
    }
    return route ?? this.#options.bucket;
  }

  async onEnd(result: FullResult): Promise<void> {
    await this.#ensureBucket(this.#options.bucket);

    const prefix =
      this.#options.prefix ??
      `runs/${result.startTime.toISOString().replace(/[:.]/g, "-")}`;
    const putOptions = this.#options.acl
      ? { acl: this.#options.acl }
      : undefined;

    const attachmentRefs = new Map<
      string,
      Array<{ bucket: string; key: string }>
    >();

    if (this.#options.uploadAttachments ?? true) {
      for (const [test, testResult] of this.testCases) {
        const refs: Array<{ bucket: string; key: string }> = [];
        for (const [index, attachment] of testResult.attachments.entries()) {
          let content: Buffer;
          if (attachment.body) {
            content = attachment.body;
          } else if (attachment.path) {
            try {
              content = await readFile(attachment.path);
            } catch {
              continue; // attachment file vanished — skip, keep uploading the rest
            }
          } else {
            continue;
          }

          // fixture-s3 marker (`s3:<bucket>:<name>`) wins over the resolver
          const marker = parseS3AttachmentName(attachment.name ?? "");
          const bucket =
            marker?.bucket ??
            this.#resolveAttachmentBucket(attachment, test, testResult);
          await this.#ensureBucket(bucket);

          const name = sanitizeKeySegment(
            marker?.name ||
              attachment.name ||
              basename(attachment.path ?? `attachment-${index}`),
          );
          const key = `${prefix}/attachments/${test.id}/${testResult.retry}-${index}-${name}`;
          await this.#client.putObject(bucket, key, content, {
            contentType: attachment.contentType,
            ...putOptions,
          });
          refs.push({ bucket, key });
        }
        if (refs.length > 0) {
          attachmentRefs.set(`${test.id}:${testResult.retry}`, refs);
        }
      }
    }

    if (this.#options.uploadSummary ?? true) {
      const summary = {
        status: result.status,
        startTime: result.startTime.toISOString(),
        duration: result.duration,
        counts: this.counts,
        tests: this.testCases.map(([test, testResult]) => ({
          id: test.id,
          title: test.titlePath().filter(Boolean).join(" › "),
          status: testResult.status,
          duration: testResult.duration,
          retry: testResult.retry,
          errors: testResult.errors.map((e) => e.message ?? String(e)),
          attachments:
            attachmentRefs.get(`${test.id}:${testResult.retry}`) ?? [],
        })),
      };
      await this.#client.putObject(
        this.#options.bucket,
        `${prefix}/summary.json`,
        JSON.stringify(summary, null, 2),
        { contentType: "application/json", ...putOptions },
      );
    }
  }
}
