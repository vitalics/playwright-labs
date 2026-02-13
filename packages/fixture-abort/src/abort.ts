import { test as baseTest, expect as baseExpect } from "@playwright/test";

type UseAbortControllerOptions = {
  /** Whether to stop the test when the controller is aborted */
  abortTest?: boolean;
  /** Callback to execute when abort is triggered */
  onAbort?: (this: AbortSignal, ev?: Event) => void | PromiseLike<void>;
};

type UseSignalWithTimeoutOptions = {
  /** Whether to stop the test when the signal is aborted */
  abortTest?: boolean;
};

/**
 * Playwright fixtures for working with AbortController and AbortSignal.
 * Provides utilities for cancelling async operations and handling timeouts in tests.
 *
 * @example
 * ```typescript
 * import { test, expect } from './abortController';
 *
 * test('cancel API request', async ({ abortController, abortSignal }) => {
 *   const fetchPromise = fetch('https://api.example.com', { signal: abortSignal });
 *   abortController.abort('Test cancelled');
 *   await expect(fetchPromise).rejects.toThrow();
 * });
 * ```
 */
export type Fixture = {
  /**
   * An AbortController instance for the current test.
   * Use this to abort operations by calling `abortController.abort()`.
   *
   * @example
   * ```typescript
   * test('abort example', async ({ abortController }) => {
   *   abortController.abort('Cancellation reason');
   *   expect(abortController.signal.aborted).toBe(true);
   * });
   * ```
   */
  abortController: AbortController;

  /**
   * Returns the AbortController instance and optionally registers an abort callback.
   * The callback will be executed when the controller is aborted.
   *
   * @param onAbort - Optional callback to execute when abort is triggered
   * @returns The AbortController instance
   *
   * @example
   * ```typescript
   * test('with callback', async ({ useAbortController }) => {
   *   const controller = useAbortController(() => {
   *     console.log('Operation cancelled');
   *   });
   *   controller.abort();
   * });
   * ```
   */
  useAbortController: (options?: UseAbortControllerOptions) => AbortController;

  /**
   * The AbortSignal associated with the test's AbortController.
   * Pass this signal to async operations to make them cancellable.
   *
   * @example
   * test('use signal', async ({ signal, abortController }) => {
   *   const operation = new Promise((resolve, reject) => {
   *     signal.addEventListener('abort', () => reject(new Error('Cancelled')));
   *     setTimeout(resolve, 1000);
   *   });
   *   abortController.abort();
   *   await expect(operation).rejects.toThrow('Cancelled');
   * });
   */
  signal: AbortSignal;

  /**
   * Creates an AbortSignal that will automatically abort after the specified timeout.
   * Also sets the Playwright test timeout to match.
   *
   * @param timeout - Timeout in milliseconds (must be greater than 0)
   * @returns An AbortSignal that will abort after the timeout
   * @throws {RangeError} If timeout is less than or equal to 0
   *
   * @example
   * ```typescript
   * test('timeout example', async ({ useAbortSignalWithTimeout }) => {
   *   const signal = useAbortSignalWithTimeout(5000);
   *   const operation = fetch('https://api.example.com', { signal });
   *   // Operation will be aborted after 5 seconds
   * });
   * ```
   */
  useSignalWithTimeout: (
    timeout: number,
    options?: UseSignalWithTimeoutOptions,
  ) => AbortSignal;
};

export const test = baseTest.extend<Fixture>({
  /**
   * Provides an AbortController instance for managing cancellable operations.
   * The controller is automatically created for each test and can be used to abort
   * async operations by calling `abort()`.
   *
   * @example
   * ```typescript
   * test('my test', async ({ abortController }) => {
   *   // Use the controller to cancel operations
   *   abortController.abort('User cancelled');
   * });
   * ```
   */
  abortController: async ({}, use) => {
    const controller = new AbortController();
    await use(controller);
  },

  /**
   * Returns the AbortController instance with optional abort callback registration.
   * This fixture allows you to register a callback that will be executed when
   * the controller is aborted, useful for cleanup operations.
   *
   * @example
   * ```typescript
   * test('with cleanup', async ({ useAbortController }) => {
   *   const controller = useAbortController(() => {
   *     console.log('Cleaning up resources');
   *   });
   *   controller.abort();
   * });
   * ```
   */
  useAbortController: async ({ abortController }, use) => {
    const createOnAbortFn = (options?: UseAbortControllerOptions) =>
      function onAbort(this: AbortSignal, ev: Event) {
        if (options?.onAbort && typeof options.onAbort === "function") {
          Reflect.apply(options.onAbort, this, [ev]);
          if (options?.abortTest) {
            test.fail(this.reason);
          }
        }
      };
    await use((options) => {
      abortController.signal.onabort = createOnAbortFn(options);
      return abortController;
    });
    abortController.signal.removeEventListener("abort", createOnAbortFn());
  },

  /**
   * Provides the AbortSignal from the test's AbortController.
   * Use this signal with fetch(), promises, or any API that supports AbortSignal
   * to make operations cancellable.
   *
   * @example
   * ```typescript
   * test('fetch with signal', async ({ abortSignal, abortController }) => {
   *   const response = fetch('https://api.example.com', { signal: abortSignal });
   *   abortController.abort(); // Cancel the request
   * });
   * ```
   */
  signal: async ({ abortController }, use) => {
    await use(abortController.signal);
  },

  /**
   * Creates an AbortSignal with automatic timeout.
   * The signal will automatically abort after the specified timeout duration.
   * Also sets the Playwright test timeout to the same value.
   *
   * @example
   * ```typescript
   * test('with timeout', async ({ useAbortSignalWithTimeout }) => {
   *   const signal = useAbortSignalWithTimeout(3000);
   *   await longRunningOperation(signal); // Will abort after 3 seconds
   * });
   * ```
   *
   * @throws {RangeError} When timeout is <= 0
   */
  useSignalWithTimeout: async ({}, use) => {
    await use((timeout, options) => {
      if (timeout <= 0) {
        throw new RangeError(
          "useAbortSignalWithTimeout: timeout parameter must be greater than 0",
        );
      }
      if (options?.abortTest) {
        baseTest.setTimeout(timeout);
      }
      return AbortSignal.timeout(timeout);
    });
  },
});

/**
 * Custom expect matchers for AbortController and AbortSignal testing.
 *
 * @example
 * ```typescript
 * import { expect } from './abortController';
 *
 * test('test aborted state', async ({ abortSignal, abortController }) => {
 *   expect(abortSignal).toBeAborted();
 *   expect(abortController).toHaveAbortedSignal();
 * });
 * ```
 */
export const expect = baseExpect.extend({
  /**
   * Asserts that an AbortSignal has been aborted.
   *
   * @example
   * ```typescript
   * test('signal aborted', async ({ abortSignal, abortController }) => {
   *   abortController.abort();
   *   expect(abortSignal).toBeAborted();
   * });
   * ```
   */
  toBeAborted(received: AbortSignal) {
    const pass = received.aborted === true;
    return {
      pass,
      message: () =>
        pass
          ? `Expected AbortSignal not to be aborted, but it was aborted`
          : `Expected AbortSignal to be aborted, but it was not aborted`,
    };
  },

  /**
   * Asserts that an AbortSignal has not been aborted.
   *
   * @example
   * ```typescript
   * test('signal not aborted', async ({ abortSignal }) => {
   *   expect(abortSignal).not.toBeAborted();
   * });
   * ```
   */
  toBeActive(received: AbortSignal) {
    const pass = received.aborted === false;
    return {
      pass,
      message: () =>
        pass
          ? `Expected AbortSignal to be aborted, but it was active`
          : `Expected AbortSignal to be active (not aborted), but it was aborted`,
    };
  },

  /**
   * Asserts that an AbortSignal was aborted with a specific reason.
   *
   * @example
   * ```typescript
   * test('signal aborted with reason', async ({ abortSignal, abortController }) => {
   *   abortController.abort('User cancelled');
   *   expect(abortSignal).toBeAbortedWithReason('User cancelled');
   * });
   * ```
   */
  toBeAbortedWithReason(received: AbortSignal, expectedReason: any) {
    const isAborted = received.aborted === true;
    const hasMatchingReason = received.reason === expectedReason;
    const pass = isAborted && hasMatchingReason;

    return {
      pass,
      message: () => {
        if (!isAborted) {
          return `Expected AbortSignal to be aborted with reason "${expectedReason}", but it was not aborted`;
        }
        return pass
          ? `Expected AbortSignal not to be aborted with reason "${expectedReason}", but it was`
          : `Expected AbortSignal to be aborted with reason "${expectedReason}", but got "${received.reason}"`;
      },
    };
  },

  /**
   * Asserts that an AbortController's signal has been aborted.
   *
   * @example
   * ```typescript
   * test('controller aborted', async ({ abortController }) => {
   *   abortController.abort();
   *   expect(abortController).toHaveAbortedSignal();
   * });
   * ```
   */
  toHaveAbortedSignal(received: AbortController) {
    const pass = received.signal.aborted === true;
    return {
      pass,
      message: () =>
        pass
          ? `Expected AbortController's signal not to be aborted, but it was aborted`
          : `Expected AbortController's signal to be aborted, but it was not aborted`,
    };
  },

  /**
   * Asserts that an AbortController's signal is active (not aborted).
   *
   * @example
   * ```typescript
   * test('controller active', async ({ abortController }) => {
   *   expect(abortController).toHaveActiveSignal();
   * });
   * ```
   */
  toHaveActiveSignal(received: AbortController) {
    const pass = received.signal.aborted === false;
    return {
      pass,
      message: () =>
        pass
          ? `Expected AbortController's signal to be aborted, but it was active`
          : `Expected AbortController's signal to be active, but it was aborted`,
    };
  },

  /**
   * Asserts that an AbortSignal will abort within a specified timeout.
   * Useful for testing timeout-based abort signals.
   *
   * @example
   * ```typescript
   * test('signal aborts within timeout', async () => {
   *   const signal = AbortSignal.timeout(100);
   *   await expect(signal).toAbortWithin(150);
   * });
   * ```
   */
  async toAbortWithin(received: AbortSignal, timeout: number) {
    if (received.aborted) {
      return {
        pass: true,
        message: () => `Expected AbortSignal not to be already aborted`,
      };
    }

    const startTime = Date.now();
    let aborted = false;

    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`AbortSignal did not abort within ${timeout}ms`));
        }, timeout);

        received.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          aborted = true;
          resolve();
        });
      });

      const elapsedTime = Date.now() - startTime;

      return {
        pass: true,
        message: () =>
          `Expected AbortSignal not to abort within ${timeout}ms, but it aborted after ${elapsedTime}ms`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error as Error).message,
      };
    }
  },

  /**
   * Asserts that an AbortSignal's reason is an instance of a specific error type.
   *
   * @example
   * ```typescript
   * test('signal has error reason', async () => {
   *   const signal = AbortSignal.timeout(100);
   *   await expect(signal).toAbortWithin(150);
   *   expect(signal).toHaveAbortReason(Error);
   * });
   * ```
   */
  toHaveAbortReason(
    received: AbortSignal,
    expectedErrorType: new (...args: any[]) => Error,
  ) {
    if (!received.aborted) {
      return {
        pass: false,
        message: () =>
          `Expected AbortSignal to be aborted with reason of type ${expectedErrorType.name}, but it was not aborted`,
      };
    }

    const pass = received.reason instanceof expectedErrorType;
    return {
      pass,
      message: () =>
        pass
          ? `Expected AbortSignal reason not to be instance of ${expectedErrorType.name}, but it was`
          : `Expected AbortSignal reason to be instance of ${expectedErrorType.name}, but got ${received.reason?.constructor?.name ?? typeof received.reason}`,
    };
  },
});
