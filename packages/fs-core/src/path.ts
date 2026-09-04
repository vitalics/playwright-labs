import nodePath from "node:path";

/** A {@link Path} or anything that stringifies into one. */
export type PathInput = string | Path;

/** Splits a raw path into an optional root prefix (`/`, `C:/`) and segments. */
function parsePath(raw: string): { prefix: string; segments: string[] } {
  let rest = raw.replace(/\\/g, "/");
  let prefix = "";
  const drive = /^([a-zA-Z]:)(\/|$)/.exec(rest);
  if (drive) {
    prefix = `${drive[1]}/`;
    rest = rest.slice(drive[0].length);
  } else if (rest.startsWith("/")) {
    prefix = "/";
    rest = rest.slice(1);
  }
  const segments: string[] = [];
  for (const segment of rest.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      const last = segments[segments.length - 1];
      if (last !== undefined && last !== "..") {
        segments.pop();
      } else if (!prefix) {
        // a relative path may climb above its own start
        segments.push("..");
      }
      // `..` above an absolute root resolves to the root itself
      continue;
    }
    segments.push(segment);
  }
  return { prefix, segments };
}

/**
 * An immutable POSIX-style path — the value object every entry and
 * {@link FileSystem} method accepts.
 *
 * Parts are joined and normalized on construction: `.` segments are dropped,
 * `..` segments collapse, duplicate slashes disappear, and `\` is read as `/`
 * so Windows paths parse too (a drive letter becomes the root prefix).
 * Every method returns a new `Path` — nothing mutates.
 *
 * ```ts
 * const p = new Path("fixtures", "img/../shot.png"); // "fixtures/shot.png"
 * p.name;              // "shot.png"
 * p.stem;              // "shot"
 * p.ext;               // ".png"
 * p.parent.toString(); // "fixtures"
 * [...p];              // ["fixtures", "shot.png"]
 * `${p}`;              // "fixtures/shot.png"
 * ```
 */
export class Path {
  /** Separator used by `toString()` — always POSIX `/`. */
  static readonly separator = "/";

  /** Same as `new Path(...parts)`. */
  static from(...parts: PathInput[]): Path {
    return new Path(...parts);
  }

  /** The current working directory as an absolute `Path`. */
  static cwd(): Path {
    return new Path(process.cwd());
  }

  readonly #prefix: string;
  readonly #segments: readonly string[];

  constructor(...parts: PathInput[]) {
    const raw = parts
      .map((part) => String(part))
      .filter((part) => part.length > 0)
      .join("/");
    const parsed = parsePath(raw);
    this.#prefix = parsed.prefix;
    this.#segments = Object.freeze(parsed.segments);
  }

  /** Normalized segments, without the root prefix. */
  get segments(): readonly string[] {
    return this.#segments;
  }

  /** Number of segments — `0` for `.` and for a root. */
  get depth(): number {
    return this.#segments.length;
  }

  /** Whether the path starts at a root (`/` or a drive letter). */
  get isAbsolute(): boolean {
    return this.#prefix.length > 0;
  }

  /** Whether the path *is* a root (`/`, `C:/`). */
  get isRoot(): boolean {
    return this.isAbsolute && this.#segments.length === 0;
  }

  /** The root of an absolute path (`/`, `C:/`); `undefined` when relative. */
  get root(): Path | undefined {
    return this.isAbsolute ? new Path(this.#prefix) : undefined;
  }

  /** Last segment (basename); `""` for a root and for `.`. */
  get name(): string {
    return this.#segments[this.#segments.length - 1] ?? "";
  }

  /** Extension including the dot (`".png"`); `""` when there is none. */
  get ext(): string {
    const name = this.name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot) : "";
  }

  /** {@link name} without {@link ext} (`"shot"` for `"shot.png"`). */
  get stem(): string {
    const ext = this.ext;
    return ext ? this.name.slice(0, -ext.length) : this.name;
  }

  /**
   * Containing directory. A root is its own parent, and so is `"."` —
   * matching `path.dirname`.
   */
  get parent(): Path {
    if (this.#segments.length === 0) return this;
    return new Path(this.#prefix + this.#segments.slice(0, -1).join("/"));
  }

  /** Appends `parts`; absolute parts do not reset the result (`path.join`). */
  join(...parts: PathInput[]): Path {
    return new Path(this, ...parts);
  }

  /** Appends `parts`, restarting at any absolute part (`path.resolve`). */
  resolve(...parts: PathInput[]): Path {
    let result: Path = this;
    for (const part of parts) {
      const next = part instanceof Path ? part : new Path(part);
      result = next.isAbsolute ? next : new Path(result, next);
    }
    return result;
  }

  /**
   * The path from `this` to `to`. Returns `to` unchanged when the two do not
   * share a root (e.g. one is relative and the other absolute).
   */
  relative(to: PathInput): Path {
    const target = to instanceof Path ? to : new Path(to);
    if (target.#prefix !== this.#prefix) return target;
    let common = 0;
    while (
      common < this.#segments.length &&
      common < target.#segments.length &&
      this.#segments[common] === target.#segments[common]
    ) {
      common++;
    }
    const up = Array.from(
      { length: this.#segments.length - common },
      () => "..",
    );
    return new Path([...up, ...target.#segments.slice(common)].join("/"));
  }

  /** Copy with the last segment replaced. */
  withName(name: string): Path {
    return this.parent.join(name);
  }

  /** Copy with {@link stem} replaced, keeping {@link ext}. */
  withStem(stem: string): Path {
    return this.withName(stem + this.ext);
  }

  /** Copy with a different extension; `""` strips it. The dot is optional. */
  withExt(ext: string): Path {
    const normalized = !ext || ext.startsWith(".") ? ext : `.${ext}`;
    return this.withName(this.stem + normalized);
  }

  /** Whether both paths normalize to the same string (case-sensitive). */
  equals(other: PathInput): boolean {
    return this.toString() === new Path(other).toString();
  }

  /** Whether `other` is a segment-wise prefix of this path. */
  startsWith(other: PathInput): boolean {
    const candidate = new Path(other);
    if (candidate.#prefix !== this.#prefix) return false;
    if (candidate.#segments.length > this.#segments.length) return false;
    return candidate.#segments.every(
      (segment, index) => this.#segments[index] === segment,
    );
  }

  /** Whether this path is strictly inside `other`. */
  isInside(other: PathInput): boolean {
    const candidate = new Path(other);
    return this.startsWith(candidate) && this.depth > candidate.depth;
  }

  /** The path in the current platform's format (`\` separators on Windows). */
  toNative(): string {
    return nodePath.normalize(this.toString());
  }

  /** POSIX-style string; `"."` for the empty relative path. */
  toString(): string {
    const value = this.#prefix + this.#segments.join("/");
    return value.length > 0 ? value : ".";
  }

  toJSON(): string {
    return this.toString();
  }

  [Symbol.toPrimitive](): string {
    return this.toString();
  }

  /** Iterates the segments. */
  *[Symbol.iterator](): IterableIterator<string> {
    yield* this.#segments;
  }
}
