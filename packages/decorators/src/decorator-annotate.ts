import { TestDetailsAnnotation } from "@playwright/test";

const kAnnotate = Symbol.for("annotate");

/**
 * Decorator for adding annotations to test methods.
 *
 * Annotations provide metadata about tests that appears in Playwright reports.
 * They can be used to track issue numbers, add descriptions, link to documentation,
 * or add any custom metadata you need.
 *
 * **Key Features:**
 * - Add custom key-value annotations to tests
 * - Annotations appear in Playwright HTML report
 * - Support for multiple annotations per test
 * - Works seamlessly with `@describe` decorator
 *
 * **Common Use Cases:**
 * - Link to issue tracker (e.g., JIRA, GitHub issues)
 * - Add test documentation URLs
 * - Mark test priority or severity
 * - Add custom metadata for reporting
 *
 * **How it works:**
 * - Annotation information is stored in test metadata
 * - The `@describe` decorator reads annotations and calls test.info().annotations
 * - Annotations are visible in the test report
 *
 * @param type - The annotation type/key (e.g., "issue", "link", "priority")
 * @param description - The annotation value/description
 *
 * @returns A decorator function that adds an annotation to the test
 *
 * @throws {Error} If used on non-method targets
 *
 * @example
 * // Link to issue tracker
 * *\@describe("Bug Fix Tests")
 * class BugFixTests {
 *   *\@annotate("issue", "JIRA-123")
 *   *\@test("should fix login bug")
 *   async testLoginBugFix() {
 *     // Annotation appears in report linking to JIRA-123
 *   }
 * }
 *
 * @example
 * // Multiple annotations
 * *\@describe("Feature Tests")
 * class FeatureTests {
 *   *\@annotate("issue", "JIRA-456")
 *   *\@annotate("priority", "high")
 *   *\@annotate("docs", "https://docs.example.com/feature-x")
 *   *\@test("should implement feature X")
 *   async testFeatureX() {
 *     // Three annotations visible in report
 *   }
 * }
 *
 * @example
 * // Test metadata
 * *\@describe("API Tests")
 * class ApiTests {
 *   *\@annotate("category", "smoke")
 *   *\@annotate("owner", "team-backend")
 *   *\@annotate("execution-time", "fast")
 *   *\@test("should validate API response")
 *   async testApiResponse() {
 *     // Custom metadata for filtering and reporting
 *   }
 * }
 *
 * @example
 * // GitHub issue linking
 * *\@describe("Regression Tests")
 * class RegressionTests {
 *   *\@annotate("regression", "true")
 *   *\@annotate("github-issue", "https://github.com/user/repo/issues/42")
 *   *\@test("should not regress on issue #42")
 *   async testRegression() {
 *     // Links directly to GitHub issue
 *   }
 * }
 *
 * @example
 * // Combining with other decorators
 * *\@describe("Critical Tests")
 * class CriticalTests {
 *   *\@tag("critical", "smoke")
 *   *\@annotate("severity", "critical")
 *   *\@annotate("issue", "JIRA-789")
 *   *\@test("should handle payment processing")
 *   async testPayment() {
 *     // Tagged and annotated
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes annotations
 * @see {@link test} - Decorator for test methods
 * @see {@link tag} - Decorator for tagging tests
 */
export function annotate<const T, const V extends (...args: any[]) => any>(
  selectorFn: (self: T) => TestDetailsAnnotation | TestDetailsAnnotation[],
): (target: any, context: ClassMethodDecoratorContext<T, any>) => V;
export function annotate<const T, const V extends (...args: any[]) => any>(
  type: string,
  description?: string,
): (target: any, context: ClassMethodDecoratorContext<T, any>) => V;
export function annotate<const T, const V extends (...args: any[]) => any>(
  typeOrFn:
    | string
    | ((self: T) => TestDetailsAnnotation | TestDetailsAnnotation[]),
  description?: string,
): (target: any, context: ClassMethodDecoratorContext<T, any>) => V {
  return function (
    target: any,
    context: ClassMethodDecoratorContext<T, any>,
  ) {
    if (context.kind !== "method") {
      throw new Error("@annotate decorator can only be used on methods");
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.annotations) {
      context.metadata.annotations = {};
    }

    const methodName = context.name as string;

    // Initialize annotations array for this method
    if (!(context.metadata.annotations as any)[methodName]) {
      (context.metadata.annotations as any)[methodName] = [];
    }

    if (typeof typeOrFn === "string") {
      // Store annotation information directly
      (context.metadata.annotations as any)[methodName].push({
        type: typeOrFn,
        description,
        lazy: false,
      });
    } else {
      // Store the function for lazy evaluation at runtime
      (context.metadata.annotations as any)[methodName].push({
        lazy: true,
        fn: typeOrFn,
      });
    }

    return target;
  };
}

/**
 * Field decorator version of @annotate for class properties.
 *
 * This allows you to decorate class fields with annotation metadata that can be
 * accessed via the kAnnotate symbol at runtime.
 *
 * @param toAnnotation - Optional function to transform the field value into an annotation
 *
 * @example
 * ```typescript
 * *\@describe("Tests")
 * class MyTests {
 *   *\@annotate.field()
 *   testAnnotation = "my-annotation-value";
 *
 *   *\@test("test with annotation")
 *   *\@annotate((self) => BaseTest.makeAnnotation(self.testAnnotation))
 *   async myTest() {
 *     // testAnnotation is available at runtime
 *   }
 * }
 * ```
 */
annotate.field = <const T, const V>(
  toAnnotation?: (v: V) => TestDetailsAnnotation | TestDetailsAnnotation[],
) => {
  return function (
    target: any,
    context: ClassFieldDecoratorContext<T, V>,
  ): (v: V) => V {
    const fieldName = context.name.toString();

    // Store annotation factory on the instance via context.addInitializer
    context.addInitializer(function (this: any) {
      // Store the annotation factory function on the instance
      const annotationKey = `__annotation_${fieldName}`;
      Object.defineProperty(this, annotationKey, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: (val: any) => {
          return (
            toAnnotation?.(val as V) ?? {
              type: fieldName,
              description: String(val),
            }
          );
        },
      });
    });

    return function (value: any): V {
      // Just return the value as-is for primitives
      // The annotation will be accessed via the instance property
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return value as V;
      }

      // Handle objects/functions with Proxy
      return new Proxy(value, {
        apply(target, thisArg, args) {
          const fnResult = Reflect.apply(target, thisArg, args);
          // Validate function returns proper annotation format
          if (
            typeof fnResult === "object" &&
            fnResult !== null &&
            "type" in fnResult
          ) {
            return fnResult;
          }
          throw new Error(
            `Expected function to return annotation object "{ type: string, description?: string }". Got ${JSON.stringify(
              fnResult,
            )}`,
          );
        },
        get(target, prop) {
          if (prop === kAnnotate) {
            return () =>
              toAnnotation?.(value) ?? {
                type: fieldName,
                description: String(value),
              };
          }
          return Reflect.get(target, prop);
        },
        set(target, prop, newValue) {
          return Reflect.set(target, prop, newValue);
        },
      }) as V;
    };
  };
};
