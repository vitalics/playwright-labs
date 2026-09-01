import {
  collectContent,
  fsError,
  type FileContent,
  type FileStat,
  type FileSystem,
  type WriteOptions,
} from "./fs.js";

type VirtualEntry = { content: Buffer; mtimeMs: number };

/**
 * In-memory {@link FileSystem} — files live in a `Map`, directories are
 * implicit from file paths. Never touches the real filesystem.
 *
 * Paths are POSIX-style; a leading `/` is optional (everything is already
 * relative to {@link root}). `.` and `..` segments are resolved; escaping
 * above the root throws.
 */
export class VirtualFileSystem implements FileSystem {
  readonly root: string;
  /** Absolute (root-prefixed) file path -> entry. */
  #files = new Map<string, VirtualEntry>();

  constructor(root: string = "/") {
    this.root = normalizePath(root);
  }

  async write(
    path: string,
    content: FileContent,
    options?: WriteOptions,
  ): Promise<void> {
    const payload =
      typeof content === "string"
        ? Buffer.from(content, options?.encoding ?? "utf8")
        : await collectContent(content);
    this.#files.set(this.#resolve(path), {
      content: payload,
      mtimeMs: Date.now(),
    });
  }

  async read(path: string): Promise<Buffer> {
    const absolute = this.#resolve(path);
    const entry = this.#files.get(absolute);
    if (!entry) {
      throw fsError("ENOENT", `ENOENT: no such file, open '${path}'`);
    }
    return entry.content;
  }

  async readText(path: string, encoding?: BufferEncoding): Promise<string> {
    const buffer = await this.read(path);
    return buffer.toString(encoding ?? "utf8");
  }

  async append(
    path: string,
    content: string | Buffer | Uint8Array,
  ): Promise<void> {
    const absolute = this.#resolve(path);
    const existing = this.#files.get(absolute);
    const chunk =
      typeof content === "string" ? Buffer.from(content, "utf8") : content;
    this.#files.set(absolute, {
      content: existing ? Buffer.concat([existing.content, chunk]) : Buffer.from(chunk),
      mtimeMs: Date.now(),
    });
  }

  async exists(path: string): Promise<boolean> {
    const absolute = this.#resolve(path);
    return this.#files.has(absolute) || this.#isDirectory(absolute);
  }

  async stat(path: string): Promise<FileStat> {
    const absolute = this.#resolve(path);
    const entry = this.#files.get(absolute);
    if (entry) {
      return {
        size: entry.content.length,
        mtimeMs: entry.mtimeMs,
        isDirectory: false,
      };
    }
    if (this.#isDirectory(absolute)) {
      return { size: 0, mtimeMs: 0, isDirectory: true };
    }
    throw fsError("ENOENT", `ENOENT: no such file or directory, stat '${path}'`);
  }

  async mkdir(path: string): Promise<void> {
    // directories are implicit — recording a marker keeps the path existing
    // even without files inside
    this.#dirs.add(this.#resolve(path));
  }

  async remove(path: string): Promise<void> {
    const absolute = this.#resolve(path);
    this.#files.delete(absolute);
    this.#dirs.delete(absolute);
    const prefix = absolute === "/" ? "/" : absolute + "/";
    for (const key of this.#files.keys()) {
      if (key.startsWith(prefix)) this.#files.delete(key);
    }
    for (const dir of this.#dirs) {
      if (dir.startsWith(prefix)) this.#dirs.delete(dir);
    }
  }

  async list(path: string = "."): Promise<string[]> {
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
    const prefix = absolute === "/" ? "/" : absolute + "/";
    const names = new Set<string>();
    for (const key of this.#files.keys()) {
      const rest = key.startsWith(prefix) ? key.slice(prefix.length) : null;
      if (rest && rest.length > 0) names.add(rest.split("/")[0]);
    }
    for (const dir of this.#dirs) {
      const rest = dir.startsWith(prefix) ? dir.slice(prefix.length) : null;
      if (rest && rest.length > 0) names.add(rest.split("/")[0]);
    }
    return [...names].sort();
  }

  /** Tracks explicitly created (possibly empty) directories. */
  #dirs = new Set<string>();

  /** Normalizes `path` against {@link root}; throws on `..` escape. */
  #resolve(path: string): string {
    const absolute = normalizePath(joinPath(this.root, path));
    if (absolute !== this.root && !absolute.startsWith(this.root === "/" ? "/" : this.root + "/")) {
      throw new Error(
        `VirtualFileSystem: path "${path}" resolves outside root "${this.root}"`,
      );
    }
    return absolute;
  }

  /** A directory exists when recorded or implied by a file beneath it. */
  #isDirectory(absolute: string): boolean {
    if (absolute === this.root) return true;
    if (this.#dirs.has(absolute)) return true;
    const prefix = absolute + "/";
    for (const key of this.#files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    for (const dir of this.#dirs) {
      if (dir.startsWith(prefix)) return true;
    }
    return false;
  }
}

/** Joins root and a POSIX-style path (`/` separator; leading `/` ignored). */
function joinPath(root: string, path: string): string {
  const stripped = path.replace(/^\/+/, "");
  if (!stripped) return root;
  return root === "/" ? `/${stripped}` : `${root}/${stripped}`;
}

/** Resolves `.`/`..` segments and collapses duplicate slashes. */
function normalizePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return "/" + segments.join("/");
}
