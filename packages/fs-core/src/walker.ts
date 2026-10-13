import { Directory, type FsEntry } from "./entry.js";
import {
  FILTER,
  WALKER,
  filterAction,
  type FilterAction,
  type WalkerFilter,
} from "./filter.js";
import type { FileSystem } from "./fs.js";
import { Path, type PathInput } from "./path.js";

/** Direction of a traversal: `1` forward (first/next), `-1` backward. */
type Direction = 1 | -1;

/** Immediate children of an entry — files have none. */
function childrenOf(entry: FsEntry): readonly FsEntry[] {
  return entry.isDirectory ? entry.children : [];
}

/** First (`1`) or last (`-1`) child of an entry. */
function edgeChild(entry: FsEntry, direction: Direction): FsEntry | null {
  const children = childrenOf(entry);
  if (children.length === 0) return null;
  return direction === 1 ? children[0]! : children[children.length - 1]!;
}

/** Next (`1`) or previous (`-1`) sibling of an entry. */
function siblingOf(entry: FsEntry, direction: Direction): FsEntry | null {
  const parent = entry.parent;
  if (!parent) return null;
  const siblings = parent.children;
  const index = siblings.indexOf(entry);
  if (index < 0) return null;
  return siblings[index + direction] ?? null;
}

/**
 * A cursor over an entry tree — the `TreeWalker` of this module, with the
 * same methods and the same traversal algorithms, over {@link File} and
 * {@link Directory} instead of DOM nodes.
 *
 * Every method moves {@link currentNode} and returns the entry it landed on,
 * or `null` when there is none (leaving `currentNode` where it was). The
 * filter is a {@link WalkerFilter}: `true`/`FILTER.ACCEPT` makes an entry
 * visible, `false`/`FILTER.SKIP` hides it but still walks its children, and
 * `FILTER.REJECT` prunes its whole subtree.
 *
 * ```ts
 * const walker = await FSWalker.from(fs, "test-results", WALKER.SHOW_ALL_FILES);
 *
 * walker.firstChild();   // File | Directory | null
 * walker.nextNode();     // document-order next visible entry
 * walker.parentNode();   // nearest visible ancestor, never above the root
 * walker.currentNode;    // where the cursor sits now
 *
 * for (const entry of walker) console.log(`${entry.path}`); // drains the walk
 * ```
 *
 * The walk runs over a materialized tree, so it is synchronous. Call
 * {@link refresh} to re-read that tree from the filesystem.
 */
export class FSWalker implements Iterable<FsEntry> {
  /**
   * Reads a directory tree from a filesystem and returns a walker over it.
   *
   * @param path directory to walk @default "."
   * @param filter @default WALKER.SHOW_ALL
   */
  static async from(
    fs: FileSystem,
    path: PathInput = ".",
    filter: WalkerFilter = WALKER.SHOW_ALL,
  ): Promise<FSWalker> {
    const root = new Path(path);
    return new FSWalker(
      new Directory(root.name || root.toString(), await fs.entries(root), {
        fs,
        path: root,
      }),
      filter,
    );
  }

  /** Entry the walk is rooted at — traversal never leaves its subtree. */
  readonly root: Directory;
  /** Filter every visited entry is passed through. */
  readonly filter: WalkerFilter;

  #current: FsEntry;

  /** @param filter @default WALKER.SHOW_ALL */
  constructor(root: Directory, filter: WalkerFilter = WALKER.SHOW_ALL) {
    this.root = root;
    this.filter = filter;
    this.#current = root;
  }

  /** Where the cursor sits. Starts at {@link root}. */
  get currentNode(): FsEntry {
    return this.#current;
  }

  /** Moves the cursor. Throws when `entry` is outside {@link root}. */
  set currentNode(entry: FsEntry) {
    let node: FsEntry | undefined = entry;
    while (node) {
      if (node === this.root) {
        this.#current = entry;
        return;
      }
      node = node.parent;
    }
    throw new RangeError(
      `FSWalker: "${entry.path}" is outside the walker root "${this.root.path}"`,
    );
  }

  /** Moves the cursor back to {@link root}. */
  reset(): this {
    this.#current = this.root;
    return this;
  }

  /**
   * Re-reads the tree from the filesystem the root came from, keeping the
   * cursor on the entry with the same path when it still exists (otherwise
   * back to the root). Throws when the root is not bound to a filesystem.
   */
  async refresh(): Promise<this> {
    const previous = this.#current.path.toString();
    await this.root.refresh();
    this.#current = this.root;
    if (previous !== this.root.path.toString()) {
      for (const entry of this.root.walk()) {
        if (entry.path.toString() === previous) {
          this.#current = entry;
          break;
        }
      }
    }
    return this;
  }

  /** Nearest visible ancestor, never above {@link root}. */
  parentNode(): FsEntry | null {
    let node: FsEntry | undefined = this.#current;
    while (node && node !== this.root) {
      node = node.parent;
      if (node && this.#action(node) === FILTER.ACCEPT) {
        this.#current = node;
        return node;
      }
    }
    return null;
  }

  /** First visible child of {@link currentNode}. */
  firstChild(): FsEntry | null {
    return this.#traverseChildren(1);
  }

  /** Last visible child of {@link currentNode}. */
  lastChild(): FsEntry | null {
    return this.#traverseChildren(-1);
  }

  /** Next visible sibling of {@link currentNode}. */
  nextSibling(): FsEntry | null {
    return this.#traverseSiblings(1);
  }

  /** Previous visible sibling of {@link currentNode}. */
  previousSibling(): FsEntry | null {
    return this.#traverseSiblings(-1);
  }

  /** Next visible entry in document order (depth-first, pre-order). */
  nextNode(): FsEntry | null {
    let node: FsEntry = this.#current;
    let action: FilterAction = FILTER.ACCEPT;
    for (;;) {
      while (action !== FILTER.REJECT) {
        const child = edgeChild(node, 1);
        if (!child) break;
        node = child;
        action = this.#action(node);
        if (action === FILTER.ACCEPT) {
          this.#current = node;
          return node;
        }
      }
      let ancestor: FsEntry | undefined = node;
      let following: FsEntry | null = null;
      while (ancestor) {
        if (ancestor === this.root) return null;
        following = siblingOf(ancestor, 1);
        if (following) break;
        ancestor = ancestor.parent;
      }
      if (!following) return null;
      node = following;
      action = this.#action(node);
      if (action === FILTER.ACCEPT) {
        this.#current = node;
        return node;
      }
    }
  }

  /** Previous visible entry in document order. */
  previousNode(): FsEntry | null {
    let node: FsEntry = this.#current;
    while (node !== this.root) {
      let sibling = siblingOf(node, -1);
      while (sibling) {
        node = sibling;
        let action = this.#action(node);
        while (action !== FILTER.REJECT) {
          const child = edgeChild(node, -1);
          if (!child) break;
          node = child;
          action = this.#action(node);
        }
        if (action === FILTER.ACCEPT) {
          this.#current = node;
          return node;
        }
        sibling = siblingOf(node, -1);
      }
      const parent = node.parent;
      if (!parent) return null;
      node = parent;
      // the root itself can be the previous node, as in the DOM
      if (this.#action(node) === FILTER.ACCEPT) {
        this.#current = node;
        return node;
      }
    }
    return null;
  }

  /** Alias of {@link previousNode}. */
  prevNode(): FsEntry | null {
    return this.previousNode();
  }

  /**
   * Drains the walk from {@link currentNode} onwards with {@link nextNode} —
   * so it moves the cursor, exactly like calling `nextNode()` in a loop.
   */
  *[Symbol.iterator](): IterableIterator<FsEntry> {
    for (let entry = this.nextNode(); entry; entry = this.nextNode()) {
      yield entry;
    }
  }

  #action(entry: FsEntry): FilterAction {
    return filterAction(this.filter, entry);
  }

  /** The DOM "traverse children" algorithm. */
  #traverseChildren(direction: Direction): FsEntry | null {
    let node: FsEntry | null = edgeChild(this.#current, direction);
    outer: while (node) {
      const action = this.#action(node);
      if (action === FILTER.ACCEPT) {
        this.#current = node;
        return node;
      }
      if (action === FILTER.SKIP) {
        const child = edgeChild(node, direction);
        if (child) {
          node = child;
          continue outer;
        }
      }
      while (node) {
        const sibling = siblingOf(node, direction);
        if (sibling) {
          node = sibling;
          continue outer;
        }
        const parent: Directory | undefined = node.parent;
        if (!parent || parent === this.root || parent === this.#current) {
          return null;
        }
        node = parent;
      }
    }
    return null;
  }

  /** The DOM "traverse siblings" algorithm. */
  #traverseSiblings(direction: Direction): FsEntry | null {
    let node: FsEntry = this.#current;
    if (node === this.root) return null;
    for (;;) {
      let sibling = siblingOf(node, direction);
      while (sibling) {
        node = sibling;
        const action = this.#action(node);
        if (action === FILTER.ACCEPT) {
          this.#current = node;
          return node;
        }
        sibling = edgeChild(node, direction);
        if (action === FILTER.REJECT || !sibling) {
          sibling = siblingOf(node, direction);
        }
      }
      const parent = node.parent;
      if (!parent || parent === this.root) return null;
      node = parent;
      if (this.#action(node) === FILTER.ACCEPT) return null;
    }
  }
}
