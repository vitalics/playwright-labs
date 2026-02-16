const kAttachment = Symbol.for("attachment");

/**
 * Decorator for attaching files or data to test methods.
 *
 * Attachments are displayed in Playwright test reports and can include screenshots,
 * videos, traces, or any other files you want to associate with a test.
 *
 * **Key Features:**
 * - Attach files with custom names and content types
 * - Support for both file paths and inline data
 * - Attachments appear in Playwright HTML report
 * - Can be combined with other decorators
 * - Support for lazy attachments via function
 *
 * **How it works:**
 * - Attachment information is stored in test metadata
 * - The `@describe` decorator reads attachments and calls testInfo.attach()
 * - Attachments are visible in the test report
 *
 * @param name - Display name for the attachment (or lazy function)
 * @param options - Attachment options (path or body, contentType)
 *
 * @returns A decorator function that registers an attachment for the test
 *
 * @throws {Error} If used on non-method targets
 * @throws {Error} If neither path nor body is provided (for static attachments)
 *
 * @example
 * // Attach a file by path
 * *\@describe("Screenshot Tests")
 * class ScreenshotTests {
 *   *\@attachment("test-screenshot", {
 *     path: "./screenshots/test.png",
 *     contentType: "image/png"
 *   })
 *   *\@test("should capture screenshot")
 *   async testScreenshot() {
 *     // Screenshot will be attached to report
 *   }
 * }
 *
 * @example
 * // Attach inline data
 * *\@describe("Log Tests")
 * class LogTests {
 *   *\@attachment("test-logs", {
 *     body: Buffer.from("Test execution logs..."),
 *     contentType: "text/plain"
 *   })
 *   *\@test("should generate logs")
 *   async testLogs() {
 *     // Logs attached inline
 *   }
 * }
 *
 * @example
 * // Lazy attachment with field
 * *\@describe("Dynamic Tests")
 * class DynamicTests extends BaseTest {
 *   *\@attachment.field()
 *   logData = Buffer.from("Log content");
 *
 *   *\@test("test with lazy attachment")
 *   *\@attachment((self) => ({
 *     name: "test-logs",
 *     body: self.logData,
 *     contentType: "text/plain"
 *   }))
 *   async testWithLazyAttachment() {
 *     // Attachment created at runtime
 *   }
 * }
 *
 * @see {@link describe} - Decorator that processes attachments
 * @see {@link test} - Decorator for test methods
 * @see {@link annotate} - Decorator for adding annotations
 */
export function attachment<const T>(
  nameOrFn:
    | string
    | ((self: T) => {
        name: string;
        path?: string;
        body?: Buffer | string;
        contentType?: string;
      }),
  options?: { path?: string; body?: Buffer | string; contentType?: string },
): (target: any, context: ClassMethodDecoratorContext<T, any>) => any {
  return function (target: any, context: ClassMethodDecoratorContext<T, any>) {
    if (context.kind !== "method") {
      throw new Error("@attachment decorator can only be used on methods");
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.attachments) {
      context.metadata.attachments = {};
    }

    const methodName = context.name as string;

    // Initialize attachments array for this method
    if (!(context.metadata.attachments as any)[methodName]) {
      (context.metadata.attachments as any)[methodName] = [];
    }

    if (typeof nameOrFn === "function") {
      // Lazy attachment - store the function for runtime evaluation
      (context.metadata.attachments as any)[methodName].push({
        lazy: true,
        fn: nameOrFn,
      });
    } else {
      // Static attachment
      if (options?.path === undefined && options?.body === undefined) {
        throw new Error(
          "@attachment requires either 'path' or 'body' in options",
        );
      }

      // Store attachment information
      (context.metadata.attachments as any)[methodName].push({
        lazy: false,
        name: nameOrFn,
        path: options.path,
        body: options.body,
        contentType: options.contentType,
      });
    }

    return target;
  };
}

type AttachmentLike = {
  name?: string;
  path?: string;
  body?: Buffer | string;
  contentType?: string;
};

/**
 * Field decorator version of @attachment for class properties.
 * 
 * This allows you to decorate class fields with attachment metadata that can be
 * accessed via the kAttachment symbol or instance properties at runtime.
 * 
 * @param toAttachment - Optional function to transform the field value into an attachment
 * 
 * @example
 * ```typescript
 * *\@describe("Tests")
 * class MyTests extends BaseTest {
 *   *\@attachment.field()
 *   logData = Buffer.from("Test logs");
 *   
 *   *\@test("test with attachment")
 *   *\@attachment((self) => BaseTest.makeAttachment(self.logData, self, "test-log"))
 *   async myTest() {
 *     // logData is available at runtime and attached to report
 *   }
 * }
 * ```
 */
attachment.field = function <const T, const V>(
  toAttachment?: (v: V) => AttachmentLike,
) {
  return function (
    target: any,
    context: ClassFieldDecoratorContext<T, V>,
  ): (v: V) => V {
    const fieldName = context.name.toString();
    
    // Store attachment factory on the instance via context.addInitializer
    context.addInitializer(function (this: any) {
      // Store the attachment factory function on the instance
      const attachmentKey = `__attachment_${fieldName}`;
      Object.defineProperty(this, attachmentKey, {
        enumerable: false,
        configurable: true,
        writable: false,
        value: (val: any, name?: string) => {
          return (
            toAttachment?.(val as V) ?? {
              name: name || fieldName,
              body: val,
              contentType: "text/plain",
            }
          );
        },
      });
    });
    
    return function (value: any): V {
      // Just return the value as-is for primitives and objects
      // The attachment will be accessed via the instance property
      return value as V;
    };
  };
};
