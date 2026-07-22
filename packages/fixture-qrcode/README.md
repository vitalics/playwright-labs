# @playwright-labs/fixture-qrcode

Playwright fixture and custom matcher for decoding QR codes straight from locators.

Built on [`@playwright-labs/qrcode-core`](../qrcode-core).

## Installation

```bash
pnpm add -D @playwright-labs/fixture-qrcode
```

## Quick start

```ts
import { test, expect } from '@playwright-labs/fixture-qrcode';

test('QR code on the page', async ({ page, useQRCodeDecode }) => {
  await page.goto('/checkout');

  // fixture: decode and inspect
  const decoded = await useQRCodeDecode(page.locator('#payment-qr img'));
  console.log(decoded?.data);

  // matcher: assert directly on the locator
  await expect(page.locator('#payment-qr img')).toHaveQRCode('https://pay.example.com/inv/42');
});
```

## API

### Fixture: `useQRCodeDecode(locator, screenshotOptions?)`

Screenshots the locator and decodes it. Resolves with the jsQR result object (`data`, `binaryData`, `location`, ...) or `null` when no QR code is found.

### Matcher: `toHaveQRCode(expected?, screenshotOptions?)`

| Call | Passes when |
|---|---|
| `toHaveQRCode()` | any QR code decodes |
| `toHaveQRCode('value')` | decoded data equals `'value'` |
| `toHaveQRCode(/^https:/)` | decoded data matches the regex |
| `.not.toHaveQRCode(...)` | negated form of the above |

`screenshotOptions` are Playwright `LocatorScreenshotOptions`, forwarded to `locator.screenshot()`.

## Related packages

- [`@playwright-labs/qrcode-core`](../qrcode-core) — encode/decode primitives used by this fixture
- [`@playwright-labs/fixture-barcode`](../fixture-barcode) — same idea for 1D barcodes (EAN, Code128, UPC, ...)

## License

MIT
