import { FSImplementation } from "node:fs";
import type { Readable } from "node:stream";

/**
 * Anything {@link FileSystem.write} can store. Streams are buffered in
 * memory before writing — both backends keep the whole payload in memory
 * anyway (the virtual FS literally; the real FS for a single `write` call).
 */
export type FileContent =
  string | Buffer | Uint8Array | Readable | ReadableStream<Uint8Array>;

/** Options for {@link FileSystem.write}. */
export type WriteOptions = {
  /**
   * Encoding used when `content` is a string.
   * @default "utf8"
   */
  encoding?: BufferEncoding;
};

/** A minimal stat snapshot shared by both backends. */
export type FileStat = {
  /** File size in bytes; `0` for directories. */
  size: number;
  /** Modification time, milliseconds since the Unix epoch. */
  mtimeMs: number;
  isDirectory: boolean;
};

class FSWalker {
  filter(
    root: string | Path | Directory | FileSystem,
    filter: (element: File | Directory) => boolean,
  ) {}
  firstChild() {}
  lastChild() {}
  nextNode() {}
  prevNode() {}
  nextSibling() {}
}

export const WALKER = {
  SHOW_ALL: (_elem: File | Directory) => true,
  SHOW_ALL_DIRECTORIES: (elem: File | Directory) => elem instanceof Directory,
  SHOW_ALL_FILES: (elem: File | Directory) => elem instanceof File,
  SHOW_ALL_FILES_CTIME_BETWEEN: () => (elem: File | Directory) => elem instanceof File && elem.,
  SHOW_ALL_FILES_MTIME_BETWEEN: () => (elem: File | Directory) => ,
};


export class Path {}

/** A file entry returned by {@link FileSystem.entries}. */
export class File {
  readonly isDirectory = false as const;
  #parent: Directory | FileSystem | null = null;
  #content: Buffer = Buffer.alloc(0);
  constructor() {}

  get parent(): Directory | FileSystem {}

  /** Create at time: */
  get ctime(): bigint { }

  /** Modification date */
  get mtime(): bigint { }


  get name(): string {
    return this.name;
  }
  get size(): number {
    return this.#content.length;
  }
}

/**
 * A directory entry returned by {@link FileSystem.entries}.
 *
 * `size` is the recursive total of every file inside (`0` when empty).
 * Supports `Symbol.iterator` — iterating yields the immediate children
 * (files and subdirectories):
 *
 * ```ts
 * for (const entry of dir) {
 *   console.log(entry.name, entry.size);
 * }
 * ```
 */
export class Directory {
  readonly isDirectory = true as const;
  /** Immediate children (files and subdirectories). */
  readonly children: readonly (File | Directory)[];
  constructor(
    /** Entry name (not a full path). */
    readonly name: string,
    children: readonly (File | Directory)[] = [],
  ) {
    this.children = children;
  }

  /** Recursive total size of every file inside, in bytes. */
  get size(): number {
    let total = 0;
    for (const child of this.children) total += child.size;
    return total;
  }

  *[Symbol.iterator](): IterableIterator<File | Directory> {
    yield* this.children;
  }
}

/** Union of directory entries — narrow via `isDirectory`. */
export type FsEntry = File | Directory;

/**
 * Filesystem abstraction shared by {@link RealFileSystem} and
 * {@link VirtualFileSystem}.
 *
 * All paths are POSIX-style, separated by `/`, and resolved against
 * {@link root}. Resolving outside the root (via `..`) throws.
 */
export interface FileSystem {
  /** Absolute root directory every path is resolved against. */
  readonly root: string;
  /**
   * Writes `content` to `path`, creating parent directories recursively.
   * Streams are buffered in memory first — see {@link collectContent}.
   */
  write(
    path: string,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void>;
  /** Reads the whole file into a `Buffer`. Throws `ENOENT` when missing. */
  read(path: string): Promise<Buffer>;
  /**
   * Reads the whole file as a string. Throws `ENOENT` when missing.
   * @param encoding @default "utf8"
   */
  readText(path: string, encoding?: BufferEncoding): Promise<string>;
  /** Appends to an existing file or creates it (parent dirs included). */
  append(path: string, content: string | Buffer | Uint8Array): Promise<void>;
  /** Whether a file or directory exists at `path`. */
  exists(path: string): Promise<boolean>;
  /** Stats for a file or directory. Throws `ENOENT` when missing. */
  stat(path: string): Promise<FileStat>;
  /** Creates a directory recursively; existing directories are fine. */
  mkdir(path: string): Promise<void>;
  /**
   * Removes a file or directory recursively (`rm -rf` semantics) —
   * removing a missing path is a no-op.
   */
  remove(path: string): Promise<void>;
  /**
   * Entry names (not full paths) of a directory.
   * @param path @default "."
   */
  list(path?: string): Promise<string[]>;
  /**
   * Entries of a directory — like {@link list}, but each entry is a
   * {@link File} or {@link Directory} instance carrying `size` (for a
   * directory the size is the recursive total of the files inside, and the
   * children are iterable via `Symbol.iterator`).
   * @param path @default "."
   */
  entries(path?: string): Promise<FsEntry[]>;
}

/** Collects a {@link FileContent} into a single Buffer. */
export async function collectContent(content: FileContent): Promise<Buffer> {
  if (typeof content === "string") return Buffer.from(content, "utf8");
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  // node Readable and web ReadableStream are both async-iterable
  const chunks: Buffer[] = [];
  for await (const chunk of content as AsyncIterable<string | Uint8Array>) {
    chunks.push(
      typeof chunk === "string"
        ? Buffer.from(chunk, "utf8")
        : Buffer.from(chunk),
    );
  }
  return Buffer.concat(chunks);
}

/**
 * Builds an `Error` with a Node-style `code` property, e.g. `ENOENT`.
 * Used by {@link VirtualFileSystem} to match `node:fs` error semantics.
 */
export function fsError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}
