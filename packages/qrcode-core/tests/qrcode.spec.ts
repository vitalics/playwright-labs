import { test, expect } from "@playwright/test";
import { PassThrough, Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { Jimp } from "jimp";

import { QRCodeEncoder, QRCodeDecoder } from "../src/qrcode.js";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const BASE64_PREFIX = "data:image/png;base64,";

test.describe("QRCodeEncoder", () => {
  test("default output is a data URL", async () => {
    const encoded = await new QRCodeEncoder().encode("hello");
    expect(typeof encoded).toBe("string");
    expect(encoded as string).toMatch(/^data:image\/png;base64,/);
  });

  test("base64url output has no data URL prefix", async () => {
    const encoded = await new QRCodeEncoder({ type: "base64url" }).encode("hello");
    expect((encoded as string).startsWith(BASE64_PREFIX)).toBe(false);
    // valid base64
    expect(() => Buffer.from(encoded as string, "base64")).not.toThrow();
  });

  test("svg output contains svg markup", async () => {
    const encoded = await new QRCodeEncoder({ type: "svg" }).encode("hello");
    expect(encoded as string).toContain("<svg");
  });

  test("utf8 output is a non-empty string", async () => {
    const encoded = await new QRCodeEncoder({ type: "utf8" }).encode("hello");
    expect(typeof encoded).toBe("string");
    expect((encoded as string).length).toBeGreaterThan(0);
  });

  test("terminal output respects small option", async () => {
    const big = await new QRCodeEncoder({ type: "terminal" }).encode("hello");
    const small = await new QRCodeEncoder({ type: "terminal", small: true }).encode("hello");
    expect((small as string).length).toBeLessThan((big as string).length);
  });

  test("buffer output is a PNG buffer", async () => {
    const encoded = await new QRCodeEncoder({ type: "buffer" }).encode("hello");
    expect(Buffer.isBuffer(encoded)).toBe(true);
    expect((encoded as Buffer).subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });

  test("file output writes a PNG and resolves with the path", async () => {
    const path = test.info().outputPath("qr.png");
    const encoded = await new QRCodeEncoder({ type: "file", path }).encode("hello");
    expect(encoded).toBe(path);
    const content = await readFile(path);
    expect(content.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });

  test("stream output pipes a PNG into the writable", async () => {
    const writable = new PassThrough();
    const chunks: Buffer[] = [];
    writable.on("data", (chunk) => chunks.push(chunk));

    await new QRCodeEncoder({ type: "stream", writable }).encode("hello");
    const content = Buffer.concat(chunks);
    expect(content.subarray(0, 4).equals(PNG_MAGIC)).toBe(true);
  });

  test("encodes from segments", async () => {
    const encoder = new QRCodeEncoder()
      .addStringSegment("order:")
      .addNumericSegment(12345);
    const encoded = await encoder.encode();
    expect(encoded as string).toMatch(/^data:image\/png;base64,/);
  });

  test("throws when both segments and argument are used", async () => {
    const encoder = new QRCodeEncoder().addStringSegment("a");
    await expect(encoder.encode("b")).rejects.toThrow(TypeError);
  });

  test("throws when neither segments nor argument is provided", async () => {
    await expect(new QRCodeEncoder().encode()).rejects.toThrow(TypeError);
  });

  test("file type without path throws", async () => {
    const encoder = new QRCodeEncoder({ type: "file" } as never);
    await expect(encoder.encode("hello")).rejects.toThrow("file options");
  });
});

test.describe("QRCodeDecoder", () => {
  test("roundtrip: buffer", async () => {
    const encoded = await new QRCodeEncoder({ type: "buffer" }).encode("hello world");
    const decoded = await new QRCodeDecoder().decode(encoded as Buffer);
    expect(decoded?.data).toBe("hello world");
  });

  test("roundtrip: data URL string", async () => {
    const encoded = await new QRCodeEncoder().encode("data-url payload");
    const decoded = await new QRCodeDecoder().decode(encoded as string);
    expect(decoded?.data).toBe("data-url payload");
  });

  test("roundtrip: raw base64 string", async () => {
    const encoded = await new QRCodeEncoder({ type: "base64url" }).encode("base64 payload");
    const decoded = await new QRCodeDecoder().decode(encoded as string);
    expect(decoded?.data).toBe("base64 payload");
  });

  test("roundtrip: file via constructor options", async () => {
    const path = test.info().outputPath("roundtrip.png");
    await new QRCodeEncoder({ type: "file", path }).encode("file payload");

    const decoded = await new QRCodeDecoder({ type: "file", path }).decode();
    expect(decoded?.data).toBe("file payload");
  });

  test("roundtrip: readable stream", async () => {
    const encoded = await new QRCodeEncoder({ type: "buffer" }).encode("stream payload");
    const decoded = await new QRCodeDecoder().decode(Readable.from([encoded as Buffer]));
    expect(decoded?.data).toBe("stream payload");
  });

  test("roundtrip: ImageDataLike", async () => {
    const encoded = await new QRCodeEncoder({ type: "buffer" }).encode("pixels payload");
    const img = await Jimp.fromBuffer(encoded as Buffer);
    const decoded = await new QRCodeDecoder().decode({
      data: new Uint8ClampedArray(img.bitmap.data),
      width: img.width,
      height: img.height,
    });
    expect(decoded?.data).toBe("pixels payload");
  });

  test("image without QR code decodes to null", async () => {
    const white = {
      data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
      width: 100,
      height: 100,
    };
    const decoded = await new QRCodeDecoder().decode(white);
    expect(decoded).toBeNull();
  });

  test("decode() without input and without file options throws", async () => {
    await expect(new QRCodeDecoder().decode()).rejects.toThrow(TypeError);
  });

  test("unsupported input throws", async () => {
    await expect(new QRCodeDecoder().decode(42 as never)).rejects.toThrow(TypeError);
  });
});
