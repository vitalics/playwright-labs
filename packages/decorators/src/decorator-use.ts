/**
 * Decorator for using/configuring fixtures at test or class level.
 *
 * This decorator allows you to configure fixture options using Playwright's test.use() API.
 * It can be applied to both individual test methods and entire test classes.
 *
 * **IMPORTANT: Decorator Order**
 * When using `@use` with `@describe`, `@describe` must be placed ABOVE `@use`:
 * ```typescript
 * * @describe("My Tests")  // ← `@describe` first
 * * @use({ viewport: ... }) // ← `@use` second
 * class MyTests { }
 * ```
 * This is because decorators are applied bottom-up, and `@describe` needs to see
 * the metadata that `@use` sets.
 *
 * **Fixture Scopes:**
 * - `test`: Test-scoped fixtures (default) - isolated per test
 * - `worker`: Worker-scoped fixtures - shared across tests in the same worker
 *
 * **Key Features:**
 * - Configure fixture options at method or class level
 * - Support for all Playwright fixture options
 * - Type-safe fixture configuration
 * - Composable with other decorators
 *
 * @param options - Fixture options to configure (e.g., viewport, locale, etc.)
 * @param scope - Optional fixture scope: 'test' | 'worker' | 'auto' (default: 'test')
 *
 * @example
 * // Method-level fixture configuration
 * *\@describe("Mobile Tests")
 * class MobileTests extends BaseTest {
 *   *\@use({ viewport: { width: 375, height: 667 }, isMobile: true })
 *   *\@test("should work on mobile")
 *   async testMobile() {
 *     expect(this.viewport).toEqual({ width: 375, height: 667 });
 *   }
 * }
 *
 * @example
 * // Class-level fixture configuration (note: `@describe` comes BEFORE `@use`)
 * *\@describe("French Tests")
 * *\@use({ locale: 'fr-FR', timezoneId: 'Europe/Paris' })
 * class FrenchTests extends BaseTest {
 *   *\@test("should use French locale")
 *   async testFrench() {
 *     expect(this.locale).toBe('fr-FR');
 *   }
 * }
 *
 * @example
 * // Worker-scoped fixtures
 * *\@describe("Debug Tests")
 * *\@use({ headless: false }, 'worker')
 * class DebugTests extends BaseTest {
 *   *\@test("runs with headed browser")
 *   async testHeaded() {
 *     await this.page.goto('https://example.com');
 *   }
 * }
 */
export function use<T = any>(
  options: Record<string, any>,
  scope?: "test" | "worker" | "auto",
) {
  return function (
    target: any,
    context: ClassDecoratorContext | ClassMethodDecoratorContext,
  ) {
    if (context.kind === "class") {
      // Class-level @use - applies to all tests in the class
      const metadata = context.metadata as any;
      if (!metadata.classUse) {
        metadata.classUse = [];
      }
      metadata.classUse.push({ options, scope: scope || "test" });
      return target;
    } else if (context.kind === "method") {
      // Method-level @use - applies to specific test
      const metadata = context.metadata as any;
      const methodName = context.name as string;

      if (!metadata.methodUse) {
        metadata.methodUse = {};
      }
      if (!metadata.methodUse[methodName]) {
        metadata.methodUse[methodName] = [];
      }
      metadata.methodUse[methodName].push({ options, scope: scope || "test" });
      return target;
    }

    throw new Error("@use decorator can only be used on classes or methods");
  };
}

// Import and attach the define decorator
import { useDefineNamespace } from './decorator-use-define';

/**
 * Namespace for use-related decorators
 */
use.define = useDefineNamespace.define;
