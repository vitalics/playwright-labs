---
"@playwright-labs/reporter-otel": patch
"@playwright-labs/otel-core": patch
---

Security: bump `@opentelemetry/sdk-node` and OTLP exporters from `^0.214.0` to `^0.217.0` to fix [GHSA-q7rr-3cgh-j5r3](https://github.com/advisories/GHSA-q7rr-3cgh-j5r3) — malformed HTTP request causes Prometheus exporter process crash.

Also updated workspace-level overrides:
- `protobufjs` → `7.5.8` (GHSA-685m-2w69-288q and others: code injection, DoS)
- `next` → `16.2.6` (multiple CVEs: middleware bypass, DoS, SSRF)
- `fast-uri` → `3.1.2` (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc: path traversal, host confusion)
- `postcss` → `8.5.10`
- `ws` → `8.20.1`
