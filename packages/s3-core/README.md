# @playwright-labs/s3-core

Zero-dependency S3-compatible client — AWS Signature V4 over the global
`fetch`. Works with AWS S3, MinIO, Cloudflare R2, and any other
SigV4-compatible object storage.

Shared core for [`@playwright-labs/reporter-s3`](../reporter-s3) and
[`@playwright-labs/fixture-s3`](../fixture-s3), but usable standalone.

## Install

```sh
npm install @playwright-labs/s3-core
```

Requires Node.js 18+ (global `fetch`).

## Usage

```ts
import { S3Client } from "@playwright-labs/s3-core";

const client = new S3Client({
  endpoint: "http://localhost:9000", // MinIO, R2, or https://s3.amazonaws.com
  region: "us-east-1",               // default
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  forcePathStyle: true,              // default; required by MinIO
  http: { timeoutMs: 30_000, retries: 2 }, // optional — per-attempt timeout + retry
});

await client.ensureBucket("artifacts");
await client.putObject("artifacts", "report.json", JSON.stringify({ ok: true }), {
  contentType: "application/json",
});

const body = await client.getObject("artifacts", "report.json"); // Buffer
await client.deleteObject("artifacts", "report.json");
```

## API

### `new S3Client(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | — (required) | S3-compatible endpoint URL |
| `region` | `string` | `"us-east-1"` | Signing region |
| `accessKeyId` | `string` | — (required) | Access key |
| `secretAccessKey` | `string` | — (required) | Secret key |
| `forcePathStyle` | `boolean` | `true` | Path-style URLs (`endpoint/bucket/key`); set `false` for virtual-host style (`bucket.endpoint/key`) |
| `http.timeoutMs` | `number` | — | Per-attempt timeout (`AbortSignal.timeout`) |
| `http.retries` | `number` | `0` | Extra attempts after network errors, timeouts, and 5xx (4xx and caller aborts are never retried) |

### Methods

- `putObject(bucket, key, body, options?)` — upload `string | Buffer | Uint8Array | Readable | ReadableStream`; `options.contentType` (default `application/octet-stream`), `options.acl` (e.g. `private`)
- `createWriteStream(bucket, key, options?)` — writable stream over `putObject` (see below)
- `getObject(bucket, key, options?)` — resolves with a `Buffer`; throws `S3Error` on 404
- `deleteObject(bucket, key, options?)`
- `bucketExists(bucket, options?)` — `HEAD`, `true`/`false`; throws on other errors
- `createBucket(bucket, options?)` — 409 (already owned) treated as success
- `ensureBucket(bucket, options?)` — create unless it exists

### Streams

`putObject` accepts a Node `Readable` or a web `ReadableStream` as the body,
and `createWriteStream` returns a Node `Writable` to write into:

```ts
const stream = client.createWriteStream("logs", "run.log", {
  contentType: "text/plain",
});
stream.write("line 1\n");
stream.end("line 2\n");
await stream.done; // resolves after the upload succeeded; `finish` fires then too
```

Streams are **buffered in memory** and sent as a single signed PUT on
`end()` — SigV4 signs the sha256 of the whole payload, so the body must be
known upfront (no multipart / `aws-chunked` in this minimal client). A failed
upload rejects `done` and emits `error`; an `options.signal` abort destroys
the stream without uploading.

### AbortSignal

Every method accepts `options.signal` — an `AbortSignal` cancelling the
request, including all retry attempts:

```ts
const controller = new AbortController();
const download = client.getObject("artifacts", "big.bin", {
  signal: controller.signal,
});
controller.abort(); // download rejects
```

A caller abort is intentional and is never retried; timeouts and network
errors are retried up to `http.retries` times.

### `S3Error`

Thrown on any non-OK response; carries `status` and raw `body`.

### Attachment-name marker

Helpers linking `fixture-s3` and `reporter-s3` — the fixture stores uploads
as Playwright attachments named `s3:<bucket>:<name>`, the reporter routes
them to `<bucket>` on run end:

```ts
formatS3AttachmentName("images", "photo.jpg"); // "s3:images:photo.jpg"
parseS3AttachmentName("s3:images:photo.jpg");  // { bucket: "images", name: "photo.jpg" }
parseS3AttachmentName("screenshot.png");       // null — not a marker
```

## License

MIT
