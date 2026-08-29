---
title: Generate and Scan Barcodes in Tests with fixture-barcode
impact: MEDIUM
impactDescription: turns barcode assertions from visual eyeballing and manual OCR into deterministic, machine-checked decodes of what the page actually renders
tags: barcode, fixtures, matchers, visual-content, test-data
---

## Generate and Scan Barcodes in Tests with fixture-barcode

**Impact: MEDIUM (turns barcode assertions from visual eyeballing and manual OCR into deterministic, machine-checked decodes of what the page actually renders)**

Pages that render barcodes — shipping labels, product pages, tickets, invoices, warehouse picking screens — are usually "tested" by asserting that an `<img>` exists or that some SKU text sits next to it. That proves nothing: the image can be blank, truncated, or encode yesterday's order number and every assertion still passes. The `@playwright-labs/fixture-barcode` package (built on `@playwright-labs/barcode-core`) screenshots a locator and decodes the 1D barcode in it (EAN-13, EAN-8, UPC-A/E, Code 39/93/128, Codabar, MSI, Pharmacode, ...), so the test asserts on the *encoded data* the user would scan — not on markup around it. `barcode-core`'s `BarcodeEncoder` closes the loop: generate a valid barcode SVG for seed data or mock responses, render it in the app, then decode it back in the same test.

## When to Use

- **Use `toHaveBarcode(type, expected)` when**: The page renders a barcode whose content is known — an order label, a product EAN, a ticket code — and you want to assert the encoded value directly
- **Use `toHaveBarcode(type)` (no expected value) when**: The exact value is dynamic but you need to prove the barcode is present and machine-readable — a freshly generated label, a print preview
- **Use the `useBarcodeDecode` fixture when**: You need the decoded string itself — to feed into a subsequent step, log it, or compare it against an API response rather than a literal
- **Use `BarcodeEncoder` from `barcode-core` when**: Test setup needs a *valid* barcode image (seed data, mocked API payload, route interception) instead of a broken placeholder — invalid checksums make real decoder libraries reject the image, so a hand-drawn fake won't do
- **Consider alternatives when**: The code is 2D (QR) — use `@playwright-labs/fixture-qrcode` instead; or the test only checks layout/CSS, where a plain visibility assertion is enough
- **Required for**: E-commerce product/label flows, ticketing, logistics/warehouse UIs, invoice generation — anywhere a barcode is the actual deliverable of the feature

## Guidelines

### Do

- Assert on the barcode's decoded content, not just the element's existence: `await expect(locator).toHaveBarcode('ean-13', '5901234123457')`
- Use a regex for partially-known values — `toHaveBarcode('ean-13', /^590/)` for a known manufacturer prefix with a dynamic tail
- Scope the locator tightly to the barcode image (`page.locator('#label img')`), not the whole card — surrounding text and borders degrade decoding
- Use `useBarcodeDecode(locator, type)` when the decoded value is needed downstream, e.g. to assert it matches what the backend API returned
- Generate setup barcodes with `BarcodeEncoder` (`new BarcodeEncoder({ format: 'EAN13' }).encode('5901234123457')`) so seed data and mocks contain *valid* codes
- Keep track of the two naming schemes: encoder formats are jsbarcode-style (`EAN13`, `CODE128`), decoder/fixture types are kebab-case (`ean-13`, `code-128`)
- Merge `test`/`expect` into your shared fixture file with `mergeTests`/`mergeExpects` alongside other Playwright-labs packages

### Don't

- Don't assert `toBeVisible()` on a barcode image and call it tested — a blank or mis-encoded image is equally "visible"
- Don't screenshot the full page and try to decode it — decode from a tight locator screenshot, which is exactly what the fixture and matcher do internally
- Don't hardcode invalid barcode values in mocks (e.g. an EAN-13 with a wrong checksum digit) — `BarcodeEncoder` rejects invalid values, and real scanner libraries reject them too
- Don't assume an EAN-13 decode returns 13 digits — the underlying reader drops the leading digit (it's encoded via left-group parity, not bars), so expect the 12-digit tail and compare with a regex or the tail value
- Don't decode with the wrong barcode type to "see if it works" — the type is required per call; decoding a Code 128 as `ean-13` fails or returns garbage
- Don't rasterize or OCR barcodes with external tools in tests — decoding the locator screenshot is faster and deterministic

### Tool Usage Patterns

- **Install**: `pnpm add -D @playwright-labs/fixture-barcode` (decoding + matcher); `pnpm add @playwright-labs/barcode-core` when you also need to *generate* barcodes for setup/mocks
- **Fixture**: `useBarcodeDecode(locator, barcode, screenshotOptions?)` — screenshots the locator and resolves with the decoded string; `screenshotOptions` are Playwright `LocatorScreenshotOptions` forwarded to `locator.screenshot()`
- **Matcher**: `toHaveBarcode(barcode, expected?, screenshotOptions?)` where `expected` is a string (exact match) or `RegExp`; `.not.toHaveBarcode(...)` for the negated form
- **Types**: the `Barcode` union (`'ean-13' | 'ean-8' | 'upc-a' | 'upc-e' | 'code-39' | 'code-93' | 'code-2of5' | 'code-128' | 'codabar' | 'msi' | 'pharmacode'`) is exported from both packages
- **Encoding**: `new BarcodeEncoder({ format: 'EAN13' }).encode(value)` resolves with an SVG string; other output targets: `file` (writes SVG, resolves path), `stream` (pipes into a writable), `imagedata` (raw RGBA pixels — feeds straight into `BarcodeDecoder.decode` with no rasterizer), `buffer`/`uint8array`/`uint8clampedarray`. Plus jsbarcode rendering options: `width`, `height`, `displayValue`, `text`, `fontSize`, `margin`, `background`, `lineColor`, `flat`
- **Decoding outside Playwright**: `new BarcodeDecoder().decode(type, input)` accepts a `Buffer`/`Uint8Array` (PNG, JPEG), data URL, raw base64 string, `Readable` stream, or raw RGBA pixels `{ data, width, height }`; `new BarcodeDecoder({ type: 'file', path })` decodes a file

## Edge Cases and Constraints

### Limitations

- Encoder output is SVG only — rasterizing to PNG requires a canvas implementation and is out of scope. If the app needs a PNG, render the SVG in the page (browsers rasterize it) and decode the locator screenshot
- The EAN-13 reader does not recover the leading digit — decoded output is the 12-digit tail. Assert with a regex (`/^901234123457$/` won't match a 13-digit expectation) or compare against `expected.slice(1)`
- `imagedata` encoding ignores text options (`displayValue`, `text`, `fontSize`) since no SVG is produced
- Decoding depends on render quality — tiny barcodes, heavy compression artifacts, or barcodes overlapped by other elements may fail to decode even though they look fine to a human

### Edge Cases

1. **Dynamic barcode values**: The encoded value isn't known upfront (auto-generated order number). Use `toHaveBarcode('code-128')` to assert readability, or `useBarcodeDecode` and compare the result against the API response that produced it.
2. **Checksum-invalid seed data**: A mock payload with a made-up EAN-13 (`1234567890123`) breaks real decoders. Generate the value with `BarcodeEncoder` — it rejects invalid checksums, so setup data is valid by construction.
3. **Barcode inside a larger label**: The label contains text, borders, and logos. Scope the locator to the `<img>`/`<svg>` itself; if that's impossible, pass `screenshotOptions` (e.g. `clip`) to crop the screenshot before decoding.
4. **Print preview / PDF-ish flows**: If the barcode renders in a canvas or an embedded viewer, locate the rendered element and decode its screenshot the same way — the fixture works on any locator screenshot, not just `<img>` tags.
5. **Multiple barcodes on one page**: Decode each with its own scoped locator rather than one wide screenshot — one decode per barcode keeps failures attributable.

### What Breaks If Ignored

- **False confidence**: `toBeVisible()` on the barcode image passes while the shipped label encodes the wrong SKU — the bug ships because the test never read the barcode
- **Silent decode failures**: Asserting a 13-digit EAN-13 string when the decoder returns 12 digits makes every test fail for a tooling reason, misread as an app bug
- **Mock/app mismatch**: Hand-rolled fake barcodes in mocks pass the (mock-based) test but fail in production against a real scanner library
- **Flaky wide screenshots**: Decoding a full-page screenshot works locally, then fails on CI where rendering scale differs — tight locator screenshots are resolution-independent in practice

**Incorrect (asserting existence, invalid mock data, wrong EAN-13 expectation):**

```typescript
import { test, expect } from '@playwright/test';

test('shipping label shows barcode', async ({ page }) => {
  await page.route('**/api/label', (route) =>
    route.fulfill({
      // ❌ Made-up EAN-13 with a wrong checksum — real decoders reject it
      json: { ean: '1234567890123' },
    }),
  );

  await page.goto('/orders/42/label');

  // ❌ Only proves an <img> exists — it could be blank or encode anything
  await expect(page.locator('#label img')).toBeVisible();

  // ❌ Reads the text NEXT to the barcode, not the barcode itself
  await expect(page.locator('#label .ean-text')).toHaveText('5901234123457');
});

test('product barcode encodes the EAN', async ({ page }) => {
  await page.goto('/product/42');

  // ❌ 13-digit expectation — the decoder returns the 12-digit tail
  const img = page.locator('#product-barcode img');
  const shot = await img.screenshot();
  // ... hand-rolled decode with a random library, wrong type assumption ...
});
```

**Why this fails:**
- Visibility and neighboring-text assertions say nothing about the encoded payload
- Invalid checksum data in the mock makes the fixture (and any real scanner) fail to decode, even though the app code is correct
- Full-value EAN-13 comparisons fail on the dropped leading digit

**Correct (decode what the page renders, generate valid setup data):**

```typescript
import { test, expect } from '@playwright-labs/fixture-barcode';
import { BarcodeEncoder } from '@playwright-labs/barcode-core';

test('shipping label barcode encodes the order EAN', async ({ page }) => {
  // ✅ Valid barcode in the mock payload — checksum verified by the encoder
  const ean = '5901234123457';
  await new BarcodeEncoder({ format: 'EAN13' }).encode(ean); // rejects if invalid
  await page.route('**/api/label', (route) => route.fulfill({ json: { ean } }));

  await page.goto('/orders/42/label');

  // ✅ Decodes the locator screenshot and compares the payload
  // (reader drops the leading EAN-13 digit — match the tail)
  await expect(page.locator('#label img')).toHaveBarcode('ean-13', ean.slice(1));
});

test('generated ticket barcode is scannable and matches the API', async ({
  page,
  useBarcodeDecode,
}) => {
  await page.goto('/tickets/new');
  await page.getByRole('button', { name: 'Generate ticket' }).click();

  const barcode = page.locator('#ticket-barcode img');

  // ✅ Value is dynamic — assert readability, then cross-check with the API
  await expect(barcode).toHaveBarcode('code-128');

  const decoded = await useBarcodeDecode(barcode, 'code-128');
  const response = await page.request.get('/api/tickets/latest');
  expect(decoded).toBe((await response.json()).code);
});
```

**Why this works:**
- Assertions read the actual encoded data — a blank or mis-encoded image fails immediately
- Mock data is valid by construction, so decode failures mean an app bug, not broken fixtures
- Dynamic values are handled: regex/readability assertion plus a decode cross-checked against the backend

## Common Mistakes

### Mistake 1: Expecting 13 digits back from an EAN-13 decode

```typescript
test('product EAN', async ({ page }) => {
  await page.goto('/product/42');
  // ❌ Decoder returns the 12-digit tail — this never matches
  await expect(page.locator('#barcode img')).toHaveBarcode(
    'ean-13',
    '5901234123457',
  );
});
```

**Why this is wrong**: The underlying reader does not recover the leading EAN-13 digit (it's encoded via left-group parity, not bars), so the decoded string is 12 digits. Exact-match assertions against the full EAN fail deterministically.

**How to fix**:

```typescript
test('product EAN', async ({ page }) => {
  await page.goto('/product/42');
  const ean = '5901234123457';
  // ✅ Compare against the 12-digit tail...
  await expect(page.locator('#barcode img')).toHaveBarcode('ean-13', ean.slice(1));
  // ✅ ...or use a regex if only a prefix is stable
  await expect(page.locator('#barcode img')).toHaveBarcode('ean-13', /^901234/);
});
```

### Mistake 2: Decoding the whole page instead of a tight locator

```typescript
test('label barcode', async ({ page, useBarcodeDecode }) => {
  await page.goto('/orders/42/label');
  // ❌ Full card: text, borders, logo — decode is flaky or impossible
  const decoded = await useBarcodeDecode(page.locator('#label-card'), 'ean-13');
  expect(decoded).toBe('901234123457');
});
```

**Why this is wrong**: Barcode readers are sensitive to surrounding content and scale. A wide screenshot with text and graphics around the bars degrades decoding and makes failures environment-dependent.

**How to fix**:

```typescript
test('label barcode', async ({ page, useBarcodeDecode }) => {
  await page.goto('/orders/42/label');
  // ✅ Scope to the barcode element itself; crop further via screenshotOptions if needed
  const decoded = await useBarcodeDecode(page.locator('#label-card img'), 'ean-13');
  expect(decoded).toBe('901234123457');
});
```

### Mistake 3: Mixing up encoder and decoder format names

```typescript
import { BarcodeEncoder } from '@playwright-labs/barcode-core';
import { test } from '@playwright-labs/fixture-barcode';

test('roundtrip', async ({ page }) => {
  // ❌ 'ean-13' is the DECODER name — the encoder expects jsbarcode format 'EAN13'
  const svg = await new BarcodeEncoder({ format: 'ean-13' as never }).encode('5901234123457');
  // ...
});
```

**Why this is wrong**: The two libraries use different naming — encoder formats are `EAN13`, `CODE128`, `UPC`, ...; decoder/fixture types are `ean-13`, `code-128`, `upc-a`, .... Passing one scheme to the other throws or fails at runtime.

**How to fix**:

```typescript
test('roundtrip', async ({ page }) => {
  // ✅ Encoder: jsbarcode format names
  const svg = await new BarcodeEncoder({ format: 'EAN13' }).encode('5901234123457');
  await page.setContent(`<img id="b" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`);

  // ✅ Decoder/matcher: kebab-case Barcode union
  await expect(page.locator('#b')).toHaveBarcode('ean-13', '901234123457');
});
```

## Advanced Patterns

### Full roundtrip without a browser rasterizer

`BarcodeEncoder` in `imagedata` mode emits raw RGBA pixels that `BarcodeDecoder` consumes directly — a complete encode → decode verification with no page at all, useful for validating seed-data generators:

```typescript
import { BarcodeEncoder, BarcodeDecoder } from '@playwright-labs/barcode-core';
import { test, expect } from '@playwright/test';

test('barcode generator produces scannable codes', async () => {
  const image = await new BarcodeEncoder({ format: 'CODE128', type: 'imagedata' })
    .encode('ORDER-12345');

  const decoded = await new BarcodeDecoder().decode('code-128', image);
  expect(decoded).toBe('ORDER-12345');
});
```

### Serving generated barcodes through route interception

Generate the SVG in the test and serve it as the app's barcode image, so the rendered page is exercised end to end:

```typescript
import { test, expect } from '@playwright-labs/fixture-barcode';
import { BarcodeEncoder } from '@playwright-labs/barcode-core';

test('label page renders the served barcode', async ({ page }) => {
  const svg = await new BarcodeEncoder({ format: 'CODE128' }).encode('SHIP-9988');

  await page.route('**/barcode.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg }),
  );

  await page.goto('/orders/42/label');
  await expect(page.locator('#label img')).toHaveBarcode('code-128', 'SHIP-9988');
});
```

**When to use this pattern**: When the barcode comes from a backend image service you don't control in tests — interception plus `BarcodeEncoder` gives you valid, deterministic barcodes without standing up the service.

### Merging into a shared fixture file

```typescript
// fixtures/index.ts
import { mergeExpects, mergeTests } from '@playwright/test';
import {
  expect as barcodeExpect,
  test as barcodeTest,
} from '@playwright-labs/fixture-barcode';

export const test = mergeTests(barcodeTest);
export const expect = mergeExpects(barcodeExpect);
```

## Integration with Other Best Practices

- **Merge Tests and Expects** (`fixture-merge-tests-expects`): `fixture-barcode` exports `test`/`expect` designed for `mergeTests`/`mergeExpects` — merge once in a shared fixture file, import everywhere
- **Generate Realistic Test Data** (`fixture-faker-realistic-data`): generate the *payload* (SKU, order number) with faker, encode it with `BarcodeEncoder`, and decode-assert it in the UI — one captured value flows through mock, render, and assertion
- **API Mocking** (`advanced-api-mocking`): serve encoder-generated SVGs via `page.route` so barcode tests don't depend on a label-generation service
- **Web-First Assertions** (`assertion-web-first`): `toHaveBarcode` is a custom matcher on a locator — pair it with web-first visibility assertions on the surrounding UI rather than manual screenshots and generic expects
- **Scale considerations**: At dozens of barcode tests, keep one shared helper that maps business payloads to `(format, expectedTail)` so the EAN-13 leading-digit caveat is handled in exactly one place

Reference: [@playwright-labs/fixture-barcode](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-barcode) and [@playwright-labs/barcode-core](https://github.com/vitalics/playwright-labs/tree/main/packages/barcode-core)
