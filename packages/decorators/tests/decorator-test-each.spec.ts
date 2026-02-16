import { describe } from "../src/decorator-describe";
import { test, serializable, formatter } from "../src/decorator-test";
import { expect } from "@playwright/test";

// Test @test.each with simple values
@describe("@test.each with simple values")
class SimpleValuesTests {
  @test.each([
    [1, 2, 3],
    [5, 3, 8],
    [10, -5, 5],
    [0, 0, 0],
  ], "$0 + $1 = $2")
  testAddition(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }

  @test.each([
    [2, 3, 6],
    [5, 4, 20],
    [0, 100, 0],
  ], "$0 * $1 = $2")
  testMultiplication(a: number, b: number, expected: number) {
    expect(a * b).toBe(expected);
  }
}

// Test @test.each with strings
@describe("@test.each with strings")
class StringTests {
  @test.each([
    ["hello", 5],
    ["world", 5],
    ["", 0],
    ["test123", 7],
  ], "String '$0' has length $1")
  testStringLength(str: string, expectedLength: number) {
    expect(str.length).toBe(expectedLength);
  }

  @test.each([
    ["hello", "HELLO"],
    ["World", "WORLD"],
    ["TEST", "TEST"],
  ], "String '$0' uppercase is '$1'")
  testStringUppercase(str: string, expected: string) {
    expect(str.toUpperCase()).toBe(expected);
  }
}

// Test @test.each with booleans
@describe("@test.each with booleans")
class BooleanTests {
  @test.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ], "$0 && $1 = $2")
  testLogicalAnd(a: boolean, b: boolean, expected: boolean) {
    expect(a && b).toBe(expected);
  }

  @test.each([
    [true, false],
    [false, true],
  ], "!$0 = $1")
  testLogicalNot(a: boolean, expected: boolean) {
    expect(!a).toBe(expected);
  }
}

// Test @test.each with arrays
@describe("@test.each with arrays")
class ArrayTests {
  @test.each([
    [[1, 2, 3], 3],
    [[], 0],
    [[1], 1],
    [[1, 2, 3, 4, 5], 5],
  ], "Array $0 has length $1")
  testArrayLength(arr: number[], expectedLength: number) {
    expect(arr.length).toBe(expectedLength);
  }

  @test.each([
    [[1, 2, 3], 2, true],
    [[1, 2, 3], 5, false],
    [[], 1, false],
  ], "Array $0 includes $1: $2")
  testArrayIncludes(arr: number[], value: number, expected: boolean) {
    expect(arr.includes(value)).toBe(expected);
  }
}

// Test @test.each with objects (using serializable)
@describe("@test.each with objects and serializable")
class ObjectTests {
  @test.each([
    [
      serializable((u: any) => u.name)({ name: "Alice", role: "admin" }),
      serializable((r: string) => `"${r}"`)("admin"),
    ],
    [
      serializable((u: any) => u.name)({ name: "Bob", role: "user" }),
      serializable((r: string) => `"${r}"`)("user"),
    ],
    [
      serializable((u: any) => u.name)({ name: "Charlie", role: "guest" }),
      serializable((r: string) => `"${r}"`)("guest"),
    ],
  ], "User $0 has role $1")
  testUserRole(user: { name: string; role: string }, expectedRole: string) {
    expect(user.role).toBe(expectedRole);
  }

  @test.each([
    [
      serializable((p: any) => p.name)({ name: "Laptop", price: 1000 }),
      serializable((p: number) => `$${p}`)(1000),
    ],
    [
      serializable((p: any) => p.name)({ name: "Mouse", price: 25 }),
      serializable((p: number) => `$${p}`)(25),
    ],
  ], "Product $0 costs $1")
  testProductPrice(
    product: { name: string; price: number },
    expectedPrice: number,
  ) {
    expect(`$${product.price}`).toBe(`$${expectedPrice}`);
  }
}

// Test @test.each with mixed types
@describe("@test.each with mixed types")
class MixedTypeTests {
  @test.each([
    [42, "number", "truthy"],
    [0, "number", "falsy"],
    ["hello", "string", "truthy"],
    ["", "string", "falsy"],
    [true, "boolean", "truthy"],
    [false, "boolean", "falsy"],
    [null, "object", "falsy"],
    [undefined, "undefined", "falsy"],
  ], "Value $0 (type: $1) is $2")
  testValueTruthiness(
    value: any,
    typeName: string,
    expectedTruthiness: string,
  ) {
    expect(typeof value).toBe(typeName);
    expect(value ? "truthy" : "falsy").toBe(expectedTruthiness);
  }
}

// Test @test.each with single parameter
@describe("@test.each with single parameter")
class SingleParameterTests {
  @test.each([[2], [3], [4], [5]], "Square of $0")
  testSquare(n: number) {
    expect(n * n).toBeGreaterThan(0);
  }

  @test.each([[1], [10], [100]], "Number $0 is positive")
  testPositive(n: number) {
    expect(n).toBeGreaterThan(0);
  }
}

// Test @test.each with many parameters
@describe("@test.each with many parameters")
class ManyParametersTests {
  @test.each([
      [1, 2, 3, 4, 5],
      [10, 20, 30, 40, 50],
    ], "$0, $1, $2, $3, $4")
  testManyParams(a: number, b: number, c: number, d: number, e: number) {
    expect(a + b + c + d + e).toBeGreaterThan(0);
  }
}

// Test @test.each with special characters in template
@describe("@test.each with special characters")
class SpecialCharactersTests {
  @test.each([
    ["input", "output"],
    ["data", "result"],
  ], "Test: $0 -> $1!")
  testSpecialChars(input: string, output: string) {
    expect(input).toBeTruthy();
    expect(output).toBeTruthy();
  }

  @test.each([
    [5, 5],
    [10, 10],
  ], "Value ($0) equals $1?")
  testParentheses(a: number, b: number) {
    expect(a).toBe(b);
  }
}

// Test @test.each with repeated placeholders
@describe("@test.each with repeated placeholders")
class RepeatedPlaceholdersTests {
  @test.each([
    [2, 4],
    [5, 10],
    [10, 20],
  ], "$0 + $0 = $1")
  testRepeatedPlaceholder(n: number, expected: number) {
    expect(n + n).toBe(expected);
  }

  @test.each([
    [5, 10],
    [3, 6],
  ], "Compare $0 with $0 and $1")
  testMultipleRepeated(a: number, b: number) {
    expect(a).toBeLessThan(b);
  }
}

// Test @test.each with empty array (should create no tests)
@describe("@test.each with empty parameters")
class EmptyParametersTests {
  @test.each([], "Should not run")
  testEmpty() {
    // This test should never run
    throw new Error("This test should not have been created");
  }

  // Regular test to ensure the describe block has at least one test
  @test("regular test")
  testRegular() {
    expect(true).toBe(true);
  }
}

// Test multiple @test.each in same class
@describe("Multiple @test.each in same class")
class MultipleTestEachTests {
  @test.each([
    [1, 2, 3],
    [5, 5, 10],
  ], "Add: $0 + $1 = $2")
  testAdd(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }

  @test.each([
    [5, 3, 2],
    [10, 5, 5],
  ], "Subtract: $0 - $1 = $2")
  testSubtract(a: number, b: number, expected: number) {
    expect(a - b).toBe(expected);
  }

  @test.each([
    [2, 3, 6],
    [4, 5, 20],
  ], "Multiply: $0 * $1 = $2")
  testMultiply(a: number, b: number, expected: number) {
    expect(a * b).toBe(expected);
  }
}

// Test @test.each with negative numbers
@describe("@test.each with negative numbers")
class NegativeNumbersTests {
  @test.each([
    [-1, -2, -3],
    [-5, 5, 0],
    [10, -10, 0],
  ], "$0 + $1 = $2")
  testNegativeAddition(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }
}

// Test @test.each with floating point numbers
@describe("@test.each with floating point")
class FloatingPointTests {
  @test.each([
    [0.1, 0.2, 0.02],
    [1.5, 2.0, 3.0],
    [0.5, 0.5, 0.25],
  ], "$0 * $1 ≈ $2")
  testFloatingPoint(a: number, b: number, expected: number) {
    expect(a * b).toBeCloseTo(expected, 5);
  }
}

// Test @test.each with null and undefined
@describe("@test.each with null and undefined")
class NullUndefinedTests {
  @test.each([
    [null, "null"],
    [undefined, "undefined"],
    [0, "zero"],
  ], "Value $0 is $1")
  testNullUndefined(value: any, description: string) {
    if (description === "null") {
      expect(value).toBeNull();
    } else if (description === "undefined") {
      expect(value).toBeUndefined();
    } else if (description === "zero") {
      expect(value).toBe(0);
    }
  }
}

// Test @test.each with custom formatter
@describe("@test.each with custom formatter")
class CustomFormatterTests {
  @test.each([
    [
      serializable((d: Date) => d.toISOString().split("T")[0])(
        new Date("2024-01-01"),
      ),
      "2024",
    ],
    [
      serializable((d: Date) => d.toISOString().split("T")[0])(
        new Date("2023-12-25"),
      ),
      "2023",
    ],
  ], "Date $0 is $1")
  testDateYear(date: Date, expectedYear: string) {
    expect(date.getFullYear().toString()).toBe(expectedYear);
  }

  @test.each([
    [serializable((n: number) => `#${n}`)(42), "#42"],
    [serializable((n: number) => `#${n}`)(100), "#100"],
  ], "Format $0 as $1")
  testCustomFormat(num: number, formatted: string) {
    expect(`#${num}`).toBe(formatted);
  }
}

// Test @test.each with regex testing
@describe("@test.each with regex patterns")
class RegexTests {
  @test.each([
    ["hello@example.com", "email"],
    ["not-an-email", "not-email"],
    ["test@test.org", "email"],
  ], "String '$0' matches pattern: $1")
  testEmailPattern(str: string, expected: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const matches = emailRegex.test(str);
    expect(matches ? "email" : "not-email").toBe(expected);
  }
}

// Test mixing @test and @test.each
@describe("Mixing @test and @test.each")
class MixedTestTypes {
  @test("regular test before")
  testBefore() {
    expect(1 + 1).toBe(2);
  }

  @test.each([[1], [2], [3]], "Each test: $0")
  testEach(n: number) {
    expect(n).toBeGreaterThan(0);
  }

  @test("regular test after")
  testAfter() {
    expect(2 + 2).toBe(4);
  }
}
