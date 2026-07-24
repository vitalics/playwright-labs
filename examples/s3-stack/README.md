# s3-stack — Full Example

A complete, runnable example showing how `@playwright-labs/reporter-s3` and
`@playwright-labs/fixture-s3` integrate with a real S3-compatible storage
(MinIO): tests upload data via `useBucket()` and plain attachments, the
reporter ships everything to MinIO at run end, and a verification script
reads it all back.

Both fixture modes are demonstrated:

- `tests/sample.spec.ts` — **deferred**: `createFixture({ bucket })`,
  uploads become attachments, the reporter ships them at run end
- `tests/immediate.spec.ts` — **immediate**: `createFixture({ mode:
  "immediate", ... })`, the fixture uploads during the test, the object is
  read back from MinIO in the same test; also shows AbortSignal cancellation

## Infrastructure

| Service | Purpose | UI |
|---------|---------|-----|
| **MinIO** | S3-compatible storage receiving the reporter's uploads | http://localhost:9001 (minioadmin / minioadmin) |

## Quick start

```sh
# From this directory:
pnpm install
pnpm demo
```

`pnpm demo` = `test:e2e` + `verify`:

1. `global-setup.ts` pulls and starts MinIO via Docker Compose
2. The tests run — `useBucket()` uploads and plain `testInfo.attach()`
   attachments are collected (nothing touches S3 yet)
3. At run end the reporter creates the buckets and uploads everything +
   `summary.json`
4. `verify.ts` reads `summary.json` back from MinIO, fetches every referenced
   attachment, and asserts the bucket routing worked
5. MinIO is left running so you can explore the console afterwards
   (`pnpm infra:down` to stop it)

Requires [Docker](https://www.docker.com/) with the Compose plugin.

## What lands where

| Upload | Bucket | Why |
|--------|--------|-----|
| `useBucket("pw-data").put(...)` | `pw-data` | fixture marker `s3:pw-data:<name>` |
| `useBucket("pw-blobs").putFile(...)` | `pw-blobs` | fixture marker |
| `testInfo.attach("pixel.png", ...)` | `pw-screenshots` | `attachmentBucket` resolver routes `image/*` |
| `testInfo.attach("run-log.txt", ...)` | `pw-artifacts` | resolver returns `undefined` → default bucket |
| `summary.json` | `pw-artifacts` | always the default bucket |
| immediate `useBucket().put(...)` | `pw-immediate` | uploaded by the fixture itself, during the test |

Object layout (fixed `prefix: "runs/latest"` so `verify.ts` knows where to
look; the default is `runs/<ISO start timestamp>` — one folder per run):

```
runs/latest/summary.json
runs/latest/attachments/<testId>/<retry>-<index>-<name>
```

## Explore results

After a run, open the MinIO console — http://localhost:9001
(minioadmin / minioadmin) — and browse the four buckets, or:

```sh
pnpm verify     # re-read everything from MinIO and assert it is intact
pnpm infra:down # stop MinIO
```
