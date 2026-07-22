# @playwright-labs/qrcode-core

QR code encode/decode primitives for Node.js — one encoder with 8 output formats, one decoder that accepts anything image-like.

## What this package provides

`@playwright-labs/qrcode-core` is the shared foundation used by `@playwright-labs/fixture-qrcode`. It can also be used standalone in any Node.js project that needs:

- `QRCodeEncoder` — builds QR codes from a string or composed segments
- `QRCodeDecoder` — decodes QR codes from buffers, streams, files, base64 strings, or raw pixel data
- `SegmentArray` — fluent builder for mixed-mode QR segments (numeric/alphanumeric/byte)

## Installation

```bash
pnpm add @playwright-labs/qrcode-core
```

## Quick start

```ts
import { QRCodeEncoder, QRCodeDecoder } from '@playwright-labs/qrcode-core';

const png = await new QRCodeEncoder({ type: 'buffer' }).encode('hello world');
const decoded = await new QRCodeDecoder().decode(png as Buffer);

console.log(decoded?.data); // 'hello world'
```

## `QRCodeEncoder`

Output format is configured via constructor options:

| `type` | `encode()` resolves with |
|---|---|
| `base64-prefix` (default) | data URL — `data:image/png;base64,...` |
| `base64url` | raw base64 payload, no prefix |
| `svg` | SVG markup string |
| `utf8` | text-art string |
| `terminal` | terminal-friendly string; supports `small`, `margin`, `scale`, `width`, `color` |
| `buffer` | PNG `Buffer` |
| `file` | writes PNG to `path`, resolves with the path |
| `stream` | pipes PNG into `writable`, resolves with `''` on finish |

```ts
// file
await new QRCodeEncoder({ type: 'file', path: 'qr.png' }).encode('hello');

// stream
import { PassThrough } from 'node:stream';
const writable = new PassThrough();
await new QRCodeEncoder({ type: 'stream', writable }).encode('hello');

// terminal
console.log(await new QRCodeEncoder({ type: 'terminal', small: true }).encode('hello'));
```

### Segments

Mixed-mode segments produce smaller QR codes than plain strings:

```ts
const encoder = new QRCodeEncoder()
  .addStringSegment('order:')
  .addNumericSegment(12345)
  .addAlphanumericSegment('ABC-42')
  .addByteSegment(Buffer.from([0x01, 0x02]));

const dataUrl = await encoder.encode(); // no argument — segments are used
```

Rules:

- `encode(string)` **or** segments — using both throws `TypeError`
- neither — throws `TypeError`

`SegmentArray` is also exported for standalone composition — build segments separately, hand them to any encoder:

```ts
import { SegmentArray, QRCodeEncoder } from '@playwright-labs/qrcode-core';

const segments = new SegmentArray()
  .addStringSegment('user:')
  .addNumericSegment(7)
  .addByteSegment(Buffer.from([0x01, 0x02]));

const path = await new QRCodeEncoder({ type: 'file', path: 'segments-qr.png' })
  .addSegments(...segments)
  .encode();
```

Segment methods (same set on `SegmentArray` and `QRCodeEncoder`):

| Method | QR mode |
|---|---|
| `addStringSegment(str)` | auto |
| `addNumericSegment(123)` | `numeric` |
| `addAlphanumericSegment('ABC-42')` | `alphanumeric` |
| `addByteSegment(buf)` | `byte` |
| `addSegment(segment)` | explicit `QRCodeSegment` |
| `addSegments(...segments)` | bulk, accepts spread `SegmentArray` |

## `QRCodeDecoder`

`decode()` accepts every shape the encoder produces:

```ts
const decoder = new QRCodeDecoder();

await decoder.decode(pngBuffer);                    // Buffer / Uint8Array (PNG, JPEG, ...)
await decoder.decode('data:image/png;base64,...');  // data URL
await decoder.decode(rawBase64String);              // raw base64
await decoder.decode(readableStream);               // Readable of an encoded image
await decoder.decode({ data, width, height });      // raw RGBA pixels

// file via constructor options
await new QRCodeDecoder({ type: 'file', path: 'qr.png' }).decode();
```

Resolves with the [jsQR](https://github.com/cozmo/jsQR) result object (`data`, `binaryData`, `location`, ...) or `null` when no QR code is found. Unsupported input throws `TypeError`.

## License

MIT
