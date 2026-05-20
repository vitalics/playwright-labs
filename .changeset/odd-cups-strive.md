---
"@playwright-labs/fixture-otel": minor
---

Feature: add traceparent in fixture (#49)

Added `useTraceparent()` fixture — generates a W3C traceparent at fixture initialisation,
registers it as the `pw_otel.traceparent` annotation so the reporter places the test span
inside that trace, and activates the corresponding OTel context for the duration of the test.

**Automatic propagation** (requires `startWorkerSdk()` in the worker): the
`AsyncLocalStorageContextManager` picks up the activated context and all auto-instrumented
libraries (`node:http`, global `fetch`, gRPC, …) propagate the traceparent without any
manual header injection:

```ts
test("checkout", async ({ useTraceparent, page }) => {
  useTraceparent(); // activates OTel context; return value is optional
  await page.goto("/checkout"); // all fetch/http requests carry the same traceId
});
```

**Manual propagation**: call `useTraceparent()` to get the header value for non-instrumented clients:

```ts
test("order API", async ({ useTraceparent, request }) => {
  const { traceparent } = useTraceparent();
  await request.post("/api/orders", { headers: { traceparent } });
});
```

Both modes compose freely — the same `traceparent` string works for both automatic and manual propagation.

Also re-exports `startWorkerSdk` and `WorkerSdkOptions` from `@playwright-labs/otel-core`.
