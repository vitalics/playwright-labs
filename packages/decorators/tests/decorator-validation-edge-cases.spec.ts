import { test, expect } from "@playwright/test";
import { timeout } from "../src/decorator-timeout";
import { before, after } from "../src/decorator-before-after";

/**
 * Edge case and validation tests for decorators
 * These tests ensure that decorators handle invalid inputs gracefully
 * and provide clear error messages for CI/CD environments
 */

test.describe("@timeout decorator validation", () => {
  test("should throw error for undefined timeout", () => {
    expect(() => {
      timeout(undefined as any);
    }).toThrow(/timeout value in milliseconds/);
  });

  test("should throw error for null timeout", () => {
    expect(() => {

      timeout(null as any);
    }).toThrow(/timeout value in milliseconds/);
  });

  test("should throw error for non-number timeout", () => {
    expect(() => {

      timeout("5000" as any);
    }).toThrow(/requires a number/);
  });

  test("should throw error for NaN timeout", () => {
    expect(() => {

      timeout(NaN);
    }).toThrow(/received NaN/);
  });

  test("should throw error for Infinity timeout", () => {
    expect(() => {

      timeout(Infinity);
    }).toThrow(/received Infinity/);
  });

  test("should throw error for negative timeout", () => {
    expect(() => {

      timeout(-1000);
    }).toThrow(/positive number/);
  });

  test("should throw error for zero timeout", () => {
    expect(() => {

      timeout(0);
    }).toThrow(/positive number/);
  });

  test("should accept positive timeout", () => {
    expect(() => {

      timeout(5000);
    }).not.toThrow();
  });

  test("should accept minimum timeout (1ms)", () => {
    expect(() => {

      timeout(1);
    }).not.toThrow();
  });

  test("should accept maximum safe integer timeout", () => {
    expect(() => {

      timeout(Number.MAX_SAFE_INTEGER);
    }).not.toThrow();
  });
});

test.describe("@before decorator validation", () => {
  test("should throw error for undefined function", () => {
    expect(() => {

      before(undefined as any);
    }).toThrow(/requires a hook function/);
  });

  test("should throw error for null function", () => {
    expect(() => {

      before(null as any);
    }).toThrow(/requires a hook function/);
  });

  test("should throw error for non-function", () => {
    expect(() => {

      before("not a function" as any);
    }).toThrow(/requires a function/);
  });

  test("should throw error for number", () => {
    expect(() => {

      before(123 as any);
    }).toThrow(/requires a function/);
  });

  test("should throw error for object", () => {
    expect(() => {

      before({} as any);
    }).toThrow(/requires a function/);
  });

  test("should accept valid async function", () => {
    expect(() => {

      before(async (self) => {});
    }).not.toThrow();
  });

  test("should accept valid sync function", () => {
    expect(() => {

      before((self) => {});
    }).not.toThrow();
  });

  test("should accept arrow function", () => {
    expect(() => {

      before((self) => {});
    }).not.toThrow();
  });

  test("should accept function expression", () => {
    expect(() => {

      before(function (self) {});
    }).not.toThrow();
  });
});

test.describe("@after decorator validation", () => {
  test("should throw error for undefined function", () => {
    expect(() => {

      after(undefined as any);
    }).toThrow(/requires a hook function/);
  });

  test("should throw error for null function", () => {
    expect(() => {

      after(null as any);
    }).toThrow(/requires a hook function/);
  });

  test("should throw error for non-function", () => {
    expect(() => {

      after("not a function" as any);
    }).toThrow(/requires a function/);
  });

  test("should throw error for boolean", () => {
    expect(() => {

      after(true as any);
    }).toThrow(/requires a function/);
  });

  test("should throw error for array", () => {
    expect(() => {

      after([] as any);
    }).toThrow(/requires a function/);
  });

  test("should accept valid async function", () => {
    expect(() => {

      after(async (self) => {});
    }).not.toThrow();
  });

  test("should accept valid sync function", () => {
    expect(() => {

      after((self) => {});
    }).not.toThrow();
  });

  test("should accept arrow function", () => {
    expect(() => {

      after((self) => {});
    }).not.toThrow();
  });

  test("should accept named function", () => {
    expect(() => {

      function cleanup(self: any) {}
      after(cleanup);
    }).not.toThrow();
  });
});

test.describe("Decorator edge cases", () => {
  test("@timeout should handle decimal numbers", () => {
    expect(() => {

      timeout(1000.5);
    }).not.toThrow();
  });

  test("@timeout should handle very large numbers", () => {
    expect(() => {

      timeout(999999999);
    }).not.toThrow();
  });

  test("@timeout should handle scientific notation", () => {
    expect(() => {

      timeout(5e3); // 5000
    }).not.toThrow();
  });

  test("@before should handle function with no parameters", () => {
    expect(() => {

      before(() => {}); // No self parameter
    }).not.toThrow();
  });

  test("@after should handle function with multiple parameters", () => {
    expect(() => {

      // @ts-expect-error test
      after((self, extra) => {}); // Extra parameter
    }).not.toThrow();
  });

  test("@before should handle function with default parameters", () => {
    expect(() => {

      before((self, option = true) => {});
    }).not.toThrow();
  });

  test("@after should handle function with rest parameters", () => {
    expect(() => {

      after((self, ...args) => {});
    }).not.toThrow();
  });
});

test.describe("Type coercion edge cases", () => {
  test("@timeout should not accept string numbers", () => {
    expect(() => {

      timeout("1000" as any);
    }).toThrow();
  });

  test("@timeout should not accept boolean", () => {
    expect(() => {

      timeout(true as any);
    }).toThrow();
  });

  test("@timeout should not accept object with valueOf", () => {
    expect(() => {

      const obj = { valueOf: () => 1000 };
      timeout(obj as any);
    }).toThrow(/requires a number/);
  });

  test("@timeout should not accept array", () => {
    expect(() => {

      timeout([1000] as any);
    }).toThrow();
  });
});

test.describe("Boundary value tests", () => {
  test("@timeout should handle 1ms (minimum)", () => {
    expect(() => {

      timeout(1);
    }).not.toThrow();
  });

  test("@timeout should handle 0.1ms (rounds to 0.1)", () => {
    expect(() => {

      timeout(0.1);
    }).not.toThrow();
  });

  test("@timeout should reject -0.1ms", () => {
    expect(() => {

      timeout(-0.1);
    }).toThrow(/positive number/);
  });

  test("@timeout should handle Number.EPSILON", () => {
    expect(() => {

      timeout(Number.EPSILON);
    }).not.toThrow();
  });

  test("@timeout should reject -Number.EPSILON", () => {
    expect(() => {

      timeout(-Number.EPSILON);
    }).toThrow(/positive number/);
  });
});

test.describe("Function reference edge cases", () => {
  test("@before should accept same function multiple times", () => {

    const hookFn = (self: any) => {};

    expect(() => {
      before(hookFn);
      before(hookFn); // Same reference
    }).not.toThrow();
  });

  test("@after should accept bound function", () => {

    const obj = { cleanup: (self: any) => {} };

    expect(() => {
      after(obj.cleanup.bind(obj));
    }).not.toThrow();
  });

  test("@before should accept class method reference", () => {


    class Helper {
      static setup(self: any) {}
    }

    expect(() => {
      before(Helper.setup);
    }).not.toThrow();
  });
});
