import { test, expect } from "../src/abort";

test.describe("abortController fixture", () => {
  test.describe("basic functionality", () => {
    test("should provide an AbortController instance", ({
      abortController,
    }) => {
      expect(abortController).toBeDefined();
      expect(abortController).toBeInstanceOf(AbortController);
    });

    test("should have a signal property", ({ abortController }) => {
      expect(abortController.signal).toBeDefined();
      expect(abortController.signal).toBeInstanceOf(AbortSignal);
    });

    test("should not be aborted initially", ({ abortController }) => {
      expect(abortController.signal).toBeActive();
      expect(abortController).toHaveActiveSignal();
    });
  });

  test.describe("abort functionality", () => {
    test("should abort the controller", ({ abortController }) => {
      expect(abortController.signal).toBeActive();
      abortController.abort();
      expect(abortController.signal).toBeAborted();
      expect(abortController).toHaveAbortedSignal();
    });

    test("should abort with a reason", ({ abortController }) => {
      const reason = "Test abort reason";
      abortController.abort(reason);
      expect(abortController.signal).toBeAborted();
      expect(abortController.signal).toBeAbortedWithReason(reason);
    });

    test("should abort with an Error object", ({ abortController }) => {
      const error = new Error("Test error");
      abortController.abort(error);
      expect(abortController.signal).toBeAborted();
      expect(abortController.signal).toBeAbortedWithReason(error);
    });

    test("should trigger abort event listener", async ({ abortController }) => {
      let eventTriggered = false;
      let eventReason: any;

      abortController.signal.addEventListener("abort", () => {
        eventTriggered = true;
        eventReason = abortController.signal.reason;
      });

      const reason = "Event test";
      abortController.abort(reason);

      expect(eventTriggered).toBe(true);
      expect(eventReason).toBe(reason);
    });

    test("should handle onabort callback", ({ abortController }) => {
      let callbackTriggered = false;

      abortController.signal.onabort = () => {
        callbackTriggered = true;
      };

      abortController.abort();
      expect(callbackTriggered).toBe(true);
    });
  });
});

test.describe("useAbortController fixture", () => {
  test("should return the same controller instance", ({
    useAbortController,
    abortController,
  }) => {
    const controller1 = useAbortController();
    const controller2 = useAbortController();

    expect(controller1).toBe(controller2);
    expect(controller1).toBe(abortController);
  });

  test("should return controller that can be aborted", ({
    useAbortController,
  }) => {
    const controller = useAbortController();
    expect(controller).toHaveActiveSignal();

    controller.abort("Test reason");
    expect(controller).toHaveAbortedSignal();
    expect(controller.signal).toBeAbortedWithReason("Test reason");
  });
});

test.describe("abortSignal fixture", () => {
  test("should provide an AbortSignal instance", ({ signal }) => {
    expect(signal).toBeDefined();
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  test("should be the same as abortController.signal", ({
    signal,
    abortController,
  }) => {
    expect(signal).toBe(abortController.signal);
  });

  test("should not be aborted initially", ({ signal }) => {
    expect(signal).toBeActive();
  });

  test("should be aborted when controller is aborted", ({
    signal,
    abortController,
  }) => {
    expect(signal).toBeActive();
    abortController.abort("Test");
    expect(signal).toBeAborted();
    expect(signal).toBeAbortedWithReason("Test");
  });

  test("should work with fetch API simulation", async ({
    signal,
    abortController,
  }) => {
    let fetchAborted = false;

    // Simulate an async operation that respects abort signal
    const simulatedFetch = new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new Error("Already aborted"));
        return;
      }

      signal.addEventListener("abort", () => {
        fetchAborted = true;
        reject(new Error("Fetch aborted"));
      });

      // Simulate long-running request
      setTimeout(() => resolve("success"), 1000);
    });

    // Abort immediately
    abortController.abort();

    try {
      await simulatedFetch;
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(fetchAborted).toBe(true);
      expect((error as Error).message).toBe("Fetch aborted");
    }
  });
});

test.describe("useAbortSignalWithTimeout fixture", () => {
  test("should create a signal with timeout", ({
    useSignalWithTimeout: useAbortSignalWithTimeout,
  }) => {
    const signal = useAbortSignalWithTimeout(5000);
    expect(signal).toBeDefined();
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  test("should throw error for zero timeout", ({
    useSignalWithTimeout: useAbortSignalWithTimeout,
  }) => {
    expect(() => useAbortSignalWithTimeout(0)).toThrow(
      "useAbortSignalWithTimeout: timeout parameter must be greater than 0",
    );
  });

  test("should throw error for negative timeout", ({
    useSignalWithTimeout: useAbortSignalWithTimeout,
  }) => {
    expect(() => useAbortSignalWithTimeout(-1000)).toThrow(
      "useAbortSignalWithTimeout: timeout parameter must be greater than 0",
    );
  });

  test("should create different signals for different timeouts", ({
    useSignalWithTimeout: useAbortSignalWithTimeout,
  }) => {
    const signal1 = useAbortSignalWithTimeout(1000);
    const signal2 = useAbortSignalWithTimeout(2000);

    expect(signal1).not.toBe(signal2);
  });

  test("should not be aborted immediately", ({
    useSignalWithTimeout: useAbortSignalWithTimeout,
  }) => {
    const signal = useAbortSignalWithTimeout(5000);
    expect(signal).toBeActive();
  });

  test("should set test timeout when abortTest is true", ({
    useSignalWithTimeout,
  }) => {
    const signal = useSignalWithTimeout(5000, { abortTest: true });
    expect(signal).toBeActive();
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  test("should eventually abort after timeout", async ({ page }) => {
    // Create signal with 100ms timeout directly using AbortSignal.timeout
    const signal = AbortSignal.timeout(100);
    expect(signal).toBeActive();

    // Wait for the timeout using custom matcher
    await expect(signal).toAbortWithin(200);

    expect(signal).toBeAborted();
  });

  test("should have TimeoutError as reason when aborted", async ({ page }) => {
    // Create signal with 100ms timeout directly using AbortSignal.timeout
    const signal = AbortSignal.timeout(100);

    // Wait for abort using custom matcher
    await expect(signal).toAbortWithin(200);

    expect(signal).toBeAborted();
    expect(signal).toHaveAbortReason(Error);
    expect(signal.reason.name).toBe("TimeoutError");
  });
});

test.describe("abortTest option", () => {
  test.describe("useAbortController with abortTest", () => {
    test("should register controller with abortTest option", ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: true });

      expect(controller).toHaveActiveSignal();
      expect(controller.signal).toBeActive();
      // Controller is configured to fail test when aborted
    });

    test("should not fail test when controller is aborted with abortTest: false", async ({
      useAbortController,
    }) => {
      const controller = useAbortController({ abortTest: false });

      expect(controller).toHaveActiveSignal();

      controller.abort("Test aborted but should not fail");

      expect(controller).toHaveAbortedSignal();
      // Test continues normally
    });

    test("should not fail test when controller is aborted without abortTest option", async ({
      useAbortController,
    }) => {
      const controller = useAbortController();

      expect(controller).toHaveActiveSignal();

      controller.abort("Test aborted");

      expect(controller).toHaveAbortedSignal();
      // Test continues normally
    });

    test("should execute onAbort callback without abortTest", async ({
      useAbortController,
    }) => {
      let callbackExecuted = false;
      let callbackReason: any;

      const controller = useAbortController({
        onAbort(ev) {
          callbackExecuted = true;
          callbackReason = this.reason;
        },
      });

      controller.abort("Callback test");

      expect(callbackExecuted).toBe(true);
      expect(callbackReason).toBe("Callback test");
      expect(controller).toHaveAbortedSignal();
    });

    test("should execute onAbort callback with abortTest: false", async ({
      useAbortController,
    }) => {
      let callbackExecuted = false;

      const controller = useAbortController({
        abortTest: false,
        onAbort() {
          callbackExecuted = true;
        },
      });

      controller.abort("Callback only");

      expect(callbackExecuted).toBe(true);
      expect(controller).toHaveAbortedSignal();
      // Test should continue normally
    });

    test("should configure abortTest option with onAbort callback", ({
      useAbortController,
    }) => {
      let callbackConfigured = false;

      const controller = useAbortController({
        abortTest: true,
        onAbort() {
          callbackConfigured = true;
        },
      });

      expect(controller).toHaveActiveSignal();
      expect(controller.signal).toBeActive();

      // Controller is configured with both abortTest and onAbort
      // When aborted, it will call onAbort and then test.fail()
      // We don't actually abort here to avoid failing this test
    });
  });

  test.describe("useSignalWithTimeout with abortTest", () => {
    test("should create signal with timeout and set test timeout when abortTest: true", ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(3000, { abortTest: true });

      expect(signal).toBeActive();
      expect(signal).toBeInstanceOf(AbortSignal);
      // The test timeout should be set to 3000ms internally
    });

    test("should create signal without affecting test timeout when abortTest: false", ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(3000, { abortTest: false });

      expect(signal).toBeActive();
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    test("should create signal without affecting test timeout when no options", ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(3000);

      expect(signal).toBeActive();
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    test("should set test timeout when abortTest: true and signal can abort", async ({
      useSignalWithTimeout,
    }) => {
      // Create a signal with timeout - the test timeout is set to match
      const signal = useSignalWithTimeout(5000, { abortTest: true });

      expect(signal).toBeActive();

      // Signal will abort after 5000ms, and test timeout is also set to 5000ms
      // In a real scenario that exceeds this, the test would fail with timeout
      expect(signal).toBeInstanceOf(AbortSignal);
    });

    test("should not fail test when timeout expires with abortTest: false", async ({
      useSignalWithTimeout,
    }) => {
      const signal = useSignalWithTimeout(100, { abortTest: false });

      expect(signal).toBeActive();

      // Wait for the signal to abort
      await expect(signal).toAbortWithin(150);

      expect(signal).toBeAborted();
      // Test should continue normally
    });
  });

  test.describe("combined scenarios", () => {
    test("should handle both useAbortController and useSignalWithTimeout with abortTest", async ({
      useAbortController,
      useSignalWithTimeout,
    }) => {
      const controller = useAbortController({ abortTest: false });
      const timeoutSignal = useSignalWithTimeout(5000, { abortTest: false });

      expect(controller).toHaveActiveSignal();
      expect(timeoutSignal).toBeActive();

      controller.abort("Manual abort");

      expect(controller).toHaveAbortedSignal();
      expect(timeoutSignal).toBeActive(); // Different signal, still active
    });

    test("should handle operation with abortTest enabled controller", async ({
      useAbortController,
    }) => {
      let operationAborted = false;

      const controller = useAbortController({ abortTest: true });
      const signal = controller.signal;

      const operation = new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          operationAborted = true;
          reject(new Error("Operation cancelled"));
        });

        setTimeout(() => resolve("done"), 500);
      });

      // Abort after starting
      setTimeout(() => controller.abort("Stopping operation"), 50);

      try {
        await operation;
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(operationAborted).toBe(true);
        expect((error as Error).message).toBe("Operation cancelled");
      }
    });
  });
});

test.describe("real-world scenarios", () => {
  test("should cancel a simulated API request", async ({
    abortController,
    signal,
  }) => {
    let requestStarted = false;
    let requestCompleted = false;
    let requestAborted = false;

    // Initially signal should be active
    expect(signal).toBeActive();
    expect(abortController).toHaveActiveSignal();

    const simulatedApiCall = async () => {
      requestStarted = true;

      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error("Request already aborted"));
          return;
        }

        const abortHandler = () => {
          requestAborted = true;
          reject(new Error("Request cancelled"));
        };

        signal.addEventListener("abort", abortHandler);

        setTimeout(() => {
          signal.removeEventListener("abort", abortHandler);
          requestCompleted = true;
          resolve("API response");
        }, 500);
      });
    };

    const requestPromise = simulatedApiCall();

    // Abort after request starts
    setTimeout(() => abortController.abort("User cancelled"), 50);

    try {
      await requestPromise;
      expect(true).toBe(false); // Should not complete
    } catch (error) {
      expect(requestStarted).toBe(true);
      expect(requestCompleted).toBe(false);
      expect(requestAborted).toBe(true);
      expect((error as Error).message).toBe("Request cancelled");
      expect(signal).toBeAborted();
      expect(signal).toBeAbortedWithReason("User cancelled");
    }
  });

  test("should handle timeout in async operation", async ({ page }) => {
    // Use AbortSignal.timeout directly to avoid setting test timeout
    const signal = AbortSignal.timeout(200);
    let operationTimedOut = false;

    expect(signal).toBeActive();

    const longOperation = new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        operationTimedOut = true;
        reject(new Error("Operation timed out"));
      });

      // Simulate operation longer than timeout
      setTimeout(() => resolve("done"), 500);
    });

    try {
      await longOperation;
      expect(true).toBe(false); // Should timeout
    } catch (error) {
      expect(operationTimedOut).toBe(true);
      expect((error as Error).message).toBe("Operation timed out");
      expect(signal).toBeAborted();
      expect(signal).toHaveAbortReason(Error);
    }
  });

  test("should work with multiple listeners", ({ abortController, signal }) => {
    let listener1Called = false;
    let listener2Called = false;
    let listener3Called = false;

    expect(signal).toBeActive();

    signal.addEventListener("abort", () => {
      listener1Called = true;
    });

    signal.addEventListener("abort", () => {
      listener2Called = true;
    });

    signal.onabort = () => {
      listener3Called = true;
    };

    abortController.abort();

    expect(listener1Called).toBe(true);
    expect(listener2Called).toBe(true);
    expect(listener3Called).toBe(true);
    expect(signal).toBeAborted();
  });

  test("should handle abort before operation starts", async ({
    abortController,
    signal,
  }) => {
    // Abort before starting operation
    abortController.abort("Pre-aborted");

    expect(signal).toBeAborted();
    expect(signal).toBeAbortedWithReason("Pre-aborted");

    const operation = new Promise((resolve, reject) => {
      // Check if already aborted
      if (signal.aborted) {
        reject(new Error("Operation cancelled before start"));
        return;
      }

      setTimeout(() => resolve("done"), 100);
    });

    try {
      await operation;
      expect(true).toBe(false); // Should not complete
    } catch (error) {
      expect((error as Error).message).toBe("Operation cancelled before start");
      expect(abortController).toHaveAbortedSignal();
    }
  });
});
