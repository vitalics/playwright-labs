import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { type TimerOptions } from "node:timers";
import {
  setTimeout,
  setInterval,
  setImmediate,
  scheduler,
} from "node:timers/promises";

export type Fixture = {
  setTimeout: <T = void>(
    delay?: number,
    value?: T,
    options?: TimerOptions,
  ) => Promise<T>;
  setInterval: <T = void>(
    delay?: number,
    value?: T,
    options?: TimerOptions,
  ) => NodeJS.AsyncIterator<T>;
  setImmediate: <T = void>(value?: T, options?: TimerOptions) => Promise<T>;
  scheduler: typeof scheduler;
};

export const test = baseTest.extend<Fixture>({
  setTimeout: async ({}, use) => {
    await use(setTimeout);
  },
  setImmediate: async ({}, use) => {
    await use(setImmediate);
  },
  setInterval: async ({}, use) => {
    await use(setInterval);
  },
  scheduler: async ({}, use) => {
    await use(scheduler);
  },
});

/**
 * Custom expect matchers for timer testing.
 */
export const expect = baseExpect.extend({
  /**
   * Asserts that a promise resolves within a specified time window.
   * 
   * @example
   * ```typescript
   * test('timer resolves quickly', async ({ setTimeout }) => {
   *   const promise = setTimeout(100);
   *   await expect(promise).toResolveWithin(150);
   * });
   * ```
   */
  async toResolveWithin(received: Promise<any>, maxMs: number) {
    const startTime = Date.now();
    let resolved = false;
    let resolvedValue: any;
    let rejected = false;
    let rejectionError: any;

    try {
      resolvedValue = await Promise.race([
        received.then(value => {
          resolved = true;
          return value;
        }).catch(error => {
          rejected = true;
          rejectionError = error;
          throw error;
        }),
        new Promise((_, reject) => 
          globalThis.setTimeout(() => reject(new Error(`Promise did not resolve within ${maxMs}ms`)), maxMs)
        )
      ]);
    } catch (error) {
      if (rejected) {
        return {
          pass: false,
          message: () => `Expected promise to resolve within ${maxMs}ms, but it rejected with: ${rejectionError}`,
        };
      }
      return {
        pass: false,
        message: () => (error as Error).message,
      };
    }

    const elapsedTime = Date.now() - startTime;

    return {
      pass: true,
      message: () => `Expected promise not to resolve within ${maxMs}ms, but it resolved after ${elapsedTime}ms with value: ${resolvedValue}`,
    };
  },

  /**
   * Asserts that a promise takes at least a minimum amount of time to resolve.
   * 
   * @example
   * ```typescript
   * test('timer takes expected time', async ({ setTimeout }) => {
   *   const promise = setTimeout(100);
   *   await expect(promise).toTakeAtLeast(95);
   * });
   * ```
   */
  async toTakeAtLeast(received: Promise<any>, minMs: number) {
    const startTime = Date.now();
    
    try {
      await received;
    } catch (error) {
      return {
        pass: false,
        message: () => `Expected promise to resolve, but it rejected with: ${error}`,
      };
    }

    const elapsedTime = Date.now() - startTime;
    const pass = elapsedTime >= minMs;

    return {
      pass,
      message: () => pass
        ? `Expected promise not to take at least ${minMs}ms, but it took ${elapsedTime}ms`
        : `Expected promise to take at least ${minMs}ms, but it took ${elapsedTime}ms`,
    };
  },

  /**
   * Asserts that a promise resolves with a specific value.
   * 
   * @example
   * ```typescript
   * test('timer resolves with value', async ({ setTimeout }) => {
   *   const promise = setTimeout(100, 'test-value');
   *   await expect(promise).toResolveWith('test-value');
   * });
   * ```
   */
  async toResolveWith(received: Promise<any>, expectedValue: any) {
    let actualValue: any;
    let rejected = false;
    let rejectionError: any;

    try {
      actualValue = await received;
    } catch (error) {
      rejected = true;
      rejectionError = error;
    }

    if (rejected) {
      return {
        pass: false,
        message: () => `Expected promise to resolve with ${JSON.stringify(expectedValue)}, but it rejected with: ${rejectionError}`,
      };
    }

    const pass = actualValue === expectedValue;

    return {
      pass,
      message: () => pass
        ? `Expected promise not to resolve with ${JSON.stringify(expectedValue)}, but it did`
        : `Expected promise to resolve with ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`,
    };
  },

  /**
   * Asserts that an async iterator yields a specific value.
   * 
   * @example
   * ```typescript
   * test('interval yields value', async ({ setInterval }) => {
   *   const iterator = setInterval(100, 'tick');
   *   await expect(iterator).toYield('tick');
   * });
   * ```
   */
  async toYield(received: AsyncIterator<any>, expectedValue?: any) {
    let result: IteratorResult<any>;
    
    try {
      result = await received.next();
    } catch (error) {
      return {
        pass: false,
        message: () => `Expected iterator to yield a value, but it threw: ${error}`,
      };
    }

    if (result.done) {
      return {
        pass: false,
        message: () => `Expected iterator to yield a value, but it was already done`,
      };
    }

    if (expectedValue === undefined) {
      return {
        pass: true,
        message: () => `Expected iterator not to yield a value, but it yielded: ${JSON.stringify(result.value)}`,
      };
    }

    const pass = result.value === expectedValue;

    return {
      pass,
      message: () => pass
        ? `Expected iterator not to yield ${JSON.stringify(expectedValue)}, but it did`
        : `Expected iterator to yield ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(result.value)}`,
    };
  },

  /**
   * Asserts that an async iterator yields a value within a specified time window.
   * 
   * @example
   * ```typescript
   * test('interval yields quickly', async ({ setInterval }) => {
   *   const iterator = setInterval(100);
   *   await expect(iterator).toYieldWithin(150);
   * });
   * ```
   */
  async toYieldWithin(received: AsyncIterator<any>, maxMs: number) {
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        received.next(),
        new Promise<IteratorResult<any>>((_, reject) =>
          globalThis.setTimeout(() => reject(new Error(`Iterator did not yield within ${maxMs}ms`)), maxMs)
        )
      ]);

      if (result.done) {
        return {
          pass: false,
          message: () => `Expected iterator to yield a value within ${maxMs}ms, but it was done`,
        };
      }

      const elapsedTime = Date.now() - startTime;

      return {
        pass: true,
        message: () => `Expected iterator not to yield within ${maxMs}ms, but it yielded after ${elapsedTime}ms`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as Error).message,
      };
    }
  },

  /**
   * Asserts that a scheduler wait function resolves within a time window.
   * 
   * @example
   * ```typescript
   * test('scheduler wait resolves', async ({ scheduler }) => {
   *   const promise = scheduler.wait(100);
   *   await expect(promise).toResolveWithin(150);
   * });
   * ```
   */
  async toResolveInTimeRange(received: Promise<any>, minMs: number, maxMs: number) {
    const startTime = Date.now();
    
    try {
      await Promise.race([
        received,
        new Promise((_, reject) =>
          globalThis.setTimeout(() => reject(new Error(`Promise did not resolve within ${maxMs}ms`)), maxMs)
        )
      ]);
    } catch (error) {
      return {
        pass: false,
        message: () => (error as Error).message,
      };
    }

    const elapsedTime = Date.now() - startTime;
    const pass = elapsedTime >= minMs && elapsedTime <= maxMs;

    return {
      pass,
      message: () => pass
        ? `Expected promise not to resolve between ${minMs}ms and ${maxMs}ms, but it took ${elapsedTime}ms`
        : `Expected promise to resolve between ${minMs}ms and ${maxMs}ms, but it took ${elapsedTime}ms`,
    };
  },
});
