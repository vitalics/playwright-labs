import { AsyncLocalStorage } from "node:async_hooks";

import type { Resource } from "./resource.js";

type HeldLocks = ReadonlyMap<string, Resource<unknown>>;

/**
 * Locks held by the `useLock(options, callback)` calls the current async
 * context runs inside — keyed by lock id. Nested callbacks see their own
 * lock plus every lock held by the callbacks around them.
 */
export const lockStorage = new AsyncLocalStorage<HeldLocks>();

/**
 * Runs `fn` with `resource` added to the locks visible through
 * `currentLock()` for everything `fn` calls, sync or async.
 */
export function runWithLock<R>(resource: Resource<unknown>, fn: () => R): R {
  const held = new Map(lockStorage.getStore());
  held.set(resource.id, resource);
  return lockStorage.run(held, fn);
}

/**
 * Returns the resource locked under `id` by an enclosing
 * `useLock(options, callback)`, or `undefined` outside of one.
 *
 * @example
 * ```ts
 * async function login(page: Page) {
 *   const account = currentLock<Account>("account-1");
 *   await page.fill("#email", account!.data!.email);
 * }
 *
 * await useLock("account-1", () => login(page));
 * ```
 */
export function currentLock<T>(id: string): Resource<T> | undefined {
  return lockStorage.getStore()?.get(id) as Resource<T> | undefined;
}

/** Ids of every lock held by enclosing `useLock(options, callback)` calls. */
export function currentLockIds(): string[] {
  return [...(lockStorage.getStore()?.keys() ?? [])];
}
