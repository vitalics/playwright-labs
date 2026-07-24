# @playwright-labs/reporter-s3

## 1.1.1

### Patch Changes

- 8cd9a82: **`@playwright-labs/s3-core`** — typed event system and pluggable transport.

  `S3Client` now extends `EventEmitter<S3ClientEvents>` with symbol event keys (no collision with userland names), exported as `S3Event`:

  | Event                   | Payload           | When                                                                |
  | ----------------------- | ----------------- | ------------------------------------------------------------------- |
  | `S3Event.requestSend`   | `S3RequestEvent`  | before every HTTP attempt (retries re-emit with a bumped `attempt`) |
  | `S3Event.response`      | `S3ResponseEvent` | HTTP response received                                              |
  | `S3Event.requestReject` | `S3Error`         | operation failed with a non-ok response                             |
  | `S3Event.requestAbort`  | `S3AbortEvent`    | request aborted by caller `signal` or timeout, with `reason`        |
  | `S3Event.error`         | `S3Error`         | symbol twin of `"error"`                                            |

  ```ts
  import { S3Client, S3Event } from "@playwright-labs/s3-core";

  const client = new S3Client({
    endpoint: "http://localhost:9000",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    captureRejections: true, // optional EventEmitter option passthrough
    fetch: myInstrumentedFetch, // NEW: custom fetch implementation
  });

  client.on(
    S3Event.requestSend,
    ({ method, url, attempt, maxAttempts, bodyLength }) => {
      console.log(
        `→ ${method} ${url} (${attempt}/${maxAttempts}, ${bodyLength}B)`,
      );
    },
  );
  client.on(S3Event.requestAbort, ({ reason }) =>
    console.warn("aborted:", reason),
  );
  client.on(S3Event.error, (error) =>
    metrics.increment("s3_errors", { status: error.status }),
  );
  ```

  Safety details:
  - `requestSend` payload strips the `authorization` header and carries `bodyLength` instead of the raw body — the SigV4 signature and payload never leak into listener logs
  - the string `"error"` event is emitted only when a listener is attached (an unobserved `"error"` emit would crash the process per EventEmitter semantics); the thrown `S3Error` stays the primary channel and is the same instance across throw and events

  **`@playwright-labs/reporter-s3`** — packaging fix: proper `dist` build (`main`/`exports`/`types` for ESM+CJS), `files` whitelist, `repository` metadata. No behavior changes.

- Updated dependencies [8cd9a82]
  - @playwright-labs/s3-core@1.2.0

## 1.1.0

### Minor Changes

- 63d68b5: Initial release of the S3 package family — ship Playwright run artifacts to any S3-compatible storage (AWS S3, MinIO, Cloudflare R2, ...).

  **`@playwright-labs/s3-core`** — zero-dependency S3 client:
  - `S3Client` — AWS Signature V4 over `fetch` (custom `fetch` injectable): `putObject`, `getObject`, `deleteObject`, `bucketExists`, `createBucket` (409-idempotent, `LocationConstraint` for non-`us-east-1`), `ensureBucket`
  - `BodyInput` everywhere: `string` / `Buffer` / `Uint8Array` / Node `Readable` / web `ReadableStream` (`collectBody` exported)
  - `createWriteStream()` / `S3WriteStream` — buffering writable, single signed PUT on `end()`, `await stream.done`
  - HTTP resilience: per-attempt `timeoutMs` (`AbortSignal.timeout`), `retries` for network errors and 5xx; caller `signal` aborts everything and is never retried
  - Typed events (`EventEmitter<S3ClientEvents>`, symbol keys via `S3Event`): `requestSend` (signature stripped from payload), `response`, `requestReject`, `requestAbort`, `error` — the string `"error"` twin fires only when listened to, so an unobserved failure never crashes the process
  - Attachment-name marker helpers (`formatS3AttachmentName` / `parseS3AttachmentName`) linking the fixture and the reporter

  ```ts
  import { S3Client, S3Event } from "@playwright-labs/s3-core";

  const client = new S3Client({
    endpoint: "http://localhost:9000", // MinIO
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    http: { timeoutMs: 5_000, retries: 2 },
  });

  client.on(S3Event.requestSend, ({ method, url, attempt, maxAttempts }) =>
    console.log(`${method} ${url} (${attempt}/${maxAttempts})`),
  );

  await client.ensureBucket("artifacts");
  await client.putObject(
    "artifacts",
    "runs/report.json",
    JSON.stringify(data),
    {
      contentType: "application/json",
    },
  );

  const log = client.createWriteStream("artifacts", "runs/run.log");
  log.write("step 1\n");
  log.end("step 2\n");
  await log.done;
  ```

  **`@playwright-labs/reporter-s3`** — Playwright reporter:
  - Uploads `summary.json` (status, counts, per-test results with `{bucket, key}` attachment refs) and test attachments (screenshots, videos, traces; `retry` encoded in keys)
  - Bucket routing: default `bucket`, `attachmentBucket` as a fixed name or a per-attachment resolver, fixture markers win over the resolver; every used bucket is lazily ensured
  - Credentials/endpoint from options or `AWS_S3_URL` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`
  - Toggles: `createBucket`, `uploadSummary`, `uploadAttachments`, `acl`, `prefix`, `forcePathStyle`

  ```ts
  // playwright.config.ts
  export default defineConfig({
    reporter: [
      [
        "@playwright-labs/reporter-s3",
        {
          endpoint: "http://localhost:9000",
          bucket: "pw-reports",
          attachmentBucket: ({ contentType }) =>
            contentType.startsWith("video/")
              ? "pw-videos"
              : contentType.startsWith("image/")
                ? "pw-screenshots"
                : undefined, // traces etc. → default bucket
        },
      ],
    ],
  });
  ```

  **`@playwright-labs/fixture-s3`** — `useBucket()` fixture:
  - `put` (Buffer/string/JSON auto content type), `putFile` (path / Buffer / stream), `createWriteStream` with `await .done`
  - Deferred mode (default): uploads become `s3:<bucket>:<name>` marker attachments, shipped by `reporter-s3` at run end; a clear error when the reporter is missing from `config.reporter`
  - Immediate mode (`createFixture({ mode: "immediate", ... })`): uploads go straight to S3 during the test, keys `[<prefix>/]<testId>/<retry>-<index>-<name>`, no reporter required

  ```ts
  import { test } from "@playwright-labs/fixture-s3";
  import { readFile } from "node:fs/promises";

  test("uploads run artifacts", async ({ useBucket }) => {
    const bucket = useBucket("some_bucket");

    await bucket.put({ qwe: "asd" }); // application/json
    await bucket.put("a,b,c", { name: "t.csv", contentType: "text/csv" });
    await bucket.putFile(await readFile("./a.jpg"), { name: "a.jpg" });
    await bucket.putFile("./a.jpg"); // by path, name = basename

    const log = bucket.createWriteStream({
      name: "run.log",
      contentType: "text/plain",
    });
    log.write("step 1\n");
    log.end("step 2\n");
    await log.done;
  });

  // immediate mode — no reporter required:
  // const { test } = createFixture({ mode: "immediate", bucket: "pw-artifacts",
  //   endpoint: "http://localhost:9000" });
  ```

  Covered by unit suites (mocked `fetch`, SigV4 structure, retry/abort/event edge cases) and integration suites against real MinIO via testcontainers (`SKIP_INTEGRATION=1` to opt out).

### Patch Changes

- Updated dependencies [63d68b5]
  - @playwright-labs/s3-core@1.1.0
