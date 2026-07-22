import QRCode from "qrcode";
import jsQR, { type QRCode as jsqrCode } from "jsqr";
import { Jimp } from "jimp";
import { Readable, Writable } from "node:stream";
import { readFile } from "node:fs/promises";

type EncoderOutputFormat =
  | "base64-prefix"
  | "base64url"
  | "terminal"
  | "svg"
  | "utf8"
  | "file"
  | "stream"
  | "buffer";

type Options =
  | TerminalOptions
  | FileOptions
  | StreamOptions
  | {
      type: Extract<
        EncoderOutputFormat,
        "base64-prefix" | "base64url" | "svg" | "utf8" | "buffer"
      >;
    };

type FileOptions = {
  type: Extract<EncoderOutputFormat, "file">;
  path: string;
};

type StreamOptions = {
  type: Extract<EncoderOutputFormat, "stream">;
  writable: Writable;
};

type TerminalOptions = {
  type: Extract<EncoderOutputFormat, "terminal">;
  /**
   * Outputs smaller QR code.
   * @default false
   */
  small?: boolean | undefined;
  /**
   * Define how much wide the quiet zone should be.
   * @default 4
   */
  margin?: number | undefined;
  /**
   * Scale factor. A value of `1` means 1px per modules (black dots).
   * @default 4
   */
  scale?: number | undefined;
  /**
   * Forces a specific width for the output image.
   * If width is too small to contain the qr symbol, this option will be ignored.
   * Takes precedence over `scale`.
   */
  width?: number | undefined;
  color?:
    | {
        /**
         * Color of dark module. Value must be in hex format (RGBA).
         * Note: dark color should always be darker than `color.light`.
         * @default '#000000ff'
         */
        dark?: string | undefined;
        /**
         * Color of light module. Value must be in hex format (RGBA).
         * @default '#ffffffff'
         */
        light?: string | undefined;
      }
    | undefined;
};

export class SegmentArray extends Array<QRCode.QRCodeSegment> {
  addStringSegment(segment: string) {
    return this.addSegment({ data: segment });
  }
  addByteSegment(segment: Buffer | Uint8ClampedArray | Uint8Array) {
    return this.addSegment({ data: segment, mode: "byte" });
  }
  addNumericSegment(segment: `${number}` | number) {
    return this.addSegment({ data: String(segment), mode: "numeric" });
  }
  addAlphanumericSegment(segment: string) {
    return this.addSegment({ data: segment, mode: "alphanumeric" });
  }
  addSegment(segment: QRCode.QRCodeSegment) {
    this.push(segment);
    return this;
  }
  addSegments(...segments: readonly QRCode.QRCodeSegment[] | SegmentArray) {
    this.push(...segments);
    return this;
  }
  get segments(): readonly QRCode.QRCodeSegment[] {
    return this;
  }
}

const BASE64_PREFIX = "data:image/png;base64,";
export class QRCodeEncoder {
  #outputFormat: Options["type"] = "base64-prefix";
  #terminalOptions?: TerminalOptions | null = null;
  #fileOptions?: Partial<FileOptions> | null = null;
  #streamOptions?: Partial<StreamOptions> | null = null;
  constructor(options?: Options) {
    this.#outputFormat = options?.type ?? "base64-prefix";
    if (this.#outputFormat === "terminal") {
      this.#terminalOptions = (options as TerminalOptions) ?? null;
    }
    if (this.#outputFormat === "file") {
      this.#fileOptions = (options as FileOptions) ?? null;
    }
    if (this.#outputFormat === "stream") {
      this.#streamOptions = (options as StreamOptions) ?? null;
    }
  }

  #segments = new SegmentArray();
  addStringSegment(segment: string) {
    this.#segments.addStringSegment(segment);
    return this;
  }
  addByteSegment(segment: Buffer | Uint8ClampedArray | Uint8Array) {
    this.#segments.addByteSegment(segment);
    return this;
  }
  addNumericSegment(segment: `${number}` | number) {
    this.#segments.addNumericSegment(segment);
    return this;
  }
  addAlphanumericSegment(segment: string) {
    this.#segments.addAlphanumericSegment(segment);
    return this;
  }
  addSegment(segment: QRCode.QRCodeSegment) {
    this.#segments.addSegment(segment);
    return this;
  }
  addSegments(...segments: readonly QRCode.QRCodeSegment[]) {
    this.#segments.addSegments(...segments);
    return this;
  }
  get segments(): readonly QRCode.QRCodeSegment[] {
    return this.#segments;
  }

  /**
   * Generates QR code in the format configured via constructor options.
   *
   * - `terminal` / `svg` / `utf8` — resolves with a string representation
   * - `file` — writes the file, resolves with the file path
   * - `stream` — pipes PNG into the writable, resolves with '' when finished
   * - `buffer` — resolves with a PNG Buffer
   * - `base64-prefix` — resolves with a data URL (`data:image/png;base64,...`)
   * - `base64url` — resolves with raw base64 payload (no data URL prefix)
   *
   * Input is either the `x` argument or previously added segments — not both,
   * and at least one of them is required.
   */
  async encode(x?: string): Promise<string | Buffer> {
    if (typeof x !== "undefined" && this.#segments.length > 0) {
      throw new TypeError(
        'Cannot encode QRCode due to using segments with encode("non empty string"). Expected either segments or encode with argument',
      );
    }
    if (typeof x === "undefined" && this.#segments.length === 0) {
      throw new TypeError(
        "Nothing to encode. Expected either encode(string) argument or segments added beforehand",
      );
    }
    const strOrSegments = x ?? this.#segments;

    switch (this.#outputFormat) {
      case "terminal":
      case "svg":
      case "utf8":
        return QRCode.toString(strOrSegments, {
          ...this.#terminalOptions,
          type: this.#outputFormat,
        });

      case "file": {
        const path = this.#fileOptions?.path;
        if (!path) {
          throw new Error("cannot encode into a file without file options");
        }
        await QRCode.toFile(path, strOrSegments);
        return path;
      }

      case "stream": {
        const writable = this.#streamOptions?.writable;
        if (!writable) {
          throw new Error("cannot encode into a stream without stream options");
        }
        await new Promise<void>((resolve, reject) => {
          writable.once("error", reject);
          writable.once("finish", resolve);
          QRCode.toFileStream(writable, strOrSegments);
        });
        return "";
      }

      case "buffer":
        return QRCode.toBuffer(strOrSegments);

      case "base64url": {
        const url = await QRCode.toDataURL(strOrSegments);
        return url.startsWith(BASE64_PREFIX)
          ? url.slice(BASE64_PREFIX.length)
          : url;
      }

      case "base64-prefix":
      default:
        return QRCode.toDataURL(strOrSegments);
    }
  }
}

type DecoderOptions = {
  type: "file";
  path: string;
};

type ImageDataLike = {
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

export class QRCodeDecoder {
  #fileOptions: DecoderOptions | null = null;
  constructor(options?: DecoderOptions) {
    this.#fileOptions = options ?? null;
  }

  /** Decodes the file configured via constructor options. */
  decode(): Promise<jsqrCode | null>;
  /** Decodes raw RGBA pixel data. */
  decode(x: ImageDataLike): Promise<jsqrCode | null>;
  /** Decodes an encoded image (PNG/JPEG/...) from a Buffer/Uint8Array. */
  decode(x: Buffer | Uint8Array): Promise<jsqrCode | null>;
  /** Decodes an encoded image read from a stream. */
  decode(x: Readable): Promise<jsqrCode | null>;
  /** Decodes a data URL (`data:image/png;base64,...`) or a raw base64 image string. */
  decode(x: string): Promise<jsqrCode | null>;
  async decode(
    x?: Readable | ImageDataLike | Buffer | Uint8Array | string,
  ): Promise<jsqrCode | null> {
    if (typeof x === "undefined") {
      if (
        this.#fileOptions?.type !== "file" ||
        typeof this.#fileOptions.path !== "string"
      ) {
        throw new TypeError(
          "Nothing to decode. Expected decode(input) argument or file options in constructor",
        );
      }
      return this.#decodeImageBuffer(await readFile(this.#fileOptions.path));
    }
    if (isImageDataLike(x)) {
      return jsQR(new Uint8ClampedArray(x.data), x.width, x.height);
    }
    if (typeof x === "string") {
      const base64 = x.startsWith("data:") ? x.slice(x.indexOf(",") + 1) : x;
      return this.#decodeImageBuffer(Buffer.from(base64, "base64"));
    }
    if (x instanceof Uint8Array) {
      // Buffer lands here too (Uint8Array subclass)
      return this.#decodeImageBuffer(
        Buffer.from(x.buffer, x.byteOffset, x.byteLength),
      );
    }
    if (Readable.isReadable(x as Readable)) {
      const chunks: Buffer[] = [];
      for await (const chunk of x as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return this.#decodeImageBuffer(Buffer.concat(chunks));
    }
    throw new TypeError(
      "Unsupported decode input. Expected ImageDataLike, Buffer, Uint8Array, Readable, base64 string or file options",
    );
  }

  async #decodeImageBuffer(buffer: Buffer): Promise<jsqrCode | null> {
    const img = await Jimp.fromBuffer(buffer);
    return jsQR(new Uint8ClampedArray(img.bitmap.data), img.width, img.height);
  }
}
