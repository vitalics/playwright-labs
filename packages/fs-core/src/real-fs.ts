import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  statSync,
} from "node:fs";
import * as fs from "node:fs/promises";
import nodePath from "node:path";
import type { Readable, Writable } from "node:stream";
import {
  collectContent,
  Directory,
  File,
  FileSystemEmitter,
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

/**
 * {@link FileSystem} over `node:fs/promises`, rooted at a directory
 * (`process.cwd()` by default).
 *
 * Paths are POSIX-style with `/`, resolved via `path.resolve(root, p)`.
 * Resolving outside the root (via `..`) throws. Operations that go through
 * this instance emit {@link FileSystemEvents}; changes made to the disk by
 * anything else are not watched.
 */
export class RealFileSystem extends FileSystemEmitter implements FileSystem {
  readonly root: string;

  constructor(root: string = process.cwd()) {
    super();
    this.root = nodePath.resolve(root);
  }

  async write(
    path: PathInput,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void> {
    const absolute = this.#resolve(path);
    await fs.mkdir(nodePath.dirname(absolute), { recursive: true });
    await fs.writeFile(
      absolute,
      await collectContent(content, options?.encoding),
    );
    this.notify("file.write", () => this.#fileEntry(path));
  }

  async read(path: PathInput): Promise<Buffer> {
    const buffer = await fs.readFile(this.#resolve(path));
    this.notify("file.read", () => this.#fileEntry(path));
    return buffer;
  }

  async readText(path: PathInput, encoding?: BufferEncoding): Promise<string> {
    const text = await fs.readFile(this.#resolve(path), encoding ?? "utf8");
    this.notify("file.read", () => this.#fileEntry(path));
    return text;
  }

  async append(
    path: PathInput,
    content: string | Buffer | Uint8Array,
  ): Promise<void> {
    const absolute = this.#resolve(path);
    await fs.mkdir(nodePath.dirname(absolute), { recursive: true });
    await fs.appendFile(absolute, content);
    this.notify("file.append", () => this.#fileEntry(path));
  }

  async exists(path: PathInput): Promise<boolean> {
    try {
      await fs.access(this.#resolve(path));
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: PathInput): Promise<FileStat> {
    const stats = await fs.stat(this.#resolve(path));
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      ctimeMs: stats.ctimeMs,
      isDirectory: stats.isDirectory(),
    };
  }

  async mkdir(path: PathInput): Promise<void> {
    const absolute = this.#resolve(path);
    const observed = this.listenerCount("directory.create") > 0;
    const existed = observed ? await this.exists(path) : false;
    await fs.mkdir(absolute, { recursive: true });
    if (observed && !existed) {
      this.notify("directory.create", () => this.#directoryEntry(path));
    }
  }

  async remove(path: PathInput): Promise<void> {
    const absolute = this.#resolve(path);
    const observed =
      this.listenerCount("file.remove") > 0 ||
      this.listenerCount("directory.remove") > 0;
    // snapshot the entry before it goes, so listeners see its size and times
    const removed = observed
      ? statSync(absolute, { throwIfNoEntry: false })
      : undefined;
    await fs.rm(absolute, { recursive: true, force: true });
    if (!removed) return;
    if (removed.isDirectory()) {
      this.notify("directory.remove", () => this.#directoryEntry(path, removed));
    } else {
      this.notify("file.remove", () => this.#fileEntry(path, removed));
    }
  }

  async list(path: PathInput = "."): Promise<string[]> {
    return fs.readdir(this.#resolve(path));
  }

  async entries(path: PathInput = "."): Promise<FsEntry[]> {
    return this.#buildEntries(this.#resolve(path), new Path(path));
  }

  createReadStream(
    path: PathInput,
    options: ReadStreamOptions = {},
  ): Readable {
    const stream = createReadStream(this.#resolve(path), options);
    stream.once("end", () =>
      this.notify("file.read", () => this.#fileEntry(path)),
    );
    return stream;
  }

  createWriteStream(
    path: PathInput,
    options: WriteStreamOptions = {},
  ): Writable {
    const absolute = this.#resolve(path);
    mkdirSync(nodePath.dirname(absolute), { recursive: true });
    const append = options.flags === "a";
    const stream = createWriteStream(absolute, {
      encoding: options.encoding,
      flags: options.flags ?? "w",
    });
    stream.once("finish", () =>
      this.notify(append ? "file.append" : "file.write", () =>
        this.#fileEntry(path),
      ),
    );
    return stream;
  }

  /**
   * Builds the entry tree of a directory: files with sizes, directories with
   * children. Every entry is bound to this filesystem and carries its
   * root-relative path, so reads and refreshes work off the returned tree.
   */
  async #buildEntries(absolute: string, relative: Path): Promise<FsEntry[]> {
    const dirents = await fs.readdir(absolute, { withFileTypes: true });
    return Promise.all(
      dirents.map(async (dirent) => {
        const childAbsolute = nodePath.join(absolute, dirent.name);
        const childPath = relative.join(dirent.name);
        const stats = await fs.stat(childAbsolute);
        const init = {
          fs: this,
          path: childPath,
          mtimeMs: stats.mtimeMs,
          ctimeMs: stats.ctimeMs,
        };
        if (dirent.isDirectory()) {
          return new Directory(
            dirent.name,
            await this.#buildEntries(childAbsolute, childPath),
            init,
          );
        }
        return new File(dirent.name, { ...init, size: stats.size });
      }),
    );
  }

  /** A {@link File} for an event payload; `stats` avoids a second `stat`. */
  #fileEntry(path: PathInput, stats = this.#statSync(path)): File {
    const entryPath = new Path(path);
    return new File(entryPath.name, {
      fs: this,
      path: entryPath,
      size: stats?.size ?? 0,
      mtimeMs: stats?.mtimeMs ?? Date.now(),
      ctimeMs: stats?.ctimeMs ?? Date.now(),
    });
  }

  /** A {@link Directory} for an event payload — children are not listed. */
  #directoryEntry(path: PathInput, stats = this.#statSync(path)): Directory {
    const entryPath = new Path(path);
    return new Directory(entryPath.name || entryPath.toString(), [], {
      fs: this,
      path: entryPath,
      mtimeMs: stats?.mtimeMs ?? Date.now(),
      ctimeMs: stats?.ctimeMs ?? Date.now(),
    });
  }

  #statSync(path: PathInput) {
    return statSync(this.#resolve(path), { throwIfNoEntry: false });
  }

  /** Resolves a POSIX-style path against {@link root}; throws on `..` escape. */
  #resolve(path: PathInput): string {
    const value = String(path);
    const absolute = nodePath.resolve(this.root, value);
    if (
      absolute !== this.root &&
      !absolute.startsWith(this.root + nodePath.sep)
    ) {
      throw new Error(
        `RealFileSystem: path "${value}" resolves outside root "${this.root}"`,
      );
    }
    return absolute;
  }
}
