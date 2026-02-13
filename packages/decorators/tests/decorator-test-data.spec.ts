import { describe } from "../src/decorator-describe";
import { test, serializable } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { expect } from "@playwright/test";

// Test @test.data on field with @test.each callback
@describe("@test.data field data provider")
class FieldDataProviderTests {
  @test.data()
  additionData = [
    [1, 2, 3],
    [5, 3, 8],
    [10, -5, 5],
  ];

  @test.each((self) => self.additionData, "$0 + $1 = $2")
  testAddition(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }
}

// Test @test.data on sync method with @test.each callback
@describe("@test.data sync method data provider")
class MethodDataProviderTests {
  @test.data()
  generateData() {
    return [
      [2, 3, 6],
      [4, 5, 20],
      [0, 100, 0],
    ];
  }

  @test.each((self) => self.generateData(), "$0 * $1 = $2")
  testMultiplication(a: number, b: number, expected: number) {
    expect(a * b).toBe(expected);
  }
}

// Test multiple data providers in one class
@describe("@test.data multiple data providers")
class MultipleDataProviderTests {
  @test.data()
  addData = [
    [1, 2, 3],
    [4, 5, 9],
  ];

  @test.data()
  mulData = [
    [2, 3, 6],
    [4, 5, 20],
  ];

  @test.each((self) => self.addData, "$0 + $1 = $2")
  testAdd(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }

  @test.each((self) => self.mulData, "$0 * $1 = $2")
  testMul(a: number, b: number, expected: number) {
    expect(a * b).toBe(expected);
  }
}

// Test @test.each callback without @test.data (plain field)
@describe("@test.each callback without @test.data")
class CallbackWithoutDataDecoratorTests {
  plainData = [
    [10, 20, 30],
    [1, 1, 2],
  ];

  @test.each((self) => self.plainData, "$0 + $1 = $2")
  testPlainField(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }
}

// Test mixing static @test.each and deferred @test.each callback
@describe("Mixed static and deferred @test.each")
class MixedStaticDeferredTests {
  @test.data()
  dynamicData = [
    [100, 200, 300],
    [50, 50, 100],
  ];

  @test.each(
    [
      [1, 2, 3],
      [5, 3, 8],
    ],
    "Static: $0 + $1 = $2",
  )
  testStaticData(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }

  @test.each((self) => self.dynamicData, "Dynamic: $0 + $1 = $2")
  testDynamicData(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }
}

// Test data provider with serializable values
@describe("@test.data with serializable values")
class SerializableDataProviderTests {
  @test.data()
  userData = [
    [
      serializable((u: { name: string }) => u.name)({
        name: "Alice",
        role: "admin",
      } as any),
      serializable((r: string) => `"${r}"`)("admin"),
    ],
    [
      serializable((u: { name: string }) => u.name)({
        name: "Bob",
        role: "user",
      } as any),
      serializable((r: string) => `"${r}"`)("user"),
    ],
  ];

  @test.each((self) => self.userData, "User $0 has role $1")
  testUserRole(user: { name: string; role: string }, expectedRole: string) {
    expect(user.role).toBe(expectedRole);
  }
}

// Test empty data array from callback (should create no tests)
@describe("@test.data with empty data")
class EmptyDataProviderTests {
  @test.data()
  emptyData: number[][] = [];

  @test.each((self) => self.emptyData, "Should not run: $0")
  testEmpty() {
    throw new Error("This test should not have been created");
  }

  // Regular test to ensure the describe block has at least one test
  @test("regular test in empty data class")
  testRegular() {
    expect(true).toBe(true);
  }
}

// Test data provider with lifecycle hooks
@describe("@test.data with lifecycle hooks")
class DataProviderWithLifecycleTests {
  counter: number = 0;

  @test.data()
  counterData = [
    [10, 20],
    [30, 40],
  ];

  @beforeEach()
  setupCounter() {
    this.counter = 100;
  }

  @test.each((self) => self.counterData, "Counter starts at 100, add $0 and $1")
  testWithLifecycle(a: number, b: number) {
    expect(this.counter).toBe(100);
    this.counter += a + b;
    expect(this.counter).toBe(100 + a + b);
  }
}

// Test data provider with strings
@describe("@test.data with string data")
class StringDataProviderTests {
  @test.data()
  stringData = [
    ["hello", 5],
    ["world", 5],
    ["", 0],
    ["test", 4],
  ];

  @test.each((self) => self.stringData, "String '$0' has length $1")
  testStringLength(str: string, expectedLength: number) {
    expect(str.length).toBe(expectedLength);
  }
}

// Test sync method data provider that computes data
@describe("@test.data computed method data")
class ComputedMethodDataTests {
  @test.data()
  computeSquares() {
    const data: number[][] = [];
    for (let i = 1; i <= 4; i++) {
      data.push([i, i * i]);
    }
    return data;
  }

  @test.each((self) => self.computeSquares(), "Square of $0 is $1")
  testSquares(n: number, expected: number) {
    expect(n * n).toBe(expected);
  }
}

// Test data provider with single parameter
@describe("@test.data with single parameter sets")
class SingleParamDataTests {
  @test.data()
  primes = [[2], [3], [5], [7], [11]];

  @test.each((self) => self.primes, "$0 is prime")
  testPrime(n: number) {
    // Simple primality check for small numbers
    for (let i = 2; i <= Math.sqrt(n); i++) {
      expect(n % i).not.toBe(0);
    }
  }
}

// Test mixed @test, @test.each static, and @test.each callback in one class
@describe("All test types combined")
class AllTestTypesCombinedTests {
  @test.data()
  dynamicValues = [
    [7, 8, 15],
    [9, 1, 10],
  ];

  @test("plain test")
  testPlain() {
    expect(1 + 1).toBe(2);
  }

  @test.each([[3, 4, 7]], "Static: $0 + $1 = $2")
  testStatic(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }

  @test.each((self) => self.dynamicValues, "Dynamic: $0 + $1 = $2")
  testDynamic(a: number, b: number, expected: number) {
    expect(a + b).toBe(expected);
  }
}

// Test with repeated placeholders in template
@describe("@test.data with repeated placeholders")
class RepeatedPlaceholderDataTests {
  @test.data()
  doubleData = [
    [2, 4],
    [5, 10],
    [10, 20],
  ];

  @test.each((self) => self.doubleData, "$0 + $0 = $1")
  testDouble(n: number, expected: number) {
    expect(n + n).toBe(expected);
  }
}
