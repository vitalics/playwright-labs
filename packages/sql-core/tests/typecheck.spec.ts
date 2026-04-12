/**
 * Runs the compile-time SQL type assertions from *.test-d.ts files as
 * Playwright tests so type errors surface in `pnpm test` output.
 */

import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runTypecheck() {
  return spawnSync(
    "pnpm",
    ["exec", "tsc", "--project", "tsconfig.typecheck.json", "--noEmit"],
    { cwd: ROOT, encoding: "utf8" },
  );
}

test("SQLType.ts — compile-time assertions in sql-types.test-d.ts all pass", () => {
  const result = runTypecheck();
  const diagnostics = (result.stdout ?? "") + (result.stderr ?? "");
  expect(result.status, `TypeScript errors:\n${diagnostics}`).toBe(0);
});

test("sql tag — compile-time type inference assertions in sql-tag.test-d.ts all pass", () => {
  const result = runTypecheck();
  const diagnostics = (result.stdout ?? "") + (result.stderr ?? "");
  expect(result.status, `TypeScript errors:\n${diagnostics}`).toBe(0);
});
