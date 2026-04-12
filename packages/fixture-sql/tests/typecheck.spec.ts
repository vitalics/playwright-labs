/**
 * Runs the compile-time SQL type assertions from sql-types.test-d.ts as a
 * Playwright test so that type errors surface in `pnpm test` output alongside
 * the runtime test results.
 *
 * The test simply invokes  tsc --project tsconfig.typecheck.json --noEmit
 * and fails if the exit code is non-zero, printing the compiler diagnostics.
 */

import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("SQLType.ts — compile-time assertions in sql-types.test-d.ts all pass", () => {
  const result = spawnSync(
    "pnpm",
    ["exec", "tsc", "--project", "tsconfig.typecheck.json", "--noEmit"],
    { cwd: ROOT, encoding: "utf8" },
  );

  const diagnostics = (result.stdout ?? "") + (result.stderr ?? "");
  expect(result.status, `TypeScript errors:\n${diagnostics}`).toBe(0);
});
