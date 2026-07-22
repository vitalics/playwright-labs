# @playwright-labs/qrcode-core

## 1.1.0

### Minor Changes

- bad66a9: Initial release of the QR/barcode package family.

  **`@playwright-labs/qrcode-core`** — QR encode/decode primitives:
  - `QRCodeEncoder` — 8 output formats: data URL (default), raw base64, SVG, UTF-8 text art, terminal, PNG `Buffer`, file, stream
  - `SegmentArray` + fluent segment API (`addStringSegment` / `addNumericSegment` / `addAlphanumericSegment` / `addByteSegment`) for smaller mixed-mode codes
  - `QRCodeDecoder` — decodes from `Buffer`/`Uint8Array`, `Readable`, data URL / raw base64 strings, raw RGBA pixels, or a file configured via constructor options

  **`@playwright-labs/barcode-core`** — 1D barcode encode/decode primitives:
  - `BarcodeEncoder` (jsbarcode, no canvas required) — SVG string (default), file, stream, raw RGBA `imagedata`, and SVG bytes as `buffer` / `uint8array` / `uint8clampedarray`; invalid values (e.g. wrong EAN-13 checksum) reject with `TypeError`
  - `BarcodeDecoder` (javascript-barcode-reader) — same input shapes as `QRCodeDecoder`, barcode type per call (`ean-13`, `code-128`, ...)

  **`@playwright-labs/fixture-qrcode`** — Playwright integration:
  - `useQRCodeDecode(locator, screenshotOptions?)` fixture
  - `toHaveQRCode(expected?, screenshotOptions?)` matcher (string / RegExp / any, `.not` supported)

  **`@playwright-labs/fixture-barcode`** — Playwright integration:
  - `useBarcodeDecode(locator, barcode, screenshotOptions?)` fixture
  - `toHaveBarcode(barcode, expected?, screenshotOptions?)` matcher
