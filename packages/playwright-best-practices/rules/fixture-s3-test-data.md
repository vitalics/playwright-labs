---
title: Upload Test Artifacts and Data to S3 with fixture-s3
impact: MEDIUM
impactDescription: keeps large test artifacts out of the report and centralizes them in durable, shareable S3 storage
tags: s3, fixtures, artifacts, test-data, storage
---

## Upload Test Artifacts and Data to S3 with fixture-s3

**Impact: MEDIUM (keeps large test artifacts out of the report and centralizes them in durable, shareable S3 storage)**

Test runs generate data worth keeping — CSV exports, downloaded files, computed payloads, run logs — but stuffing megabytes into HTML-report attachments or CI artifacts makes reports slow and ephemeral. The `@playwright-labs/fixture-s3` package gives tests a `useBucket()` fixture with two upload modes: **deferred** (default), where uploads are recorded as `s3:<bucket>:<name>` attachments and shipped at run end by `@playwright-labs/reporter-s3`, and **immediate**, where the fixture builds its own `@playwright-labs/s3-core` client and uploads during the test so the test itself can verify the object. It works against AWS S3, MinIO, Cloudflare R2, or any SigV4-compatible storage.

## When to Use

- **Use deferred mode when**: You already run `@playwright-labs/reporter-s3` and want uploads routed to S3 alongside the rest of the run's artifacts — one connection, one `prefix`, everything lands at run end
- **Use immediate mode when**: The test needs to read the object back, assert on the returned key, or must guarantee the data is in S3 before the test ends — no reporter required
- **Use a bucket argument when**: Different data classes belong in different buckets — `useBucket()` uses the default `bucket` option, `useBucket("pw-blobs")` overrides it per call
- **Consider alternatives when**: Artifacts are small and only useful with the report (screenshots, traces) — plain `testInfo.attach()` plus reporter routing is enough
- **Required for**: Suites producing large/binary artifacts, pipelines where S3 (or MinIO/R2) is the single artifact store, tests that verify what they uploaded

## Guidelines

### Do

- Configure the fixture once with `createFixture({ bucket })` (or `createFixture({ mode: "immediate", ... })`) and reuse its `test`/`expect`, or merge them into your shared fixture file with `mergeTests`
- Give every upload an explicit, descriptive `name` (`bucket.put(data, { name: "users.csv", contentType: "text/csv" })`) — names become attachment names and object-key suffixes
- Let content types default correctly: `Buffer`/`Uint8Array` → `application/octet-stream`, `string` → `text/plain`, everything else is JSON-stringified to `application/json`
- Use `putFile(path)` for files on disk — the name defaults to the basename
- Use `createWriteStream()` for incrementally produced data (logs, streamed output); the upload happens on `end()`, and `await stream.done` tells you it landed
- In immediate mode, capture the `PutResult` from `put()` and verify the object with an `S3Client` from `@playwright-labs/s3-core` — `put()` returns `{ bucket, name, key }`
- Set `prefix` in immediate mode as a string or `(testInfo) => string` so objects from one run live under one key folder
- Pass an `AbortSignal` via `options.signal` for uploads that must be cancellable (immediate mode)

### Don't

- Don't pass connection options (`endpoint`, credentials, `http`, …) in deferred mode — it throws a `TypeError` because the S3 connection belongs to the reporter, not the fixture
- Don't expect `key` on the `PutResult` in deferred mode — the reporter assigns keys at run end, so `key` is only set in immediate mode
- Don't assume the reporter is optional in deferred mode — `useBucket` throws early when `@playwright-labs/reporter-s3` is missing from `config.reporter`
- Don't buffer huge payloads blindly — `putObject` and stream uploads are buffered in memory and sent as a single signed PUT (SigV4 signs the sha256 of the whole body); there is no multipart upload
- Don't point immediate mode at production buckets by default — use a dedicated bucket (or MinIO locally) and lifecycle-expire old run prefixes

### Tool Usage Patterns

- **Install**: `npm install --save-dev @playwright-labs/fixture-s3` — deferred mode also needs `npm install --save-dev @playwright-labs/reporter-s3`
- **Fixture factory**: `createFixture(options?)` returns `{ test, expect }`; the zero-config `import { test, expect } from "@playwright-labs/fixture-s3"` is equivalent to `createFixture().test`
- **Fixture**: `useBucket(bucket?)` returns a handle with `put(data, options?)`, `putFile(file, options?)`, and `createWriteStream(options?)`; `put`/`putFile` resolve to `{ bucket, name, key? }`
- **Immediate-mode options**: `endpoint` (env `AWS_S3_URL`), `accessKeyId` (env `AWS_ACCESS_KEY_ID`), `secretAccessKey` (env `AWS_SECRET_ACCESS_KEY`), `region` (env `AWS_REGION`, default `"us-east-1"`), `forcePathStyle` (default `true`, required by MinIO), `prefix`, `createBucket` (default `true`), `acl`, `http: { timeoutMs, retries }`
- **Key layout**: immediate mode writes `[<prefix>/]<testId>/<retry>-<index>-<name>`; deferred mode lets the reporter write `<prefix>/attachments/<testId>/<retry>-<index>-<name>`
- **Verification**: `new S3Client({ endpoint, accessKeyId, secretAccessKey })` from `@playwright-labs/s3-core` with `getObject`/`deleteObject`/`ensureBucket` for read-back assertions

## Edge Cases and Constraints

### Limitations

- Deferred uploads are invisible until run end — a test cannot verify its own deferred uploads, and a crashed runner may never ship them
- Streams are buffered in memory (SigV4 needs the full-body hash), so multi-gigabyte uploads are out of scope
- Immediate mode creates its own S3 client per fixture setup — for suites with heavy immediate uploads, prefer fewer, larger objects over many tiny ones
- Retries cover network errors, timeouts, and 5xx only; 4xx responses and caller aborts fail immediately (`S3Error` with `status` and `body`)

### Edge Cases

1. **MinIO/LocalStack locally**: keep `forcePathStyle: true` (the default) and point `endpoint` at `http://localhost:9000` — virtual-host style won't resolve against a local MinIO.
2. **Missing buckets in immediate mode**: `createBucket: true` (the default) creates used buckets on the fly, so first runs against a fresh MinIO just work; disable it when buckets are provisioned externally and creation should fail loudly.
3. **Cancelling a doomed upload**: pass `options.signal` — a caller abort destroys the stream without uploading and is never retried, which keeps a timed-out test from leaking a background upload.
4. **Mixing modes in one suite**: nothing stops a spec from using a deferred fixture and another an immediate one (the `s3-stack` example does exactly this) — but don't use both fixtures in the same test file without merging via `mergeTests`, or fixture keys collide.

### What Breaks If Ignored

- **Connection options silently ignored**: passing `endpoint`/credentials to deferred mode is a `TypeError` — the error is intentional, fixing it means moving connection config to the reporter or switching to `mode: "immediate"`
- **Missing reporter**: deferred mode without `@playwright-labs/reporter-s3` in `config.reporter` fails fast at fixture setup — uploads were never going anywhere
- **Undefined keys in deferred mode**: asserting `ref.key` after a deferred `put()` fails — the key only exists after the reporter ships the attachment
- **Memory pressure**: buffering multi-hundred-MB payloads in a worker process can OOM the test runner; chunk the data or upload to S3 outside the test process

**Incorrect (deferred mode with connection options, and asserting a key that doesn't exist yet):**

```typescript
import { createFixture } from "@playwright-labs/fixture-s3";

// ❌ Deferred mode + connection options = TypeError at fixture setup.
//    The S3 connection belongs to reporter-s3, not the fixture.
const { test, expect } = createFixture({
  bucket: "pw-data",
  endpoint: "http://localhost:9000", // ❌ not allowed in deferred mode
  accessKeyId: "minioadmin",         // ❌ not allowed in deferred mode
});

test("collects data", async ({ useBucket }) => {
  const ref = await useBucket().put({ users: 3 });

  // ❌ key is undefined in deferred mode — the reporter assigns it at run end
  expect(ref.key).toBeDefined();
});
```

**Why this fails:**
- Deferred mode deliberately throws on connection options instead of silently ignoring them
- The object key is produced by the reporter after the run — no key exists while the test is executing
- The test reads like immediate mode but behaves like deferred mode, so both failures look confusing

**Correct (immediate mode when the test must verify; deferred mode with a reporter otherwise):**

```typescript
import { S3Client } from "@playwright-labs/s3-core";
import { createFixture } from "@playwright-labs/fixture-s3";

const S3 = {
  endpoint: "http://localhost:9000", // ?? env AWS_S3_URL
  accessKeyId: "minioadmin",         // ?? env AWS_ACCESS_KEY_ID
  secretAccessKey: "minioadmin",     // ?? env AWS_SECRET_ACCESS_KEY
};

// ✅ Immediate mode: fixture owns the connection, uploads during the test
const { test, expect } = createFixture({
  mode: "immediate",
  ...S3,
  bucket: "pw-immediate",
  prefix: "runs/latest", // string | (testInfo) => string
  http: { timeoutMs: 30_000, retries: 2 },
});

test("upload is verifiable in the same test", async ({ useBucket }) => {
  // ✅ put() returns { bucket, name, key } — the object is already in S3
  const ref = await useBucket().put({ ok: true }, { name: "report.json" });
  expect(ref.key).toBeDefined();

  // ✅ Read it straight back with s3-core — impossible in deferred mode
  const client = new S3Client(S3);
  const body = await client.getObject(ref.bucket, ref.key!);
  expect(JSON.parse(body.toString("utf8"))).toEqual({ ok: true });
});
```

**Why this works:**
- Immediate mode uploads synchronously during the test, so `key` is real and read-back assertions are meaningful
- Connection options live where they belong — on the immediate fixture or the reporter, never on a deferred fixture
- `http.timeoutMs`/`retries` make uploads resilient to flaky local MinIO without test-level try/catch

## Common Mistakes

### Mistake 1: Deferred mode without the reporter

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [["html"]], // ❌ no @playwright-labs/reporter-s3
});

// spec
const { test } = createFixture({ bucket: "pw-data" }); // default deferred mode

test("collects data", async ({ useBucket }) => {
  // ❌ throws early: deferred mode requires reporter-s3 in config.reporter
  await useBucket().put({ users: 3 });
});
```

**Why this is wrong**: In deferred mode the fixture only records `s3:<bucket>:<name>` attachments; without the reporter nothing ever parses the markers and the uploads silently have no destination — so the fixture fails fast instead.

**How to fix**:

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-s3",
      {
        endpoint: "http://localhost:9000",
        accessKeyId: "minioadmin",
        secretAccessKey: "minioadmin",
        bucket: "pw-artifacts", // default bucket for plain attachments + summary.json
      },
    ],
  ],
});
```

### Mistake 2: Writing a stream but never awaiting the upload

```typescript
test("log upload", async ({ useBucket }) => {
  const log = useBucket().createWriteStream({ name: "run.log", contentType: "text/plain" });
  log.write("step 1\n");
  log.end("step 2\n");
  // ❌ test ends without awaiting — upload may fail unnoticed
});
```

**Why this is wrong**: `createWriteStream` uploads on `end()`, but the result is only observable via `.done` (and a failed upload rejects it). Dropping the promise hides upload errors.

**How to fix**:

```typescript
test("log upload", async ({ useBucket }) => {
  const log = useBucket().createWriteStream({ name: "run.log", contentType: "text/plain" });
  log.write("step 1\n");
  log.end("step 2\n");

  const ref = await log.done; // ✅ resolves after upload/attach; rejects on failure
  expect(ref.name).toBe("run.log");
});
```

### Mistake 3: Expecting per-run isolation without a prefix

```typescript
const { test } = createFixture({
  mode: "immediate",
  ...S3,
  bucket: "pw-immediate", // ❌ no prefix — every run mixes into the same key space
});
```

**Why this is wrong**: Keys are `<testId>/<retry>-<index>-<name>`, so two runs of the same suite write the same keys — later runs overwrite earlier artifacts and old objects can't be attributed to a run.

**How to fix**:

```typescript
const { test } = createFixture({
  mode: "immediate",
  ...S3,
  bucket: "pw-immediate",
  // ✅ one folder per run; a (testInfo) => string callback works too
  prefix: `runs/${new Date().toISOString()}`,
});
```

## Advanced Patterns

### Deferred mode with bucket routing via the reporter

Deferred uploads are attachments named `s3:<bucket>:<name>` (helpers `formatS3AttachmentName`/`parseS3AttachmentName` live in `@playwright-labs/s3-core`). The marker takes precedence over the reporter's `attachmentBucket` resolver, so fixture uploads always land in their named bucket while plain `testInfo.attach()` files follow the resolver:

```typescript
import { createFixture } from "@playwright-labs/fixture-s3";

const { test, expect } = createFixture({ bucket: "pw-data" });

test("routes by marker, not by resolver", async ({ useBucket }, testInfo) => {
  // → bucket "pw-data" (marker wins)
  await useBucket().put("a,b,c", { name: "t.csv", contentType: "text/csv" });
  // → bucket "pw-blobs" (explicit bucket argument)
  await useBucket("pw-blobs").putFile("./artifacts/photo.jpg");
  // → whatever reporter's attachmentBucket resolver says for image/*
  await testInfo.attach("pixel.png", {
    body: Buffer.from("…"),
    contentType: "image/png",
  });
});
```

### Cancelling an upload with AbortSignal

Immediate mode forwards `options.signal` to every HTTP call, including bucket creation:

```typescript
test("bail out of a doomed upload", async ({ useBucket }) => {
  const controller = new AbortController();
  controller.abort(); // test decided to stop early

  await expect(
    useBucket().put("never lands", { signal: controller.signal }),
  ).rejects.toThrow(/abort/i);
});
```

### Merging into a shared fixture file

```typescript
// fixtures/index.ts
import { mergeTests } from "@playwright/test";
import { createFixture } from "@playwright-labs/fixture-s3";

export const test = mergeTests(createFixture({ bucket: "pw-data" }).test, myTest);
export { expect } from "@playwright/test";
```

**When to use this pattern**: merge once when several specs share the same default bucket; create a second immediate-mode fixture only for the specs that verify uploads in-test.

## Integration with Other Best Practices

- **Compose Fixtures with mergeTests and mergeExpects** (`fixture-merge-tests-expects`): `createFixture().test` is designed to be merged — one shared fixture file exposes `useBucket` alongside page objects and other fixtures
- **Cancel Async Operations with AbortSignal Fixtures** (`fixture-abort-cancel`): pair the `signal` option on `put`/`putFile` with an abort-fixture controller so timed-out tests cancel in-flight uploads instead of leaking them
- **Enrich Test Reports with fixture-allure** (`fixture-allure-rich-reporting`): deferred uploads still appear as attachments (`s3:<bucket>:<name>` markers), so report-based debugging works while the heavy bytes live in S3
- **Test Against Real Services with fixture-testcontainers** (`fixture-testcontainers-real-services`): run MinIO in a container for immediate-mode read-back assertions in CI, exactly like the `s3-stack` example does with Docker Compose
- **Scale considerations**: at 100+ tests prefer deferred mode for bulk artifacts (one reporter-managed connection, uploads batched at run end) and reserve immediate mode for the few tests that must verify their uploads

Reference: [@playwright-labs/fixture-s3](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-s3)
