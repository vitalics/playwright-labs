import * as fs from "node:fs/promises";
import nodePath from "node:path";
import {
  collectContent,
  Directory,
  File,
  type FileContent,
  type FileStat,
  type FileSystem,
  type FsEntry,
  type WriteOptions,
} from "./fs.js";

/** Builds the entry tree of a directory: files with sizes, directories with children. */
async function buildEntries(absolute: string): Promise<FsEntry[]> {
  const dirents = await fs.readdir(absolute, { withFileTypes: true });
  return Promise.all(
    dirents.map(async (dirent) => {
      const child = nodePath.join(absolute, dirent.name);
      if (dirent.isDirectory()) {
        return new Directory(dirent.name, await buildEntries(child));
      }
      return new File(dirent.name, (await fs.stat(child)).size);
    }),
  );
}

/**
 * {@link FileSystem} over `node:fs/promises`, rooted at a directory
 * (`process.cwd()` by default).
 *
 * Paths are POSIX-style with `/`, resolved via `path.resolve(root, p)`.
 * Resolving outside the root (via `..`) throws.
 */
export class RealFileSystem implements FileSystem {
  readonly root: string;

  constructor(root: string = process.cwd()) {
    this.root = nodePath.resolve(root);
  }

  async write(
    path: string,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void> {
    const absolute = this.#resolve(path);
    await fs.mkdir(nodePath.dirname(absolute), { recursive: true });
    const payload =
      typeof content === "string"
        ? Buffer.from(content, options?.encoding ?? "utf8")
        : await collectContent(content);
    await fs.writeFile(absolute, payload);
  }

  async read(path: string): Promise<Buffer> {
    return fs.readFile(this.#resolve(path));
  }

  async readText(path: string, encoding?: BufferEncoding): Promise<string> {
    return fs.readFile(this.#resolve(path), encoding ?? "utf8");
  }

  async append(
    path: string,
    content: string | Buffer | Uint8Array,
  ): Promise<void> {
    const absolute = this.#resolve(path);
    await fs.mkdir(nodePath.dirname(absolute), { recursive: true });
    await fs.appendFile(absolute, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(this.#resolve(path));
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileStat> {
    const stats = await fs.stat(this.#resolve(path));
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      isDirectory: stats.isDirectory(),
    };
  }

  async mkdir(path: string): Promise<void> {
    await fs.mkdir(this.#resolve(path), { recursive: true });
  }

  async remove(path: string): Promise<void> {
    await fs.rm(this.#resolve(path), { recursive: true, force: true });
  }

  async list(path: string = "."): Promise<string[]> {
    return fs.readdir(this.#resolve(path));
  }

  async entries(path: string = "."): Promise<FsEntry[]> {
    return buildEntries(this.#resolve(path));
  }

  /** Resolves a POSIX-style path against {@link root}; throws on `..` escape. */
  #resolve(path: string): string {
    const absolute = nodePath.resolve(this.root, path);
    if (absolute !== this.root && !absolute.startsWith(this.root + nodePath.sep)) {
      throw new Error(
        `RealFileSystem: path "${path}" resolves outside root "${this.root}"`,
      );
    }
    return absolute;
  }
}
