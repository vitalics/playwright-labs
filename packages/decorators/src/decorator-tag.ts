import { test as baseTest } from "@playwright/test";

/**
 * Decorator for adding tags to test methods.
 *
 * Tags help organize and filter tests in Playwright. You can run tests with specific tags
 * using the `--grep` option or filter them in the test report.
 *
 * **Key Features:**
 * - Add multiple tags to a single test
 * - Tags are converted to Playwright annotations
 * - Can be combined with other decorators
 * - Supports tag-based test filtering
 *
 * **How it works:**
 * - Tags are stored in the test metadata
 * - The `@describe` decorator reads tags and applies them to tests
 * - Tags appear as annotations in Playwright reports
 *
 * @param tags - One or more tags to apply to the test
 *
 * @returns A decorator function that adds tags to the test method
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Single tag
 * *\@describe("User Tests")
 * class UserTests {
 *   *\@tag("smoke")
 *   *\@test("should login successfully")
 *   async testLogin() {
 *     // This test is tagged as "smoke"
 *   }
 * }
 *
 * @example
 * // Multiple tags
 * *\@describe("API Tests")
 * class ApiTests {
 *   *\@tag("api", "critical", "smoke")
 *   *\@test("should fetch user data")
 *   async testFetchUser() {
 *     // This test has 3 tags
 *   }
 *
 *   *\@tag("api", "slow")
 *   *\@test("should handle large responses")
 *   async testLargeResponse() {
 *     // Different tags for different tests
 *   }
 * }
 *
 * @example
 * // Running tests by tag
 * // npx playwright test --grep @smoke
 * // npx playwright test --grep @api
 *
 * @example
 * // Combining with other decorators
 * *\@describe("E2E Tests")
 * class E2ETests {
 *   *\@tag("e2e", "critical")
 *   *\@skip("Not ready yet")
 *   *\@test("should complete checkout")
 *   async testCheckout() {
 *     // Tagged and skipped
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes tags
 * @see {@link test} - Decorator for test methods
 * @see {@link skip} - Decorator to skip tests
 */
export function tag(
  ...tags: string[]
): (
  target: any,
  context: ClassDecoratorContext | ClassMethodDecoratorContext,
) => any {
  return function (
    target: any,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ) {
    if (context.kind !== "method" && context.kind !== "class") {
      throw new Error("@tag decorator can only be used on methods");
    }

    // Initialize metadata arrays if they don't exist
    if (!context.metadata.tags) {
      context.metadata.tags = {};
    }

    const methodName = context.name as string;

    // Store tags for this method
    if (!(context.metadata.tags as any)[methodName]) {
      (context.metadata.tags as any)[methodName] = [];
    }

    (context.metadata.tags as any)[methodName].push(...tags);

    return target;
  };
}
