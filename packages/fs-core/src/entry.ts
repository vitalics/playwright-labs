import {
  collectContent,
  collectContentSync,
  fsError,
  isSyncContent,
  type FileContent,
  type SyncFileContent,
} from "./content.js";
import {
  FILTER,
  WALKER,
  filterAction,
  type WalkerFilter,
} from "./filter.js";
import { DEFAULT_MIME_TYPE, mimeType } from "./mime.js";
import { Path, type PathInput } from "./path.js";
import type { FileSystem } from "./fs.js";

/** Union of directory entries — narrow via `isDirectory`. */
export type FsEntry = File | Directory;

/** Parent links, kept outside the entries so `toJSON` stays acyclic. */
const parents = new WeakMap<object, Directory>();

/** Shared {@link File} / {@link Directory} construction options. */
export type EntryInit = {
  /**
   * Path of the entry inside {@link EntryInit.fs} — root-relative, like every
   * other {@link FileSystem} argument. Defaults to the entry name, or to
   * `parent.path / name` once the entry belongs to a {@link Directory}.
   */
  path?: PathInput;
  /** Filesystem the entry came from — enables lazy reads and refreshes. */
  fs?: FileSystem;
  /** Modification time, epoch ms. @default Date.now() */
  mtimeMs?: number;
  /** Creation time, epoch ms. @default Date.now() */
  ctimeMs?: number;
};

/** {@link File} construction options. */
export type FileInit = EntryInit & {
  /** In-memory content. Without it the file reads through {@link EntryInit.fs}. */
  content?: SyncFileContent;
  /** Encoding for string content. @default "utf8" */
  encoding?: BufferEncoding;
  /** Size in bytes when the content is not loaded (e.g. a directory listing). */
  size?: number;
  /** Overrides the IANA media type guessed from the extension. */
  type?: string;
};

/** {@link Directory} construction options. */
export type DirectoryInit = EntryInit;

/**
 * A file — either a snapshot returned by {@link FileSystem.entries} (name,
 * size and times, content read on demand) or a standalone value holding its
 * own content.
 *
 * ```ts
 * const file = new File("report.csv", "a,b\n1,2");
 * file.type;               // "text/csv"
 * file.size;               // 7
 * await file.toBuffer();   // <Buffer 61 2c ...>
 * await file.toText();     // "a,b\n1,2"
 * await file.toBlob();     // Blob { type: "text/csv" }
 *
 * const [entry] = await fs.entries("downloads");
 * await entry.toBuffer();  // read through the filesystem it came from
 * ```
 */
export class File {
  readonly isDirectory = false as const;
  readonly isFile = true as const;

  readonly #name: string;
  readonly #path?: Path;
  readonly #fs?: FileSystem;
  readonly #content?: Buffer;
  readonly #size: number;
  readonly #type?: string;
  readonly #mtimeMs: number;
  readonly #ctimeMs: number;

  /**
   * @param name entry name; a path is accepted and its basename becomes the name
   * @param content in-memory content, a size in bytes, or a {@link FileInit}
   */
  constructor(
    name: PathInput,
    content?: SyncFileContent | number | FileInit,
    init: FileInit = {},
  ) {
    const fromContent: FileInit =
      content === undefined
        ? {}
        : typeof content === "number"
          ? { size: content }
          : isSyncContent(content)
            ? { content }
            : content;
    const options: FileInit = { ...fromContent, ...init };
    const named = new Path(name);
    this.#name = named.name;
    this.#path =
      options.path !== undefined
        ? new Path(options.path)
        : named.depth > 1 || named.isAbsolute
          ? named
          : undefined;
    this.#fs = options.fs;
    this.#content =
      options.content !== undefined
        ? collectContentSync(options.content, options.encoding)
        : undefined;
    this.#size = options.size ?? this.#content?.length ?? 0;
    this.#type = options.type;
    this.#mtimeMs = options.mtimeMs ?? Date.now();
    this.#ctimeMs = options.ctimeMs ?? Date.now();
  }

  /** Buffers any {@link FileContent} — streams included — into a `File`. */
  static async from(
    name: PathInput,
    content: FileContent,
    init: FileInit = {},
  ): Promise<File> {
    return new File(name, {
      ...init,
      content: await collectContent(content, init.encoding),
    });
  }

  /** Entry name, not a full path. */
  get name(): string {
    return this.#name;
  }

  /** Path inside the owning filesystem, derived from the parent chain. */
  get path(): Path {
    if (this.#path) return this.#path;
    const parent = parents.get(this);
    return parent ? parent.path.join(this.#name) : new Path(this.#name);
  }

  /** Extension including the dot (`".png"`); `""` when there is none. */
  get ext(): string {
    return this.path.ext;
  }

  /** Name without the extension. */
  get stem(): string {
    return this.path.stem;
  }

  /**
   * IANA media type guessed from the extension, or the explicit `type` passed
   * to the constructor. Unknown extensions give
   * {@link DEFAULT_MIME_TYPE} (`application/octet-stream`).
   */
  get type(): string {
    return this.#type ?? mimeType(this.#name) ?? DEFAULT_MIME_TYPE;
  }

  /** Alias of {@link File.type}. */
  get mime(): string {
    return this.type;
  }

  /** Size in bytes — the loaded content's length, or the recorded size. */
  get size(): number {
    return this.#content?.length ?? this.#size;
  }

  /** Modification time, epoch ms. */
  get mtimeMs(): number {
    return this.#mtimeMs;
  }

  /** Creation time, epoch ms. On a real POSIX filesystem this is `ctime`. */
  get ctimeMs(): number {
    return this.#ctimeMs;
  }

  /** Modification time. */
  get mtime(): Date {
    return new Date(this.#mtimeMs);
  }

  /** Creation time. */
  get ctime(): Date {
    return new Date(this.#ctimeMs);
  }

  /** Owning {@link Directory}, when the file came from one. */
  get parent(): Directory | undefined {
    return parents.get(this);
  }

  /** Whether the content is already in memory (no filesystem read needed). */
  get loaded(): boolean {
    return this.#content !== undefined;
  }

  /**
   * The content as a `Buffer` — from memory, or read through the filesystem
   * the entry came from. Throws `ENOENT` when the file has neither.
   */
  async toBuffer(): Promise<Buffer> {
    if (this.#content) return this.#content;
    if (this.#fs) return this.#fs.read(this.path);
    throw fsError(
      "ENOENT",
      `ENOENT: no content in memory and no filesystem bound, read '${this.path}'`,
    );
  }

  /**
   * The content as a string.
   * @param encoding @default "utf8"
   */
  async toText(encoding: BufferEncoding = "utf8"): Promise<string> {
    return (await this.toBuffer()).toString(encoding);
  }

  /** The content as a `Blob` tagged with {@link File.type}. */
  async toBlob(): Promise<Blob> {
    const buffer = await this.toBuffer();
    return new Blob([new Uint8Array(buffer)], { type: this.type });
  }

  toJSON(): {
    name: string;
    path: string;
    size: number;
    type: string;
    isDirectory: false;
    mtimeMs: number;
    ctimeMs: number;
  } {
    return {
      name: this.#name,
      path: this.path.toString(),
      size: this.size,
      type: this.type,
      isDirectory: false,
      mtimeMs: this.#mtimeMs,
      ctimeMs: this.#ctimeMs,
    };
  }

  /** The path — use {@link File.toText} for the content. */
  toString(): string {
    return this.path.toString();
  }
}

/**
 * A directory — a snapshot of its children plus, when it came from a
 * {@link FileSystem}, a live handle onto it.
 *
 * `size` is the recursive total of every file inside (`0` when empty).
 * `Symbol.iterator` walks the snapshot of immediate children;
 * `Symbol.asyncIterator` re-reads them from the filesystem first, so it sees
 * writes that happened after the snapshot was taken:
 *
 * ```ts
 * for (const entry of dir) console.log(entry.name, entry.size);
 *
 * for await (const entry of dir) console.log(entry.name); // fresh listing
 *
 * for (const file of dir.walk(WALKER.SHOW_ALL_FILES)) console.log(file.path);
 * ```
 */
export class Directory {
  readonly isDirectory = true as const;
  readonly isFile = false as const;

  readonly #name: string;
  readonly #path?: Path;
  readonly #fs?: FileSystem;
  readonly #mtimeMs: number;
  readonly #ctimeMs: number;
  #children: readonly FsEntry[];

  constructor(
    /** Entry name; a path is accepted and its basename becomes the name. */
    name: PathInput,
    /** Immediate children (files and subdirectories). */
    children: readonly FsEntry[] = [],
    init: DirectoryInit = {},
  ) {
    const named = new Path(name);
    this.#name = named.name;
    this.#path =
      init.path !== undefined
        ? new Path(init.path)
        : named.depth > 1 || named.isAbsolute
          ? named
          : undefined;
    this.#fs = init.fs;
    this.#mtimeMs = init.mtimeMs ?? Date.now();
    this.#ctimeMs = init.ctimeMs ?? Date.now();
    this.#children = this.#adopt(children);
  }

  /** Entry name, not a full path. */
  get name(): string {
    return this.#name;
  }

  /** Path inside the owning filesystem, derived from the parent chain. */
  get path(): Path {
    if (this.#path) return this.#path;
    const parent = parents.get(this);
    return parent ? parent.path.join(this.#name) : new Path(this.#name);
  }

  /** Immediate children (files and subdirectories). */
  get children(): readonly FsEntry[] {
    return this.#children;
  }

  /** Immediate child files. */
  get files(): File[] {
    return this.#children.filter((child): child is File => !child.isDirectory);
  }

  /** Immediate child directories. */
  get directories(): Directory[] {
    return this.#children.filter(
      (child): child is Directory => child.isDirectory,
    );
  }

  /** Recursive total size of every file inside, in bytes. */
  get size(): number {
    let total = 0;
    for (const child of this.#children) total += child.size;
    return total;
  }

  /** Modification time, epoch ms. */
  get mtimeMs(): number {
    return this.#mtimeMs;
  }

  /** Creation time, epoch ms. */
  get ctimeMs(): number {
    return this.#ctimeMs;
  }

  /** Modification time. */
  get mtime(): Date {
    return new Date(this.#mtimeMs);
  }

  /** Creation time. */
  get ctime(): Date {
    return new Date(this.#ctimeMs);
  }

  /** Owning {@link Directory}, when this one came from a listing. */
  get parent(): Directory | undefined {
    return parents.get(this);
  }

  /** Immediate child by name, or the first one matching a predicate. */
  find(nameOrFilter: string | ((entry: FsEntry) => boolean)): FsEntry | undefined {
    const filter =
      typeof nameOrFilter === "string"
        ? (entry: FsEntry) => entry.name === nameOrFilter
        : nameOrFilter;
    return this.#children.find((child) => filter(child));
  }

  /** Immediate child file by name. */
  file(name: string): File | undefined {
    return this.files.find((child) => child.name === name);
  }

  /** Immediate child directory by name. */
  directory(name: string): Directory | undefined {
    return this.directories.find((child) => child.name === name);
  }

  /** Whether an immediate child with that name exists. */
  has(name: string): boolean {
    return this.find(name) !== undefined;
  }

  /**
   * Depth-first walk of the snapshot — every descendant the filter accepts.
   * A skipped directory (`false`) is still descended into; only
   * `FILTER.REJECT` prunes a subtree. See {@link FSWalker} for a cursor.
   *
   * @param filter @default WALKER.SHOW_ALL
   */
  *walk(filter: WalkerFilter = WALKER.SHOW_ALL): Generator<FsEntry> {
    for (const child of this.#children) {
      const action = filterAction(filter, child);
      if (action === FILTER.ACCEPT) yield child;
      if (action !== FILTER.REJECT && child.isDirectory) {
        yield* child.walk(filter);
      }
    }
  }

  /**
   * Depth-first walk that re-reads every level from the filesystem.
   * Falls back to the snapshot for unbound directories.
   *
   * @param filter @default WALKER.SHOW_ALL
   */
  async *walkAsync(
    filter: WalkerFilter = WALKER.SHOW_ALL,
  ): AsyncGenerator<FsEntry> {
    for await (const child of this) {
      const action = filterAction(filter, child);
      if (action === FILTER.ACCEPT) yield child;
      if (action !== FILTER.REJECT && child.isDirectory) {
        yield* child.walkAsync(filter);
      }
    }
  }

  /**
   * Re-reads the children from the filesystem the directory came from.
   * Throws when the directory is not bound to one.
   */
  async refresh(): Promise<this> {
    if (!this.#fs) {
      throw new Error(
        `Directory "${this.path}" is not bound to a filesystem — nothing to refresh`,
      );
    }
    this.#children = this.#adopt(await this.#fs.entries(this.path));
    return this;
  }

  toJSON(): {
    name: string;
    path: string;
    size: number;
    isDirectory: true;
    children: unknown[];
  } {
    return {
      name: this.#name,
      path: this.path.toString(),
      size: this.size,
      isDirectory: true,
      children: this.#children.map((child) => child.toJSON()),
    };
  }

  /** The path. */
  toString(): string {
    return this.path.toString();
  }

  /** Immediate children, from the snapshot. */
  *[Symbol.iterator](): IterableIterator<FsEntry> {
    yield* this.#children;
  }

  /** Immediate children, re-read from the filesystem when bound. */
  async *[Symbol.asyncIterator](): AsyncIterableIterator<FsEntry> {
    if (this.#fs) this.#children = this.#adopt(await this.#fs.entries(this.path));
    yield* this.#children;
  }

  /** Records this directory as the parent of every child. */
  #adopt(children: readonly FsEntry[]): readonly FsEntry[] {
    const adopted = [...children];
    for (const child of adopted) parents.set(child, this);
    return Object.freeze(adopted);
  }
}
