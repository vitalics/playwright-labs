import { test, expect } from "../src/timers";

test.describe("setTimeout fixture", () => {
  test.describe("basic functionality", () => {
    test("should resolve after specified delay", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveWithin(150);
    });

    test("should resolve with undefined by default", async ({ setTimeout }) => {
      const result = await setTimeout(50);
      expect(result).toBeUndefined();
    });

    test("should resolve with specified value", async ({ setTimeout }) => {
      const promise = setTimeout(50, "test-value");
      await expect(promise).toResolveWith("test-value");
    });

    test("should resolve with number value", async ({ setTimeout }) => {
      const promise = setTimeout(50, 42);
      await expect(promise).toResolveWith(42);
    });

    test("should resolve with object value", async ({ setTimeout }) => {
      const obj = { key: "value" };
      const result = await setTimeout(50, obj);
      expect(result).toBe(obj);
    });

    test("should handle zero delay", async ({ setTimeout }) => {
      const promise = setTimeout(0);
      await expect(promise).toResolveWithin(50);
    });

    test("should handle undefined delay", async ({ setTimeout }) => {
      const promise = setTimeout();
      await expect(promise).toResolveWithin(50);
    });
  });

  test.describe("timing validation", () => {
    test("should take at least the specified delay", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toTakeAtLeast(95);
    });

    test("should resolve in expected time range", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveInTimeRange(95, 200);
    });

    test("should not resolve too early", async ({ setTimeout }) => {
      const startTime = Date.now();
      await setTimeout(100);
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });
  });

  test.describe("AbortSignal support", () => {
    test("should support abort signal in options", async ({ setTimeout }) => {
      const controller = new AbortController();
      const promise = setTimeout(1000, "value", { signal: controller.signal });

      // Abort after 50ms
      globalThis.setTimeout(() => controller.abort(), 50);

      await expect(promise).rejects.toThrow();
    });

    test("should abort before timeout completes", async ({ setTimeout }) => {
      const controller = new AbortController();
      const promise = setTimeout(500, "value", { signal: controller.signal });

      controller.abort();

      await expect(promise).rejects.toThrow();
    });
  });

  test.describe("multiple timers", () => {
    test("should handle multiple concurrent timeouts", async ({ setTimeout }) => {
      const promise1 = setTimeout(50, "first");
      const promise2 = setTimeout(100, "second");
      const promise3 = setTimeout(150, "third");

      const result1 = await promise1;
      const result2 = await promise2;
      const result3 = await promise3;

      expect(result1).toBe("first");
      expect(result2).toBe("second");
      expect(result3).toBe("third");
    });

    test("should resolve in correct order", async ({ setTimeout }) => {
      const results: string[] = [];

      const p1 = setTimeout(100).then(() => results.push("100ms"));
      const p2 = setTimeout(50).then(() => results.push("50ms"));
      const p3 = setTimeout(150).then(() => results.push("150ms"));

      await Promise.all([p1, p2, p3]);

      expect(results).toEqual(["50ms", "100ms", "150ms"]);
    });
  });
});

test.describe("setImmediate fixture", () => {
  test.describe("basic functionality", () => {
    test("should resolve immediately", async ({ setImmediate }) => {
      const promise = setImmediate();
      await expect(promise).toResolveWithin(50);
    });

    test("should resolve with undefined by default", async ({ setImmediate }) => {
      const result = await setImmediate();
      expect(result).toBeUndefined();
    });

    test("should resolve with specified value", async ({ setImmediate }) => {
      const promise = setImmediate("immediate-value");
      await expect(promise).toResolveWith("immediate-value");
    });

    test("should resolve with number", async ({ setImmediate }) => {
      const result = await setImmediate(123);
      expect(result).toBe(123);
    });

    test("should resolve with object", async ({ setImmediate }) => {
      const obj = { immediate: true };
      const result = await setImmediate(obj);
      expect(result).toBe(obj);
    });

    test("should resolve faster than setTimeout", async ({
      setImmediate,
      setTimeout,
    }) => {
      const results: string[] = [];

      const immediate = setImmediate().then(() => results.push("immediate"));
      const timeout = setTimeout(0).then(() => results.push("timeout"));

      await Promise.all([immediate, timeout]);

      // setImmediate should resolve before setTimeout(0)
      expect(results[0]).toBe("immediate");
    });
  });

  test.describe("AbortSignal support", () => {
    test("should support abort signal", async ({ setImmediate }) => {
      const controller = new AbortController();
      controller.abort();

      const promise = setImmediate("value", { signal: controller.signal });

      await expect(promise).rejects.toThrow();
    });

    test("should abort if signal is aborted", async ({ setImmediate }) => {
      const controller = new AbortController();
      const promise = setImmediate("value", { signal: controller.signal });

      controller.abort();

      await expect(promise).rejects.toThrow();
    });
  });

  test.describe("multiple immediates", () => {
    test("should handle multiple setImmediate calls", async ({
      setImmediate,
    }) => {
      const promise1 = setImmediate("first");
      const promise2 = setImmediate("second");
      const promise3 = setImmediate("third");

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toBe("first");
      expect(result2).toBe("second");
      expect(result3).toBe("third");
    });
  });
});

test.describe("setInterval fixture", () => {
  test.describe("basic functionality", () => {
    test("should yield values at intervals", async ({ setInterval }) => {
      const iterator = setInterval(100);

      await expect(iterator).toYieldWithin(150);
      await expect(iterator).toYieldWithin(150);

      // Clean up
      await iterator.return?.();
    });

    test("should yield undefined by default", async ({ setInterval }) => {
      const iterator = setInterval(50);

      const result1 = await iterator.next();
      expect(result1.value).toBeUndefined();

      await iterator.return?.();
    });

    test("should yield specified value", async ({ setInterval }) => {
      const iterator = setInterval(50, "tick");

      await expect(iterator).toYield("tick");
      await expect(iterator).toYield("tick");

      await iterator.return?.();
    });

    test("should yield number value", async ({ setInterval }) => {
      const iterator = setInterval(50, 42);

      const result = await iterator.next();
      expect(result.value).toBe(42);

      await iterator.return?.();
    });

    test("should yield object value", async ({ setInterval }) => {
      const obj = { count: 0 };
      const iterator = setInterval(50, obj);

      const result = await iterator.next();
      expect(result.value).toBe(obj);

      await iterator.return?.();
    });
  });

  test.describe("iteration", () => {
    test("should support for-await-of loop", async ({ setInterval }) => {
      const iterator = setInterval(50, "tick");
      const values: string[] = [];
      let count = 0;

      for await (const value of iterator) {
        values.push(value);
        count++;
        if (count >= 3) break;
      }

      expect(values).toEqual(["tick", "tick", "tick"]);
    });

    test("should yield multiple values", async ({ setInterval }) => {
      const iterator = setInterval(50);
      const values: any[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await iterator.next();
        values.push(result.value);
      }

      expect(values).toHaveLength(5);

      await iterator.return?.();
    });

    test("should handle early termination", async ({ setInterval }) => {
      const iterator = setInterval(50, "value");

      await iterator.next();
      await iterator.next();

      // Return early
      const returnResult = await iterator.return?.();
      expect(returnResult?.done).toBe(true);
    });
  });

  test.describe("AbortSignal support", () => {
    test("should stop when signal is aborted", async ({ setInterval }) => {
      const controller = new AbortController();
      const iterator = setInterval(50, "tick", { signal: controller.signal });

      await iterator.next();
      await iterator.next();

      controller.abort();

      // Next call should throw
      await expect(iterator.next()).rejects.toThrow();
    });

    test("should not yield if signal is pre-aborted", async ({
      setInterval,
    }) => {
      const controller = new AbortController();
      controller.abort();

      const iterator = setInterval(50, "tick", { signal: controller.signal });

      await expect(iterator.next()).rejects.toThrow();
    });
  });

  test.describe("timing validation", () => {
    test("should yield at approximately correct intervals", async ({
      setInterval,
    }) => {
      const iterator = setInterval(100);
      const times: number[] = [];

      times.push(Date.now());
      await iterator.next();
      times.push(Date.now());
      await iterator.next();
      times.push(Date.now());

      const interval1 = times[1] - times[0];
      const interval2 = times[2] - times[1];

      expect(interval1).toBeGreaterThanOrEqual(95);
      expect(interval1).toBeLessThanOrEqual(150);
      expect(interval2).toBeGreaterThanOrEqual(95);
      expect(interval2).toBeLessThanOrEqual(150);

      await iterator.return?.();
    });
  });
});

test.describe("scheduler fixture", () => {
  test.describe("scheduler.wait", () => {
    test("should wait for specified duration", async ({ scheduler }) => {
      const promise = scheduler.wait(100);
      await expect(promise).toResolveWithin(150);
    });

    test("should resolve with undefined", async ({ scheduler }) => {
      const result = await scheduler.wait(50);
      expect(result).toBeUndefined();
    });

    test("should take at least specified time", async ({ scheduler }) => {
      const promise = scheduler.wait(100);
      await expect(promise).toTakeAtLeast(95);
    });

    test("should support abort signal", async ({ scheduler }) => {
      const controller = new AbortController();
      const promise = scheduler.wait(1000, { signal: controller.signal });

      globalThis.setTimeout(() => controller.abort(), 50);

      await expect(promise).rejects.toThrow();
    });

    test("should handle zero delay", async ({ scheduler }) => {
      const promise = scheduler.wait(0);
      await expect(promise).toResolveWithin(50);
    });
  });

  test.describe("scheduler.yield", () => {
    test("should yield control", async ({ scheduler }) => {
      const result = await scheduler.yield();
      expect(result).toBeUndefined();
    });

    test("should resolve quickly", async ({ scheduler }) => {
      const promise = scheduler.yield();
      await expect(promise).toResolveWithin(50);
    });
  });
});

test.describe("combined timer scenarios", () => {
  test("should handle mixed timer types", async ({
    setTimeout,
    setImmediate,
    setInterval,
  }) => {
    const results: string[] = [];

    const immediate = setImmediate().then(() => results.push("immediate"));
    const timeout = setTimeout(50).then(() => results.push("timeout"));
    const interval = setInterval(100);

    await immediate;
    await timeout;
    await interval.next();
    results.push("interval");

    expect(results).toEqual(["immediate", "timeout", "interval"]);

    await interval.return?.();
  });

  test("should coordinate multiple timers", async ({
    setTimeout,
    scheduler,
  }) => {
    const startTime = Date.now();

    await Promise.all([setTimeout(100), scheduler.wait(100)]);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(95);
    expect(elapsed).toBeLessThanOrEqual(200);
  });

  test("should handle complex timing scenarios", async ({
    setTimeout,
    setImmediate,
  }) => {
    const order: number[] = [];

    const p1 = setTimeout(100).then(() => order.push(3));
    const p2 = setTimeout(50).then(() => order.push(2));
    const p3 = setImmediate().then(() => order.push(1));
    const p4 = setTimeout(150).then(() => order.push(4));

    await Promise.all([p1, p2, p3, p4]);

    expect(order).toEqual([1, 2, 3, 4]);
  });
});

test.describe("real-world scenarios", () => {
  test("should implement retry logic with setTimeout", async ({
    setTimeout,
  }) => {
    let attempts = 0;
    const maxAttempts = 3;

    const tryOperation = async (): Promise<string> => {
      attempts++;
      if (attempts < maxAttempts) {
        await setTimeout(50);
        return tryOperation();
      }
      return "success";
    };

    const result = await tryOperation();
    expect(result).toBe("success");
    expect(attempts).toBe(3);
  });

  test("should implement polling with setInterval", async ({
    setInterval,
  }) => {
    const iterator = setInterval(50);
    let checks = 0;
    let found = false;

    for await (const _ of iterator) {
      checks++;
      if (checks === 3) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
    expect(checks).toBe(3);
  });

  test("should implement timeout with race", async ({ setTimeout }) => {
    const operation = new Promise((resolve) =>
      globalThis.setTimeout(() => resolve("done"), 200)
    );
    const timeout = setTimeout(100).then(() => {
      throw new Error("Timeout");
    });

    await expect(Promise.race([operation, timeout])).rejects.toThrow(
      "Timeout"
    );
  });

  test("should implement debounce pattern", async ({
    setTimeout,
    setImmediate,
  }) => {
    let callCount = 0;
    const debounceDelay = 100;

    const debouncedFn = async () => {
      await setTimeout(debounceDelay);
      callCount++;
    };

    // Multiple rapid calls
    const p1 = setImmediate().then(() => debouncedFn());
    const p2 = setImmediate().then(() => debouncedFn());
    const p3 = setImmediate().then(() => debouncedFn());

    await Promise.all([p1, p2, p3]);

    // All three calls complete
    expect(callCount).toBe(3);
  });

  test("should implement delay utility", async ({ setTimeout }) => {
    const delay = (ms: number) => setTimeout(ms);

    const startTime = Date.now();
    await delay(100);
    await delay(100);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeGreaterThanOrEqual(190);
  });
});
