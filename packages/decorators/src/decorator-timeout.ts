/**
 * `@timeout` decorator for setting test timeouts at class, method, or field level.
 *
 * This decorator allows you to configure timeouts for:
 * - Entire test classes (applies to all tests in the class)
 * - Individual test methods
 * - Fixture methods defined with `@use.define`
 *
 * When applied at multiple levels, the most specific timeout takes precedence:
 * Method timeout > Class timeout > Global timeout
 *
 * **Key Features:**
 * - Set timeout for entire test class
 * - Override timeout for specific tests
 * - Configure fixture timeouts
 * - Consistent API across all decorator types
 *
 * @param milliseconds - Timeout value in milliseconds
 *
 * @returns A decorator function that sets the timeout
 *
 * @throws {Error} If timeout value is not a positive number
 * @throws {Error} If used on unsupported targets
 *
 * @example
 * // Class-level timeout (applies to all tests)
 * *\@describe("Slow Integration Tests")
 * *\@timeout(60000) // 60 seconds for all tests
 * class SlowTests extends BaseTest {
 *   *\@test("slow test 1")
 *   async test1() {
 *     await slowOperation();
 *   }
 *
 *   *\@test("slow test 2")
 *   async test2() {
 *     await anotherSlowOperation();
 *   }
 * }
 *
 * @example
 * // Method-level timeout (overrides class timeout)
 * *\@describe("Mixed Speed Tests")
 * *\@timeout(10000) // Default 10 seconds
 * class MixedTests extends BaseTest {
 *   *\@test("fast test")
 *   async fastTest() {
 *     // Uses class timeout: 10 seconds
 *   }
 *
 *   *\@test("very slow test")
 *   *\@timeout(120000) // Override: 120 seconds
 *   async verySlowTest() {
 *     await extremelySlowOperation();
 *   }
 * }
 *
 * @example
 * // Fixture timeout with *\@use.define
 * *\@describe("Database Tests")
 * class DatabaseTests extends BaseTest {
 *   *\@use.define({ auto: true })
 *   *\@timeout(30000) // 30 seconds to set up database
 *   async setupDatabase() {
 *     this.db = await connectToDatabase();
 *     await this.db.migrate();
 *   }
 *
 *   *\@test("should query data")
 *   async testQuery() {
 *     const result = await this.db.query("SELECT * FROM users");
 *   }
 * }
 *
 * @example
 * // Different timeouts for different operations
 * *\@describe("E2E Tests")
 * class E2ETests extends BaseTest {
 *   *\@beforeAll()
 *   *\@timeout(60000) // 1 minute for setup
 *   static async setupEnvironment() {
 *     await startServer();
 *     await seedDatabase();
 *   }
 *
 *   *\@test("quick UI test")
 *   *\@timeout(5000) // 5 seconds
 *   async quickTest() {
 *     await this.page.goto("/");
 *     await expect(this.page).toHaveTitle("Home");
 *   }
 *
 *   *\@test("slow E2E flow")
 *   *\@timeout(120000) // 2 minutes
 *   async slowE2ETest() {
 *     await completeCheckoutFlow();
 *   }
 * }
 *
 * @example
 * // Field-level timeout (for fixture definitions)
 * *\@describe("API Tests")
 * class ApiTests extends BaseTest {
 *   *\@use.define()
 *   *\@timeout(15000)
 *   apiClient = createApiClient();
 *
 *   *\@test("should make API call")
 *   async testApiCall() {
 *     const response = await this.apiClient.get("/api/users");
 *   }
 * }
 *
 * @see {@link describe} - Decorator for test classes
 * @see {@link test} - Decorator for test methods
 * @see {@link use.define} - Decorator for fixture definitions
 */
export function timeout(
  milliseconds: number,
): (target: any, context: DecoratorContext) => void {
  // Validation 1: Check if milliseconds is provided
  if (milliseconds === undefined || milliseconds === null) {
    throw new Error(
      `@timeout decorator requires a timeout value in milliseconds. Usage: @timeout(5000)`,
    );
  }

  // Validation 2: Check if milliseconds is a number
  if (typeof milliseconds !== "number") {
    throw new Error(
      `@timeout decorator requires a number, got ${typeof milliseconds} (${JSON.stringify(milliseconds)}). Usage: @timeout(5000)`,
    );
  }

  // Validation 3: Check if milliseconds is not NaN
  if (isNaN(milliseconds)) {
    throw new Error(
      `@timeout decorator received NaN. Please provide a valid number. Usage: @timeout(5000)`,
    );
  }

  // Validation 4: Check if milliseconds is not Infinity
  if (!isFinite(milliseconds)) {
    throw new Error(
      `@timeout decorator received Infinity. Please provide a finite number. Usage: @timeout(5000)`,
    );
  }

  // Validation 5: Check if milliseconds is positive
  if (milliseconds <= 0) {
    throw new Error(
      `@timeout decorator requires a positive number, got ${milliseconds}. Timeouts must be greater than 0.`,
    );
  }

  // Validation 6: Warn about very large timeouts (> 10 minutes)
  if (milliseconds > 600000) {
    console.warn(
      `⚠️  @timeout decorator: Timeout of ${milliseconds}ms (${(milliseconds / 60000).toFixed(1)} minutes) is very large. Consider if this is intentional.`,
    );
  }

  // Validation 7: Warn about very small timeouts (< 100ms)
  if (milliseconds < 100) {
    console.warn(
      `⚠️  @timeout decorator: Timeout of ${milliseconds}ms is very small and may cause tests to fail unexpectedly.`,
    );
  }

  return function (target: any, context: any) {
    // Validation 8: Check context exists
    if (!context) {
      throw new Error(
        `@timeout decorator: Invalid decorator context. This decorator must be used with TC39 decorators.`,
      );
    }

    // Validation 9: Check context.kind exists
    if (!context.kind) {
      throw new Error(
        `@timeout decorator: Invalid decorator context - missing 'kind' property.`,
      );
    }

    const contextKind = context.kind;
    const memberName = context.name as string;

    if (contextKind === "class") {
      // Class-level timeout: store in metadata for all tests in this class
      if (!context.metadata) {
        throw new Error(
          `@timeout decorator: Class context is missing metadata. Ensure you're using a compatible decorator system.`,
        );
      }

      // Validation 10: Check for duplicate class timeout
      if (
        context.metadata.classTimeout &&
        context.metadata.classTimeout !== milliseconds
      ) {
        console.warn(
          `⚠️  @timeout decorator: Duplicate class-level timeout detected. Previous: ${context.metadata.classTimeout}ms, New: ${milliseconds}ms. The new value will be used.`,
        );
      }

      context.metadata.classTimeout = milliseconds;
      return target;
    } else if (contextKind === "method") {
      // Method-level timeout: store in metadata for this specific method
      if (!context.metadata) {
        throw new Error(
          `@timeout decorator: Method '${memberName}' context is missing metadata.`,
        );
      }

      if (!context.metadata.methodTimeouts) {
        context.metadata.methodTimeouts = {};
      }

      // Validation 11: Check for duplicate method timeout
      const existingTimeout = (
        context.metadata.methodTimeouts as Record<string, number>
      )[memberName];
      if (existingTimeout && existingTimeout !== milliseconds) {
        console.warn(
          `⚠️  @timeout decorator: Duplicate timeout on method '${memberName}'. Previous: ${existingTimeout}ms, New: ${milliseconds}ms. The new value will be used.`,
        );
      }

      (context.metadata.methodTimeouts as Record<string, number>)[memberName] =
        milliseconds;
      return target;
    } else if (contextKind === "field" || contextKind === "getter") {
      // Field/getter timeout: store in metadata for fixture definitions
      if (!context.metadata) {
        throw new Error(
          `@timeout decorator: ${contextKind} '${memberName}' context is missing metadata.`,
        );
      }

      if (!context.metadata.fieldTimeouts) {
        context.metadata.fieldTimeouts = {};
      }

      // Validation 12: Check for duplicate field timeout
      const existingTimeout = (
        context.metadata.fieldTimeouts as Record<string, number>
      )[memberName];
      if (existingTimeout && existingTimeout !== milliseconds) {
        console.warn(
          `⚠️  @timeout decorator: Duplicate timeout on ${contextKind} '${memberName}'. Previous: ${existingTimeout}ms, New: ${milliseconds}ms. The new value will be used.`,
        );
      }

      (context.metadata.fieldTimeouts as Record<string, number>)[memberName] =
        milliseconds;
      return target;
    } else {
      // Validation 13: Invalid decorator target
      throw new Error(
        `@timeout decorator can only be used on classes, methods, or fields. Got: ${contextKind}. ` +
          `If you see this error, you may be applying @timeout to an unsupported target like a setter or accessor.`,
      );
    }
  };
}
