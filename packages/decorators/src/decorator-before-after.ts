/**
 * Decorators for individual test-level before/after hooks.
 * 
 * These decorators allow you to define setup and cleanup logic that runs
 * before and after a specific test method, providing more granular control
 * than `@beforeEach` and `@afterEach`.
 *
 * **Lifecycle order:**
 * 1. `@beforeAll` (once per class)
 * 2. `@beforeEach` (before each test)
 * 3. `@before` (before the specific test)
 * 4. test method
 * 5. `@after` (after the specific test)
 * 6. `@afterEach` (after each test)
 * 7. `@afterAll` (once per class)
 *
 * **Key Features:**
 * - Test-specific setup and cleanup
 * - Access to test instance via `self` parameter
 * - Runs even if the test fails (for cleanup)
 * - Can be combined with other lifecycle decorators
 * - Type-safe with full TypeScript support
 */

/**
 * `@before` decorator for test-specific setup.
 *
 * Runs before the decorated test method, after `@beforeEach` hooks.
 * Useful for test-specific initialization that doesn't apply to all tests.
 *
 * **Key Features:**
 * - Runs after `@beforeEach` but before the test
 * - Access to test instance and its properties
 * - Can be async
 * - Only applies to the specific test method
 *
 * @param fn - Function that runs before the test, receives test instance as parameter
 *
 * @returns A decorator function that registers the before hook
 *
 * @throws {Error} If used on non-method targets
 * @throws {Error} If used on methods not decorated with `@test`
 *
 * @example
 * // Basic usage
 * *\@describe("Database Tests")
 * class DatabaseTests extends BaseTest {
 *   *\@test("should create user")
 *   *\@before((self) => {
 *     console.log("Setting up test data");
 *     self.testUser = { name: "Test User", email: "test@example.com" };
 *   })
 *   async testCreateUser() {
 *     const user = await createUser(this.testUser);
 *     expect(user.id).toBeDefined();
 *   }
 * }
 *
 * @example
 * // Async before hook
 * *\@describe("API Tests")
 * class ApiTests extends BaseTest {
 *   *\@test("should fetch data")
 *   *\@before(async (self) => {
 *     self.authToken = await getAuthToken();
 *     self.apiClient = new ApiClient(self.authToken);
 *   })
 *   async testFetchData() {
 *     const data = await this.apiClient.fetchData();
 *     expect(data).toBeDefined();
 *   }
 * }
 *
 * @example
 * // Multiple tests with different before hooks
 * *\@describe("E2E Tests")
 * class E2ETests extends BaseTest {
 *   *\@test("admin test")
 *   *\@before((self) => {
 *     self.user = { role: "admin" };
 *   })
 *   async testAdminFlow() {
 *     expect(this.user.role).toBe("admin");
 *   }
 *
 *   *\@test("user test")
 *   *\@before((self) => {
 *     self.user = { role: "user" };
 *   })
 *   async testUserFlow() {
 *     expect(this.user.role).toBe("user");
 *   }
 * }
 *
 * @example
 * // Combining with @after
 * *\@describe("Resource Tests")
 * class ResourceTests extends BaseTest {
 *   *\@test("should use resource")
 *   *\@before(async (self) => {
 *     self.resource = await acquireResource();
 *     console.log("Resource acquired");
 *   })
 *   *\@after(async (self) => {
 *     await self.resource.release();
 *     console.log("Resource released");
 *   })
 *   async testWithResource() {
 *     await this.resource.doSomething();
 *     expect(this.resource.isActive()).toBe(true);
 *   }
 * }
 *
 * @see {@link after} - Decorator for test-specific cleanup
 * @see {@link beforeEach} - Decorator for setup before each test
 * @see {@link test} - Decorator for test methods
 */
export function before<T>(
  fn: (self: T) => void | Promise<void>,
): (target: any, context: ClassMethodDecoratorContext<T, any>) => void {
  // Validation 1: Check if fn is provided
  if (fn === undefined || fn === null) {
    throw new Error(
      `@before decorator requires a hook function. Usage: @before(async (self) => { /* setup code */ })`
    );
  }

  // Validation 2: Check if fn is a function
  if (typeof fn !== 'function') {
    throw new Error(
      `@before decorator requires a function, got ${typeof fn}. Usage: @before(async (self) => { /* setup code */ })`
    );
  }

  // Validation 3: Check function arity (should accept at least 1 parameter)
  if (fn.length === 0) {
    console.warn(
      `⚠️  @before decorator: Hook function has no parameters. It should accept 'self' parameter to access test instance. Usage: @before(async (self) => { /* use self */ })`
    );
  }

  return function (target: any, context: ClassMethodDecoratorContext<T, any>) {
    // Validation 4: Check context exists
    if (!context) {
      throw new Error(
        `@before decorator: Invalid decorator context. This decorator must be used with TC39 decorators.`
      );
    }

    // Validation 5: Check context.kind
    if (context.kind !== "method") {
      throw new Error(
        `@before decorator can only be used on methods. Got: ${context.kind}. ` +
        `This decorator is for test-specific setup hooks that run before individual test methods.`
      );
    }

    // Validation 6: Check metadata exists
    if (!context.metadata) {
      throw new Error(
        `@before decorator: Method context is missing metadata. Ensure you're using a compatible decorator system.`
      );
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.beforeHooks) {
      context.metadata.beforeHooks = {};
    }

    const methodName = context.name as string;

    // Validation 7: Check method name
    if (!methodName) {
      throw new Error(
        `@before decorator: Unable to determine method name from context.`
      );
    }

    // Initialize array for this method's before hooks
    if (!(context.metadata.beforeHooks as any)[methodName]) {
      (context.metadata.beforeHooks as any)[methodName] = [];
    }

    const hooks = (context.metadata.beforeHooks as any)[methodName];

    // Validation 8: Check for duplicate hooks (same function reference)
    if (hooks.includes(fn)) {
      console.warn(
        `⚠️  @before decorator: The same hook function is registered multiple times on method '${methodName}'. This may be unintentional.`
      );
    }

    // Validation 9: Warn about too many hooks
    if (hooks.length >= 10) {
      console.warn(
        `⚠️  @before decorator: Method '${methodName}' has ${hooks.length + 1} @before hooks. This may indicate overly complex test setup.`
      );
    }

    // Store the before hook function
    hooks.push(fn);

    return target;
  };
}

/**
 * `@after` decorator for test-specific cleanup.
 *
 * Runs after the decorated test method, before `@afterEach` hooks.
 * Useful for test-specific cleanup that doesn't apply to all tests.
 * Runs even if the test fails, ensuring cleanup always happens.
 *
 * **Key Features:**
 * - Runs before `@afterEach` but after the test
 * - Always executes, even if test fails
 * - Access to test instance and its properties
 * - Can be async
 * - Only applies to the specific test method
 *
 * @param fn - Function that runs after the test, receives test instance as parameter
 *
 * @returns A decorator function that registers the after hook
 *
 * @throws {Error} If used on non-method targets
 * @throws {Error} If used on methods not decorated with `@test`
 *
 * @example
 * // Basic usage
 * *\@describe("File Tests")
 * class FileTests extends BaseTest {
 *   *\@test("should create file")
 *   *\@after((self) => {
 *     if (self.createdFile) {
 *       fs.unlinkSync(self.createdFile);
 *       console.log("Cleaned up file");
 *     }
 *   })
 *   async testCreateFile() {
 *     this.createdFile = await createTempFile();
 *     expect(fs.existsSync(this.createdFile)).toBe(true);
 *   }
 * }
 *
 * @example
 * // Async after hook
 * *\@describe("Connection Tests")
 * class ConnectionTests extends BaseTest {
 *   *\@test("should connect")
 *   *\@after(async (self) => {
 *     if (self.connection) {
 *       await self.connection.close();
 *       console.log("Connection closed");
 *     }
 *   })
 *   async testConnection() {
 *     this.connection = await openConnection();
 *     expect(this.connection.isOpen()).toBe(true);
 *   }
 * }
 *
 * @example
 * // Cleanup that runs even on test failure
 * *\@describe("Transaction Tests")
 * class TransactionTests extends BaseTest {
 *   *\@test("should rollback on error")
 *   *\@before(async (self) => {
 *     self.transaction = await db.beginTransaction();
 *   })
 *   *\@after(async (self) => {
 *     // This runs even if test throws
 *     if (self.transaction.isActive()) {
 *       await self.transaction.rollback();
 *       console.log("Transaction rolled back");
 *     }
 *   })
 *   async testTransaction() {
 *     await this.transaction.insert({ name: "test" });
 *     throw new Error("Simulated failure");
 *   }
 * }
 *
 * @example
 * // Multiple cleanup steps
 * *\@describe("Cleanup Tests")
 * class CleanupTests extends BaseTest {
 *   *\@test("should cleanup multiple resources")
 *   *\@before(async (self) => {
 *     self.resources = [];
 *     self.resources.push(await acquireResource1());
 *     self.resources.push(await acquireResource2());
 *   })
 *   *\@after(async (self) => {
 *     for (const resource of self.resources) {
 *       await resource.release();
 *     }
 *     console.log("All resources cleaned up");
 *   })
 *   async testMultipleResources() {
 *     expect(this.resources).toHaveLength(2);
 *   }
 * }
 *
 * @see {@link before} - Decorator for test-specific setup
 * @see {@link afterEach} - Decorator for cleanup after each test
 * @see {@link test} - Decorator for test methods
 */
export function after<T>(
  fn: (self: T) => void | Promise<void>,
): (target: any, context: ClassMethodDecoratorContext<T, any>) => void {
  // Validation 1: Check if fn is provided
  if (fn === undefined || fn === null) {
    throw new Error(
      `@after decorator requires a hook function. Usage: @after(async (self) => { /* cleanup code */ })`
    );
  }

  // Validation 2: Check if fn is a function
  if (typeof fn !== 'function') {
    throw new Error(
      `@after decorator requires a function, got ${typeof fn}. Usage: @after(async (self) => { /* cleanup code */ })`
    );
  }

  // Validation 3: Check function arity (should accept at least 1 parameter)
  if (fn.length === 0) {
    console.warn(
      `⚠️  @after decorator: Hook function has no parameters. It should accept 'self' parameter to access test instance. Usage: @after(async (self) => { /* use self */ })`
    );
  }

  return function (target: any, context: ClassMethodDecoratorContext<T, any>) {
    // Validation 4: Check context exists
    if (!context) {
      throw new Error(
        `@after decorator: Invalid decorator context. This decorator must be used with TC39 decorators.`
      );
    }

    // Validation 5: Check context.kind
    if (context.kind !== "method") {
      throw new Error(
        `@after decorator can only be used on methods. Got: ${context.kind}. ` +
        `This decorator is for test-specific cleanup hooks that run after individual test methods.`
      );
    }

    // Validation 6: Check metadata exists
    if (!context.metadata) {
      throw new Error(
        `@after decorator: Method context is missing metadata. Ensure you're using a compatible decorator system.`
      );
    }

    // Initialize metadata if it doesn't exist
    if (!context.metadata.afterHooks) {
      context.metadata.afterHooks = {};
    }

    const methodName = context.name as string;

    // Validation 7: Check method name
    if (!methodName) {
      throw new Error(
        `@after decorator: Unable to determine method name from context.`
      );
    }

    // Initialize array for this method's after hooks
    if (!(context.metadata.afterHooks as any)[methodName]) {
      (context.metadata.afterHooks as any)[methodName] = [];
    }

    const hooks = (context.metadata.afterHooks as any)[methodName];

    // Validation 8: Check for duplicate hooks (same function reference)
    if (hooks.includes(fn)) {
      console.warn(
        `⚠️  @after decorator: The same hook function is registered multiple times on method '${methodName}'. This may be unintentional.`
      );
    }

    // Validation 9: Warn about too many hooks
    if (hooks.length >= 10) {
      console.warn(
        `⚠️  @after decorator: Method '${methodName}' has ${hooks.length + 1} @after hooks. This may indicate overly complex test cleanup.`
      );
    }

    // Store the after hook function
    hooks.push(fn);

    return target;
  };
}
