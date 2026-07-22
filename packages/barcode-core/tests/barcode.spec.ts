import { test, expect } from "@playwright/test";
import { PassThrough } from "node:stream";
import { readFile } from "node:fs/promises";

import { BarcodeEncoder, BarcodeDecoder } from "../src/barcode.js";

test.describe("BarcodeEncoder", () => {
  test("encodes EAN13 into an SVG string", async () => {
    const svg = await new BarcodeEncoder({ format: "EAN13" }).encode(
      "5901234123457",
    );
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
  });

  test("encodes CODE128 into an SVG string", async () => {
    const svg = await new BarcodeEncoder({ format: "CODE128" }).encode(
      "hello-42",
    );
    expect(svg).toContain("<svg");
  });

  test("accepts numeric values", async () => {
    const svg = await new BarcodeEncoder({ format: "pharmacode" }).encode(
      12345,
    );
    expect(svg).toContain("<svg");
  });

  test("renders value text by default and hides it with displayValue=false", async () => {
    const withText = await new BarcodeEncoder({ format: "CODE128" }).encode(
      "abc",
    );
    const withoutText = await new BarcodeEncoder({
      format: "CODE128",
      displayValue: false,
    }).encode("abc");
    expect(withText).toContain("abc");
    expect(withoutText).not.toContain("abc");
  });

  test("rejects on invalid EAN13 checksum", async () => {
    await expect(
      new BarcodeEncoder({ format: "EAN13" }).encode("5901234123450"),
    ).rejects.toThrow();
  });

  test("file output writes SVG and resolves with the path", async () => {
    const path = test.info().outputPath("barcode.svg");
    const result = await new BarcodeEncoder({
      format: "CODE128",
      type: "file",
      path,
    }).encode("file-payload");

    expect(result).toBe(path);
    const content = await readFile(path, "utf8");
    expect(content).toContain("<svg");
  });

  test("buffer output resolves with SVG bytes in a Buffer", async () => {
    const result = await new BarcodeEncoder({
      format: "CODE128",
      type: "buffer",
    }).encode("bytes");

    expect(Buffer.isBuffer(result)).toBe(true);
    expect((result as Buffer).toString("utf8")).toContain("<svg");
  });

  test("uint8array output resolves with SVG bytes in a Uint8Array", async () => {
    const result = await new BarcodeEncoder({
      format: "CODE128",
      type: "uint8array",
    }).encode("bytes");

    expect(result).toBeInstanceOf(Uint8Array);
    expect(Buffer.isBuffer(result)).toBe(false);
    expect(Buffer.from(result as Uint8Array).toString("utf8")).toContain(
      "<svg",
    );
  });

  test("uint8clampedarray output resolves with SVG bytes in a Uint8ClampedArray", async () => {
    const result = await new BarcodeEncoder({
      format: "CODE128",
      type: "uint8clampedarray",
    }).encode("bytes");

    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(Buffer.from(result as Uint8ClampedArray).toString("utf8")).toContain(
      "<svg",
    );
  });

  test("byte outputs carry identical SVG payload", async () => {
    const svg = await new BarcodeEncoder({ format: "CODE128" }).encode("same");
    const buf = await new BarcodeEncoder({
      format: "CODE128",
      type: "buffer",
    }).encode("same");

    expect((buf as Buffer).toString("utf8")).toBe(svg as string);
  });

  test("imagedata output resolves with RGBA pixels", async () => {
    const image = await new BarcodeEncoder({
      format: "CODE128",
      type: "imagedata",
    }).encode("pixels");

    expect(typeof image).toBe("object");
    const { data, width, height } = image as {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    };
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(data.length).toBe(width * height * 4);
  });

  test("roundtrip: imagedata output decodes back", async () => {
    const image = await new BarcodeEncoder({
      format: "EAN13",
      type: "imagedata",
    }).encode("5901234123457");

    const decoded = await new BarcodeDecoder().decode(
      "ean-13",
      image as never,
    );
    // javascript-barcode-reader does not recover the leading EAN-13 digit
    // (it is encoded via left-group parity, not bars) — expect the 12-digit tail
    expect(decoded).toBe("901234123457");
  });

  test("stream output pipes SVG into the writable", async () => {
    const writable = new PassThrough();
    const chunks: Buffer[] = [];
    writable.on("data", (chunk) => chunks.push(chunk));

    const result = await new BarcodeEncoder({
      format: "CODE128",
      type: "stream",
      writable,
    }).encode("stream-payload");

    expect(result).toBe("");
    expect(Buffer.concat(chunks).toString("utf8")).toContain("<svg");
  });
});

test.describe("BarcodeDecoder", () => {
  test("decode without input and without file options throws", async () => {
    await expect(new BarcodeDecoder().decode("ean-13")).rejects.toThrow(
      TypeError,
    );
  });

  test("unsupported input throws", async () => {
    await expect(
      new BarcodeDecoder().decode("ean-13", 42 as never),
    ).rejects.toThrow(TypeError);
  });

  test("file options with missing file rejects", async () => {
    const decoder = new BarcodeDecoder({
      type: "file",
      path: "does-not-exist.png",
    });
    await expect(decoder.decode("ean-13")).rejects.toThrow();
  });

  test("garbage buffer rejects on image parse", async () => {
    await expect(
      new BarcodeDecoder().decode("ean-13", Buffer.from("not an image")),
    ).rejects.toThrow();
  });
});
