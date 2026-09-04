import { expect as baseExpect, test as baseTest } from "@playwright/test";
import {
  RealFileSystem,
  VirtualFileSystem,
  type FileSystem,
} from "@playwright-labs/fs-core";

export type Fixture = {
  /**
   * Per-test filesystem handle. In `"virtual"` mode (default) each test gets
   * a fresh in-memory FS — tests running in parallel are fully isolated.
   * In `"real"` mode the handle works against the real disk rooted at
   * `cwd` — nothing is cleaned up automatically.
   */
  fs: FileSystem;
};

export type CreateFixtureOptions = {
  /**
   * - `"virtual"` (default) — fresh in-memory FS per test.
   * - `"real"` — real filesystem rooted at {@link CreateFixtureOptions.cwd}.
   */
  mode?: "virtual" | "real";
  /**
   * Root directory for `"real"` mode. There is NO automatic cleanup —
   * files written during the test stay on disk.
   * @default process.cwd()
   */
  cwd?: string;
};

/**
 * Builds a configured `test` with the {@link Fixture} fixtures.
 *
 * ```ts
 * // virtual (default) — in-memory, isolated per test
 * const { test, expect } = createFixture();
 *
 * // real — writes to disk under the given root, no auto-cleanup
 * const { test, expect } = createFixture({ mode: "real", cwd: tmpDir });
 * ```
 */
export function createFixture(options: CreateFixtureOptions = {}) {
  const mode = options.mode ?? "virtual";
  if (mode !== "virtual" && mode !== "real") {
    throw new TypeError(
      `createFixture: unknown mode "${String(mode)}" — expected "virtual" or "real"`,
    );
  }
  if (mode === "virtual" && options.cwd !== undefined) {
    throw new TypeError(
      'createFixture: option cwd is only valid in real mode — ' +
        "in virtual mode the filesystem is in-memory and has no meaningful root. " +
        "Pass { mode: 'real' } to work against the disk.",
    );
  }

  const test = baseTest.extend<Fixture>({
    fs: async ({}, use) => {
      await use(
        mode === "real"
          ? new RealFileSystem(options.cwd ?? process.cwd())
          : new VirtualFileSystem(),
      );
    },
  });

  return { test, expect };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const expect = baseExpect.extend({
  /**
   * Asserts that a file or directory exists at `path`.
   *
   * ```ts
   * await expect(fs).toExist("shot.png");
   * await expect(fs).not.toExist("missing.txt");
   * ```
   */
  async toExist(received: FileSystem, path: string) {
    const assertionName = "toExist";
    const pass = await received.exists(path);
    return {
      name: assertionName,
      pass,
      expected: path,
      actual: pass ? path : undefined,
      message: () =>
        this.isNot
          ? `Expected path not to exist, but it does: ${this.utils.printReceived(path)}`
          : `Expected path to exist, but it does not: ${this.utils.printReceived(path)}`,
    };
  },

  /**
   * Asserts that the text content of the file at `path` equals `expected`
   * (string) or matches it (RegExp).
   *
   * ```ts
   * await expect(fs).toHaveText("log.txt", /done in \d+ms/);
   * ```
   */
  async toHaveText(received: FileSystem, path: string, expected: string | RegExp) {
    const assertionName = "toHaveText";
    let actual: string | undefined;
    let error: unknown;
    try {
      actual = await received.readText(path);
    } catch (e) {
      error = e;
    }

    const pass =
      actual !== undefined &&
      (expected instanceof RegExp ? expected.test(actual) : actual === expected);
    return {
      name: assertionName,
      pass,
      expected,
      actual,
      message: () => {
        if (error) {
          return `${assertionName}: failed to read ${this.utils.printReceived(path)}: ${describeError(error)}`;
        }
        const expectation = this.isNot ? "not to have" : "to have";
        return `Expected file ${this.utils.printReceived(path)} ${expectation} text ${this.utils.printExpected(expected)}, got ${this.utils.printReceived(actual)}`;
      },
    };
  },

  /**
   * Asserts that the binary content of the file at `path` equals `expected`
   * byte for byte.
   *
   * ```ts
   * await expect(fs).toHaveContent("shot.png", referencePng);
   * ```
   */
  async toHaveContent(
    received: FileSystem,
    path: string,
    expected: Buffer | Uint8Array,
  ) {
    const assertionName = "toHaveContent";
    let actual: Buffer | undefined;
    let error: unknown;
    try {
      actual = await received.read(path);
    } catch (e) {
      error = e;
    }

    const pass = actual !== undefined && actual.equals(expected);
    return {
      name: assertionName,
      pass,
      expected,
      actual,
      message: () => {
        if (error) {
          return `${assertionName}: failed to read ${this.utils.printReceived(path)}: ${describeError(error)}`;
        }
        const expectation = this.isNot ? "not to have" : "to have";
        return `Expected file ${this.utils.printReceived(path)} ${expectation} content ${this.utils.printExpected(expected)}, got ${this.utils.printReceived(actual)}`;
      },
    };
  },

  /**
   * Asserts that `path` exists, is a directory, and contains zero entries.
   *
   * ```ts
   * await expect(fs).toBeEmptyDir("out");
   * ```
   */
  async toBeEmptyDir(received: FileSystem, path: string) {
    const assertionName = "toBeEmptyDir";
    let entries: string[] | undefined;
    let stat: Awaited<ReturnType<FileSystem["stat"]>> | undefined;
    let error: unknown;
    try {
      stat = await received.stat(path);
      entries = stat.isDirectory ? await received.list(path) : undefined;
    } catch (e) {
      error = e;
    }

    const pass =
      entries !== undefined && stat !== undefined && stat.isDirectory && entries.length === 0;
    return {
      name: assertionName,
      pass,
      expected: 0,
      actual: entries?.length,
      message: () => {
        if (error) {
          return `${assertionName}: path ${this.utils.printReceived(path)} does not exist: ${describeError(error)}`;
        }
        if (stat && !stat.isDirectory) {
          return `${assertionName}: expected ${this.utils.printReceived(path)} to be a directory, but it is a file`;
        }
        const expectation = this.isNot ? "not to be" : "to be";
        return `Expected directory ${this.utils.printReceived(path)} ${expectation} empty, entries: ${this.utils.printReceived(entries)}`;
      },
    };
  },
});

/** Zero-config virtual fixture — equivalent to `createFixture().test`. */
export const test = createFixture().test;
