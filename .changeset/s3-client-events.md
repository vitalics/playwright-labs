---
"@playwright-labs/s3-core": minor
"@playwright-labs/reporter-s3": patch
---

**`@playwright-labs/s3-core`** — typed event system and pluggable transport.

`S3Client` now extends `EventEmitter<S3ClientEvents>` with symbol event keys (no collision with userland names), exported as `S3Event`:

| Event | Payload | When |
|---|---|---|
| `S3Event.requestSend` | `S3RequestEvent` | before every HTTP attempt (retries re-emit with a bumped `attempt`) |
| `S3Event.response` | `S3ResponseEvent` | HTTP response received |
| `S3Event.requestReject` | `S3Error` | operation failed with a non-ok response |
| `S3Event.requestAbort` | `S3AbortEvent` | request aborted by caller `signal` or timeout, with `reason` |
| `S3Event.error` | `S3Error` | symbol twin of `"error"` |

```ts
import { S3Client, S3Event } from "@playwright-labs/s3-core";

const client = new S3Client({
  endpoint: "http://localhost:9000",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  captureRejections: true,           // optional EventEmitter option passthrough
  fetch: myInstrumentedFetch,        // NEW: custom fetch implementation
});

client.on(S3Event.requestSend, ({ method, url, attempt, maxAttempts, bodyLength }) => {
  console.log(`→ ${method} ${url} (${attempt}/${maxAttempts}, ${bodyLength}B)`);
});
client.on(S3Event.requestAbort, ({ reason }) => console.warn("aborted:", reason));
client.on(S3Event.error, (error) => metrics.increment("s3_errors", { status: error.status }));
```

Safety details:

- `requestSend` payload strips the `authorization` header and carries `bodyLength` instead of the raw body — the SigV4 signature and payload never leak into listener logs
- the string `"error"` event is emitted only when a listener is attached (an unobserved `"error"` emit would crash the process per EventEmitter semantics); the thrown `S3Error` stays the primary channel and is the same instance across throw and events

**`@playwright-labs/reporter-s3`** — packaging fix: proper `dist` build (`main`/`exports`/`types` for ESM+CJS), `files` whitelist, `repository` metadata. No behavior changes.
