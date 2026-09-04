import { mkdtempSync, rmSync } from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import nodePath from "node:path";
import { Directory } from "./entry.js";
import { Path, type PathInput } from "./path.js";
import { RealFileSystem } from "./real-fs.js";

// Node < 20.11 does not define the symbols `using` / `await using` compile to.
const symbolRegistry = Symbol as unknown as {
  dispose?: symbol;
  asyncDispose?: symbol;
};
symbolRegistry.dispose ??= Symbol.for("nodejs.dispose");
symbolRegistry.asyncDispose ??= Symbol.for("nodejs.asyncDispose");

/** Options for {@link TempDirectory.create}. */
export type TempDirectoryOptions = {
  /**
   * Name prefix of the created directory — a random suffix is appended.
   * @default "fs-core-"
   */
  prefix?: string;
  /**
   * Parent directory, created recursively when missing.
   * @default os.tmpdir()
   */
  root?: string;
  /**
   * Keep the directory on disposal — handy while debugging a failing test.
   * @default false
   */
  keep?: boolean;
};

/**
 * A real temporary directory that deletes itself at the end of the scope.
 *
 * It is a {@link Directory}, so the listing API (`size`, `Symbol.iterator`,
 * `Symbol.asyncIterator`, `walk`, `find`) works on it, and {@link fs} is a
 * {@link RealFileSystem} rooted inside it. Disposal is `rm -rf` on
 * {@link path} and is idempotent.
 *
 * ```ts
 * // scoped — removed when the block ends (TypeScript 5.2+, Node 20.11+)
 * await using temp = await TempDirectory.create({ prefix: "downloads-" });
 * await temp.fs.write("report.csv", "a,b\n1,2");
 * for await (const entry of temp) console.log(entry.name, entry.size);
 *
 * // synchronous scope
 * using temp = TempDirectory.createSync();
 *
 * // or manage it by hand
 * const temp = await TempDirectory.create();
 * await temp.remove();
 * ```
 */
export class TempDirectory extends Directory {
  /** Creates the directory on disk. */
  static async create(
    options: TempDirectoryOptions = {},
  ): Promise<TempDirectory> {
    const parent = options.root ?? os.tmpdir();
    await fsp.mkdir(parent, { recursive: true });
    const created = await fsp.mkdtemp(
      nodePath.join(parent, options.prefix ?? "fs-core-"),
    );
    return new TempDirectory(created, options);
  }

  /** {@link TempDirectory.create} without awaiting — for a `using` scope. */
  static createSync(options: TempDirectoryOptions = {}): TempDirectory {
    const parent = options.root ?? os.tmpdir();
    const created = mkdtempSync(
      nodePath.join(parent, options.prefix ?? "fs-core-"),
    );
    return new TempDirectory(created, options);
  }

  /** Filesystem rooted at this directory. */
  readonly fs: RealFileSystem;

  readonly #keep: boolean;
  #disposed = false;

  /**
   * Adopts an existing directory — disposal removes it. Prefer
   * {@link TempDirectory.create}, which makes one.
   */
  constructor(location: PathInput, options: { keep?: boolean } = {}) {
    const path = new Path(location);
    const fs = new RealFileSystem(path.toNative());
    super(path.name, [], { fs, path });
    this.fs = fs;
    this.#keep = options.keep ?? false;
  }

  /** Whether the directory has been disposed already. */
  get disposed(): boolean {
    return this.#disposed;
  }

  /** Whether disposal keeps the directory on disk. */
  get kept(): boolean {
    return this.#keep;
  }

  /** Removes the directory recursively. Idempotent; a no-op when `keep`. */
  async remove(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#keep) return;
    await fsp.rm(this.path.toNative(), { recursive: true, force: true });
  }

  /** {@link TempDirectory.remove} without awaiting. */
  removeSync(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#keep) return;
    rmSync(this.path.toNative(), { recursive: true, force: true });
  }

  [Symbol.dispose](): void {
    this.removeSync();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.remove();
  }
}
