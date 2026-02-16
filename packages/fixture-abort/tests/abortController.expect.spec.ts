import { test, expect } from "../src/abort";

test.describe("Custom expect matchers", () => {
  test.describe("toBeAborted", () => {
    test("should pass when signal is aborted", ({
      signal,
      abortController,
    }) => {
      abortController.abort();
      expect(signal).toBeAborted();
    });

    test("should fail when signal is not aborted", ({ signal }) => {
      expect(() => expect(signal).toBeAborted()).toThrow(
        "Expected AbortSignal to be aborted, but it was not aborted",
      );
    });

    test("should work with .not modifier", ({ signal }) => {
      expect(signal).not.toBeAborted();
    });
  });

  test.describe("toBeActive", () => {
    test("should pass when signal is active", ({ signal }) => {
      expect(signal).toBeActive();
    });

    test("should fail when signal is aborted", ({
      signal,
      abortController,
    }) => {
      abortController.abort();
      expect(() => expect(signal).toBeActive()).toThrow(
        "Expected AbortSignal to be active (not aborted), but it was aborted",
      );
    });

    test("should work with .not modifier", ({ signal, abortController }) => {
      abortController.abort();
      expect(signal).not.toBeActive();
    });
  });

  test.describe("toBeAbortedWithReason", () => {
    test("should pass when signal is aborted with matching reason", ({
      signal,
      abortController,
    }) => {
      const reason = "User cancelled";
      abortController.abort(reason);
      expect(signal).toBeAbortedWithReason(reason);
    });

    test("should fail when signal is not aborted", ({ signal }) => {
      expect(() => expect(signal).toBeAbortedWithReason("test")).toThrow(
        'Expected AbortSignal to be aborted with reason "test", but it was not aborted',
      );
    });

    test("should fail when reason does not match", ({
      signal,
      abortController,
    }) => {
      abortController.abort("Reason A");
      expect(() => expect(signal).toBeAbortedWithReason("Reason B")).toThrow(
        'Expected AbortSignal to be aborted with reason "Reason B", but got "Reason A"',
      );
    });

    test("should work with Error objects", ({ signal, abortController }) => {
      const error = new Error("Custom error");
      abortController.abort(error);
      expect(signal).toBeAbortedWithReason(error);
    });
  });

  test.describe("toHaveAbortedSignal", () => {
    test("should pass when controller's signal is aborted", ({
      abortController,
    }) => {
      abortController.abort();
      expect(abortController).toHaveAbortedSignal();
    });

    test("should fail when controller's signal is not aborted", ({
      abortController,
    }) => {
      expect(() => expect(abortController).toHaveAbortedSignal()).toThrow(
        "Expected AbortController's signal to be aborted, but it was not aborted",
      );
    });

    test("should work with .not modifier", ({ abortController }) => {
      expect(abortController).not.toHaveAbortedSignal();
    });
  });

  test.describe("toHaveActiveSignal", () => {
    test("should pass when controller's signal is active", ({
      abortController,
    }) => {
      expect(abortController).toHaveActiveSignal();
    });

    test("should fail when controller's signal is aborted", ({
      abortController,
    }) => {
      abortController.abort();
      expect(() => expect(abortController).toHaveActiveSignal()).toThrow(
        "Expected AbortController's signal to be active, but it was aborted",
      );
    });

    test("should work with .not modifier", ({ abortController }) => {
      abortController.abort();
      expect(abortController).not.toHaveActiveSignal();
    });
  });

  test.describe("toAbortWithin", () => {
    test("should pass when signal aborts within timeout", async () => {
      const signal = AbortSignal.timeout(100);
      await expect(signal).toAbortWithin(200);
    });

    test("should pass immediately if signal is already aborted", async ({
      abortController,
    }) => {
      abortController.abort();
      await expect(abortController.signal).toAbortWithin(100);
    });

    test("should fail when signal does not abort within timeout", async () => {
      const signal = AbortSignal.timeout(500);
      await expect(expect(signal).toAbortWithin(100)).rejects.toThrow(
        "AbortSignal did not abort within 100ms",
      );
    });

    test("should work with custom timeout signals", async () => {
      const signal = AbortSignal.timeout(50);
      await expect(signal).toAbortWithin(100);
      expect(signal).toBeAborted();
    });
  });

  test.describe("toHaveAbortReason", () => {
    test("should pass when reason is instance of expected error type", async () => {
      const signal = AbortSignal.timeout(50);
      await expect(signal).toAbortWithin(100);
      expect(signal).toHaveAbortReason(Error);
    });

    test("should fail when signal is not aborted", ({ signal }) => {
      expect(() => expect(signal).toHaveAbortReason(Error)).toThrow(
        "Expected AbortSignal to be aborted with reason of type Error, but it was not aborted",
      );
    });

    test("should fail when reason is not instance of expected type", ({
      abortController,
      signal,
    }) => {
      abortController.abort("string reason");
      expect(() => expect(signal).toHaveAbortReason(Error)).toThrow(
        "Expected AbortSignal reason to be instance of Error, but got String",
      );
    });

    test("should work with custom error types", ({
      abortController,
      signal,
    }) => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error");
      abortController.abort(error);
      expect(signal).toHaveAbortReason(CustomError);
      expect(signal).toHaveAbortReason(Error); // CustomError extends Error
    });
  });

  test.describe("abortTest option validation", () => {
    test("should validate abortTest option setup with useAbortController", ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: true });

      // Initially active
      expect(controller).toHaveActiveSignal();
      expect(controller.signal).toBeActive();
      // Controller is configured to fail test when aborted with onAbort callback
    });

    test("should validate abortTest option with useSignalWithTimeout", ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(3000, { abortTest: true });

      // Initially active
      expect(signal).toBeActive();
      expect(signal).not.toBeAborted();
      expect(signal).toBeInstanceOf(AbortSignal);
      // Test timeout is set to 3000ms
    });

    test("should validate onAbort callback setup with abortTest", ({
      useAbortController,
    }) => {
      let callbackCalled = false;

      const controller = useAbortController({
        abortTest: true,
        onAbort(ev) {
          callbackCalled = true;
        },
      });

      expect(controller).toHaveActiveSignal();
      expect(callbackCalled).toBe(false);
      // When controller is aborted, callback will be called and test will fail
    });

    test("should use matchers with string reason", async ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: false });
      controller.abort("String reason");
      expect(controller).toHaveAbortedSignal();
      expect(controller.signal).toBeAbortedWithReason("String reason");
    });

    test("should use matchers with Error object reason", async ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: false });
      const error = new Error("Error reason");
      controller.abort(error);
      expect(controller).toHaveAbortedSignal();
      expect(controller.signal).toBeAbortedWithReason(error);
      expect(controller.signal).toHaveAbortReason(Error);
    });

    test("should use matchers with no reason", async ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: false });
      controller.abort();
      expect(controller).toHaveAbortedSignal();
      expect(controller.signal).toBeAborted();
    });

    test("should validate timeout signal with matchers", async ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(50, { abortTest: false });

      // Initially active
      expect(signal).toBeActive();
      expect(signal).not.toBeAborted();

      // Wait and validate
      await expect(signal).toAbortWithin(100);

      // Validate abort state
      expect(signal).toBeAborted();
      expect(signal).not.toBeActive();
      expect(signal).toHaveAbortReason(Error);

      // Validate TimeoutError specifically
      expect(signal.reason).toBeInstanceOf(Error);
      expect(signal.reason.name).toBe("TimeoutError");
    });
  });

  test.describe("real-world usage", () => {
    test("should validate abort flow", async ({ abortController, signal }) => {
      // Initially active
      expect(signal).toBeActive();
      expect(signal).not.toBeAborted();
      expect(abortController).toHaveActiveSignal();

      // Abort with reason
      const reason = "Operation cancelled by user";
      abortController.abort(reason);

      // Now aborted
      expect(signal).toBeAborted();
      expect(signal).not.toBeActive();
      expect(abortController).toHaveAbortedSignal();
      expect(signal).toBeAbortedWithReason(reason);
    });

    test("should validate timeout signal", async () => {
      const signal = AbortSignal.timeout(100);

      // Initially active
      expect(signal).toBeActive();

      // Wait for abort
      await expect(signal).toAbortWithin(150);

      // Now aborted with TimeoutError
      expect(signal).toBeAborted();
      expect(signal).toHaveAbortReason(Error);
    });

    test("should work in API request simulation", async ({
      abortController,
      signal,
    }) => {
      const fetchSimulation = new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error("Already aborted"));
          return;
        }

        signal.addEventListener("abort", () => {
          reject(new Error("Request cancelled"));
        });

        setTimeout(() => resolve("success"), 1000);
      });

      // Initially active
      expect(abortController).toHaveActiveSignal();

      // Cancel request
      setTimeout(() => abortController.abort("User action"), 50);

      // Request should be cancelled
      await expect(fetchSimulation).rejects.toThrow("Request cancelled");
      expect(abortController).toHaveAbortedSignal();
    });
  });
});
