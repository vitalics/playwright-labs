import JsBarcode from "jsbarcode";
import javascriptBarcodeReader from "javascript-barcode-reader";
import { Jimp } from "jimp";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import { Readable, Writable } from "node:stream";
import { readFile, writeFile } from "node:fs/promises";

/** Formats supported by the jsbarcode encoder. */
export type BarcodeFormat =
  | "CODE128"
  | "CODE128A"
  | "CODE128B"
  | "CODE128C"
  | "EAN13"
  | "EAN8"
  | "EAN5"
  | "EAN2"
  | "UPC"
  | "CODE39"
  | "ITF"
  | "ITF14"
  | "MSI"
  | "MSI10"
  | "MSI11"
  | "MSI1010"
  | "MSI1110"
  | "pharmacode"
  | "codabar";

type RenderOptions = {
  format: BarcodeFormat;
  /** Width of a single bar in px. @default 2 */
  width?: number;
  /** Height of the barcode in px. @default 100 */
  height?: number;
  /** Render the value below the barcode. @default true */
  displayValue?: boolean;
  /** Override the text rendered below the barcode. */
  text?: string;
  fontSize?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
  flat?: boolean;
};

type OutputOptions =
  /** Default: `encode()` resolves with the SVG string. */
  | { type?: "svg" }
  /** Writes the SVG to `path`, `encode()` resolves with the path. */
  | { type: "file"; path: string }
  /** Pipes the SVG into `writable`, `encode()` resolves with `''`. */
  | { type: "stream"; writable: Writable }
  /** `encode()` resolves with raw RGBA pixels (`ImageDataLike`). */
  | { type: "imagedata" }
  /** `encode()` resolves with the SVG as UTF-8 bytes in a `Buffer`. */
  | { type: "buffer" }
  /** `encode()` resolves with the SVG as UTF-8 bytes in a `Uint8Array`. */
  | { type: "uint8array" }
  /** `encode()` resolves with the SVG as UTF-8 bytes in a `Uint8ClampedArray`. */
  | { type: "uint8clampedarray" };

export type EncoderOptions = RenderOptions & OutputOptions;

const SVG_NS = "http://www.w3.org/2000/svg";

export class BarcodeEncoder {
  #renderOptions: RenderOptions;
  #outputFormat: NonNullable<OutputOptions["type"]>;
  #path: string | null = null;
  #writable: Writable | null = null;
  constructor(options: EncoderOptions) {
    const { type = "svg", ...rest } = options;
    this.#outputFormat = type;
    if (options.type === "file") {
      this.#path = options.path;
      delete (rest as { path?: string }).path;
    }
    if (options.type === "stream") {
      this.#writable = options.writable;
      delete (rest as { writable?: Writable }).writable;
    }
    this.#renderOptions = rest as RenderOptions;
  }

  /**
   * Encodes the value in the format configured via constructor options:
   *
   * - `svg` (default) — resolves with the SVG string
   * - `file` — writes the SVG to `path`, resolves with the path
   * - `stream` — pipes the SVG into `writable`, resolves with `''` when flushed
   * - `imagedata` — resolves with raw RGBA pixels (`ImageDataLike`);
   *   `displayValue`/text options are ignored (no text rasterizer)
   * - `buffer` / `uint8array` / `uint8clampedarray` — resolves with the SVG
   *   as UTF-8 bytes in the corresponding container
   *
   * Rejects when the value is invalid for the configured format
   * (e.g. wrong EAN-13 checksum digit).
   */
  async encode(
    value: string | `${number}` | number,
  ): Promise<
    string | ImageDataLike | Buffer | Uint8Array | Uint8ClampedArray
  > {
    if (this.#outputFormat === "imagedata") {
      return this.#renderImageData(value);
    }
    const svg = this.#render(value);

    switch (this.#outputFormat) {
      case "file": {
        if (!this.#path) {
          throw new Error("cannot encode into a file without file options");
        }
        await writeFile(this.#path, svg, "utf8");
        return this.#path;
      }

      case "stream": {
        const writable = this.#writable;
        if (!writable) {
          throw new Error("cannot encode into a stream without stream options");
        }
        await new Promise<void>((resolve, reject) => {
          writable.once("error", reject);
          writable.end(svg, resolve);
        });
        return "";
      }

      case "buffer":
        return Buffer.from(svg, "utf8");

      case "uint8array":
        return new TextEncoder().encode(svg);

      case "uint8clampedarray": {
        const bytes = new TextEncoder().encode(svg);
        return new Uint8ClampedArray(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        );
      }

      case "svg":
      default:
        return svg;
    }
  }

  #render(value: string | `${number}` | number): string {
    const { format, ...options } = this.#renderOptions;
    const document = new DOMImplementation().createDocument(
      "http://www.w3.org/1999/xhtml",
      "html",
      null,
    );
    const svgNode = document.createElementNS(SVG_NS, "svg");

    // casts: @types/jsbarcode wants DOM types (SVGElement/Document) which are
    // not available under lib ES2022; xmldom nodes are structurally compatible
    let valid = true;
    JsBarcode(
      svgNode as never,
      String(value),
      {
        ...options,
        format,
        xmlDocument: document,
        valid: (v: boolean) => {
          valid = v;
        },
      } as never,
    );
    if (!valid) {
      throw new TypeError(`invalid ${format} value: ${String(value)}`);
    }

    return new XMLSerializer().serializeToString(svgNode);
  }

  #renderImageData(value: string | `${number}` | number): ImageDataLike {
    const { format, ...options } = this.#renderOptions;

    // jsbarcode "object renderer": a plain object target receives the
    // encoded bar structure without any DOM/canvas involved
    const target: { encodings?: Array<{ data: string }> } = {};
    let valid = true;
    JsBarcode(target as never, String(value), {
      ...options,
      format,
      valid: (v: boolean) => {
        valid = v;
      },
    } as never);
    if (!valid) {
      throw new TypeError(`invalid ${format} value: ${String(value)}`);
    }
    if (!target.encodings || target.encodings.length === 0) {
      throw new Error(`failed to encode ${format} value`);
    }
    const binary = target.encodings.map((e) => e.data).join("");

    const barWidth = options.width ?? 2;
    const barHeight = options.height ?? 100;
    const margin = options.margin ?? 10;
    const line = parseHexColor(options.lineColor ?? "#000000");
    const background = parseHexColor(options.background ?? "#ffffff");

    const width = binary.length * barWidth + margin * 2;
    const height = barHeight + margin * 2;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const inBars =
          y >= margin &&
          y < margin + barHeight &&
          x >= margin &&
          x < width - margin;
        const bit = inBars
          ? binary[Math.floor((x - margin) / barWidth)]
          : "0";
        const [r, g, b] = bit === "1" ? line : background;
        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }

    return { data, width, height };
  }
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new TypeError(`unsupported color format: ${hex} (expected hex)`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Formats supported by the javascript-barcode-reader decoder. */
export type Barcode =
  | "ean-13"
  | "ean-8"
  | "upc-a"
  | "upc-e"
  | "code-39"
  | "code-93"
  | "code-2of5"
  | "code-128"
  | "codabar"
  | "msi"
  | "pharmacode";

type DecoderOptions = {
  type: "file";
  path: string;
};

export type ImageDataLike = {
  data: Uint8ClampedArray | Uint8Array | Buffer;
  width: number;
  height: number;
};

function isImageDataLike(x: unknown): x is ImageDataLike {
  if (typeof x !== "object" || x === null) return false;
  const candidate = x as ImageDataLike;
  return (
    // Buffer is a Uint8Array subclass, covered by the second check
    (candidate.data instanceof Uint8ClampedArray ||
      candidate.data instanceof Uint8Array) &&
    Number.isInteger(candidate.width) &&
    candidate.width > 0 &&
    Number.isInteger(candidate.height) &&
    candidate.height > 0
  );
}

export class BarcodeDecoder {
  #fileOptions: DecoderOptions | null = null;
  constructor(options?: DecoderOptions) {
    this.#fileOptions = options ?? null;
  }

  /** Decodes the file configured via constructor options. */
  decode(barcode: Barcode): Promise<string>;
  /** Decodes raw RGBA pixel data. */
  decode(barcode: Barcode, x: ImageDataLike): Promise<string>;
  /** Decodes an encoded image (PNG/JPEG/...) from a Buffer/Uint8Array. */
  decode(barcode: Barcode, x: Buffer | Uint8Array): Promise<string>;
  /** Decodes an encoded image read from a stream. */
  decode(barcode: Barcode, x: Readable): Promise<string>;
  /** Decodes a data URL (`data:image/png;base64,...`) or a raw base64 image string. */
  decode(barcode: Barcode, x: string): Promise<string>;
  async decode(
    barcode: Barcode,
    x?: Readable | ImageDataLike | Buffer | Uint8Array | string,
  ): Promise<string> {
    if (typeof x === "undefined") {
      if (
        this.#fileOptions?.type !== "file" ||
        typeof this.#fileOptions.path !== "string"
      ) {
        throw new TypeError(
          "Nothing to decode. Expected decode(barcode, input) argument or file options in constructor",
        );
      }
      return this.#decodeImageBuffer(
        barcode,
        await readFile(this.#fileOptions.path),
      );
    }
    if (isImageDataLike(x)) {
      return this.#decodeImageData(barcode, x);
    }
    if (typeof x === "string") {
      const base64 = x.startsWith("data:") ? x.slice(x.indexOf(",") + 1) : x;
      return this.#decodeImageBuffer(barcode, Buffer.from(base64, "base64"));
    }
    if (x instanceof Uint8Array) {
      // Buffer lands here too (Uint8Array subclass)
      return this.#decodeImageBuffer(
        barcode,
        Buffer.from(x.buffer, x.byteOffset, x.byteLength),
      );
    }
    if (Readable.isReadable(x as Readable)) {
      const chunks: Buffer[] = [];
      for await (const chunk of x as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return this.#decodeImageBuffer(barcode, Buffer.concat(chunks));
    }
    throw new TypeError(
      "Unsupported decode input. Expected ImageDataLike, Buffer, Uint8Array, Readable, base64 string or file options",
    );
  }

  #decodeImageData(barcode: Barcode, image: ImageDataLike): Promise<string> {
    return javascriptBarcodeReader({
      image: {
        data: new Uint8ClampedArray(image.data),
        width: image.width,
        height: image.height,
      },
      barcode,
    });
  }

  async #decodeImageBuffer(barcode: Barcode, buffer: Buffer): Promise<string> {
    const img = await Jimp.fromBuffer(buffer);
    return this.#decodeImageData(barcode, {
      data: img.bitmap.data,
      width: img.width,
      height: img.height,
    });
  }
}
