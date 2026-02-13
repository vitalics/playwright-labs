/**
 * Decorator for marking test methods as "fixme" - tests that should be fixed.
 *
 * Marks a test method as needing attention. In Playwright, fixme tests are skipped
 * but highlighted differently than regular skipped tests, indicating they require fixing.
 *
 * **Key Features:**
 * - Mark tests that need to be fixed
 * - Optional reason explaining what needs fixing
 * - Conditional fixme using selector function
 * - Works with `@describe` decorator
 * - Can be combined with other decorators like `@tag`
 *
 * **How it works:**
 * - Fixme information is stored in test metadata
 * - The `@describe` decorator reads fixme metadata and calls test.fixme()
 * - Fixme tests appear in reports differently than skipped tests
 *
 * @param fnOrReason - Optional selector function or reason string
 * @param reason - Optional reason (when first param is a function)
 *
 * @returns A decorator function that marks the test as fixme
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Fixme without reason
 * *\@describe("Bug Tests")
 * class BugTests extends BaseTest {
 *   *\@fixme()
 *   *\@test("has known bug")
 *   async testWithBug() {
 *     // This test is marked as needing a fix
 *   }
 * }
 *
 * @example
 * // Fixme with reason
 * *\@describe("Flaky Tests")
 * class FlakyTests extends BaseTest {
 *   *\@fixme("Fails intermittently - race condition")
 *   *\@test("async operation")
 *   async testAsync() {
 *     // Marked as fixme with a clear reason
 *   }
 * }
 *
 * @example
 * // Conditional fixme using selector function
 * *\@describe("Browser Tests")
 * class BrowserTests extends BaseTest {
 *   *\@fixme((self) => self.browserName === 'webkit', "WebKit specific issue")
 *   *\@test("webkit bug")
 *   async testWebKitBug() {
 *     // Only marked as fixme in WebKit
 *   }
 * }
 *
 * @example
 * // Combining with tags
 * *\@describe("Feature Tests")
 * class FeatureTests extends BaseTest {
 *   *\@tag("critical", "flaky")
 *   *\@fixme("Critical but flaky - needs investigation")
 *   *\@test("payment processing")
 *   async testPayment() {
 *     // Tagged and marked as fixme
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes fixme metadata
 * @see {@link test} - Decorator for test methods
 * @see {@link skip} - Decorator for skipping tests
 */
export function fixme<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fn?: (self: T) => boolean,
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function fixme<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function fixme<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fnOrReason?: string | ((self: T) => boolean),
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void {
  return function (target: V, context: ClassMethodDecoratorContext<T, V>) {
    if (context.kind !== "method") {
      throw new Error("@fixme decorator can only be used on methods");
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.fixme) {
      context.metadata.fixme = {};
    }

    const methodName = context.name as string;
    
    // Determine if it's a function or a reason string
    let selectorFn: ((self: T) => boolean) | undefined;
    let fixmeReason: string = "Test marked as fixme";
    
    if (typeof fnOrReason === 'function') {
      selectorFn = fnOrReason;
      fixmeReason = reason || fixmeReason;
    } else if (typeof fnOrReason === 'string') {
      fixmeReason = fnOrReason;
    }

    // Store fixme information for this method
    (context.metadata.fixme as any)[methodName] = {
      fixme: true,
      reason: fixmeReason,
      condition: selectorFn,
    };

    return target;
  };
}
