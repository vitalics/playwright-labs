import { Readable, Writable } from "node:stream";
import {
  collectContent,
  Directory,
  File,
  FileSystemEmitter,
  fsError,
  Path,
  type FileContent,
  type FileStat,
  type FileSystem,
  type FsEntry,
  type PathInput,
  type ReadStreamOptions,
  type WriteOptions,
  type WriteStreamOptions,
} from "./fs.js";

type VirtualEntry = { content: Buffer; mtimeMs: number; ctimeMs: number };

/**
 * In-memory {@link FileSystem} — files live in a `Map`, directories are
 * implicit from file paths. Never touches the real filesystem.
 *
 * Paths are POSIX-style; a leading `/` is optional (everything is already
 * relative to {@link root}). `.` and `..` segments are resolved; escaping
 * above the root throws. Operations emit {@link FileSystemEvents}.
 */
export class VirtualFileSystem extends FileSystemEmitter implements FileSystem {
  readonly root: string;
  /** Absolute (root-prefixed) file path -> entry. */
  #files = new Map<string, VirtualEntry>();
  /** Explicitly created (possibly empty) directories -> creation time. */
  #dirs = new Map<string, number>();

  constructor(root: string = "/") {
    super();
    // the virtual root is always absolute: "data" and "/data" are the same
    this.root = new Path("/", root).toString();
  }

  async write(
    path: PathInput,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void> {
    this.#store(path, await collectContent(content, options?.encoding), false);
    this.notify("file.write", () => this.#fileEntry(path));
  }

  async read(path: PathInput): Promise<Buffer> {
    const entry = this.#files.get(this.#resolve(path));
    if (!entry) {
      throw fsError("ENOENT", `ENOENT: no such file, open '${path}'`);
    }
    this.notify("file.read", () => this.#fileEntry(path));
    return entry.content;
  }

  async readText(path: PathInput, encoding?: BufferEncoding): Promise<string> {
    const buffer = await this.read(path);
    return buffer.toString(encoding ?? "utf8");
  }

  async append(
    path: PathInput,
    content: string | Buffer | Uint8Array,
  ): Promise<void> {
    const chunk =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;
    this.#store(path, Buffer.from(chunk), true);
    this.notify("file.append", () => this.#fileEntry(path));
  }

  async exists(path: PathInput): Promise<boolean> {
    const absolute = this.#resolve(path);
    return this.#files.has(absolute) || this.#isDirectory(absolute);
  }

  async stat(path: PathInput): Promise<FileStat> {
    const absolute = this.#resolve(path);
    const entry = this.#files.get(absolute);
    if (entry) {
      return {
        size: entry.content.length,
        mtimeMs: entry.mtimeMs,
        ctimeMs: entry.ctimeMs,
        isDirectory: false,
      };
    }
    if (this.#isDirectory(absolute)) {
      const created = this.#dirs.get(absolute) ?? 0;
      return {
        size: 0,
        mtimeMs: created,
        ctimeMs: created,
        isDirectory: true,
      };
    }
    throw fsError("ENOENT", `ENOENT: no such file or directory, stat '${path}'`);
  }

  async mkdir(path: PathInput): Promise<void> {
    // directories are implicit — recording a marker keeps the path existing
    // even without files inside
    const absolute = this.#resolve(path);
    const existed = this.#isDirectory(absolute);
    if (!this.#dirs.has(absolute)) this.#dirs.set(absolute, Date.now());
    if (!existed) {
      this.notify("directory.create", () => this.#directoryEntry(path));
    }
  }

  async remove(path: PathInput): Promise<void> {
    const absolute = this.#resolve(path);
    const removedFile = this.#files.get(absolute);
    const removedDirectory = !removedFile && this.#isDirectory(absolute);
    this.#files.delete(absolute);
    this.#dirs.delete(absolute);
    const prefix = absolute === "/" ? "/" : absolute + "/";
    for (const key of this.#files.keys()) {
      if (key.startsWith(prefix)) this.#files.delete(key);
    }
    for (const dir of this.#dirs.keys()) {
      if (dir.startsWith(prefix)) this.#dirs.delete(dir);
    }
    if (removedFile) {
      this.notify("file.remove", () =>
        this.#fileEntry(path, {
          size: removedFile.content.length,
          mtimeMs: removedFile.mtimeMs,
          ctimeMs: removedFile.ctimeMs,
        }),
      );
    } else if (removedDirectory) {
      this.notify("directory.remove", () => this.#directoryEntry(path));
    }
  }

  async list(path: PathInput = "."): Promise<string[]> {
    const absolute = this.#resolve(path);
    if (!this.#isDirectory(absolute)) {
      if (this.#files.has(absolute)) {
        throw fsError("ENOTDIR", `ENOTDIR: not a directory, scandir '${path}'`);
      }
      throw fsError(
        "ENOENT",
        `ENOENT: no such file or directory, scandir '${path}'`,
      );
    }
    return this.#childNames(absolute);
  }

  async entries(path: PathInput = "."): Promise<FsEntry[]> {
    const absolute = this.#resolve(path);
    await this.list(path); // also throws ENOENT/ENOTDIR
    return this.#childEntries(absolute, new Path(path));
  }

  createReadStream(path: PathInput, options: ReadStreamOptions = {}): Readable {
    const entry = this.#files.get(this.#resolve(path));
    if (!entry) {
      // missing files fail through the `error` event, like node:fs
      const missing = new Readable({ read() {} });
      const error = fsError("ENOENT", `ENOENT: no such file, open '${path}'`);
      process.nextTick(() => missing.destroy(error));
      return missing;
    }
    const payload = entry.content.subarray(
      options.start ?? 0,
      options.end === undefined ? undefined : options.end + 1,
    );
    let pushed = false;
    const stream = new Readable({
      encoding: options.encoding,
      highWaterMark: options.highWaterMark,
      read() {
        if (pushed) return;
        pushed = true;
        this.push(payload);
        this.push(null);
      },
    });
    stream.once("end", () =>
      this.notify("file.read", () => this.#fileEntry(path)),
    );
    return stream;
  }

  createWriteStream(
    path: PathInput,
    options: WriteStreamOptions = {},
  ): Writable {
    this.#resolve(path); // fail fast on a path outside the root
    const encoding = options.encoding ?? "utf8";
    const append = options.flags === "a";
    const chunks: Buffer[] = [];
    return new Writable({
      write: (chunk, _encoding, callback) => {
        chunks.push(
          typeof chunk === "string"
            ? Buffer.from(chunk, encoding)
            : Buffer.from(chunk as Uint8Array),
        );
        callback();
      },
      final: (callback) => {
        this.#store(path, Buffer.concat(chunks), append);
        this.notify(append ? "file.append" : "file.write", () =>
          this.#fileEntry(path),
        );
        callback();
      },
    });
  }

  /** Writes or appends `payload`, keeping the original creation time. */
  #store(path: PathInput, payload: Buffer, append: boolean): void {
    const absolute = this.#resolve(path);
    const existing = this.#files.get(absolute);
    const now = Date.now();
    this.#files.set(absolute, {
      content:
        append && existing
          ? Buffer.concat([existing.content, payload])
          : payload,
      mtimeMs: now,
      ctimeMs: existing?.ctimeMs ?? now,
    });
  }

  /**
   * Builds the entry tree of a directory: files with sizes, directories with
   * children. Entries are bound to this filesystem and carry their
   * root-relative path.
   */
  #childEntries(absolute: string, relative: Path): FsEntry[] {
    return this.#childNames(absolute).map((name) => {
      const child = absolute === "/" ? `/${name}` : `${absolute}/${name}`;
      const childPath = relative.join(name);
      const file = this.#files.get(child);
      if (file) {
        return new File(name, {
          fs: this,
          path: childPath,
          size: file.content.length,
          mtimeMs: file.mtimeMs,
          ctimeMs: file.ctimeMs,
        });
      }
      const created = this.#dirs.get(child) ?? 0;
      return new Directory(name, this.#childEntries(child, childPath), {
        fs: this,
        path: childPath,
        mtimeMs: created,
        ctimeMs: created,
      });
    });
  }

  /** Immediate entry names of a directory, sorted. */
  #childNames(absolute: string): string[] {
    const prefix = absolute === "/" ? "/" : absolute + "/";
    const names = new Set<string>();
    for (const key of [...this.#files.keys(), ...this.#dirs.keys()]) {
      const rest = key.startsWith(prefix) ? key.slice(prefix.length) : null;
      if (rest && rest.length > 0) names.add(rest.split("/")[0]!);
    }
    return [...names].sort();
  }

  /** A {@link File} for an event payload. */
  #fileEntry(
    path: PathInput,
    snapshot?: { size: number; mtimeMs: number; ctimeMs: number },
  ): File {
    const entryPath = new Path(path);
    const stored = this.#files.get(this.#resolve(path));
    const stats =
      snapshot ??
      (stored && {
        size: stored.content.length,
        mtimeMs: stored.mtimeMs,
        ctimeMs: stored.ctimeMs,
      });
    return new File(entryPath.name, {
      fs: this,
      path: entryPath,
      size: stats?.size ?? 0,
      mtimeMs: stats?.mtimeMs ?? Date.now(),
      ctimeMs: stats?.ctimeMs ?? Date.now(),
    });
  }

  /** A {@link Directory} for an event payload — children are not listed. */
  #directoryEntry(path: PathInput): Directory {
    const entryPath = new Path(path);
    const created = this.#dirs.get(this.#resolve(path)) ?? Date.now();
    return new Directory(entryPath.name || entryPath.toString(), [], {
      fs: this,
      path: entryPath,
      mtimeMs: created,
      ctimeMs: created,
    });
  }

  /** Normalizes `path` against {@link root}; throws on `..` escape. */
  #resolve(path: PathInput): string {
    const value = String(path);
    const absolute = new Path(this.root, value.replace(/^\/+/, "")).toString();
    if (
      absolute !== this.root &&
      !absolute.startsWith(this.root === "/" ? "/" : this.root + "/")
    ) {
      throw new Error(
        `VirtualFileSystem: path "${value}" resolves outside root "${this.root}"`,
      );
    }
    return absolute;
  }

  /** A directory exists when recorded or implied by a file beneath it. */
  #isDirectory(absolute: string): boolean {
    if (absolute === this.root) return true;
    if (this.#dirs.has(absolute)) return true;
    const prefix = absolute + "/";
    for (const key of [...this.#files.keys(), ...this.#dirs.keys()]) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }
}
