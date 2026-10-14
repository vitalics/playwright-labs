import { test as baseTest, expect as baseExpect } from "@playwright/test";
import * as crypto from "node:crypto";

import { currentLock, runWithLock } from "./context.js";
import { Resource } from "./resource.js";
import type { ResourceOptions } from "./transport.js";

type UseLockOptions<T> = Omit<ResourceOptions<T>, "id"> &
  Partial<Pick<ResourceOptions<T>, "id">>;

export type UseLock = {
  <T>(options: UseLockOptions<T> | string): Promise<Resource<T>>;
  /**
   * Holds the lock only while `callback` runs and releases it right after,
   * even if `callback` throws. Inside `callback` (and everything it calls)
   * the resource is reachable via `currentLock(id)`. Resolves with the
   * callback's return value.
   */
  <T, R>(
    options: UseLockOptions<T> | string,
    callback: (resource: Resource<T>) => R | Promise<R>,
  ): Promise<R>;
};

export type Fixture = {
  /**
   * Creates a `Resource`, acquires its lock and tracks it so the fixture
   * releases it automatically after the test — even if the test fails.
   * Accepts a bare lock id string as shorthand for `{ id }` — data is then
   * resolved from the lock backend (published by whoever wrote it first).
   *
   * Pass a callback to scope the lock to it instead of the whole test.
   * Calling `useLock` again with an id already held by an enclosing
   * callback returns the held resource instead of waiting on itself.
   *
   * @example
   * ```ts
   * test('shared account', async ({ useLock }) => {
   *   const account = await useLock({ id: 'account-1', data: { email: 'a@b.c' } })
   *   // account.data is only readable once the lock is acquired
   * })
   *
   * test('scoped lock', async ({ useLock }) => {
   *   const email = await useLock('account-1', (account) => account.data?.email)
   *   // lock already released here
   * })
   * ```
   */
  useLock: UseLock;
};

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useLock: async ({}, use) => {
    const resources: Resource<unknown>[] = [];

    const useLock = (async <T, R>(
      options: UseLockOptions<T> | string,
      callback?: (resource: Resource<T>) => R | Promise<R>,
    ) => {
      const id =
        (typeof options === "string" ? options : options?.id) ??
        `shared-${crypto.randomUUID()}`;

      // Re-entrant: an enclosing callback already holds this id.
      const held = currentLock<T>(id);
      if (held?.isLocked) {
        return callback ? runWithLock(held, () => callback(held)) : held;
      }

      const resource = new Resource<T>({
        ...(typeof options === "string" ? { id } : options),
        id,
      });
      await resource.acquire();
      resources.push(resource);

      if (!callback) return resource;
      try {
        return await runWithLock(resource, () => callback(resource));
      } finally {
        await resource.release();
      }
    }) as UseLock;

    await use(useLock);

    await Promise.all(resources.map((resource) => resource.release()));
  },
});

export const expect = baseExpect.extend({});
