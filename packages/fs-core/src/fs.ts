import type { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import type { FileContent, WriteOptions } from "./content.js";
import type { FsEntry } from "./entry.js";
import type { FileSystemEvents } from "./events.js";
import type { PathInput } from "./path.js";

/** Options for {@link FileSystem.createReadStream}. */
export type ReadStreamOptions = {
  /** Emit strings in this encoding instead of `Buffer` chunks. */
  encoding?: BufferEncoding;
  /** First byte to read. @default 0 */
  start?: number;
  /** Last byte to read, inclusive — like `node:fs`. @default end of file */
  end?: number;
  highWaterMark?: number;
};

/** Options for {@link FileSystem.createWriteStream}. */
export type WriteStreamOptions = {
  /** Encoding used to decode string chunks. @default "utf8" */
  encoding?: BufferEncoding;
  /**
   * `"w"` truncates, `"a"` appends.
   * @default "w"
   */
  flags?: "w" | "a";
};

/** A minimal stat snapshot shared by both backends. */
export type FileStat = {
  /** File size in bytes; `0` for directories. */
  size: number;
  /** Modification time, milliseconds since the Unix epoch. */
  mtimeMs: number;
  /**
   * Creation time, milliseconds since the Unix epoch. On a real POSIX
   * filesystem this is `ctime` (inode change time); in the virtual filesystem
   * it is the time the file was first written.
   */
  ctimeMs: number;
  isDirectory: boolean;
};

/**
 * Filesystem abstraction shared by {@link RealFileSystem} and
 * {@link VirtualFileSystem}.
 *
 * All paths are POSIX-style, separated by `/`, and resolved against
 * {@link root}. Resolving outside the root (via `..`) throws. Every path
 * argument also accepts a {@link Path}.
 *
 * It is also an `EventEmitter` typed with {@link FileSystemEvents}, so every
 * operation that goes through it can be observed:
 *
 * ```ts
 * fs.on("directory.create", (dir) => console.log("dir:", `${dir.path}`));
 * ```
 */
export interface FileSystem extends EventEmitter<FileSystemEvents> {
  /** Absolute root directory every path is resolved against. */
  readonly root: string;
  /**
   * Writes `content` to `path`, creating parent directories recursively.
   * Streams are buffered in memory first — see {@link collectContent}.
   */
  write(
    path: PathInput,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void>;
  /** Reads the whole file into a `Buffer`. Throws `ENOENT` when missing. */
  read(path: PathInput): Promise<Buffer>;
  /**
   * Reads the whole file as a string. Throws `ENOENT` when missing.
   * @param encoding @default "utf8"
   */
  readText(path: PathInput, encoding?: BufferEncoding): Promise<string>;
  /** Appends to an existing file or creates it (parent dirs included). */
  append(path: PathInput, content: string | Buffer | Uint8Array): Promise<void>;
  /** Whether a file or directory exists at `path`. */
  exists(path: PathInput): Promise<boolean>;
  /** Stats for a file or directory. Throws `ENOENT` when missing. */
  stat(path: PathInput): Promise<FileStat>;
  /** Creates a directory recursively; existing directories are fine. */
  mkdir(path: PathInput): Promise<void>;
  /**
   * Removes a file or directory recursively (`rm -rf` semantics) —
   * removing a missing path is a no-op.
   */
  remove(path: PathInput): Promise<void>;
  /**
   * Entry names (not full paths) of a directory.
   * @param path @default "."
   */
  list(path?: PathInput): Promise<string[]>;
  /**
   * Entries of a directory — like {@link list}, but each entry is a
   * {@link File} or {@link Directory} instance carrying `size` and times, and
   * bound to this filesystem, so `file.toBuffer()` and `directory.refresh()`
   * read through it. A directory's `size` is the recursive total of the files
   * inside; its children are iterable via `Symbol.iterator`.
   * @param path @default "."
   */
  entries(path?: PathInput): Promise<FsEntry[]>;
  /**
   * Streaming read. A missing file fails through the stream's `error` event
   * (with `code: "ENOENT"`), like `node:fs`. Emits `file.read` on `end`.
   */
  createReadStream(path: PathInput, options?: ReadStreamOptions): Readable;
  /**
   * Streaming write, creating parent directories. Emits `file.write` (or
   * `file.append` with `flags: "a"`) once the stream finishes.
   */
  createWriteStream(path: PathInput, options?: WriteStreamOptions): Writable;
}

export {
  collectContent,
  collectContentSync,
  fsError,
  isSyncContent,
  type FileContent,
  type SyncFileContent,
  type WriteOptions,
} from "./content.js";
export {
  Directory,
  File,
  type DirectoryInit,
  type EntryInit,
  type FileInit,
  type FsEntry,
} from "./entry.js";
export {
  FileSystemEmitter,
  type FileSystemEvent,
  type FileSystemEvents,
} from "./events.js";
export {
  FILTER,
  WALKER,
  filterAction,
  type EntryFilter,
  type FilterAction,
  type TimeInput,
  type WalkerFilter,
} from "./filter.js";
export { FSWalker } from "./walker.js";
export { DEFAULT_MIME_TYPE, MIME_BY_EXTENSION, mimeType } from "./mime.js";
export { Path, type PathInput } from "./path.js";
