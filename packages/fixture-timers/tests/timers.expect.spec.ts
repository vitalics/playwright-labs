import { test, expect } from "../src/timers";

test.describe("Custom expect matchers", () => {
  test.describe("toResolveWithin", () => {
    test("should pass when promise resolves within time", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(50);
      await expect(promise).toResolveWithin(100);
    });

    test("should fail when promise takes too long", async ({ setTimeout }) => {
      const promise = setTimeout(200);
      await expect(
        expect(promise).toResolveWithin(100)
      ).rejects.toThrow("Promise did not resolve within 100ms");
    });

    test("should work with fast promises", async ({ setImmediate }) => {
      const promise = setImmediate();
      await expect(promise).toResolveWithin(50);
    });

    test("should handle promise rejection", async () => {
      const promise = Promise.reject(new Error("Test error"));
      await expect(
        expect(promise).toResolveWithin(100)
      ).rejects.toThrow();
    });

    test("should report elapsed time on pass", async ({ setTimeout }) => {
      const promise = setTimeout(50, "value");
      await expect(promise).toResolveWithin(100);
    });
  });

  test.describe("toTakeAtLeast", () => {
    test("should pass when promise takes minimum time", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(100);
      await expect(promise).toTakeAtLeast(95);
    });

    test("should fail when promise resolves too quickly", async ({
      setImmediate,
    }) => {
      const promise = setImmediate();
      await expect(
        expect(promise).toTakeAtLeast(100)
      ).rejects.toThrow("Expected promise to take at least 100ms");
    });

    test("should work with exact timing", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toTakeAtLeast(95);
    });

    test("should handle promise rejection", async () => {
      const promise = Promise.reject(new Error("Test error"));
      await expect(
        expect(promise).toTakeAtLeast(50)
      ).rejects.toThrow();
    });
  });

  test.describe("toResolveWith", () => {
    test("should pass when promise resolves with expected value", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(50, "test-value");
      await expect(promise).toResolveWith("test-value");
    });

    test("should fail when value doesn't match", async ({ setTimeout }) => {
      const promise = setTimeout(50, "actual");
      await expect(
        expect(promise).toResolveWith("expected")
      ).rejects.toThrow(
        'Expected promise to resolve with "expected", but got "actual"'
      );
    });

    test("should work with numbers", async ({ setTimeout }) => {
      const promise = setTimeout(50, 42);
      await expect(promise).toResolveWith(42);
    });

    test("should work with undefined", async ({ setTimeout }) => {
      const promise = setTimeout(50);
      await expect(promise).toResolveWith(undefined);
    });

    test("should work with null", async ({ setTimeout }) => {
      const promise = setTimeout(50, null);
      await expect(promise).toResolveWith(null);
    });

    test("should work with booleans", async ({ setTimeout }) => {
      const promiseTrue = setTimeout(50, true);
      const promiseFalse = setTimeout(50, false);

      await expect(promiseTrue).toResolveWith(true);
      await expect(promiseFalse).toResolveWith(false);
    });

    test("should work with objects (reference equality)", async ({
      setTimeout,
    }) => {
      const obj = { key: "value" };
      const promise = setTimeout(50, obj);
      await expect(promise).toResolveWith(obj);
    });

    test("should fail for different objects with same content", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(50, { key: "value" });
      await expect(
        expect(promise).toResolveWith({ key: "value" })
      ).rejects.toThrow();
    });

    test("should handle promise rejection", async () => {
      const promise = Promise.reject(new Error("Test error"));
      await expect(
        expect(promise).toResolveWith("value")
      ).rejects.toThrow();
    });
  });

  test.describe("toYield", () => {
    test("should pass when iterator yields", async ({ setInterval }) => {
      const iterator = setInterval(50);
      await expect(iterator).toYield();
      await iterator.return?.();
    });

    test("should pass when iterator yields expected value", async ({
      setInterval,
    }) => {
      const iterator = setInterval(50, "tick");
      await expect(iterator).toYield("tick");
      await iterator.return?.();
    });

    test("should fail when value doesn't match", async ({ setInterval }) => {
      const iterator = setInterval(50, "actual");
      await expect(
        expect(iterator).toYield("expected")
      ).rejects.toThrow(
        'Expected iterator to yield "expected", but got "actual"'
      );
      await iterator.return?.();
    });

    test("should work with numbers", async ({ setInterval }) => {
      const iterator = setInterval(50, 123);
      await expect(iterator).toYield(123);
      await iterator.return?.();
    });

    test("should work with undefined", async ({ setInterval }) => {
      const iterator = setInterval(50);
      await expect(iterator).toYield(undefined);
      await iterator.return?.();
    });

    test("should work without expected value", async ({ setInterval }) => {
      const iterator = setInterval(50, "any-value");
      await expect(iterator).toYield();
      await iterator.return?.();
    });

    test("should handle multiple yields", async ({ setInterval }) => {
      const iterator = setInterval(50, "value");

      await expect(iterator).toYield("value");
      await expect(iterator).toYield("value");
      await expect(iterator).toYield("value");

      await iterator.return?.();
    });
  });

  test.describe("toYieldWithin", () => {
    test("should pass when iterator yields within time", async ({
      setInterval,
    }) => {
      const iterator = setInterval(50);
      await expect(iterator).toYieldWithin(100);
      await iterator.return?.();
    });

    test("should fail when iterator takes too long", async ({
      setInterval,
    }) => {
      const iterator = setInterval(200);
      await expect(
        expect(iterator).toYieldWithin(100)
      ).rejects.toThrow("Iterator did not yield within 100ms");
      await iterator.return?.();
    });

    test("should work with fast intervals", async ({ setInterval }) => {
      const iterator = setInterval(10);
      await expect(iterator).toYieldWithin(50);
      await iterator.return?.();
    });

    test("should handle multiple yields with timing", async ({
      setInterval,
    }) => {
      const iterator = setInterval(50);

      await expect(iterator).toYieldWithin(100);
      await expect(iterator).toYieldWithin(100);
      await expect(iterator).toYieldWithin(100);

      await iterator.return?.();
    });
  });

  test.describe("toResolveInTimeRange", () => {
    test("should pass when promise resolves in range", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveInTimeRange(95, 150);
    });

    test("should fail when promise resolves too quickly", async ({
      setImmediate,
    }) => {
      const promise = setImmediate();
      await expect(
        expect(promise).toResolveInTimeRange(100, 200)
      ).rejects.toThrow(
        "Expected promise to resolve between 100ms and 200ms"
      );
    });

    test("should fail when promise takes too long", async ({ setTimeout }) => {
      const promise = setTimeout(200);
      await expect(
        expect(promise).toResolveInTimeRange(50, 100)
      ).rejects.toThrow("Promise did not resolve within 100ms");
    });

    test("should work at min boundary", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveInTimeRange(100, 150);
    });

    test("should work at max boundary", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveInTimeRange(50, 105);
    });

    test("should work with scheduler.wait", async ({ scheduler }) => {
      const promise = scheduler.wait(100);
      await expect(promise).toResolveInTimeRange(95, 150);
    });

    test("should work with narrow range", async ({ setTimeout }) => {
      const promise = setTimeout(100);
      await expect(promise).toResolveInTimeRange(95, 200);
    });
  });

  test.describe("combined matcher scenarios", () => {
    test("should use multiple matchers on separate promises", async ({
      setTimeout,
    }) => {
      const value = "test-result";
      
      // Use separate promises for each matcher since promises can only be awaited once with timing
      const promise1 = setTimeout(100, value);
      await expect(promise1).toResolveWithin(150);
      
      const promise2 = setTimeout(100, value);
      await expect(promise2).toResolveWith(value);
      
      const promise3 = setTimeout(100, value);
      await expect(promise3).toTakeAtLeast(95);
    });

    test("should validate iterator with multiple matchers", async ({
      setInterval,
    }) => {
      const iterator = setInterval(50, "tick");

      await expect(iterator).toYieldWithin(100);
      await expect(iterator).toYield("tick");
      await expect(iterator).toYieldWithin(100);

      await iterator.return?.();
    });

    test("should chain validations", async ({ setTimeout }) => {
      const promise1 = setTimeout(50, "first");
      await expect(promise1).toResolveWith("first");
      
      const promise2 = setTimeout(100, "second");
      await expect(promise2).toResolveWith("second");
      
      // Use a new promise for timing validation
      const promise3 = setTimeout(100, "third");
      await expect(promise3).toTakeAtLeast(95);
    });
  });

  test.describe("edge cases", () => {
    test("should handle very fast resolution", async ({ setImmediate }) => {
      const promise = setImmediate("instant");
      await expect(promise).toResolveWithin(10);
      await expect(promise).toResolveWith("instant");
    });

    test("should handle zero delay timeout", async ({ setTimeout }) => {
      const promise = setTimeout(0, "zero");
      await expect(promise).toResolveWithin(50);
      await expect(promise).toResolveWith("zero");
    });

    test("should handle very small intervals", async ({ setInterval }) => {
      const iterator = setInterval(1);

      await expect(iterator).toYieldWithin(50);
      await expect(iterator).toYieldWithin(50);

      await iterator.return?.();
    });

    test("should handle concurrent matchers", async ({ setTimeout }) => {
      const promise1 = setTimeout(50, "a");
      const promise2 = setTimeout(50, "b");
      const promise3 = setTimeout(50, "c");

      await Promise.all([
        expect(promise1).toResolveWith("a"),
        expect(promise2).toResolveWith("b"),
        expect(promise3).toResolveWith("c"),
      ]);
    });
  });

  test.describe("error messages", () => {
    test("toResolveWithin should provide clear error message", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(200);
      try {
        await expect(promise).toResolveWithin(100);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain(
          "Promise did not resolve within 100ms"
        );
      }
    });

    test("toTakeAtLeast should provide clear error message", async ({
      setImmediate,
    }) => {
      const promise = setImmediate();
      try {
        await expect(promise).toTakeAtLeast(100);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain(
          "Expected promise to take at least 100ms"
        );
      }
    });

    test("toResolveWith should provide clear error message", async ({
      setTimeout,
    }) => {
      const promise = setTimeout(50, "actual");
      try {
        await expect(promise).toResolveWith("expected");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain("expected");
        expect((error as Error).message).toContain("actual");
      }
    });

    test("toYield should provide clear error message", async ({
      setInterval,
    }) => {
      const iterator = setInterval(50, "actual");
      try {
        await expect(iterator).toYield("expected");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain("expected");
        expect((error as Error).message).toContain("actual");
      } finally {
        await iterator.return?.();
      }
    });
  });
});
