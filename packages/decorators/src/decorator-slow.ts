/**
 * Decorator for marking test methods as slow.
 *
 * Marks a test as slow, which triples the default timeout for that test.
 * This is useful for tests that legitimately take longer to execute.
 *
 * **Key Features:**
 * - Automatically triples the test timeout
 * - Optional reason explaining why test is slow
 * - Conditional slow using selector function
 * - Works with `@describe` decorator
 * - Can be combined with other decorators
 *
 * **How it works:**
 * - Slow information is stored in test metadata
 * - The `@describe` decorator reads slow metadata and calls test.slow()
 * - Test timeout is automatically tripled
 *
 * @param fnOrReason - Optional selector function or reason string
 * @param reason - Optional reason (when first param is a function)
 *
 * @returns A decorator function that marks the test as slow
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Slow without reason
 * *\@describe("Performance Tests")
 * class PerformanceTests extends BaseTest {
 *   *\@slow()
 *   *\@test("large dataset processing")
 *   async testLargeDataset() {
 *     // This test will have 3x timeout
 *   }
 * }
 *
 * @example
 * // Slow with reason
 * *\@describe("Integration Tests")
 * class IntegrationTests extends BaseTest {
 *   *\@slow("Waits for external API responses")
 *   *\@test("API integration")
 *   async testAPIIntegration() {
 *     // Marked as slow with explanation
 *   }
 * }
 *
 * @example
 * // Conditional slow using selector function
 * *\@describe("Browser Tests")
 * class BrowserTests extends BaseTest {
 *   *\@slow((self) => self.browserName === 'webkit', "WebKit is slower for this test")
 *   *\@test("heavy rendering")
 *   async testRendering() {
 *     // Only slow in WebKit
 *   }
 * }
 *
 * @example
 * // Combining with other decorators
 * *\@describe("E2E Tests")
 * class E2ETests extends BaseTest {
 *   *\@tag("e2e", "critical")
 *   *\@slow("Full user flow")
 *   *\@test("complete checkout flow")
 *   async testCheckout() {
 *     // Tagged and marked as slow
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes slow metadata
 * @see {@link test} - Decorator for test methods
 * @see {@link skip} - Decorator for skipping tests
 * @see {@link fixme} - Decorator for marking tests that need fixing
 */
export function slow<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fn?: (self: T) => boolean,
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function slow<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void;
export function slow<
  const T,
  const V extends (...args: any[]) => void | Promise<void>,
>(
  fnOrReason?: string | ((self: T) => boolean),
  reason?: string,
): (target: V, context: ClassMethodDecoratorContext<T, V>) => void {
  return function (target: V, context: ClassMethodDecoratorContext<T, V>) {
    if (context.kind !== "method") {
      throw new Error("@slow decorator can only be used on methods");
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.slow) {
      context.metadata.slow = {};
    }

    const methodName = context.name as string;
    
    // Determine if it's a function or a reason string
    let selectorFn: ((self: T) => boolean) | undefined;
    let slowReason: string | undefined;
    
    if (typeof fnOrReason === 'function') {
      selectorFn = fnOrReason;
      slowReason = reason;
    } else if (typeof fnOrReason === 'string') {
      slowReason = fnOrReason;
    }

    // Store slow information for this method
    (context.metadata.slow as any)[methodName] = {
      slow: true,
      reason: slowReason,
      condition: selectorFn,
    };

    return target;
  };
}
