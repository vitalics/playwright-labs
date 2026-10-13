import type { FsEntry } from "./entry.js";

/**
 * What a {@link WalkerFilter} may return — the `NodeFilter` codes of the DOM,
 * with the same meaning:
 *
 * - `ACCEPT` — the entry is visible to the walk;
 * - `SKIP` — the entry is invisible, its children are still visited;
 * - `REJECT` — the entry and its whole subtree are invisible.
 */
export const FILTER = {
  ACCEPT: 1,
  REJECT: 2,
  SKIP: 3,
} as const;

/** One of the {@link FILTER} codes. */
export type FilterAction = (typeof FILTER)[keyof typeof FILTER];

/** Boolean predicate — `true` accepts, `false` skips (children still visited). */
export type EntryFilter = (entry: FsEntry) => boolean;

/**
 * Filter accepted by {@link FSWalker} and {@link Directory.walk} — either a
 * boolean predicate or a {@link FILTER} code, so `REJECT` can prune a subtree.
 */
export type WalkerFilter = (entry: FsEntry) => boolean | FilterAction;

/** A timestamp as epoch milliseconds or a `Date`. */
export type TimeInput = number | Date;

/** Runs a filter and normalizes its result into a {@link FILTER} code. */
export function filterAction(
  filter: WalkerFilter,
  entry: FsEntry,
): FilterAction {
  const result = filter(entry);
  if (result === true) return FILTER.ACCEPT;
  if (result === false) return FILTER.SKIP;
  return result;
}

function toMs(time: TimeInput): number {
  return typeof time === "number" ? time : time.getTime();
}

function inRange(value: number, from: TimeInput, to: TimeInput): boolean {
  return value >= toMs(from) && value <= toMs(to);
}

/**
 * Ready-made filters and combinators for {@link FSWalker} and
 * {@link Directory.walk} — the `NodeFilter` of this module.
 *
 * ```ts
 * const recent = WALKER.SHOW_ALL_FILES_MTIME_BETWEEN(Date.now() - 60_000, Date.now());
 * const [...touched] = dir.walk(recent);
 *
 * // only look at files, and do not descend into directories at all
 * const shallow = WALKER.prune(WALKER.SHOW_ALL_FILES);
 * ```
 */
export const WALKER = {
  /** Every entry. */
  SHOW_ALL: (_entry: FsEntry): boolean => true,
  /** Directories only; files are skipped. */
  SHOW_ALL_DIRECTORIES: (entry: FsEntry): boolean => entry.isDirectory,
  /** Files only; directories are skipped but still descended into. */
  SHOW_ALL_FILES: (entry: FsEntry): boolean => !entry.isDirectory,
  /** Files created within `[from, to]` (inclusive). */
  SHOW_ALL_FILES_CTIME_BETWEEN:
    (from: TimeInput, to: TimeInput): EntryFilter =>
    (entry) =>
      !entry.isDirectory && inRange(entry.ctimeMs, from, to),
  /** Files modified within `[from, to]` (inclusive). */
  SHOW_ALL_FILES_MTIME_BETWEEN:
    (from: TimeInput, to: TimeInput): EntryFilter =>
    (entry) =>
      !entry.isDirectory && inRange(entry.mtimeMs, from, to),
  /** Accepts what `filter` does not accept. */
  not:
    (filter: WalkerFilter): EntryFilter =>
    (entry) =>
      filterAction(filter, entry) !== FILTER.ACCEPT,
  /** Accepts entries every filter accepts. */
  every:
    (...filters: WalkerFilter[]): EntryFilter =>
    (entry) =>
      filters.every((filter) => filterAction(filter, entry) === FILTER.ACCEPT),
  /** Accepts entries at least one filter accepts. */
  some:
    (...filters: WalkerFilter[]): EntryFilter =>
    (entry) =>
      filters.some((filter) => filterAction(filter, entry) === FILTER.ACCEPT),
  /**
   * Turns skipping into pruning — a non-matching directory is not descended
   * into, instead of being walked through invisibly.
   */
  prune:
    (filter: WalkerFilter): WalkerFilter =>
    (entry) =>
      filterAction(filter, entry) === FILTER.ACCEPT
        ? FILTER.ACCEPT
        : FILTER.REJECT,
} as const;
