import type {
  Page,
  BrowserContext,
  Browser,
  Locator,
  Request,
  Response,
  APIRequestContext,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
  TestInfo,
} from "@playwright/test";

import { test as baseTest } from "@playwright/test";

/**
 * Base test class that provides access to all Playwright fixtures.
 *
 * Extend this class to automatically get access to Playwright fixtures like:
 * - page: Page - Isolated page for each test
 * - context: BrowserContext - Isolated browser context
 * - browser: Browser - Shared browser instance
 * - request: APIRequestContext - API testing context
 * - browserName: string - Current browser name
 * - and all other Playwright built-in test options
 *
 * All fixtures are injected directly on the instance via `this.page`, `this.context`, etc.
 * Configuration options like `this.viewport`, `this.locale` are also available.
 *
 * @example
 * import { BaseTest } from "@fixture-generic";
 * import { describe, test } from "@fixture-generic";
 *
 * *\@describe("My Tests")
 * class MyTests extends BaseTest {
 *   *\@test()
 *   async testPageNavigation() {
 *     await this.page.goto("https://example.com");
 *     await this.page.click("button");
 *     await expect(this.page).toHaveURL(/success/);
 *   }
 * }
 */
export interface BaseTest<
  T extends {} = PlaywrightTestArgs &
    PlaywrightTestOptions &
    PlaywrightWorkerArgs &
    PlaywrightWorkerOptions,
>
  extends
    PlaywrightTestArgs,
    PlaywrightTestOptions,
    PlaywrightWorkerArgs,
    PlaywrightWorkerOptions {}

export class BaseTest<
  T extends {} = PlaywrightTestArgs &
    PlaywrightTestOptions &
    PlaywrightWorkerArgs &
    PlaywrightWorkerOptions,
> {
  // Runtime API access for core fixtures
  pwSelf!: T & {
    page: Page;
    context: BrowserContext;
    request: APIRequestContext;
    browser: Browser;
    browserName: "chromium" | "firefox" | "webkit";
    viewport: { width: number; height: number } | null;
    userAgent?: string;
    deviceScaleFactor?: number;
    extraHTTPHeaders?: { [key: string]: string };
    geolocation?: { longitude: number; latitude: number; accuracy?: number };
    permissions?: string[];
    baseURL?: string;
    storageState?: string | { cookies: any[]; origins: any[] };
    actionTimeout?: number;
    navigationTimeout?: number;
    serviceWorkers?: "allow" | "block";
    testIdAttribute?: string;
    channel?: string;
  };

  testSelf!: {
    info: () => TestInfo;
    use: (fixtures: any) => void;
  };

  static toAnnotation(
    value: any,
    instance: any,
  ):
    | { type: string; description?: string }
    | { type: string; description?: string }[] {
    // Find which field contains this value
    for (const key of Object.keys(instance)) {
      if (instance[key] === value) {
        const annotationKey = `__annotation_${key}`;
        if (typeof instance[annotationKey] === "function") {
          return instance[annotationKey](value);
        }
      }
    }

    // Try Symbol.for("annotate") on the value itself
    if (value !== undefined && value !== null) {
      const symbolKey = Symbol.for("annotate");
      if (
        typeof value === "object" &&
        symbolKey in value &&
        typeof value[symbolKey] === "function"
      ) {
        return value[symbolKey]();
      }
    }

    return { type: "unknown", description: value };
  }

  static toAttachment(
    value: any,
    instance: any,
    name?: string,
  ): {
    name: string;
    body?: Buffer | string;
    path?: string;
    contentType?: string;
  } {
    // Find which field contains this value
    for (const key of Object.keys(instance)) {
      if (instance[key] === value) {
        const attachmentKey = `__attachment_${key}`;
        if (typeof instance[attachmentKey] === "function") {
          const result = instance[attachmentKey](value);
          // If a name was provided, override the attachment name
          if (result && name) {
            return { ...result, name };
          }
          return result;
        }
      }
    }

    // Try Symbol.for("attachment") on the value itself
    if (value !== undefined && value !== null) {
      const symbolKey = Symbol.for("attachment");
      if (
        typeof value === "object" &&
        !Buffer.isBuffer(value) &&
        symbolKey in value &&
        typeof value[symbolKey] === "function"
      ) {
        const result = value[symbolKey]();
        // If a name was provided, override the attachment name
        if (result && name) {
          return { ...result, name };
        }
        return result;
      }
    }

    return {
      name: name || "attachment",
    };
  }
}

export function makeBaseTest<
  const T extends TestType<any, any>,
  const O extends {} & Record<string, any> = T extends TestType<
    infer O1,
    infer O2
  >
    ? O1 & O2
    : {},
>(pwTest: T, fixtureStrings?: string[]): typeof BaseTest<O> {
  class Decorated extends BaseTest<O> {
    constructor() {
      super();
    }

    toAnnotation(annotation: any) {
      return Decorated.toAnnotation(annotation);
    }

    static toAnnotation(
      annotation: any,
      instance?: any,
    ): {
      type: string;
      description?: string;
    } {
      // First, try to read from Symbol.for("annotate") for objects
      const kAnnotate = Symbol.for("annotate");
      if (annotation != null && typeof annotation === "object") {
        const annotationFn = (annotation as any)[kAnnotate];
        if (typeof annotationFn === "function") {
          const result = annotationFn();
          // Validate the result has the correct shape
          if (result && typeof result === "object" && "type" in result) {
            return result;
          }
        }
      }

      // If instance is provided, check for instance-based annotation factories
      // This is used for @annotate.field() decorated properties
      if (instance) {
        // Try to find an annotation factory on the instance
        for (const key of Object.getOwnPropertyNames(instance)) {
          if (key.startsWith("__annotation_")) {
            const fieldName = key.replace("__annotation_", "");
            const fieldValue = (instance as any)[fieldName];

            // Check if this annotation factory is for the current value
            if (fieldValue === annotation) {
              const annotationFn = (instance as any)[key];
              if (typeof annotationFn === "function") {
                const result = annotationFn(annotation);
                if (result && typeof result === "object" && "type" in result) {
                  return result;
                }
              }
            }
          }
        }
      }

      // Fallback to default behavior for primitives
      if (typeof annotation === "string") {
        return { type: annotation };
      }

      return { type: "example", description: String(annotation) };
    }

    toAttachment(data: any, name?: string) {
      return Decorated.toAttachment(data, name);
    }

    static toAttachment(
      data: any,
      instance?: any,
      name?: string,
    ): {
      name: string;
      path?: string;
      body?: Buffer | string;
      contentType?: string;
    } {
      // First, try to read from Symbol.for("attachment") for objects
      const kAttachment = Symbol.for("attachment");
      if (data != null && typeof data === "object" && !Buffer.isBuffer(data)) {
        const attachmentFn = (data as any)[kAttachment];
        if (typeof attachmentFn === "function") {
          const result = attachmentFn();
          // Validate the result has the correct shape
          if (result && typeof result === "object" && result.name) {
            return result;
          }
        }
      }

      // If instance is provided, check for instance-based attachment factories
      // This is used for @attachment.field() decorated properties
      if (instance) {
        // Try to find an attachment factory on the instance
        for (const key of Object.getOwnPropertyNames(instance)) {
          if (key.startsWith("__attachment_")) {
            const fieldName = key.replace("__attachment_", "");
            const fieldValue = (instance as any)[fieldName];

            // Check if this attachment factory is for the current value
            if (fieldValue === data) {
              const attachmentFn = (instance as any)[key];
              if (typeof attachmentFn === "function") {
                const result = attachmentFn(data, name);
                if (result && typeof result === "object" && result.name) {
                  return result;
                }
              }
            }
          }
        }
      }

      // Fallback to default behavior
      return {
        name: name || "attachment",
        body: Buffer.isBuffer(data) ? data : String(data),
        contentType: Buffer.isBuffer(data)
          ? "application/octet-stream"
          : "text/plain",
      };
    }
  }
  return Decorated as typeof BaseTest<O>;
}
