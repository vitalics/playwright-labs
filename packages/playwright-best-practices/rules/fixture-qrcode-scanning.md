---
title: Generate and Decode QR Codes in Tests with fixture-qrcode
impact: MEDIUM
impactDescription: replaces brittle image snapshots of QR codes with deterministic decoded-content assertions and generated QR inputs
tags: qrcode, fixtures, custom-matchers, visual-content, assertions
---

## Generate and Decode QR Codes in Tests with fixture-qrcode

**Impact: MEDIUM (replaces brittle image snapshots of QR codes with deterministic decoded-content assertions and generated QR inputs)**

QR codes show up in real flows — payment pages, 2FA enrollment, ticket downloads, device pairing — and are usually "tested" in one of two bad ways: not at all, or with a screenshot diff that breaks on every rendering nuance (size, margin, error-correction level) while saying nothing about what the code actually encodes. The `@playwright-labs/fixture-qrcode` package provides a `useQRCodeDecode` fixture and a `toHaveQRCode` matcher that screenshot a locator and decode the QR code inside it, so you assert on the encoded content itself. Its companion `@playwright-labs/qrcode-core` provides `QRCodeEncoder`/`QRCodeDecoder` primitives for generating QR inputs (for upload/scan flows) and decoding images outside the browser.

## When to Use

- **Use `toHaveQRCode` when**: A page renders a QR code (payment link, TOTP setup, ticket, pairing code) and you want to assert *what* it encodes — exact string, regex, or just "a decodable QR exists"
- **Use `useQRCodeDecode` when**: You need the decoded payload as a value — to extract a TOTP secret, parse a URL, or feed the content into a subsequent step
- **Use `QRCodeEncoder` (qrcode-core) when**: The flow goes the other direction — your app *reads* QR codes (file upload, camera input) and you need to generate a known QR image as test input
- **Use `QRCodeDecoder` (qrcode-core) when**: Decoding from a buffer, base64 string, stream, or file in Node.js — API responses, downloaded PDFs/PNGs, fixtures on disk
- **Consider alternatives when**: The QR encodes a large binary payload that never decodes reliably at screenshot resolution — assert the underlying data via API instead
- **Required for**: Payment/invoice flows, 2FA/TOTP enrollment, ticketing, device pairing, any test that previously snapshotted a QR image

## Guidelines

### Do

- Import `test`/`expect` from `@playwright-labs/fixture-qrcode` (or merge into your shared fixture file) so `toHaveQRCode` is available
- Locate the element that actually renders the code — the `<img>` or `<canvas>` — not a wrapper with padding; pass `screenshotOptions` (e.g. `scale: 'css'`) when needed
- Assert the *content*: `toHaveQRCode('https://pay.example.com/inv/42')` or a regex like `/^https:\/\/pay\.example\.com\//`
- Use `toHaveQRCode()` with no argument when only renderability matters — "the QR is present and decodable"
- Capture the expected payload in a variable and reuse it in the assertion, so generation and verification never diverge
- Use `QRCodeEncoder` to generate QR images as inputs for upload/scan tests — `{ type: 'buffer' }` for in-memory, `{ type: 'file', path }` for disk, `{ type: 'base64-prefix' }` for data URLs

### Don't

- Don't assert QR correctness with `toHaveScreenshot()` — it passes/fails on pixels, not content, and breaks on anti-aliasing, size, and margin changes
- Don't read `img.src` and assert the `alt` or `title` attribute — that tests an attribute string, not the rendered QR
- Don't assume decode always succeeds — `useQRCodeDecode` resolves `null` when no QR is found; check before dereferencing `.data`
- Don't screenshot the whole page and decode — cropping noise and scaling reduce decode reliability; screenshot the QR element itself
- Don't mix `encode(string)` and segment methods on the same `QRCodeEncoder` — using both throws `TypeError`

### Tool Usage Patterns

- **Install**: `pnpm add -D @playwright-labs/fixture-qrcode` (decode side); `pnpm add @playwright-labs/qrcode-core` for standalone encode/decode primitives in Node.js
- **Fixture**: `useQRCodeDecode(locator, screenshotOptions?)` — screenshots the locator and decodes; resolves with the jsQR result object (`data`, `binaryData`, `location`, ...) or `null`
- **Matcher**: `toHaveQRCode(expected?, screenshotOptions?)` — no arg: any QR decodes; string: decoded data equals it; `RegExp`: decoded data matches; `.not.toHaveQRCode(...)` for the negated forms. `screenshotOptions` are Playwright `LocatorScreenshotOptions` forwarded to `locator.screenshot()`
- **Encoder formats** (`QRCodeEncoder` constructor `type`): `base64-prefix` (default data URL), `base64url`, `svg`, `utf8`, `terminal`, `buffer`, `file` (writes PNG to `path`), `stream` (pipes into `writable`)
- **Segments**: `addStringSegment` / `addNumericSegment` / `addAlphanumericSegment` / `addByteSegment` build smaller mixed-mode QR codes; call `encode()` with no argument to use them
- **Decoder inputs** (`QRCodeDecoder.decode()`): `Buffer`/`Uint8Array`, data URL, raw base64 string, `Readable` stream, or raw `{ data, width, height }` RGBA pixels; or `{ type: 'file', path }` via constructor

## Edge Cases and Constraints

### Limitations

- Decoding works on the element's rendered pixels — a QR scaled down too far, blurred, or with insufficient contrast may fail to decode even though it looks fine to a human
- The matcher asserts decoded content, not visual placement; layout regressions of the QR block still need a separate visual check if you care
- `toHaveQRCode` is a locator-based matcher but performs a screenshot-decode cycle, not a pure DOM check — it is slower than `toHaveText` and best used once per QR, not in polling loops

### Edge Cases

1. **QR rendered in a `<canvas>`**: Works the same — the fixture screenshots the element's bounding box regardless of whether it's an `img`, `canvas`, or inline SVG. Locate the canvas directly.
2. **TOTP / 2FA enrollment**: Decode the otpauth URL with `useQRCodeDecode`, parse the `secret` query param, and generate the TOTP code in the test — no manual authenticator needed.
3. **No QR present**: `useQRCodeDecode` resolves `null`, and `expect(locator).toHaveQRCode(...)` fails with the decoded value printed as `null` — for "QR should not be shown" use `.not.toHaveQRCode()`.
4. **Generating input for scan flows**: Encode with `QRCodeEncoder({ type: 'file', path })`, then feed the PNG to `setInputFiles()` for an upload-based scanner.

### What Breaks If Ignored

- **Content bugs shipped silently**: The QR renders beautifully but encodes yesterday's invoice URL — a screenshot diff either passes (looks identical) or fails (font hinting changed) without ever telling you the payload was wrong
- **Snapshot churn**: Every QR library upgrade or margin tweak invalidates baselines, and reviewers rubber-stamp "update snapshots" without verifying what the code now encodes
- **Untestable scan flows**: Without generated QR inputs, upload/camera scan features get zero automated coverage

**Incorrect (pixel snapshot of a QR, attribute poking, no content assertion):**

```typescript
import { test, expect } from "@playwright/test";

test("payment QR", async ({ page }) => {
  await page.goto("/checkout");

  // ❌ Asserts pixels, not content — breaks on rendering noise,
  //    and passes even if the QR encodes the wrong URL
  await expect(page.locator("#payment-qr")).toHaveScreenshot("qr.png");

  // ❌ Tests an attribute string, not the rendered QR code
  const src = await page.locator("#payment-qr img").getAttribute("src");
  expect(src).toContain("data:image/png");
});
```

**Why this fails:**
- A visual diff can't distinguish "QR changed because payload changed" from "QR changed because error-correction level changed"
- Checking `src`/`alt` proves nothing about what the rendered code decodes to
- Updating baselines becomes a blind ritual that masks real payload regressions

**Correct (decode the locator and assert the encoded content):**

```typescript
import { test, expect } from "@playwright-labs/fixture-qrcode";

test("payment QR encodes the invoice URL", async ({ page, useQRCodeDecode }) => {
  await page.goto("/checkout");

  const qr = page.locator("#payment-qr img");

  // ✅ Asserts the decoded payload — rendering details don't matter
  await expect(qr).toHaveQRCode(/^https:\/\/pay\.example\.com\/inv\/\d+$/);

  // ✅ Fixture returns the decoded value for further steps
  const decoded = await useQRCodeDecode(qr);
  expect(decoded).not.toBeNull();
  const invoiceId = new URL(decoded!.data).pathname.split("/").pop();
  expect(invoiceId).toBe("42");
});
```

**Why this works:**
- The assertion targets the semantic contract ("this QR encodes a pay.example.com invoice URL") instead of pixel state
- Regex matching tolerates dynamic segments (invoice IDs) while pinning the scheme/host/path
- `useQRCodeDecode` exposes the raw payload when the test needs to act on it, not just assert it

## Common Mistakes

### Mistake 1: Screenshotting a wrapper instead of the QR element

```typescript
test("ticket QR", async ({ page }) => {
  await page.goto("/ticket/123");

  // ❌ Wide wrapper with text and padding — decode is unreliable or fails
  await expect(page.locator(".ticket-card")).toHaveQRCode("TICKET-123");
});
```

**Why this is wrong**: The decoder works on whatever the screenshot contains. Extra content shrinks the QR's relative size and introduces noise, so decodable codes intermittently return `null`.

**How to fix**:

```typescript
test("ticket QR", async ({ page }) => {
  await page.goto("/ticket/123");

  // ✅ Locate the img/canvas/svg that renders the code itself
  await expect(page.locator(".ticket-card canvas")).toHaveQRCode("TICKET-123");
});
```

### Mistake 2: Dereferencing the fixture result without a null check

```typescript
test("pairing code", async ({ page, useQRCodeDecode }) => {
  await page.goto("/devices/pair");

  const decoded = await useQRCodeDecode(page.locator("#pair-qr img"));

  // ❌ Crashes with TypeError when no QR was found — decode returns null
  expect(decoded.data).toContain("device:");
});
```

**Why this is wrong**: `useQRCodeDecode` resolves `null` when nothing decodes. Dereferencing turns a clean assertion failure into a confusing `TypeError: Cannot read properties of null`.

**How to fix**:

```typescript
test("pairing code", async ({ page, useQRCodeDecode }) => {
  await page.goto("/devices/pair");

  // ✅ Prefer the matcher for pure assertions — it handles null internally
  await expect(page.locator("#pair-qr img")).toHaveQRCode(/device:/);

  // ✅ Or guard explicitly when you need the value
  const decoded = await useQRCodeDecode(page.locator("#pair-qr img"));
  expect(decoded).not.toBeNull();
  expect(decoded!.data).toContain("device:");
});
```

### Mistake 3: Asserting presence only, never content

```typescript
test("invoice QR exists", async ({ page }) => {
  await page.goto("/invoice/7");

  // ❌ Passes for ANY QR — including one encoding last month's invoice
  await expect(page.locator("#qr img")).toHaveQRCode();
});
```

**Why this is wrong**: A no-argument `toHaveQRCode()` only proves a decodable QR rendered. It catches "QR missing" but never "QR encodes the wrong thing".

**How to fix**:

```typescript
test("invoice QR encodes this invoice", async ({ page }) => {
  await page.goto("/invoice/7");

  // ✅ Pin the payload — exact string or regex over the dynamic parts
  await expect(page.locator("#qr img")).toHaveQRCode(
    "https://billing.example.com/invoices/7",
  );
});
```

## Advanced Patterns

### Generating QR inputs for scan/upload flows

When the app consumes QR codes rather than producing them, generate known inputs with `qrcode-core`:

```typescript
import { test, expect } from "@playwright/test";
import { QRCodeEncoder } from "@playwright-labs/qrcode-core";

test("upload a QR to redeem a coupon", async ({ page }) => {
  // ✅ Deterministic input image generated in-test
  const qrPath = test.info().outputPath("coupon-qr.png");
  await new QRCodeEncoder({ type: "file", path: qrPath }).encode("COUPON-2026-XKCD");

  await page.goto("/redeem");
  await page.locator("input[type=file]").setInputFiles(qrPath);
  await expect(page.locator("#redeem-result")).toHaveText("COUPON-2026-XKCD");
});
```

Mixed-mode segments produce denser codes when the payload has typed parts:

```typescript
const dataUrl = await new QRCodeEncoder() // default: base64-prefix data URL
  .addStringSegment("order:")
  .addNumericSegment(12345)
  .encode(); // no argument when segments were added — mixing both throws TypeError
```

### Round-trip verification

Encode in Node, inject into the page, decode back with the matcher — verifying the full pipeline without a real scanner:

```typescript
import { test, expect } from "@playwright-labs/fixture-qrcode";
import { QRCodeEncoder } from "@playwright-labs/qrcode-core";

test("rendered QR round-trips", async ({ page }) => {
  const payload = "https://pay.example.com/inv/99";
  const dataUrl = await new QRCodeEncoder().encode(payload); // data:image/png;base64,...

  await page.goto("/preview");
  await page.locator("#qr-slot img").evaluate((img, src) => {
    (img as HTMLImageElement).src = src;
  }, dataUrl);

  // ✅ What the page shows decodes back to exactly what was encoded
  await expect(page.locator("#qr-slot img")).toHaveQRCode(payload);
});
```

**When to use this pattern**: Round-trips are for verifying your QR pipeline (encoding params, rendering size, quiet zone). In ordinary app tests, assert the app's own QR against the expected payload directly.

## Integration with Other Best Practices

- **Merge Tests and Expects** (`fixture-merge-tests-expects`): merge `fixture-qrcode`'s `test`/`expect` into your shared fixture file once with `mergeTests`/`mergeExpects`, then import from there in every spec
- **Generate Realistic Test Data** (`fixture-faker-realistic-data`): combine faker-generated order IDs with a regex `toHaveQRCode` assertion — the captured variable is both the app input and the QR expectation
- **Web-First Assertions** (`assertion-web-first`): `toHaveQRCode` complements web-first assertions — use it for the QR's content and standard matchers (`toBeVisible`, `toHaveText`) for the surrounding UI
- **1D barcodes**: the sibling package `@playwright-labs/fixture-barcode` applies the same decode-the-locator pattern to EAN/Code128/UPC barcodes

Reference: [@playwright-labs/fixture-qrcode](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-qrcode)
