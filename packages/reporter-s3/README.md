# @playwright-labs/reporter-s3

Playwright reporter that uploads test attachments (screenshots, videos,
traces) and a run summary to any S3-compatible storage — AWS S3, MinIO,
Cloudflare R2.

Zero AWS SDK: signing is done by
[`@playwright-labs/s3-core`](../s3-core) (SigV4 over `fetch`).

## Install

```sh
npm install --save-dev @playwright-labs/reporter-s3
```

## Usage

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    [
      "@playwright-labs/reporter-s3",
      {
        endpoint: "http://localhost:9000", // or env AWS_S3_URL
        accessKeyId: "minioadmin",         // or env AWS_ACCESS_KEY_ID
        secretAccessKey: "minioadmin",     // or env AWS_SECRET_ACCESS_KEY
        bucket: "pw-artifacts",
      },
    ],
  ],
});
```

Uploads happen once, at the end of the run (`onEnd`).

## Object layout

```
<prefix>/summary.json
<prefix>/attachments/<testId>/<retry>-<index>-<name>
```

`summary.json` contains the run status, duration, per-test outcomes, and
references (`bucket` + `key`) to every uploaded attachment.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `bucket` | `string` | — (required) | Default bucket for all objects |
| `endpoint` | `string` | `env.AWS_S3_URL` | S3-compatible endpoint |
| `region` | `string` | `env.AWS_REGION ?? "us-east-1"` | Signing region |
| `accessKeyId` | `string` | `env.AWS_ACCESS_KEY_ID` | Access key |
| `secretAccessKey` | `string` | `env.AWS_SECRET_ACCESS_KEY` | Secret key |
| `attachmentBucket` | `string \| resolver` | — | Per-attachment bucket routing (see below) |
| `createBucket` | `boolean` | `true` | Create used buckets when missing |
| `prefix` | `string` | `runs/<ISO start timestamp>` | Key prefix for all objects |
| `uploadSummary` | `boolean` | `true` | Upload `summary.json` |
| `uploadAttachments` | `boolean` | `true` | Upload test attachments |
| `acl` | `string` | — | Canned ACL, e.g. `private`, `public-read` |
| `forcePathStyle` | `boolean` | `true` | Path-style URLs (MinIO etc.) |

## Bucket routing

Route attachments to different buckets — a fixed name, or a resolver:

```ts
attachmentBucket: ({ contentType }) =>
  contentType.startsWith("video/") ? "pw-videos"
  : contentType.startsWith("image/") ? "pw-screenshots"
  : undefined, // traces etc. fall back to the default `bucket`
```

## fixture-s3 integration

[`@playwright-labs/fixture-s3`](../fixture-s3) lets tests upload arbitrary
data from inside a test via `useBucket()`. The fixture stores uploads as
attachments named `s3:<bucket>:<name>`; this reporter recognises the marker
and routes them to the requested bucket — the marker wins over
`attachmentBucket`.

## License

MIT
