# @playwright-labs/fixture-barcode

Playwright fixture and custom matcher for decoding 1D barcodes (EAN, Code128, UPC, ...) straight from locators.

Built on [`@playwright-labs/barcode-core`](../barcode-core).

## Installation

```bash
pnpm add -D @playwright-labs/fixture-barcode
```

## Quick start

```ts
import { test, expect } from '@playwright-labs/fixture-barcode';

test('barcode on the page', async ({ page, useBarcodeDecode }) => {
  await page.goto('/product/42');

  // fixture: decode and inspect
  const decoded = await useBarcodeDecode(page.locator('#label img'), 'ean-13');
  console.log(decoded);

  // matcher: assert directly on the locator
  await expect(page.locator('#label img')).toHaveBarcode('ean-13', '5901234123457');
});
```

## Supported barcode types

`ean-13`, `ean-8`, `upc-a`, `upc-e`, `code-39`, `code-93`, `code-2of5`, `code-128`, `codabar`, `msi`, `pharmacode`

(the `Barcode` union type is exported)

## API

### Fixture: `useBarcodeDecode(locator, barcode, screenshotOptions?)`

Screenshots the locator and decodes it with the given barcode type. Resolves with the decoded string.

### Matcher: `toHaveBarcode(barcode, expected?, screenshotOptions?)`

| Call | Passes when |
|---|---|
| `toHaveBarcode('code-128')` | any Code128 decodes |
| `toHaveBarcode('ean-13', 'value')` | decoded data equals `'value'` |
| `toHaveBarcode('ean-13', /^590/)` | decoded data matches the regex |
| `.not.toHaveBarcode(...)` | negated form of the above |

`screenshotOptions` are Playwright `LocatorScreenshotOptions`, forwarded to `locator.screenshot()`.

## Related packages

- [`@playwright-labs/barcode-core`](../barcode-core) — encode/decode primitives used by this fixture
- [`@playwright-labs/fixture-qrcode`](../fixture-qrcode) — same idea for QR codes

## License

MIT
