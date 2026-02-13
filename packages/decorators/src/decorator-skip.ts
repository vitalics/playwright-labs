/**
 * Decorator for skipping test methods with an optional reason.
 *
 * Marks a test method to be skipped during test execution. This is useful for
 * temporarily disabling tests that are broken, not yet implemented, or not
 * applicable in certain environments.
 *
 * **Key Features:**
 * - Skip tests with an optional reason
 * - Reason appears in test reports
 * - Works with `@describe` decorator
 * - Can be combined with other decorators like `@tag`
 *
 * **How it works:**
 * - Skip information is stored in test metadata
 * - The `@describe` decorator reads skip metadata and calls test.skip()
 * - Skipped tests appear in reports with the provided reason
 *
 * @param reason - Optional reason why the test is being skipped
 *
 * @returns A decorator function that marks the test to be skipped
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Skip without reason
 * *\@describe("Feature Tests")
 * class FeatureTests {
 *   *\@skip()
 *   *\@test("incomplete feature")
 *   async testIncomplete() {
 *     // This test will be skipped
 *   }
 * }
 *
 * @example
 * // Skip with reason
 * *\@describe("Browser Tests")
 * class BrowserTests {
 *   *\@skip("Fails in WebKit, investigating")
 *   *\@test("drag and drop")
 *   async testDragDrop() {
 *     // Skipped with a clear reason
 *   }
 *
 *   *\@skip("Not implemented yet")
 *   *\@test("file upload")
 *   async testFileUpload() {
 *     // Another skipped test
 *   }
 * }
 *
 * @example
 * // Conditional skip (can be implemented in tests)
 * *\@describe("Mobile Tests")
 * class MobileTests {
 *   *\@skip("Only for mobile browsers")
 *   *\@test("mobile gestures")
 *   async testGestures() {
 *     // Skip on desktop browsers
 *   }
 * }
 *
 * @example
 * // Combining with tags
 * *\@describe("Integration Tests")
 * class IntegrationTests {
 *   *\@tag("integration", "flaky")
 *   *\@skip("Flaky test - needs investigation")
 *   *\@test("external API integration")
 *   async testExternalAPI() {
 *     // Tagged and skipped
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes skip metadata
 * @see {@link test} - Decorator for test methods
 * @see {@link tag} - Decorator for tagging tests
 */
export function skip<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fn?: (self: T) => boolean,
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function skip<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function skip<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fnORreason?: string | ((self: T) => boolean),
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void {
  return function (target: V, context: ClassMethodDecoratorContext<T, V>) {
    if (context.kind !== "method") {
      throw new Error("@skip decorator can only be used on methods");
      // todo: add check for @test decorator and can be applied only on marked @test methods
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.skipped) {
      context.metadata.skipped = {};
    }

    const methodName = context.name as string;

    // Store skip information for this method
    (context.metadata.skipped as any)[methodName] = {
      skip: true,
      reason: reason || "Test skipped",
    };

    return target;
  };
}
