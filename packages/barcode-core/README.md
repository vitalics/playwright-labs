# @playwright-labs/barcode-core

1D barcode encode/decode primitives for Node.js — SVG encoder (jsbarcode) and multi-input decoder (javascript-barcode-reader).

## What this package provides

`@playwright-labs/barcode-core` is the shared foundation used by `@playwright-labs/fixture-barcode`. It can also be used standalone in any Node.js project that needs:

- `BarcodeEncoder` — renders EAN/Code128/UPC/... barcodes as SVG strings, no browser or canvas required
- `BarcodeDecoder` — decodes barcodes from buffers, streams, files, base64 strings, or raw pixel data

## Installation

```bash
pnpm add @playwright-labs/barcode-core
```

## `BarcodeEncoder`

```ts
import { BarcodeEncoder } from '@playwright-labs/barcode-core';

// svg (default): resolves with the SVG string
const svg = await new BarcodeEncoder({ format: 'EAN13' }).encode('5901234123457');

// file: writes the SVG, resolves with the path
await new BarcodeEncoder({ format: 'EAN13', type: 'file', path: 'barcode.svg' })
  .encode('5901234123457');

// stream: pipes the SVG into the writable, resolves with ''
await new BarcodeEncoder({ format: 'EAN13', type: 'stream', writable })
  .encode('5901234123457');

// imagedata: resolves with raw RGBA pixels ({ data, width, height })
const image = await new BarcodeEncoder({ format: 'EAN13', type: 'imagedata' })
  .encode('5901234123457');

// buffer / uint8array / uint8clampedarray: SVG as UTF-8 bytes
const bytes = await new BarcodeEncoder({ format: 'EAN13', type: 'buffer' })
  .encode('5901234123457');
```

Constructor options: `format` (required), output target (`type`: `svg` | `file` | `stream` | `imagedata` | `buffer` | `uint8array` | `uint8clampedarray`, default `svg`) plus jsbarcode rendering options — `width`, `height`, `displayValue`, `text`, `fontSize`, `margin`, `background`, `lineColor`, `flat`.

`imagedata` renders pixels directly (no SVG involved), so it feeds straight into `BarcodeDecoder.decode(type, image)` — full roundtrip without a rasterizer. Text options (`displayValue`, `text`, `fontSize`) are ignored in this mode.

Supported formats (`BarcodeFormat`): `CODE128` (+`A`/`B`/`C`), `EAN13`, `EAN8`, `EAN5`, `EAN2`, `UPC`, `CODE39`, `ITF`, `ITF14`, `MSI` (+variants), `pharmacode`, `codabar`.

Invalid values reject (e.g. wrong EAN-13 checksum digit).

> Output is SVG only. Rasterizing to PNG needs a canvas implementation — out of scope for this package.

## `BarcodeDecoder`

Barcode type is required per call (`Barcode` union is exported):

```ts
import { BarcodeDecoder } from '@playwright-labs/barcode-core';

const decoder = new BarcodeDecoder();

await decoder.decode('ean-13', pngBuffer);                   // Buffer / Uint8Array (PNG, JPEG, ...)
await decoder.decode('code-128', 'data:image/png;base64,...'); // data URL
await decoder.decode('code-128', rawBase64String);           // raw base64
await decoder.decode('upc-a', readableStream);               // Readable of an encoded image
await decoder.decode('ean-8', { data, width, height });      // raw RGBA pixels

// file via constructor options
await new BarcodeDecoder({ type: 'file', path: 'barcode.png' }).decode('ean-13');
```

Supported types (`Barcode`): `ean-13`, `ean-8`, `upc-a`, `upc-e`, `code-39`, `code-93`, `code-2of5`, `code-128`, `codabar`, `msi`, `pharmacode`.

Resolves with the decoded string. Unsupported input throws `TypeError`.

> EAN-13 caveat: the underlying reader does not recover the leading digit (encoded via left-group parity, not bars) — expect the 12-digit tail.

> Encoder and decoder format names differ (`EAN13` vs `ean-13`) — they come from different underlying libraries.

## Related packages

- [`@playwright-labs/fixture-barcode`](../fixture-barcode) — Playwright fixture and matchers built on this package
- [`@playwright-labs/qrcode-core`](../qrcode-core) — same idea for QR codes

## License

MIT
