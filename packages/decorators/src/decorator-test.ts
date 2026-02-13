import { TestAnnotation, TestDetailsAnnotation } from "@playwright/test";
import { Annotation } from "./decorator-step";

type Tag = `@${string}`;
type TestOptions<Cls> = {
  tag?: Tag | Tag[];
  skip?: boolean;
  annotation?:
    | string
    | TestAnnotation
    | TestDetailsAnnotation
    | ((self: Cls) => TestAnnotation | TestDetailsAnnotation | Annotation<any>);
};

/**
 * Decorator for marking class methods as test cases.
 *
 * When used with the `@describe` decorator, methods decorated with `@test` will be
 * automatically discovered and registered as test cases, regardless of their method name.
 * This allows you to use descriptive method names without the "test" prefix requirement.
 *
 * **Key Features:**
 * - Works with `@describe` to automatically discover tests
 * - Supports custom test names with parameter placeholders ($name. Placeholder described via `@param` decorator)
 * - Integrates with `@param` decorator for named parameters
 * - Can be used standalone or within `@describe` classes
 * - Type-safe test definitions
 *
 * **Usage:**
 * - Use with `@describe`: Method name can be anything, `@test` marks it as a test
 * - Standalone: Registers the test immediately (without `@describe`)
 * - With custom name: Provide a template string with placeholders
 *
 * @template Name - The custom name template for the test
 *
 * @param name - Optional custom name for the test. Supports parameter placeholders.
 * @param tag - Optional custom tag for the test. Supports parameter placeholders.
 *
 * @returns A decorator function that marks the method as a test case
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Basic usage with `@describe` (no "test" prefix required)
 * *\@describe("User Tests")
 * class UserTests {
 *   *\@test()
 *   shouldLoginSuccessfully() {
 *     // Test implementation
 *   }
 *
 *   *\@test()
 *   shouldHandleInvalidCredentials() {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Custom test name
 * *\@describe("API Tests")
 * class ApiTests {
 *   *\@test("should return 200 status code")
 *   checkStatusCode() {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Using with `@param` decorator
 * *\@describe("Shopping Cart")
 * class ShoppingCartTests {
 *   *\@param("product")
 *   productName: string = "Laptop";
 *
 *   *\@test("Add $product to cart")
 *   addToCart() {
 *     // Test implementation - name will be "Add Laptop to cart"
 *   }
 * }
 *
 * @example
 * // Using with indexed placeholders
 * *\@describe("Calculator")
 * class CalculatorTests {
 *   *\@test("should add $0 and $1")
 *   testAddition(a: number, b: number) {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Mixing `@test` decorated and test-prefixed methods
 * *\@describe("Mixed Tests")
 * class MixedTests {
 *   *\@test()
 *   shouldWorkWithDecorator() {
 *     // Discovered by `@test` decorator
 *   }
 *
 *   testWorkWithoutDecorator() {
 *     // Discovered by "test" prefix
 *   }
 * }
 *
 * @example
 * // Standalone usage (without `@describe`)
 * class StandaloneTests {
 *   *\@test("standalone test")
 *   myTest() {
 *     // This will be registered immediately as a test
 *   }
 * }
 *
 * @see {@link describe} - Decorator for creating test suites from classes
 * @see {@link param} - Decorator for named parameters in test names
 * @see {@link step} - Decorator for creating test steps
 */
export function test<
  const Name extends string,
  const TT,
  const T extends () => Promise<void> | void,
>(
  name?: Name extends `${string}$${infer Val extends number}`
    ? [
        "@test decorator does not support index based variables, any named",
        never,
      ]
    : Name,
  options?: TestOptions<TT>,
) {
  return function (target: T, context: ClassMethodDecoratorContext<TT, T>) {
    const testName =
      name?.toString() ?? context.name?.toString() ?? "<anonymous>";

    if (context.kind !== "method") {
      throw new Error("@test decorator can only be used on methods");
    }

    if (!context.metadata!.tests) {
      context.metadata!.tests = [];
    }

    (context.metadata!.tests as any[]).push({
      methodName: context.name as string,
      testName: testName,
    });

    // Return the original method unchanged
    // The @describe decorator will handle registration
    return target;
  };
}

type Serializable = {
  toString: () => string;
};

export function formatter<T>(value: T, toString: (value: T) => string) {
  return {
    __value: value, // Store the actual value
    toString: () => toString(value),
  };
}

export function serializable<T>(toString: (value: T) => string) {
  return (value: T) => formatter(value, toString);
}

type MaybePromise<T> = T | Promise<T>;

/**
 * `@test.each` decorator for parameterized tests with table-driven approach.
 *
 * Creates multiple test cases from a single test method by iterating over an array of parameter sets.
 * Each parameter set generates a separate test case with the parameters interpolated into the test name.
 *
 * **Key Features:**
 * - Table-driven testing with multiple parameter sets
 * - Automatic test name generation with parameter interpolation
 * - Type-safe parameter access via method arguments
 * - Support for custom formatters via serializable()
 * - Works seamlessly with `@describe` decorator
 *
 * **Parameter Interpolation:**
 * - Use `$0`, `$1`, `$2`, etc. for positional parameters
 * - Parameters are automatically converted to strings
 * - Use `serializable()` for custom formatting
 *
 * @param template - Template string for test names with placeholders ($0, $1, etc.)
 * @param parameters - Array of parameter sets, where each set is an array of values
 *
 * @returns A decorator function that generates multiple test cases
 *
 * @throws {Error} If used on non-method targets
 * @throws {Error} If template contains placeholders beyond the number of parameters
 *
 * @example
 * // Basic usage with simple values (Vitest/Jest compatible format)
 * *\@describe("Calculator Tests")
 * class CalculatorTests {
 *   *\@test.each([
 *     [1, 2, 3],
 *     [5, 3, 8],
 *     [10, -5, 5],
 *   ])("$0 + $1 = $2")
 *   testAddition(a: number, b: number, expected: number) {
 *     expect(a + b).toBe(expected);
 *   }
 * }
 * // Generates 3 tests:
 * // - "1 + 2 = 3"
 * // - "5 + 3 = 8"
 * // - "10 + -5 = 5"
 *
 * @example
 * // Using custom formatters
 * *\@describe("User Tests")
 * class UserTests extends BaseTest {
 *   *\@test.each([
 *     [
 *       serializable((u: User) => u.email)({ email: "admin@test.com", role: "admin" }),
 *       serializable((r: string) => `"${r}" role`)("admin"),
 *     ],
 *     [
 *       serializable((u: User) => u.email)({ email: "user@test.com", role: "user" }),
 *       serializable((r: string) => `"${r}" role`)("user"),
 *     ],
 *   ])("Login with $0 should show $1")
 *   async testLoginRole(user: User, expectedRole: string) {
 *     await this.page.goto("/login");
 *     await this.page.fill("#email", user.email);
 *     await this.page.click("#login");
 *     const role = await this.page.textContent(".role");
 *     expect(role).toContain(expectedRole);
 *   }
 * }
 * // Generates:
 * // - "Login with admin@test.com should show \"admin\" role"
 * // - "Login with user@test.com should show \"user\" role"
 *
 * @example
 * // Testing multiple scenarios
 * *\@describe("Form Validation")
 * class ValidationTests {
 *   *\@test.each([
 *     ["user@example.com", "valid"],
 *     ["invalid-email", "invalid"],
 *     ["", "invalid"],
 *     ["test@", "invalid"],
 *   ])("Email $0 should be $1")
 *   testEmailValidation(email: string, expected: string) {
 *     const isValid = validateEmail(email);
 *     expect(isValid ? "valid" : "invalid").toBe(expected);
 *   }
 * }
 *
 * @example
 * // Complex objects with formatter helper
 * *\@describe("API Tests")
 * class ApiTests extends BaseTest {
 *   *\@test.each([
 *     ["GET", "/users", 200],
 *     ["POST", "/users", 201],
 *     ["DELETE", "/users/1", 204],
 *     ["GET", "/not-found", 404],
 *   ])("$0 request to $1 returns $2")
 *   async testApiEndpoint(method: string, endpoint: string, status: number) {
 *     const response = await this.request.fetch(`https://api.example.com${endpoint}`, {
 *       method,
 *     });
 *     expect(response.status()).toBe(status);
 *   }
 * }
 *
 * @see {@link test} - Decorator for single test cases
 * @see {@link describe} - Decorator for test suites
 * @see {@link serializable} - Helper for custom parameter formatting
 * @see {@link formatter} - Helper for creating formatted values
 */
test.each = function <const T, const V extends (...args: any[]) => any>(
  parametersOrTemplate:
    | readonly (readonly (Serializable | null | undefined)[])[]
    | ((
        self: T,
      ) => MaybePromise<
        readonly (readonly (Serializable | null | undefined)[])[]
      >),
  templateString: string,
) {
  // Support both formats:
  // 1. Old format: test.each(template, [data]) - template first
  // 2. New format: test.each([data], template) - data first (Vitest/Jest compatible)

  let parameters: (Serializable | null | undefined)[][] | undefined;
  let template: string;
  let dataFn:
    | ((
        self: T,
      ) => MaybePromise<
        readonly (readonly (Serializable | null | undefined)[])[]
      >)
    | undefined;

  if (Array.isArray(parametersOrTemplate)) {
    // Static format: test.each([data], template)
    parameters = parametersOrTemplate;
    if (!templateString) {
      throw new Error(
        "@test.each requires template string as second parameter when data is first",
      );
    }
    template = templateString;
  } else if (typeof parametersOrTemplate === "function") {
    // Callback format: test.each((self) => self.data, template)
    dataFn = parametersOrTemplate;
    if (!templateString) {
      throw new Error(
        "@test.each requires template string as second parameter when using callback data provider",
      );
    }
    template = templateString;
  } else {
    throw new Error(
      "@test.each requires either an array of parameters or a callback function as first parameter",
    );
  }

  return function (target: any, context: ClassMethodDecoratorContext<T, V>) {
    const methodName = context.name?.toString() ?? "<anonymous>";

    if (context.kind !== "method") {
      throw new Error("@test.each decorator can only be used on methods");
    }

    // Initialize tests array in metadata if it doesn't exist
    if (!context.metadata!.tests) {
      context.metadata!.tests = [];
    }

    // If using callback data provider, store a deferred entry
    // The @describe decorator will resolve it at runtime
    if (dataFn) {
      (context.metadata!.tests as any[]).push({
        methodName: methodName,
        testName: template,
        eachDataFn: dataFn,
        isDeferred: true,
      });
      return target;
    }

    // Generate a test entry for each parameter set (static data)
    for (let i = 0; i < parameters!.length; i++) {
      const paramSet = parameters![i];

      // Convert Serializable objects to strings for interpolation
      const args = paramSet.map((param) => {
        if (param && typeof param === "object" && "toString" in param) {
          return param.toString();
        }
        return String(param);
      });

      // Generate test name by replacing $0, $1, $2, etc. with actual values
      let testName = template;
      for (let j = 0; j < args.length; j++) {
        testName = testName.replace(new RegExp(`\\$${j}`, "g"), args[j]);
      }

      // Store test metadata with parameter information
      (context.metadata!.tests as any[]).push({
        methodName: methodName,
        testName: testName,
        eachParams: paramSet, // Store original parameters for the test method
        eachIndex: i, // Store index for uniqueness
      });
    }

    // Return the original method unchanged
    // The @describe decorator will handle registration
    return target;
  };
};

/**
 * Decorator for marking class fields or methods as test data providers.
 *
 * When used with `@test.each` in callback form, `@test.data` marks a field or method
 * as a source of parameterized test data. The `@test.each` callback can then reference
 * the decorated member to dynamically provide test parameters at describe-time.
 *
 * **Key Features:**
 * - Works on class fields (static arrays) and sync methods (computed data)
 * - Integrates with `@test.each` callback form: `@test.each((self) => self.field, "template")`
 * - Validates data provider membership in metadata for future tooling
 * - Type-safe data provider definitions
 *
 * **Important:** Playwright requires synchronous test registration inside `describe()` blocks.
 * Async data provider methods (returning Promises) are **not supported** with the `@test.each`
 * callback form. Use static field data or synchronous methods instead.
 *
 * @returns A decorator function that marks the field or method as a data provider
 *
 * @throws {Error} If used on targets other than fields or methods
 *
 * @example
 * // Field data provider
 * *\@describe("Calculator Tests")
 * class CalculatorTests {
 *   *\@test.data()
 *   additionData = [
 *     [1, 2, 3],
 *     [5, 3, 8],
 *     [10, -5, 5],
 *   ];
 *
 *   *\@test.each((self) => self.additionData, "$0 + $1 = $2")
 *   testAddition(a: number, b: number, expected: number) {
 *     expect(a + b).toBe(expected);
 *   }
 * }
 *
 * @example
 * // Sync method data provider
 * *\@describe("Dynamic Data Tests")
 * class DynamicTests {
 *   *\@test.data()
 *   generateData() {
 *     return [
 *       [1, 1, 2],
 *       [2, 2, 4],
 *     ];
 *   }
 *
 *   *\@test.each((self) => self.generateData(), "$0 + $1 = $2")
 *   testDynamic(a: number, b: number, expected: number) {
 *     expect(a + b).toBe(expected);
 *   }
 * }
 *
 * @example
 * // Multiple data providers in one class
 * *\@describe("Multi-Data Tests")
 * class MultiDataTests {
 *   *\@test.data()
 *   addData = [[1, 2, 3], [4, 5, 9]];
 *
 *   *\@test.data()
 *   mulData = [[2, 3, 6], [4, 5, 20]];
 *
 *   *\@test.each((self) => self.addData, "$0 + $1 = $2")
 *   testAdd(a: number, b: number, expected: number) {
 *     expect(a + b).toBe(expected);
 *   }
 *
 *   *\@test.each((self) => self.mulData, "$0 * $1 = $2")
 *   testMul(a: number, b: number, expected: number) {
 *     expect(a * b).toBe(expected);
 *   }
 * }
 *
 * @see {@link test.each} - Decorator for parameterized tests
 * @see {@link describe} - Decorator for creating test suites from classes
 * @see {@link serializable} - Helper for custom parameter formatting
 */
function testData<
  const T,
  const V extends readonly (readonly (Serializable | null | undefined)[])[],
>(): any;
function testData<const T, const V extends (...args: any[]) => any>(): any;
function testData<
  const T,
  const V extends
    | ((...args: any[]) => any)
    | readonly (readonly (Serializable | null | undefined)[])[],
>() {
  return function (
    target: any,
    context: V extends (...args: any[]) => any
      ? ClassMethodDecoratorContext<T, V>
      : ClassFieldDecoratorContext<T, V>,
  ) {
    if (context.kind === "field") {
      if (!context.metadata!.testDataFields) {
        context.metadata!.testDataFields = [];
      }
      (context.metadata!.testDataFields as string[]).push(
        context.name as string,
      );
      return target;
    }
    if (context.kind === "method") {
      if (!context.metadata!.testDataMethods) {
        context.metadata!.testDataMethods = [];
      }
      (context.metadata!.testDataMethods as string[]).push(
        context.name as string,
      );
      return target;
    }
    throw new Error(
      `Unsupported decorator type. Expected a method or field decorator. Got ${(context as any).kind}`,
    );
  };
}

test.data = testData;
