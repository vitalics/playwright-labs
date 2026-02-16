import { test as baseTest, TestType } from "@playwright/test";
import {
  type Formatter,
  formatStringTemplate,
  ParamContext,
} from "./formatStringTemplate";
import { inspect } from "node:util";
import { kAnnotate } from "./decorator-step";

type DescribeOptions = {
  mode?: "default" | "parallel" | "serial";
  retries?: number;
  timeout?: number;
};

/**
 * Default Playwright fixture keys that are injected into test instances.
 * These include all built-in Playwright test and worker fixtures.
 */
export const DEFAULT_FIXTURE_KEYS = [
  // PlaywrightTestArgs - test-scoped fixtures
  'page', 'context', 'request',
  // PlaywrightWorkerArgs - worker-scoped fixtures
  'browser', 'browserName',
  // PlaywrightTestOptions - test configuration
  'acceptDownloads', 'bypassCSP', 'colorScheme', 'clientCertificates',
  'deviceScaleFactor', 'extraHTTPHeaders', 'geolocation', 'hasTouch',
  'httpCredentials', 'ignoreHTTPSErrors', 'isMobile', 'javaScriptEnabled',
  'locale', 'offline', 'permissions', 'proxy', 'storageState', 'timezoneId',
  'userAgent', 'viewport', 'baseURL', 'contextOptions', 'actionTimeout',
  'navigationTimeout', 'serviceWorkers', 'testIdAttribute',
  // PlaywrightWorkerOptions - worker configuration
  'headless', 'channel', 'launchOptions', 'connectOptions', 'screenshot',
  'trace', 'video',
] as const;

/**
 * Default keys exposed via pwSelf for runtime access.
 * This is a subset of DEFAULT_FIXTURE_KEYS containing commonly used fixtures.
 */
export const DEFAULT_PWSELF_KEYS = [
  'page', 'context', 'request', 'browser', 'browserName',
  'viewport', 'userAgent', 'deviceScaleFactor', 'extraHTTPHeaders',
  'geolocation', 'permissions', 'baseURL', 'storageState',
  'actionTimeout', 'navigationTimeout', 'serviceWorkers',
  'testIdAttribute', 'channel',
] as const;

export function makeDescribe<T extends TestType<any, any>>(
  pwTest: T,
  fixturesToExtract?: string[],
) {
  return function describe<const Name extends string, T extends new () => any>(
    name?: Name,
    options?: DescribeOptions,
  ) {
    return function (target: T, context: ClassDecoratorContext<T>) {
      const describeName =
        name?.toString() ?? context.name?.toString() ?? "<anonymous>";

      if (context.kind !== "class") {
        throw new Error("describe decorator can only be used on classes");
      }

      // Register the describe block
      pwTest.describe(describeName, () => {
        if (options) {
          pwTest.describe.configure(options);
        }
        
        // Get metadata and apply class-level @use configurations
        const metadata = context.metadata as any;
        const classUse = metadata?.classUse || [];
        for (const useConfig of classUse) {
          pwTest.use(useConfig.options);
        }
        
        // Get all method names from the prototype
        const methodNames = Object.getOwnPropertyNames(target.prototype).filter(
          (key) => {
            if (key === "constructor") return false;
            const descriptor = Object.getOwnPropertyDescriptor(target.prototype, key);
            // Check if it's a method (not a getter/setter)
            return descriptor && typeof descriptor.value === "function";
          }
        );

        // Find lifecycle hooks from decorator metadata or method names
        // Walk up the prototype chain to collect all lifecycle hooks (including inherited ones)
        const beforeEachMethods: string[] = [];
        const beforeAllMethods: string[] = [];
        const afterEachMethods: string[] = [];
        const afterAllMethods: string[] = [];

        // Collect from current class decorator metadata first
        if (metadata?.beforeEach) {
          beforeEachMethods.push(...metadata.beforeEach);
        }
        if (metadata?.beforeAll) {
          beforeAllMethods.push(...metadata.beforeAll);
        }
        if (metadata?.afterEach) {
          afterEachMethods.push(...metadata.afterEach);
        }
        if (metadata?.afterAll) {
          afterAllMethods.push(...metadata.afterAll);
        }

        // Collect lifecycle hooks from parent class metadata (for inheritance)
        // Walk up the class hierarchy to find lifecycle hooks from parent classes
        let currentClass: any = target;
        let parentProto = Object.getPrototypeOf(target.prototype);

        while (parentProto && parentProto !== Object.prototype) {
          const parentConstructor = parentProto.constructor;
          const parentMetadata = parentConstructor[Symbol.metadata] as any;

          if (parentMetadata) {
            if (parentMetadata.beforeEach) {
              beforeEachMethods.push(...parentMetadata.beforeEach);
            }
            if (parentMetadata.beforeAll) {
              beforeAllMethods.push(...parentMetadata.beforeAll);
            }
            if (parentMetadata.afterEach) {
              afterEachMethods.push(...parentMetadata.afterEach);
            }
            if (parentMetadata.afterAll) {
              afterAllMethods.push(...parentMetadata.afterAll);
            }
          }

          parentProto = Object.getPrototypeOf(parentProto);
        }

        // Note: We only collect lifecycle hooks from decorators, not from method names.
        // Methods must be explicitly decorated with @beforeEach(), @afterEach(), etc.
        // to be recognized as lifecycle hooks.

        // Validate that all decorated lifecycle methods actually exist on the prototype or as static methods
        // Filter out any methods that don't exist (they may have been defined in parent classes
        // that weren't decorated with @describe and their metadata wasn't properly inherited)
        const validateMethodExists = (methodName: string): boolean => {
          // Check instance methods in prototype chain
          let proto: any = target.prototype;
          while (proto && proto !== Object.prototype) {
            if (
              Object.getOwnPropertyNames(proto).includes(methodName) &&
              typeof proto[methodName] === "function"
            ) {
              return true;
            }
            proto = Object.getPrototypeOf(proto);
          }

          // Check static methods in class hierarchy
          let currentClass: any = target;
          while (
            currentClass &&
            currentClass !== Object &&
            currentClass !== Function.prototype
          ) {
            if (
              Object.getOwnPropertyNames(currentClass).includes(methodName) &&
              typeof currentClass[methodName] === "function"
            ) {
              return true;
            }
            currentClass = Object.getPrototypeOf(currentClass);
          }

          return false;
        };

        // Filter lifecycle methods to only include those that actually exist
        const validBeforeEach = beforeEachMethods.filter(validateMethodExists);
        const validBeforeAll = beforeAllMethods.filter(validateMethodExists);
        const validAfterEach = afterEachMethods.filter(validateMethodExists);
        const validAfterAll = afterAllMethods.filter(validateMethodExists);

        beforeEachMethods.length = 0;
        beforeEachMethods.push(...validBeforeEach);
        beforeAllMethods.length = 0;
        beforeAllMethods.push(...validBeforeAll);
        afterEachMethods.length = 0;
        afterEachMethods.push(...validAfterEach);
        afterAllMethods.length = 0;
        afterAllMethods.push(...validAfterAll);

        // Find test methods from @test decorator metadata
        const testMetadata = (metadata?.tests || []) as Array<{
          methodName: string;
          testName: string;
          eachParams?: any[]; // Parameters for @test.each
          eachIndex?: number; // Index for @test.each
          eachDataFn?: (self: any) => any; // Callback data provider for deferred @test.each
          isDeferred?: boolean; // Whether this entry needs runtime resolution
        }>;

        // Expand deferred @test.each entries (callback data providers)
        // This must happen synchronously inside the describe callback
        const expandedTestMetadata: Array<{
          methodName: string;
          testName: string;
          eachParams?: any[];
          eachIndex?: number;
        }> = [];

        // Create a temp instance for resolving deferred data (if needed)
        const hasDeferredTests = testMetadata.some((t) => t.isDeferred);
        let deferredInstance: any = null;
        if (hasDeferredTests) {
          try {
            deferredInstance = new target();
          } catch (e) {
            throw new Error(
              `Failed to create instance for resolving @test.each callback data. ` +
              `Ensure the class constructor has no required arguments. Error: ${e}`,
            );
          }
        }

        for (const t of testMetadata) {
          if (t.isDeferred && t.eachDataFn) {
            // Resolve the callback data provider
            const result = t.eachDataFn(deferredInstance);

            // Check for async result (Promises are not supported)
            if (result && typeof result === "object" && typeof (result as any).then === "function") {
              throw new Error(
                `@test.each callback for method "${t.methodName}" returned a Promise. ` +
                `Async data providers are not supported because Playwright requires synchronous test registration. ` +
                `Use a static array or a synchronous data provider instead.`,
              );
            }

            const parameters = result as readonly (readonly any[])[];

            // Expand into concrete test entries
            for (let i = 0; i < parameters.length; i++) {
              const paramSet = parameters[i];

              // Convert Serializable objects to strings for interpolation
              const args = paramSet.map((param: any) => {
                if (param && typeof param === "object" && "toString" in param) {
                  return param.toString();
                }
                return String(param);
              });

              // Generate test name by replacing $0, $1, $2, etc.
              let testName = t.testName;
              for (let j = 0; j < args.length; j++) {
                testName = testName.replace(new RegExp(`\\$${j}`, "g"), args[j]);
              }

              expandedTestMetadata.push({
                methodName: t.methodName,
                testName: testName,
                eachParams: [...paramSet],
                eachIndex: i,
              });
            }
          } else {
            // Static entry — pass through as-is
            expandedTestMetadata.push({
              methodName: t.methodName,
              testName: t.testName,
              eachParams: t.eachParams,
              eachIndex: t.eachIndex,
            });
          }
        }

        // Only use test methods marked with @test decorator
        // Methods starting with "test" are NOT automatically recognized as tests
        const allTestMethods = expandedTestMetadata.map((t) => ({
          methodName: t.methodName,
          testName: t.testName,
          eachParams: t.eachParams,
          eachIndex: t.eachIndex,
        }));

        // Register beforeAll hooks
        if (beforeAllMethods.length > 0) {
          pwTest.beforeAll(async () => {
            for (const methodName of beforeAllMethods) {
              // First check if it's an instance method on the prototype
              let isStaticMethod = false;
              let methodOwner: any = null;

              // Check for static method by walking up the class hierarchy
              let currentClass: any = target;
              while (
                currentClass &&
                currentClass !== Object &&
                currentClass !== Function.prototype
              ) {
                if (
                  Object.getOwnPropertyNames(currentClass).includes(
                    methodName,
                  ) &&
                  typeof currentClass[methodName] === "function"
                ) {
                  // Found as static method - use the class where it's defined
                  isStaticMethod = true;
                  methodOwner = currentClass;
                  break;
                }
                currentClass = Object.getPrototypeOf(currentClass);
              }

              if (isStaticMethod && methodOwner) {
                // Call static method on the owning class (not child class)
                await methodOwner[methodName]();
              } else {
                // Call as instance method
                const instance = new target();
                await (instance as any)[methodName]();
              }
            }
          });
        }

        // Register afterAll hooks
        if (afterAllMethods.length > 0) {
          pwTest.afterAll(async () => {
            for (const methodName of afterAllMethods) {
              // First check if it's an instance method on the prototype
              let isStaticMethod = false;
              let methodOwner: any = null;

              // Check for static method by walking up the class hierarchy
              let currentClass: any = target;
              while (
                currentClass &&
                currentClass !== Object &&
                currentClass !== Function.prototype
              ) {
                if (
                  Object.getOwnPropertyNames(currentClass).includes(
                    methodName,
                  ) &&
                  typeof currentClass[methodName] === "function"
                ) {
                  // Found as static method - use the class where it's defined
                  isStaticMethod = true;
                  methodOwner = currentClass;
                  break;
                }
                currentClass = Object.getPrototypeOf(currentClass);
              }

              if (isStaticMethod && methodOwner) {
                // Call static method on the owning class (not child class)
                await methodOwner[methodName]();
              } else {
                // Call as instance method
                const instance = new target();
                await (instance as any)[methodName]();
              }
            }
          });
        }

        // Register each test method as a test case
        for (const testMethod of allTestMethods) {
          const { methodName, testName, eachParams, eachIndex } = testMethod;

          // Try to create instance to access parameter values for test name transformation
          let tempInstance: any = null;
          try {
            tempInstance = new target();
          } catch (e) {
            // If instance creation fails (e.g., constructor requires specific state),
            // we'll use the test name as-is without parameter substitution
          }

          // Build the ParamContext by extracting actual property values
          // Walk up the prototype chain to collect all @param decorators (including inherited ones)
          const paramContext: ParamContext = {};

          if (tempInstance) {
            // Collect all property names from the instance (including inherited properties)
            const allProps = new Set<string>();
            let currentObj: any = tempInstance;

            while (currentObj && currentObj !== Object.prototype) {
              Object.getOwnPropertyNames(currentObj).forEach((prop) =>
                allProps.add(prop),
              );
              currentObj = Object.getPrototypeOf(currentObj);
            }

            // Now collect param metadata from all levels of the prototype chain
            const allMetadataParams: Record<
              string,
              {
                name: string;
                originalName: string;
                formatter?: (v: any) => string;
              }
            > = {};

            // First, collect params from the current class's metadata (from context.metadata)
            const currentClassParams = metadata?.params as
              | Record<string, any>
              | undefined;
            if (currentClassParams) {
              for (const [paramName, paramInfo] of Object.entries(
                currentClassParams,
              )) {
                allMetadataParams[paramName] = paramInfo;
              }
            }

            // Then collect params from parent classes via Symbol.metadata
            let currentProto: any = target.prototype;
            while (currentProto && currentProto !== Object.prototype) {
              const protoConstructor = currentProto.constructor;
              const protoMetadata = protoConstructor[Symbol.metadata];
              const protoParams = protoMetadata?.params as
                | Record<string, any>
                | undefined;

              if (protoParams) {
                // Add params from this level (child params take precedence)
                for (const [paramName, paramInfo] of Object.entries(
                  protoParams,
                )) {
                  if (!allMetadataParams[paramName]) {
                    allMetadataParams[paramName] = paramInfo;
                  }
                }
              }

              currentProto = Object.getPrototypeOf(currentProto);
            }

            // Build param context with values from instance
            for (const [paramName, paramInfo] of Object.entries(
              allMetadataParams,
            )) {
              if (tempInstance[paramInfo.originalName] !== undefined) {
                paramContext[paramName] = {
                  value: tempInstance[paramInfo.originalName],
                  formatter: paramInfo.formatter,
                };
              }
            }
          }

          // Transform test name with parameter values
          let transformedTestName = testName;
          try {
            transformedTestName = formatStringTemplate(
              testName,
              [],
              paramContext,
              [],
            );
          } catch (e) {
            // If transformation fails (e.g., missing parameter), use original test name
            // This can happen if test names reference parameters that aren't decorated yet
            transformedTestName = testName;
          }

          // Get metadata for this specific test method
          const methodTags = (metadata?.tags as any)?.[methodName] || [];
          const methodSkip = (metadata?.skipped as any)?.[methodName];
          const methodFixme = (metadata?.fixme as any)?.[methodName];
          const methodSlow = (metadata?.slow as any)?.[methodName];
          const methodAnnotations =
            (metadata?.annotations as any)?.[methodName] || [];
          const methodAttachments =
            (metadata?.attachments as any)?.[methodName] || [];
          const methodUse = (metadata?.methodUse as any)?.[methodName] || [];

          // Apply method-level @use configurations
          // Note: test.use() modifies the test in-place and returns void
          // Class-level @use is already applied at the describe level
          for (const useConfig of methodUse) {
            pwTest.use(useConfig.options);
          }

          const newPwTest = new Proxy(pwTest, {
            apply(target, thisArg, args) {
              const result = Reflect.apply(target, thisArg, args);
              return result;
            },
          });

          // Determine which test function to use
          let testFn = newPwTest;

          // Apply skip if needed (skip doesn't support conditional evaluation)
          if (methodSkip?.skip) {
            testFn = newPwTest.skip as any;
          }

          // Apply fixme if needed (without condition - conditional fixme is handled at runtime)
          if (methodFixme?.fixme && !methodFixme.condition) {
            testFn = newPwTest.fixme as any;
          }

          // Note: methodSlow with condition is handled at runtime inside the test wrapper
          // Note: methodFixme with condition is also handled at runtime inside the test wrapper

          // Determine which fixture keys to use
          const fixtureKeys = fixturesToExtract || [...DEFAULT_FIXTURE_KEYS];
          const pwSelfKeys = fixturesToExtract || [...DEFAULT_PWSELF_KEYS];
          
          // Create a test function with dynamic destructuring using Function constructor
          // This is necessary because Playwright requires explicit destructuring
          const fixtureParams = fixtureKeys.join(', ');
          const testFunctionCode = `
            return async function testWrapper({ ${fixtureParams} }) {
              const fixtures = { ${fixtureParams} };
              await testImplementation(fixtures);
            }
          `;
          
          const createTestFunction = new Function('testImplementation', testFunctionCode);
          
          const testImplementation = async (fixtures: Record<string, any>) => {
            const instance = Reflect.construct(target, []);

            // Dynamically inject requested fixtures into the instance
            for (const key of fixtureKeys) {
              (instance as any)[key] = fixtures[key];
            }

              // Get testInfo for annotations and attachments
              const testInfo = newPwTest.info();

              // Apply conditional fixme if needed
              if (methodFixme?.fixme && methodFixme.condition) {
                const shouldFixme = methodFixme.condition(instance);
                if (shouldFixme) {
                  testInfo.fixme(true, methodFixme.reason);
                }
              }

              // Apply slow if needed (conditional or unconditional)
              if (methodSlow?.slow) {
                if (methodSlow.condition) {
                  const shouldBeSlow = methodSlow.condition(instance);
                  if (shouldBeSlow) {
                    testInfo.slow(true, methodSlow.reason);
                  }
                } else {
                  testInfo.slow(true, methodSlow.reason);
                }
              }

              // Apply tags as annotations
              for (const tag of methodTags) {
                testInfo.annotations.push({
                  type: "tag",
                  description: `@${tag}`,
                });
              }

              // Apply custom annotations
              for (const annotation of methodAnnotations) {
                if (annotation.lazy) {
                  // Lazy annotation - evaluate the function with the instance
                  const result = annotation.fn(instance);

                  // Skip if result is null/undefined
                  if (!result) continue;

                  // Handle both single annotation and array of annotations
                  if (Array.isArray(result)) {
                    for (const ann of result) {
                      testInfo.annotations.push({
                        type: ann.type,
                        description: ann.description,
                      });
                    }
                  } else {
                    testInfo.annotations.push({
                      type: result.type,
                      description: result.description,
                    });
                  }
                } else {
                  // Static annotation
                  testInfo.annotations.push({
                    type: annotation.type,
                    description: annotation.description,
                  });
                }
              }

              // Apply attachments
              for (const attachment of methodAttachments) {
                if (attachment.lazy) {
                  // Lazy attachment - evaluate the function with the instance
                  const result = attachment.fn(instance);

                  // Validate result has required fields
                  if (result && typeof result === "object" && result.name) {
                    await testInfo.attach(result.name, {
                      path: result.path,
                      body: result.body,
                      contentType: result.contentType,
                    });
                  }
                } else {
                  // Static attachment
                  await testInfo.attach(attachment.name, {
                    path: attachment.path,
                    body: attachment.body,
                    contentType: attachment.contentType,
                  });
                }
              }

              // Expose Playwright fixtures for runtime access via pwSelf
              (instance as any).pwSelf = {};
              for (const key of pwSelfKeys) {
                (instance as any).pwSelf[key] = fixtures[key];
              }

              // Expose test.info() for runtime annotations and attachments
              (instance as any).testSelf = {
                info: newPwTest.info,
                use: newPwTest.use,
              };

              try {
                // Run beforeEach hooks
                for (const beforeEachMethod of beforeEachMethods) {
                  await (instance as any)[beforeEachMethod]();
                }

                // Get @before hooks for this specific test method
                const beforeHooks = (metadata?.beforeHooks as any)?.[methodName] || [];
                
                // Run @before hooks (reverse order since decorators are applied bottom-to-top)
                for (const beforeHook of [...beforeHooks].reverse()) {
                  await beforeHook(instance);
                }

                // Run the test method
                // If this test was created by @test.each, pass the parameters
                if (eachParams && Array.isArray(eachParams)) {
                  // Extract actual values from Serializable/formatter objects
                  const actualParams = eachParams.map((param) => {
                    // If it's a formatter object with __value property, extract the value
                    if (
                      param &&
                      typeof param === "object" &&
                      "__value" in param
                    ) {
                      return (param as any).__value;
                    }
                    // Otherwise use the param as-is
                    return param;
                  });
                  await (instance as any)[methodName](...actualParams);
                } else {
                  await (instance as any)[methodName]();
                }
              } finally {
                // Get @after hooks for this specific test method
                const afterHooks = (metadata?.afterHooks as any)?.[methodName] || [];
                
                // Run @after hooks (always run, even if test fails)
                // Reverse order since decorators are applied bottom-to-top
                for (const afterHook of [...afterHooks].reverse()) {
                  await afterHook(instance);
                }

                // Run afterEach hooks
                for (const afterEachMethod of afterEachMethods) {
                  await (instance as any)[afterEachMethod]();
                }
              }
            };
          
          // Call testFn with the dynamically created wrapper function
          testFn(transformedTestName, createTestFunction(testImplementation));
        }
      });
    };
  };
}

/**
 * Decorator for creating Playwright test suites from classes.
 *
 * Wraps a class in a `test.describe` block from Playwright, automatically converting
 * class methods into test cases. This provides an organized, object-oriented way to
 * structure test suites.
 *
 * **How it works:**
 * - Only methods decorated with `@test()` become test cases
 * - Methods decorated with `@beforeEach()` run before each test
 * - Methods decorated with `@beforeAll()` run once before all tests
 * - Methods decorated with `@afterEach()` run after each test
 * - Methods decorated with `@afterAll()` run once after all tests
 * - All other methods (including those starting with "test") are regular helper methods
 *
 * **Key Features:**
 * - Automatic test case generation from class methods
 * - Support for test lifecycle hooks
 * - Custom describe block names
 * - Works with `@param` and `@step` decorators
 * - Maintains `this` context across all methods
 * - Type-safe test organization
 *
 * @template Name - The name for the describe block
 * @template T - The class constructor type
 *
 * @param name - Optional custom name for the test suite. If not provided, uses the class name.
 *
 * @returns A decorator function that registers the class as a test suite
 *
 * @throws {Error} If used on non-class targets
 *
 * @example
 * // Basic usage with *\@test decorator
 * *\@describe()
 * class UserTests {
 *   *\@test()
 *   userLogin() {
 *     // This becomes a test case: "userLogin"
 *   }
 *
 *   *\@test()
 *   userLogout() {
 *     // This becomes a test case: "userLogout"
 *   }
 * }
 *
 * @example
 * // Custom describe block name and custom test names
 * *\@describe("User Authentication Tests")
 * class UserAuthTests {
 *   *\@test("Valid credentials should login")
 *   testValidCredentials() {
 *     // Test implementation
 *   }
 *
 *   *\@test("Invalid credentials should fail")
 *   testInvalidCredentials() {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Using lifecycle hooks
 * *\@describe("Shopping Cart Tests")
 * class CartTests {
 *   cart: any;
 *
 *   *\@beforeEach()
 *   setupCart() {
 *     this.cart = { items: [] };
 *   }
 *
 *   *\@afterEach()
 *   cleanupCart() {
 *     this.cart = null;
 *   }
 *
 *   *\@test()
 *   testAddItem() {
 *     this.cart.items.push({ id: 1 });
 *     expect(this.cart.items.length).toBe(1);
 *   }
 *
 *   *\@test()
 *   testRemoveItem() {
 *     this.cart.items.push({ id: 1 });
 *     this.cart.items.pop();
 *     expect(this.cart.items.length).toBe(0);
 *   }
 * }
 *
 * @example
 * // Using with *\@param and *\@step decorators
 * *\@describe("API Tests")
 * class ApiTests {
 *   *\@param("baseUrl")
 *   apiUrl: string = "https://api.example.com";
 *
 *   *\@step("Make request to $baseUrl/$0")
 *   async makeRequest(endpoint: string) {
 *     // Step implementation
 *   }
 *
 *   *\@test()
 *   async testGetUsers() {
 *     await this.makeRequest("users");
 *   }
 *
 *   *\@test()
 *   async testGetPosts() {
 *     await this.makeRequest("posts");
 *   }
 * }
 *
 * @example
 * // Helper methods (non-test methods)
 * *\@describe("E2E Tests")
 * class E2ETests {
 *   // Helper method - not a test case
 *   async login(username: string, password: string) {
 *     // Login implementation
 *   }
 *
 *   // This is a test case (must use *\@test decorator)
 *   *\@test()
 *   async testUserFlow() {
 *     await this.login("user", "pass");
 *     // Rest of test
 *   }
 * }
 *
 * @example
 * // Using beforeAll and afterAll
 * *\@describe("Database Tests")
 * class DatabaseTests {
 *   static connection: any;
 *
 *   *\@beforeAll()
 *   static setupDatabase() {
 *     DatabaseTests.connection = connectToDatabase();
 *   }
 *
 *   *\@afterAll()
 *   static teardownDatabase() {
 *     DatabaseTests.connection.close();
 *   }
 *
 *   *\@test()
 *   testQuery() {
 *     const result = DatabaseTests.connection.query("SELECT * FROM users");
 *     expect(result).toBeDefined();
 *   }
 * }
 *
 * @see {@link step} - Decorator for creating test steps within methods
 * @see {@link param} - Decorator for named parameters in step templates
 */
export const describe = makeDescribe(baseTest);
