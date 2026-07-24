import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type {
  FullResult,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { BaseReporter } from "@playwright-labs/reporter-core";
import { S3Client, parseS3AttachmentName } from "@playwright-labs/s3-core";

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
  /** Callback to see after the result has been sent. It has been called after onEnd reporter event */
  afterSend?: () => Promise<void>;
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

  constructor(options: S3ReporterOptions) {
    super();
    this.#options = options;
  }

  async onEnd(result: FullResult): Promise<void> {
    const options = this.#options;
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

    const client = new S3Client({
      endpoint,
      region: options.region ?? process.env.AWS_REGION ?? "us-east-1",
      accessKeyId,
      secretAccessKey,
      forcePathStyle: options.forcePathStyle,
    });

    const ensuredBuckets = new Set<string>();
    const ensureBucket = async (bucket: string): Promise<void> => {
      if (ensuredBuckets.has(bucket)) return;
      if (options.createBucket ?? true) {
        await client.ensureBucket(bucket);
      }
      ensuredBuckets.add(bucket);
    };

    const resolveAttachmentBucket = (
      attachment: Attachment,
      test: TestCase,
      testResult: TestResult,
    ): string => {
      const route = options.attachmentBucket;
      if (typeof route === "function") {
        return route(attachment, test, testResult) ?? options.bucket;
      }
      return route ?? options.bucket;
    };

    await ensureBucket(options.bucket);

    const prefix =
      options.prefix ??
      `runs/${result.startTime.toISOString().replace(/[:.]/g, "-")}`;
    const putOptions = options.acl ? { acl: options.acl } : undefined;

    const attachmentRefs = new Map<
      string,
      Array<{ bucket: string; key: string }>
    >();

    if (options.uploadAttachments ?? true) {
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
            resolveAttachmentBucket(attachment, test, testResult);
          await ensureBucket(bucket);

          const name = sanitizeKeySegment(
            marker?.name ||
              attachment.name ||
              basename(attachment.path ?? `attachment-${index}`),
          );
          const key = `${prefix}/attachments/${test.id}/${testResult.retry}-${index}-${name}`;
          await client.putObject(bucket, key, content, {
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

    if (options.uploadSummary ?? true) {
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
      await client.putObject(
        options.bucket,
        `${prefix}/summary.json`,
        JSON.stringify(summary, null, 2),
        { contentType: "application/json", ...putOptions },
      );
    }
  }
}
