import { createHash, createHmac } from "node:crypto";
import { Readable, Writable } from "node:stream";
import { EventEmitter } from "node:events";

const K_EVENT_REQUEST_SEND = Symbol("s3.events.request.send");
const K_EVENT_RESPONSE = Symbol("s3.events.response");
const K_EVENT_REQUEST_REJECT = Symbol("s3.events.request.reject");
const K_EVENT_REQUEST_ABORT = Symbol("s3.events.request.abort");
const K_EVENT_ERROR = Symbol("s3.events.error");

/**
 * Event keys emitted by {@link S3Client}. Symbols — no collision with
 * userland event names.
 *
 * ```ts
 * client.on(S3Event.requestSend, ({ method, url, attempt }) => { ... });
 * client.on(S3Event.error, (error) => { ... }); // safe symbol twin of "error"
 * ```
 *
 * The string `"error"` event is ALSO emitted for EventEmitter compatibility,
 * but only when at least one listener is attached (an unhandled `"error"`
 * emit would crash the process).
 */
export const S3Event = Object.freeze({
  /** Before every HTTP attempt. Payload: {@link S3RequestEvent} (signature stripped). */
  requestSend: K_EVENT_REQUEST_SEND,
  /** HTTP response data. If no error occurred */
  response: K_EVENT_RESPONSE,
  /** An operation failed with a non-ok response. Payload: {@link S3Error}. */
  requestReject: K_EVENT_REQUEST_REJECT,
  /** A request was aborted (caller signal or timeout). Payload: {@link S3AbortEvent}. */
  requestAbort: K_EVENT_REQUEST_ABORT,
  /** Symbol twin of the standard `"error"` event. Payload: {@link S3Error}. */
  error: K_EVENT_ERROR,
} as const);

export type S3RequestEvent = {
  url: URL;
  method: string;
  /** 1-based attempt counter (retries bump it). */
  attempt: number;
  maxAttempts: number;
  /**
   * Request headers minus `authorization` — the SigV4 signature must not
   * leak into listener logs.
   */
  headers: Record<string, string>;
  bodyLength: number;
};

export type S3ResponseEvent = {
  url: URL;
  method: string;
  response: Response;
  headers: Response["headers"];
  statusText: string;
  status: number;
  body?: ReadableStream<unknown> | null;
  isRetried: boolean;
  retryCount: number;
};

export type S3AbortEvent = {
  url: URL;
  method: string;
  attempt: number;
  reason: unknown;
};

export type S3ClientEvents = {
  [K_EVENT_REQUEST_SEND]: [S3RequestEvent];
  [K_EVENT_REQUEST_REJECT]: [S3Error];
  [K_EVENT_REQUEST_ABORT]: [S3AbortEvent];
  [K_EVENT_ERROR]: [S3Error];
  error: [S3Error];
  [K_EVENT_RESPONSE]: [S3ResponseEvent];
};

export type HttpOptions = {
  /** Per-attempt timeout in milliseconds (via `AbortSignal.timeout`). */
  timeoutMs?: number;
  /**
   * Extra attempts after network errors, timeouts, and 5xx responses.
   * A caller-provided `signal` abort is never retried.
   * @default 0
   */
  retries?: number;
};

export type RequestOptions = {
  /** Cancels the request (including all retry attempts) when aborted. */
  signal?: AbortSignal;
};

export type S3ClientOptions = {
  /**
   * Capture rejections from eventEmitter.
   * It's captures [automatic capturing of promise rejection](https://nodejs.org/docs/latest-v25.x/api/events.html#capture-rejections-of-promises).
   * @default false
   */
  captureRejections?: boolean;
  /** S3-compatible endpoint, e.g. `https://s3.amazonaws.com` or `http://localhost:9000` (MinIO). */
  endpoint: string;
  /** @default "us-east-1" */
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * Path-style URLs (`endpoint/bucket/key`) — required by MinIO and most
   * self-hosted S3 implementations.
   * @default true
   */
  forcePathStyle?: boolean;
  /** Timeout and retry behaviour for every HTTP call. */
  http?: HttpOptions;
  /**
   * Custom fetch API function.
   * @default
   * globalThis.fetch
   */
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
};

export type PutObjectOptions = RequestOptions & {
  /** @default "application/octet-stream" */
  contentType?: string;
  /** Canned ACL, e.g. `private`, `public-read`. Sent as `x-amz-acl`. */
  acl?: string;
};

/**
 * Anything `putObject` can upload. Streams are buffered in memory before
 * the request — SigV4 signs the sha256 of the whole payload, so the body
 * must be known upfront (no multipart / aws-chunked in this minimal client).
 */
export type BodyInput =
  string | Buffer | Uint8Array | Readable | ReadableStream<Uint8Array>;

/** Collects a {@link BodyInput} into a single Buffer. */
export async function collectBody(body: BodyInput): Promise<Buffer> {
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  // node Readable and web ReadableStream are both async-iterable
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<string | Uint8Array>) {
    chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk, "utf8")
        : Buffer.from(chunk),
    );
  }
  return Buffer.concat(chunks);
}

export class S3Error extends Error {
  readonly status: number;
  readonly body: string;
  constructor(operation: string, status: number, body: string) {
    super(`S3 ${operation} failed with ${status}: ${body || "<empty body>"}`);
    this.name = "S3Error";
    this.status = status;
    this.body = body;
  }
}

/**
 * Attachment-name marker linking `@playwright-labs/fixture-s3` and
 * `@playwright-labs/reporter-s3`: the fixture stores uploads as Playwright
 * attachments named `s3:<bucket>:<name>`, the reporter routes them
 * to `<bucket>` on run end.
 */
export const S3_ATTACHMENT_PREFIX = "s3:";

export function formatS3AttachmentName(bucket: string, name: string): string {
  return `${S3_ATTACHMENT_PREFIX}${bucket}:${name}`;
}

export function parseS3AttachmentName(
  attachmentName: string,
): { bucket: string; name: string } | null {
  if (!attachmentName.startsWith(S3_ATTACHMENT_PREFIX)) return null;
  const rest = attachmentName.slice(S3_ATTACHMENT_PREFIX.length);
  const separator = rest.indexOf(":");
  if (separator <= 0 || separator === rest.length - 1) return null;
  return {
    bucket: rest.slice(0, separator),
    name: rest.slice(separator + 1),
  };
}

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/** Combine caller and timeout signals; `AbortSignal.any` with a Node 18 fallback. */
function anySignal(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a || !b) return a ?? b;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a, b]);
  const controller = new AbortController();
  for (const signal of [a, b]) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener(
      "abort",
      () => {
        controller.abort(signal.reason);
      },
      {
        once: true,
      },
    );
  }
  return controller.signal;
}

/** RFC 3986 encode, keeping `/` for object keys. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}

/**
 * Buffering writable stream over `putObject` — chunks accumulate in memory,
 * the single signed PUT happens on `end()`. `finish` fires only after the
 * upload succeeded; a failed upload emits `error`. Await {@link done} for
 * a promise-style interface.
 */
export class S3WriteStream<T = void> extends Writable {
  /** Resolves after the upload succeeded; rejects on upload error or abort. */
  readonly done: Promise<T>;
  #chunks: Buffer[] = [];
  #upload: (body: Buffer) => Promise<T>;
  #result!: T;

  constructor(upload: (body: Buffer) => Promise<T>, signal?: AbortSignal) {
    super();
    this.#upload = upload;
    this.done = new Promise<T>((resolve, reject) => {
      this.once("finish", () => resolve(this.#result));
      this.once("error", reject);
    });
    // consumers may use only events — keep a rejected `done` from becoming
    // an unhandled rejection
    this.done.catch(() => {});
    if (signal) {
      const abort = () =>
        this.destroy(
          signal.reason instanceof Error
            ? signal.reason
            : new DOMException("This operation was aborted", "AbortError"),
        );
      if (signal.aborted) {
        // let the caller attach listeners first
        queueMicrotask(abort);
      } else {
        signal.addEventListener("abort", abort, { once: true });
        this.once("close", () => signal.removeEventListener("abort", abort));
      }
    }
  }

  override _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.#chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk, encoding)
        : Buffer.from(chunk as Uint8Array),
    );
    callback();
  }

  override _final(callback: (error?: Error | null) => void): void {
    this.#upload(Buffer.concat(this.#chunks)).then(
      (result) => {
        this.#result = result;
        callback();
      },
      (error) => callback(error as Error),
    );
  }
}

/**
 * Minimal S3-compatible client — AWS Signature V4 over global `fetch`,
 * zero dependencies. Works with AWS S3, MinIO, Cloudflare R2, and any
 * other SigV4-compatible object storage.
 */
export class S3Client extends EventEmitter<S3ClientEvents> {
  #endpoint: string;
  #region: string;
  #accessKeyId: string;
  #secretAccessKey: string;
  #forcePathStyle: boolean;
  #http: HttpOptions;
  #fetch: Required<Pick<S3ClientOptions, "fetch">>["fetch"] = fetch;

  constructor(options: S3ClientOptions) {
    super({ captureRejections: options.captureRejections ?? false });
    if (!options.endpoint)
      throw new TypeError("S3Client: endpoint is required");
    if (!options.accessKeyId || !options.secretAccessKey) {
      throw new TypeError(
        "S3Client: accessKeyId and secretAccessKey are required",
      );
    }
    this.#fetch = options.fetch ?? fetch;
    this.#endpoint = options.endpoint.replace(/\/+$/, "");
    this.#region = options.region ?? "us-east-1";
    this.#accessKeyId = options.accessKeyId;
    this.#secretAccessKey = options.secretAccessKey;
    this.#forcePathStyle = options.forcePathStyle ?? true;
    this.#http = options.http ?? {};
  }

  async putObject(
    bucket: string,
    key: string,
    body: BodyInput,
    options?: PutObjectOptions,
  ): Promise<void> {
    const payload = await collectBody(body);
    const headers: Record<string, string> = {
      "content-type": options?.contentType ?? "application/octet-stream",
    };
    if (options?.acl) headers["x-amz-acl"] = options.acl;
    const response = await this.#request(
      "PUT",
      bucket,
      key,
      payload,
      headers,
      options?.signal,
    );
    await this.#assertOk("putObject", response);
  }

  /**
   * Writable stream over {@link putObject}: chunks are buffered in memory
   * and uploaded as a single signed PUT on `end()` (SigV4 needs the whole
   * payload upfront). `finish`/`done` fire only after the upload succeeded.
   *
   * ```ts
   * const stream = client.createWriteStream("logs", "run.log");
   * stream.write("line 1\n");
   * stream.write("line 2\n");
   * stream.end();
   * await stream.done;
   * ```
   */
  createWriteStream(
    bucket: string,
    key: string,
    options?: PutObjectOptions,
  ): S3WriteStream {
    return new S3WriteStream(
      (body) => this.putObject(bucket, key, body, options),
      options?.signal,
    );
  }

  async getObject(
    bucket: string,
    key: string,
    options?: RequestOptions,
  ): Promise<Buffer> {
    const response = await this.#request(
      "GET",
      bucket,
      key,
      undefined,
      {},
      options?.signal,
    );
    if (!response.ok) {
      throw this.#emitError(
        new S3Error("getObject", response.status, await response.text()),
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async deleteObject(
    bucket: string,
    key: string,
    options?: RequestOptions,
  ): Promise<void> {
    const response = await this.#request(
      "DELETE",
      bucket,
      key,
      undefined,
      {},
      options?.signal,
    );
    await this.#assertOk("deleteObject", response);
  }

  async bucketExists(
    bucket: string,
    options?: RequestOptions,
  ): Promise<boolean> {
    const response = await this.#request(
      "HEAD",
      bucket,
      "",
      undefined,
      {},
      options?.signal,
    );
    await response.arrayBuffer(); // drain
    if (response.ok) return true;
    if (response.status === 404) return false;
    throw this.#emitError(new S3Error("bucketExists", response.status, ""));
  }

  async createBucket(bucket: string, options?: RequestOptions): Promise<void> {
    const body =
      this.#region === "us-east-1"
        ? Buffer.alloc(0)
        : Buffer.from(
            `<CreateBucketConfiguration><LocationConstraint>${this.#region}</LocationConstraint></CreateBucketConfiguration>`,
            "utf8",
          );
    const response = await this.#request(
      "PUT",
      bucket,
      "",
      body,
      {},
      options?.signal,
    );
    // 409 BucketAlreadyOwnedByYou — treat as success for idempotency
    if (response.status === 409) {
      await response.arrayBuffer();
      return;
    }
    await this.#assertOk("createBucket", response);
  }

  /** Creates the bucket unless it already exists. */
  async ensureBucket(bucket: string, options?: RequestOptions): Promise<void> {
    if (!(await this.bucketExists(bucket, options))) {
      await this.createBucket(bucket, options);
    }
  }

  async #assertOk(operation: string, response: Response): Promise<void> {
    if (!response.ok) {
      throw this.#emitError(
        new S3Error(operation, response.status, await response.text()),
      );
    }
    // drain the body so undici can reuse the connection
    await response.arrayBuffer();
  }

  /** Emits reject + error events; string "error" only when listened to. */
  #emitError(error: S3Error): S3Error {
    this.emit(S3Event.requestReject, error);
    this.emit(S3Event.error, error);
    // bare "error" emit without listeners crashes the process (EventEmitter
    // semantics) — the thrown S3Error is the primary channel, the event is a bonus
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
    }
    return error;
  }

  async #request(
    method: string,
    bucket: string,
    key: string,
    body?: Buffer | Uint8Array,
    extraHeaders: Record<string, string> = {},
    callerSignal?: AbortSignal,
  ): Promise<Response> {
    const url = new URL(this.#endpoint);
    let path: string;
    if (this.#forcePathStyle) {
      path = `/${bucket}${key ? `/${encodeKey(key)}` : ""}`;
    } else {
      url.host = `${bucket}.${url.host}`;
      path = key ? `/${encodeKey(key)}` : "/";
    }
    url.pathname = path;

    const now = new Date();
    const amzDate = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash =
      body && body.length > 0 ? sha256hex(body) : EMPTY_SHA256;

    const headers: Record<string, string> = {
      ...extraHeaders,
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    const signedHeaderNames = Object.keys(headers)
      .map((h) => h.toLowerCase())
      .sort();
    const canonicalHeaders = signedHeaderNames
      .map((h) => `${h}:${headers[h].trim()}\n`)
      .join("");
    const signedHeaders = signedHeaderNames.join(";");

    const canonicalRequest = [
      method,
      path,
      "", // canonical query string (no query-based operations used)
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const scope = `${dateStamp}/${this.#region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      sha256hex(canonicalRequest),
    ].join("\n");

    const kDate = hmac(`AWS4${this.#secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, this.#region);
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = createHmac("sha256", kSigning)
      .update(stringToSign)
      .digest("hex");

    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${this.#accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // fetch sets the Host header itself; it must not be passed explicitly
    const { host: _host, ...requestHeaders } = headers;
    const requestBody =
      body && body.length > 0 ? (body as Uint8Array) : undefined;

    const maxAttempts = (this.#http.retries ?? 0) + 1;
    for (let attempt = 1; ; attempt++) {
      // fresh timeout per attempt — AbortSignal.timeout starts ticking on creation
      const timeoutSignal = this.#http.timeoutMs
        ? AbortSignal.timeout(this.#http.timeoutMs)
        : undefined;
      const signal = anySignal(callerSignal, timeoutSignal);
      try {
        // authorization carries the signature — never expose it to listeners
        const { authorization: _authorization, ...safeHeaders } =
          requestHeaders;
        this.emit(S3Event.requestSend, {
          url: new URL(url),
          method,
          attempt,
          maxAttempts,
          headers: safeHeaders,
          bodyLength: requestBody?.length ?? 0,
        });
        const response = await this.#fetch(url, {
          method,
          headers: requestHeaders,
          body: requestBody,
          signal,
        });
        this.emit(K_EVENT_RESPONSE, {
          url,
          method,
          response,
          body: response.body,
          headers: response.headers,
          statusText: response.statusText,
          status: response.status,
          isRetried: attempt > 1,
          retryCount: attempt - 1,
        });
        // 5xx is retryable; 4xx is the caller's problem — no retry
        if (response.status >= 500 && attempt < maxAttempts) {
          await response.arrayBuffer(); // drain before retrying
          continue;
        }
        return response;
      } catch (error) {
        // caller abort is intentional — never retry it
        if (callerSignal?.aborted || attempt >= maxAttempts) {
          const aborted =
            callerSignal?.aborted ||
            (error instanceof Error &&
              (error.name === "AbortError" || error.name === "TimeoutError"));
          if (aborted) {
            this.emit(S3Event.requestAbort, {
              url: new URL(url),
              method,
              attempt,
              reason: callerSignal?.reason ?? error,
            });
          }
          throw error;
        }
      }
    }
  }
}
