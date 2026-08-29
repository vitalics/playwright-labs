---
title: Upload Test Results and Artifacts to S3 with reporter-s3
impact: LOW
impactDescription: preserves screenshots, videos, and traces beyond CI artifact retention without AWS SDK
tags: s3, reporter, artifacts, screenshots, traces, minio, cloudflare-r2, ci, attachments
---

## Upload Test Results and Artifacts to S3 with reporter-s3

**Impact: LOW (preserves screenshots, videos, and traces beyond CI artifact retention without AWS SDK)**

CI artifact storage is ephemeral and tied to the CI provider — logs expire, links break, and sharing a failing trace with a colleague requires CI access. The `@playwright-labs/reporter-s3` package uploads test attachments (screenshots, videos, traces) and a machine-readable `summary.json` to any S3-compatible storage (AWS S3, MinIO, Cloudflare R2) at the end of the run. It has zero AWS SDK dependency — signing is done via `@playwright-labs/s3-core` (SigV4 over `fetch`), keeping install size and cold-start time small.

## When to Use

- **Use this reporter when**: You need durable, shareable artifact storage independent of the CI provider, or you run tests against self-hosted infrastructure (MinIO) with no CI artifact support
- **Use bucket routing when**: Different artifact types have different retention/access needs — e.g. videos in a short-retention bucket, screenshots in a long-retention one
- **Use `fixture-s3` together when**: Tests need to upload arbitrary data (HAR files, custom exports) from inside the test via `useBucket()` — the reporter recognises the `s3:<bucket>:<name>` attachment marker and routes it automatically
- **Consider alternatives when**: Your CI artifacts (GitHub Actions, GitLab) already cover retention needs and team access — S3 adds an infrastructure dependency that must be maintained

## Guidelines

### Do

- Read credentials from environment variables (`AWS_S3_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or CI secrets — never hardcode keys in `playwright.config.ts`
- Keep the default `prefix` (`runs/<ISO start timestamp>`) or set an explicit prefix per pipeline so runs never overwrite each other
- Keep `createBucket: true` (default) for local MinIO setups; disable it in production where buckets are provisioned by infrastructure
- Keep `forcePathStyle: true` (default) for MinIO and other S3-compatible services; AWS S3 works with either style
- Use `attachmentBucket` resolver to route large artifacts (videos) separately from small ones (screenshots)
- Keep `uploadSummary: true` (default) — `summary.json` is the index that links run status, per-test outcomes, and uploaded attachment keys

### Don't

- Don't commit access keys or secrets to the repository — use env vars and CI secret storage
- Don't disable `uploadAttachments` on failure-focused debugging workflows — traces and videos are the primary debugging payload
- Don't point multiple parallel runs at the same fixed `prefix` — objects will collide and overwrite each other
- Don't assume uploads are per-test — uploads happen once in `onEnd`, so killing the runner process loses everything

### Tool Usage Patterns

- **Install**: `npm install --save-dev @playwright-labs/reporter-s3`
- **Reporter entry**: `["@playwright-labs/reporter-s3", { bucket, endpoint, ... }]` alongside your usual reporters (`list`, `html`)
- **Object layout**: `<prefix>/summary.json` and `<prefix>/attachments/<testId>/<retry>-<index>-<name>`
- **Env fallbacks**: `endpoint` ← `AWS_S3_URL`, `region` ← `AWS_REGION` (default `us-east-1`), `accessKeyId` ← `AWS_ACCESS_KEY_ID`, `secretAccessKey` ← `AWS_SECRET_ACCESS_KEY`
- **Toggles**: `uploadSummary` and `uploadAttachments` (both default `true`), `acl` for canned ACLs like `private` or `public-read`

## Edge Cases and Constraints

### Limitations

- Uploads happen once in `onEnd` — a crashed or force-killed runner (`SIGKILL`, CI timeout) never uploads anything
- Very large attachments (full-size videos, traces) are uploaded sequentially at run end, adding wall-clock time to the pipeline
- MinIO and other non-AWS services require path-style URLs — the default `forcePathStyle: true` covers this; only change it if your provider mandates virtual-hosted style
- `summary.json` references attachments by `bucket` + `key` — consumers must have read access to the same buckets

### Edge Cases

1. **Parallel sharded runs**: Each shard uploads under its own timestamped prefix. Merge summaries downstream by listing objects under `runs/` for the run window.
2. **Retries producing duplicate attachment names**: Keys include `<retry>-<index>-<name>`, so retry attempts never overwrite each other.
3. **Mixed artifact retention**: Use the `attachmentBucket` resolver — videos to a lifecycle-expiring bucket, screenshots and traces to the default bucket. Return `undefined` from the resolver to fall back to the default `bucket`.
4. **Missing bucket in production**: `createBucket: true` will silently create a misnamed bucket instead of failing. Set `createBucket: false` in production to surface typos as errors.

### What Breaks If Ignored

- **Hardcoded credentials**: Keys leak into git history and any fork/PR build can exfiltrate them
- **Fixed shared prefix**: Concurrent pipelines overwrite each other's `summary.json`, making run history unusable
- **CI timeout before `onEnd`**: The run's artifacts are lost entirely — budget pipeline time for the upload phase
- **Wrong URL style**: MinIO returns signature/404 errors if path style is disabled

**Incorrect (hardcoded credentials, shared prefix, local-only artifacts):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"],
    [
      "@playwright-labs/reporter-s3",
      {
        // ❌ Credentials committed to source control
        endpoint: "https://s3.company.com",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        bucket: "artifacts",
        // ❌ Fixed prefix — every run overwrites the previous one
        prefix: "latest",
      },
    ],
  ],
});
```

**Why this fails:**
- Secrets in git history are a security incident requiring key rotation
- `prefix: "latest"` means parallel pipelines and reruns clobber each other's objects
- No environment separation — local runs upload to the production bucket

**Correct (env-driven credentials, default timestamped prefix, failure-ready config):**

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  // ✅ Capture everything needed for debugging failures
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["html"],
    [
      "@playwright-labs/reporter-s3",
      {
        // ✅ All credentials from CI secrets / env
        endpoint: process.env.AWS_S3_URL,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: "pw-artifacts",
        // ✅ Default prefix (runs/<ISO timestamp>) keeps runs isolated
        // ✅ Route large videos to a short-retention bucket
        attachmentBucket: ({ contentType }) =>
          contentType.startsWith("video/")
            ? "pw-videos-ephemeral"
            : undefined, // screenshots, traces → default bucket
        // ✅ Fail loudly on bucket typos in production
        createBucket: process.env.CI ? false : true,
      },
    ],
  ],
});
```

**Why this works:**
- Credentials never touch source code; rotation happens in CI secret storage
- Timestamped default prefix means every run (including shards and reruns) gets its own key space
- Videos — the largest artifacts — land in a bucket with lifecycle expiry, controlling storage cost
- `createBucket: false` in CI turns misconfiguration into an immediate, visible error

## Common Mistakes

### Mistake 1: Uploading on local development runs

```typescript
// ❌ Bad: every local `npx playwright test` uploads to shared storage
export default defineConfig({
  reporter: [
    ["@playwright-labs/reporter-s3", { bucket: "pw-artifacts" }],
  ],
});
```

**Why this is wrong**: Local runs pollute the bucket with hundreds of throwaway objects and require credentials on every developer machine.

**How to fix**:

```typescript
// ✅ Good: enable S3 upload only in CI
const reporters: ReporterDescription[] = [["list"], ["html"]];
if (process.env.CI) {
  reporters.push([
    "@playwright-labs/reporter-s3",
    { bucket: "pw-artifacts" },
  ]);
}
export default defineConfig({ reporter: reporters });
```

### Mistake 2: Assuming failed runs always upload

```typescript
// ❌ Bad: global timeout kills the process before onEnd completes
export default defineConfig({
  globalTimeout: 10 * 60 * 1000, // exactly the CI job limit
  reporter: [["@playwright-labs/reporter-s3", { bucket: "pw-artifacts" }]],
});
```

**Why this is wrong**: Uploads happen in `onEnd`; if the runner is terminated by a timeout or `kill`, attachments and summary are lost — exactly when you need them most (a hung run).

**How to fix**: Leave headroom between `globalTimeout` and the CI job timeout, and keep artifact capture (`trace: "retain-on-failure"`) so the upload phase has content worth the extra seconds.

### Mistake 3: Disabling path style against MinIO

```typescript
// ❌ Bad: virtual-hosted style against a local MinIO
{
  endpoint: "http://localhost:9000",
  bucket: "pw-artifacts",
  forcePathStyle: false, // requests hit pw-artifacts.localhost:9000 → DNS failure
}
```

**Why this is wrong**: Non-AWS endpoints cannot resolve virtual-hosted bucket subdomains.

**How to fix**: Keep the default `forcePathStyle: true` for MinIO/R2; only disable it for providers that require virtual-hosted URLs.

Reference: [@playwright-labs/reporter-s3](https://github.com/vitalics/playwright-labs/tree/main/packages/reporter-s3)
