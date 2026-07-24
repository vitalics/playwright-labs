# @playwright-labs/fixture-s3

Playwright fixture for uploading arbitrary data to S3 from inside a test —
`useBucket()` returns a handle with two upload modes:

- **deferred** (default) — uploads are stored as test attachments and shipped
  by [`@playwright-labs/reporter-s3`](../reporter-s3) when the run ends
- **immediate** — the fixture uploads straight to S3 during the test, no
  reporter required; `put()` returns the full object key

## Install

```sh
npm install --save-dev @playwright-labs/fixture-s3
# deferred mode also needs the reporter:
npm install --save-dev @playwright-labs/reporter-s3
```

## `createFixture(options?)`

### Deferred mode (default)

The S3 connection belongs to the reporter (`playwright.config.ts`); the
fixture only records attachments named `s3:<bucket>:<name>`. The reporter is
**required** in `config.reporter` — `useBucket` throws early when it is
missing.

```ts
import { createFixture } from "@playwright-labs/fixture-s3";

const { test, expect } = createFixture({ bucket: "pw-data" });

test("collects data to S3", async ({ useBucket }) => {
  const bucket = useBucket(); // default bucket pw-data

  await bucket.put({ users: 3 });                          // → JSON, name "data"
  await bucket.put("a,b,c", { name: "t.csv", contentType: "text/csv" });
  await bucket.putFile("./artifacts/photo.jpg");           // name "photo.jpg"

  await useBucket("pw-blobs").putFile(Buffer.from("…"), { name: "raw.bin" });
});
```

Passing connection options in deferred mode is a `TypeError` — they would
silently do nothing otherwise.

The zero-config export is still available:
`import { test, expect } from "@playwright-labs/fixture-s3"` ≡
`createFixture().test`.

### Immediate mode

The fixture builds its own S3 client and uploads during the test — the
object is in S3 the moment `put()` resolves, so the test itself can verify
it. No reporter needed.

```ts
const { test, expect } = createFixture({
  mode: "immediate",
  endpoint: "http://localhost:9000",   // ?? env AWS_S3_URL
  accessKeyId: "minioadmin",           // ?? env AWS_ACCESS_KEY_ID
  secretAccessKey: "minioadmin",       // ?? env AWS_SECRET_ACCESS_KEY
  region: "us-east-1",                 // ?? env AWS_REGION
  bucket: "pw-data",
  prefix: "runs/latest",               // string | (testInfo) => string
  http: { timeoutMs: 30_000, retries: 2 },
});

test("upload verifiable in-test", async ({ useBucket }) => {
  const ref = await useBucket().put({ ok: true }, { name: "report.json" });
  // ref = { bucket: "pw-data", name: "report.json", key: "runs/latest/<testId>/0-0-report.json" }
});
```

Each upload leaves a small `s3-ref:<bucket>:<name>` attachment
(`{ bucket, key }` JSON) as a trace in the report — the data itself is not
duplicated.

### Options

| Option | Mode | Default | Description |
|---|---|---|---|
| `mode` | — | `"deferred"` | `"deferred"` or `"immediate"` |
| `bucket` | both | — | Default bucket → `useBucket()` without argument |
| `endpoint` | immediate | `env.AWS_S3_URL` | S3-compatible endpoint |
| `region` | immediate | `env.AWS_REGION ?? "us-east-1"` | Signing region |
| `accessKeyId` | immediate | `env.AWS_ACCESS_KEY_ID` | Access key |
| `secretAccessKey` | immediate | `env.AWS_SECRET_ACCESS_KEY` | Secret key |
| `forcePathStyle` | immediate | `true` | Path-style URLs (MinIO etc.) |
| `prefix` | immediate | — | Key prefix; string or `(testInfo) => string` |
| `createBucket` | immediate | `true` | Create used buckets when missing |
| `acl` | immediate | — | Canned ACL, e.g. `private` |
| `http` | immediate | — | `{ timeoutMs, retries }` for every HTTP call |

Object keys in immediate mode: `[<prefix>/]<testId>/<retry>-<index>-<name>`.

### `put` / `putFile` / `createWriteStream`

- `put(data, options?)` — `Buffer`/`Uint8Array` as-is (`application/octet-stream`),
  `string` as UTF-8 (`text/plain`), anything else `JSON.stringify`-ed
  (`application/json`). Default name: `data`.
- `putFile(file, options?)` — file path (name defaults to the basename),
  `Buffer` content, or a stream (`Readable` / web `ReadableStream`,
  buffered in memory).
- `createWriteStream(options?)` — Node `Writable` to write into during the
  test; the upload happens on `end()`. Works in both modes.

`put`/`putFile` return `Promise<PutResult>` — `{ bucket, name, key? }`;
`key` is set in immediate mode only (in deferred mode the reporter assigns
it at run end). `createWriteStream` exposes the same value as `.done`:

```ts
const log = useBucket().createWriteStream({ name: "run.log", contentType: "text/plain" });
log.write("step 1\n");
log.end("step 2\n");
const ref = await log.done; // { bucket, name, key? } — uploaded/attached by now
```

`options`: `name`, `contentType`, and `signal` — an `AbortSignal` cancelling
the upload (immediate mode; forwarded to every HTTP call including bucket
creation):

```ts
const controller = new AbortController();
await bucket.put(bigBlob, { signal: controller.signal });
```

### Merging with your fixtures

```ts
import { mergeTests } from "@playwright/test";
import { createFixture } from "@playwright-labs/fixture-s3";

export const test = mergeTests(createFixture({ bucket: "pw-data" }).test, myTest);
```

## How deferred mode works

Uploads are stored as Playwright attachments named `s3:<bucket>:<name>`
(helpers in [`@playwright-labs/s3-core`](../s3-core)). At run end,
`reporter-s3` parses the marker and puts the object into `<bucket>` under
`<prefix>/attachments/<testId>/<retry>-<index>-<name>`. The marker takes
precedence over the reporter's `attachmentBucket` routing.

## License

MIT
