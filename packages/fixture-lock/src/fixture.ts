import { test as baseTest, expect as baseExpect } from "@playwright/test";
import * as crypto from "node:crypto";

import { Resource } from "./resource.js";
import type { ResourceOptions } from "./transport.js";

type UseLockOptions<T> = Omit<ResourceOptions<T>, "id"> &
  Partial<Pick<ResourceOptions<T>, "id">>;

export type UseLock = <T>(options: UseLockOptions<T>) => Promise<Resource<T>>;

export type Fixture = {
  /**
   * Creates a `Resource`, acquires its lock and tracks it so the fixture
   * releases it automatically after the test — even if the test fails.
   *
   * @example
   * ```ts
   * test('shared account', async ({ useLock }) => {
   *   const account = await useLock({ id: 'account-1', data: { email: 'a@b.c' } })
   *   // account.data is only readable once the lock is acquired
   * })
   * ```
   */
  useLock: UseLock;
};

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useLock: async ({}, use) => {
    const resources: Resource<unknown>[] = [];

    const useLock: UseLock = async (options) => {
      const uuid = crypto.randomUUID();
      const resource = new Resource({
        id: options?.id ?? `shared-${uuid}`,
        ...options,
      });
      await resource.acquire();
      resources.push(resource);
      return resource;
    };

    await use(useLock);

    await Promise.all(resources.map((resource) => resource.release()));
  },
});

export const expect = baseExpect.extend({});
