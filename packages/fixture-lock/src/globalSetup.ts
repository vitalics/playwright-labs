import { HttpLockServer } from "./servers/http.js";
import { kPlaywrightLockKey } from "./constants.js";
import { Server } from "./servers/types.js";

export async function createGlobalSetup(server: Server) {
  const info = await server.start();

  process.env.LOCK_SERVER_URL = info.url.toString();
  (globalThis as Record<string | symbol, unknown>)[kPlaywrightLockKey] = server;

  return async () => {
    await server[Symbol.asyncDispose]();
    delete (globalThis as Record<string | symbol, unknown>)[kPlaywrightLockKey];
  };
}

/**
 * Starts a shared HttpLockServer once for the whole run and points
 * `LOCK_SERVER_URL` at it so every worker's `createLockClientFromEnv()`
 * talks to the same server. Playwright forwards `process.env` mutations
 * made here into worker processes.
 *
 * Wire it up either via the returned teardown function:
 * ```ts
 * export default globalSetup // playwright.config.ts -> globalSetup
 * ```
 * or, if you need a separate file, pair it with `globalTeardown.ts`,
 * which reads the same server instance back off `globalThis`.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  return createGlobalSetup(new HttpLockServer());
}

export { kPlaywrightLockKey };
