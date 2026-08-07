import type { Server } from "./servers/types.js";
import { kPlaywrightLockKey } from "./constants.js";

/**
 * Standalone teardown for setups that configure `globalSetup` and
 * `globalTeardown` as two separate playwright.config.ts entries instead
 * of using the teardown function `globalSetup` returns.
 */
export default async function globalTeardown(): Promise<void> {
  const server = (globalThis as Record<string | symbol, unknown>)[
    kPlaywrightLockKey
  ] as Server | undefined;

  if (!server) return;

  await server[Symbol.asyncDispose]();
  delete (globalThis as Record<string | symbol, unknown>)[kPlaywrightLockKey];
}
