/**
 * Lifecycle decorators for test setup and teardown.
 *
 * These decorators mark methods to be executed at specific points in the test lifecycle
 * when used with the @describe decorator. They provide a declarative way to define
 * setup and cleanup logic for test suites.
 */

/**
 * Marks a method to run before each test in the suite.
 *
 * When a method is decorated with `@beforeEach`, it will be executed before every
 * test case in the class. This is useful for:
 * - Setting up test data
 * - Initializing state
 * - Resetting counters or flags
 * - Creating fresh instances of dependencies
 *
 * **Key Features:**
 * - Runs before each individual test
 * - Can access and modify instance properties
 * - Multiple `@beforeEach` methods are supported (all will run)
 * - Executes in the order they appear in the class
 * - Can be async
 *
 * **Restrictions:**
 * - Cannot be used on static methods (use `@beforeAll` for static setup)
 * - Cannot be used on private methods (marked with #)
 * - Must be a class method (not a field)
 *
 * **Note:** The method name doesn't matter when using the decorator.
 * The decorator identifies the method as a beforeEach hook regardless of its name.
 *
 * @example
 * // Basic usage
 * *\@describe("User Tests")
 * class UserTests {
 *   user: any;
 *
 *   *\@beforeEach()
 *   async setupUser() {
 *     this.user = { id: 1, name: "John" };
 *   }
 *
 *   testUserName() {
 *     expect(this.user.name).toBe("John");
 *   }
 * }
 *
 * @example
 * // Multiple beforeEach hooks
 * *\@describe("Database Tests")
 * class DatabaseTests {
 *   connection: any;
 *   transaction: any;
 *
 *   *\@beforeEach()
 *   async connectToDatabase() {
 *     this.connection = await connect();
 *   }
 *
 *   *\@beforeEach()
 *   async startTransaction() {
 *     this.transaction = await this.connection.beginTransaction();
 *   }
 *
 *   testQuery() {
 *     // Both setup methods have run
 *     expect(this.connection).toBeDefined();
 *     expect(this.transaction).toBeDefined();
 *   }
 * }
 *
 * @example
 * // With cleanup
 * *\@describe("File Tests")
 * class FileTests {
 *   tempFile: string;
 *
 *   *\@beforeEach()
 *   createTempFile() {
 *     this.tempFile = `/tmp/test-${Date.now()}.txt`;
 *   }
 *
 *   *\@afterEach()
 *   deleteTempFile() {
 *     // Cleanup after each test
 *     fs.unlinkSync(this.tempFile);
 *   }
 *
 *   testFileCreation() {
 *     fs.writeFileSync(this.tempFile, "test");
 *     expect(fs.existsSync(this.tempFile)).toBe(true);
 *   }
 * }
 *
 * @see {@link describe} - The decorator that recognizes lifecycle hooks
 * @see {@link afterEach} - Cleanup after each test
 * @see {@link beforeAll} - Setup once before all tests
 */
export function beforeEach() {
  return function (
    target: any,
    context: ClassMethodDecoratorContext | ClassFieldDecoratorContext,
  ) {
    // Validation: must be a method, not static, not private
    if (context.kind !== "method") {
      throw new Error(
        `@beforeEach can only be used on methods. Cannot decorate ${String(context.name)}.`,
      );
    }

    if (context.static) {
      throw new Error(
        `@beforeEach cannot be used on static methods. Use @beforeAll for static setup. Method: ${String(context.name)}`,
      );
    }

    if (context.private) {
      throw new Error(
        `@beforeEach cannot be used on private methods. Method: ${String(context.name)}`,
      );
    }

    if (!context.metadata.beforeEach) {
      context.metadata.beforeEach = [];
    }
    (context.metadata.beforeEach as string[]).push(context.name as string);
  };
}

/**
 * Marks a method to run before all tests in the suite.
 *
 * When a method is decorated with `@beforeAll`, it will be executed once before
 * any test cases run. This is useful for:
 * - Expensive setup operations
 * - Database connections
 * - Starting servers
 * - Loading configuration
 * - One-time resource allocation
 *
 * **Key Features:**
 * - Runs once before all tests
 * - Can set up static/shared resources
 * - Multiple `@beforeAll` methods are supported
 * - Executes in the order they appear in the class
 * - Can be async
 *
 * **Restrictions:**
 * - Can be used on both static and instance methods
 * - Cannot be used on private methods (marked with #)
 * - Must be a class method (not a field)
 *
 * **Important:** Since beforeAll runs before any test instances are created,
 * it typically works with static properties or side effects.
 *
 * @example
 * // Basic usage
 * *\@describe("API Tests")
 * class ApiTests {
 *   static server: any;
 *
 *   *\@beforeAll()
 *   static async startServer() {
 *     this.server = await createServer();
 *     await this.server.listen(3000);
 *   }
 *
 *   *\@afterAll()
 *   static async stopServer() {
 *     await this.server.close();
 *   }
 *
 *   testServerRunning() {
 *     expect(ApiTests.server).toBeDefined();
 *   }
 * }
 *
 * @example
 * // Database setup
 * *\@describe("Database Tests")
 * class DatabaseTests {
 *   static db: any;
 *
 *   *\@beforeAll()
 *   static async setupDatabase() {
 *     this.db = await connectToDatabase();
 *     await this.db.migrate();
 *   }
 *
 *   *\@afterAll()
 *   static async teardownDatabase() {
 *     await this.db.rollback();
 *     await this.db.disconnect();
 *   }
 *
 *   testDatabaseConnection() {
 *     expect(DatabaseTests.db.isConnected()).toBe(true);
 *   }
 * }
 *
 * @example
 * // Loading test data
 * *\@describe("User Tests")
 * class UserTests {
 *   static testUsers: any[];
 *
 *   *\@beforeAll()
 *   static loadTestUsers() {
 *     this.testUsers = JSON.parse(fs.readFileSync("test-users.json"));
 *   }
 *
 *   *\@test()
 *   testUserCount() {
 *     expect(UserTests.testUsers.length).toBeGreaterThan(0);
 *   }
 * }
 *
 * @see {@link describe} - The decorator that recognizes lifecycle hooks
 * @see {@link afterAll} - Cleanup after all tests
 * @see {@link beforeEach} - Setup before each test
 */
export function beforeAll<F extends (...args: any[]) => any, const T>() {
  return function (target: F, context: ClassMethodDecoratorContext<T, F>) {
    // Validation: must be a method, not private
    if (context.kind !== "method") {
      throw new Error(
        `@beforeAll can only be used on methods. Cannot decorate ${String(context.name)}.`,
      );
    }

    if (context.private) {
      throw new Error(
        `@beforeAll cannot be used on private methods. Method: ${String(context.name)}`,
      );
    }

    if (!context.metadata.beforeAll) {
      context.metadata.beforeAll = [];
    }
    (context.metadata.beforeAll as string[]).push(context.name as string);
  };
}

/**
 * Marks a method to run after each test in the suite.
 *
 * When a method is decorated with `@afterEach`, it will be executed after every
 * test case completes. This is useful for:
 * - Cleaning up test data
 * - Resetting state
 * - Closing connections
 * - Deleting temporary files
 * - Releasing resources
 *
 * **Key Features:**
 * - Runs after each individual test
 * - Executes even if the test fails
 * - Can access instance properties
 * - Multiple `@afterEach` methods are supported
 * - Executes in the order they appear in the class
 * - Can be async
 *
 * **Restrictions:**
 * - Cannot be used on static methods (use `@afterAll` for static cleanup)
 * - Cannot be used on private methods (marked with #)
 * - Must be a class method (not a field)
 *
 * **Important:** afterEach always runs, even if the test throws an error,
 * ensuring cleanup happens consistently.
 *
 * @example
 * // Basic cleanup
 * *\@describe("File Tests")
 * class FileTests {
 *   tempFile: string;
 *
 *   *\@beforeEach()
 *   createFile() {
 *     this.tempFile = `/tmp/test-${Date.now()}.txt`;
 *     fs.writeFileSync(this.tempFile, "");
 *   }
 *
 *   *\@afterEach()
 *   deleteFile() {
 *     if (fs.existsSync(this.tempFile)) {
 *       fs.unlinkSync(this.tempFile);
 *     }
 *   }
 *
 *   testFileOperations() {
 *     fs.writeFileSync(this.tempFile, "data");
 *     expect(fs.readFileSync(this.tempFile, "utf8")).toBe("data");
 *   }
 * }
 *
 * @example
 * // Multiple cleanup operations
 * *\@describe("Resource Tests")
 * class ResourceTests {
 *   connection: any;
 *   cache: any;
 *
 *   *\@beforeEach()
 *   setup() {
 *     this.connection = openConnection();
 *     this.cache = new Cache();
 *   }
 *
 *   *\@afterEach()
 *   closeConnection() {
 *     this.connection?.close();
 *   }
 *
 *   *\@afterEach()
 *   clearCache() {
 *     this.cache?.clear();
 *   }
 *
 *   testResourceUsage() {
 *     this.cache.set("key", "value");
 *     expect(this.cache.get("key")).toBe("value");
 *   }
 * }
 *
 * @example
 * // Cleanup runs even on test failure
 * *\@describe("Error Tests")
 * class ErrorTests {
 *   resource: any;
 *
 *   *\@beforeEach()
 *   allocateResource() {
 *     this.resource = allocate();
 *   }
 *
 *   *\@afterEach()
 *   releaseResource() {
 *     // This runs even if test fails
 *     this.resource?.release();
 *   }
 *
 *   testThatFails() {
 *     throw new Error("Test error");
 *     // afterEach still runs
 *   }
 * }
 *
 * @see {@link describe} - The decorator that recognizes lifecycle hooks
 * @see {@link beforeEach} - Setup before each test
 * @see {@link afterAll} - Cleanup after all tests
 */
export function afterEach() {
  return function (
    target: any,
    context: ClassMethodDecoratorContext | ClassFieldDecoratorContext,
  ) {
    // Validation: must be a method, not static, not private
    if (context.kind !== "method") {
      throw new Error(
        `@afterEach can only be used on methods. Cannot decorate ${String(context.name)}.`,
      );
    }

    if (context.static) {
      throw new Error(
        `@afterEach cannot be used on static methods. Use @afterAll for static cleanup. Method: ${String(context.name)}`,
      );
    }

    if (context.private) {
      throw new Error(
        `@afterEach cannot be used on private methods. Method: ${String(context.name)}`,
      );
    }

    if (!context.metadata.afterEach) {
      context.metadata.afterEach = [];
    }
    (context.metadata.afterEach as string[]).push(context.name as string);
  };
}

/**
 * Marks a method to run after all tests in the suite.
 *
 * When a method is decorated with `@afterAll`, it will be executed once after
 * all test cases have completed. This is useful for:
 * - Closing database connections
 * - Stopping servers
 * - Cleaning up shared resources
 * - Deleting test data
 * - Releasing expensive resources
 *
 * **Key Features:**
 * - Runs once after all tests
 * - Executes even if tests fail
 * - Can clean up static/shared resources
 * - Multiple `@afterAll` methods are supported
 * - Executes in the order they appear in the class
 * - Can be async
 *
 * **Restrictions:**
 * - Can be used on both static and instance methods
 * - Cannot be used on private methods (marked with #)
 * - Must be a class method (not a field)
 *
 * **Important:** afterAll runs after all tests complete, making it ideal
 * for expensive cleanup operations that should happen once.
 *
 * @example
 * // Server cleanup
 * *\@describe("Server Tests")
 * class ServerTests {
 *   static server: any;
 *
 *   *\@beforeAll()
 *   static async startServer() {
 *     this.server = await createServer();
 *     await this.server.listen(3000);
 *   }
 *
 *   *\@afterAll()
 *   static async stopServer() {
 *     await this.server.close();
 *   }
 *
 *   testServerEndpoint() {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Database cleanup
 * *\@describe("Integration Tests")
 * class IntegrationTests {
 *   static database: any;
 *
 *   *\@beforeAll()
 *   static async setupDatabase() {
 *     this.database = await connect();
 *     await this.database.seed();
 *   }
 *
 *   *\@afterAll()
 *   static async cleanupDatabase() {
 *     await this.database.truncate();
 *     await this.database.close();
 *   }
 *
 *   testDatabaseQuery() {
 *     // Test implementation
 *   }
 * }
 *
 * @example
 * // Multiple cleanup operations
 * *\@describe("E2E Tests")
 * class E2ETests {
 *   static browser: any;
 *   static testData: any;
 *
 *   *\@beforeAll()
 *   static async setup() {
 *     this.browser = await launchBrowser();
 *     this.testData = await loadTestData();
 *   }
 *
 *   *\@afterAll()
 *   static async closeBrowser() {
 *     await this.browser.close();
 *   }
 *
 *   *\@afterAll()
 *   static async cleanupTestData() {
 *     await this.testData.cleanup();
 *   }
 *
 *   testPageLoad() {
 *     // Test implementation
 *   }
 * }
 *
 * @see {@link describe} - The decorator that recognizes lifecycle hooks
 * @see {@link beforeAll} - Setup before all tests
 * @see {@link afterEach} - Cleanup after each test
 */
export function afterAll() {
  return function (
    target: any,
    context: ClassMethodDecoratorContext | ClassFieldDecoratorContext,
  ) {
    // Validation: must be a method, not private
    if (context.kind !== "method") {
      throw new Error(
        `@afterAll can only be used on methods. Cannot decorate ${String(context.name)}.`,
      );
    }

    if (context.private) {
      throw new Error(
        `@afterAll cannot be used on private methods. Method: ${String(context.name)}`,
      );
    }

    if (!context.metadata.afterAll) {
      context.metadata.afterAll = [];
    }
    (context.metadata.afterAll as string[]).push(context.name as string);
  };
}
