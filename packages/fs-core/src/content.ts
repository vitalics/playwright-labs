import type { Readable } from "node:stream";

/**
 * Anything {@link FileSystem.write} can store. Streams are buffered in
 * memory before writing — both backends keep the whole payload in memory
 * anyway (the virtual FS literally; the real FS for a single `write` call).
 */
export type FileContent =
  | string
  | Buffer
  | Uint8Array
  | Readable
  | ReadableStream<Uint8Array>;

/**
 * The subset of {@link FileContent} that can be turned into a `Buffer`
 * without awaiting — accepted by the {@link File} constructor.
 */
export type SyncFileContent = string | Buffer | Uint8Array | ArrayBuffer;

/** Options for {@link FileSystem.write}. */
export type WriteOptions = {
  /**
   * Encoding used when `content` is a string.
   * @default "utf8"
   */
  encoding?: BufferEncoding;
};

/**
 * Collects a {@link FileContent} into a single Buffer.
 * @param encoding applied to string content @default "utf8"
 */
export async function collectContent(
  content: FileContent,
  encoding: BufferEncoding = "utf8",
): Promise<Buffer> {
  if (isSyncContent(content)) return collectContentSync(content, encoding);
  // node Readable and web ReadableStream are both async-iterable
  const chunks: Buffer[] = [];
  for await (const chunk of content as AsyncIterable<string | Uint8Array>) {
    chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk, encoding)
        : Buffer.from(chunk),
    );
  }
  return Buffer.concat(chunks);
}

/**
 * Collects a {@link SyncFileContent} into a Buffer without awaiting.
 * @param encoding applied to string content @default "utf8"
 */
export function collectContentSync(
  content: SyncFileContent,
  encoding: BufferEncoding = "utf8",
): Buffer {
  if (typeof content === "string") return Buffer.from(content, encoding);
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (content instanceof ArrayBuffer) return Buffer.from(content);
  throw new TypeError(
    `collectContentSync: unsupported content of type ${typeof content}`,
  );
}

/** Whether `value` can be buffered by {@link collectContentSync}. */
export function isSyncContent(value: unknown): value is SyncFileContent {
  return (
    typeof value === "string" ||
    value instanceof Uint8Array ||
    value instanceof ArrayBuffer
  );
}

/**
 * Builds an `Error` with a Node-style `code` property, e.g. `ENOENT`.
 * Used by {@link VirtualFileSystem} to match `node:fs` error semantics.
 */
export function fsError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}
