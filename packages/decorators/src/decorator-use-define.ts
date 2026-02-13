/**
 * Options for defining a fixture with `@use.define` decorator
 */
export interface UseDefineOptions {
  /**
   * Whether the fixture should be automatically set up for every test.
   * Default: false for methods, true for fields and getters
   */
  auto?: boolean;

  /**
   * Scope of the fixture - 'test' or 'worker'
   * Default: 'test'
   */
  scope?: 'test' | 'worker';

  /**
   * Whether the fixture should be boxed (hidden from test reports)
   * Default: false
   */
  box?: boolean | 'self';

  /**
   * Custom title for the fixture in test reports
   */
  title?: string;

  /**
   * Timeout for the fixture setup/teardown in milliseconds
   * @deprecated Use `@timeout` decorator instead
   */
  timeout?: number;
}

/**
 * Metadata stored for each defined fixture
 */
export interface FixtureDefinition {
  name: string;
  type: 'field' | 'getter' | 'method';
  options: UseDefineOptions;
  initialValue?: any;
}

/**
 * `@use.define` decorator for defining Playwright fixtures in a declarative way.
 *
 * This decorator allows you to define fixtures using class properties, getters, or methods,
 * providing a more readable alternative to the traditional Playwright fixture definition pattern.
 *
 * **Key Features:**
 * - Define fixtures using fields, getters, or methods
 * - Automatic fixtures with `auto: true`
 * - Worker-scoped fixtures with `scope: 'worker'`
 * - Cleanup functions for teardown logic
 * - Box fixtures to hide from test reports
 * - Custom titles and timeouts
 *
 * **How it works:**
 * - Fields and getters: Automatically set to `auto: true` (boxed fixtures)
 * - Methods: Set to `auto: false` by default, use `await use()` pattern from Playwright
 * - Cleanup: Use the `cleanup` option for teardown logic
 *
 * @param options - Configuration options for the fixture
 *
 * @returns A decorator function that marks the member as a fixture definition
 *
 * @example
 * // Field fixture (boxed, auto)
 * *\@describe()
 * class MyTests extends BaseTest {
 *   *\@use.define({ box: true })
 *   apiKey = "test-api-key-123";
 *
 *   *\@test("should use API key")
 *   async testApi() {
 *     // this.apiKey is available
 *   }
 * }
 *
 * @example
 * // Getter fixture (auto)
 * *\@describe()
 * class ConfigTests extends BaseTest {
 *   *\@use.define({ auto: true })
 *   get config() {
 *     return {
 *       apiUrl: "https://api.example.com",
 *       timeout: 5000
 *     };
 *   }
 *
 *   *\@test("should use config")
 *   async testWithConfig() {
 *     // this.config is available
 *   }
 * }
 *
 * @example
 * // Method fixture with cleanup using *\@after decorator
 * *\@describe()
 * class LogTests extends BaseTest {
 *   *\@use.define({ auto: true })
 *   *\@after(async (self) => {
 *     if (self.testInfo.status !== self.testInfo.expectedStatus) {
 *       const logFile = self.testInfo.outputPath("logs.txt");
 *       await fs.promises.writeFile(logFile, self.logs.join("\\n"), "utf8");
 *       self.testInfo.attachments.push({
 *         name: "logs",
 *         contentType: "text/plain",
 *         path: logFile
 *       });
 *     }
 *   })
 *   async setupLogging() {
 *     this.logs = [];
 *     debug.log = (...args) => this.logs.push(args.map(String).join(""));
 *     debug.enable("myserver");
 *   }
 *
 *   *\@test("test with logging")
 *   async testWithLogs() {
 *     // Logging is automatically set up and cleaned up via *\@after
 *   }
 * }
 *
 * @example
 * // Worker-scoped fixture
 * *\@describe()
 * class DatabaseTests extends BaseTest {
 *   *\@use.define({ scope: 'worker', timeout: 60000 })
 *   async database() {
 *     const db = await connectToDatabase();
 *     // Setup expensive database connection
 *     return db;
 *   }
 *
 *   *\@test("should query database")
 *   async testQuery() {
 *     const result = await this.database.query("SELECT * FROM users");
 *   }
 * }
 *
 * @example
 * // Multiple fixtures with cleanup
 * *\@describe()
 * class E2ETests extends BaseTest {
 *   *\@use.define()
 *   defaultUser = { name: "Test User", email: "test@example.com" };
 *
 *   *\@use.define({ auto: true })
 *   get authToken() {
 *     return generateAuthToken(this.defaultUser);
 *   }
 *
 *   *\@use.define()
 *   *\@after(async (self) => {
 *     await self.clearCookies();
 *   })
 *   async setupAuth() {
 *     await this.page.goto("/login");
 *     await this.page.fill("#token", this.authToken);
 *     await this.page.click("#login");
 *   }
 *
 *   *\@test("authenticated test")
 *   async testWithAuth() {
 *     // All fixtures are available, cleanup handled by *\@after
 *   }
 * }
 *
 * @see {@link use} - Decorator for using fixtures
 * @see {@link describe} - Decorator that processes fixture definitions
 */
export function define(options: UseDefineOptions = {}) {
  return function (
    target: any,
    context: ClassFieldDecoratorContext | ClassGetterDecoratorContext | ClassMethodDecoratorContext,
  ) {
    const memberName = context.name as string;

    // Determine the member type
    let memberType: 'field' | 'getter' | 'method';
    if (context.kind === 'field') {
      memberType = 'field';
    } else if (context.kind === 'getter') {
      memberType = 'getter';
    } else if (context.kind === 'method') {
      memberType = 'method';
    } else {
      throw new Error(`@use.define can only be used on fields, getters, or methods`);
    }

    // Set default options based on member type
    const finalOptions: UseDefineOptions = {
      scope: 'test',
      box: false,
      ...options,
      // Fields and getters default to auto: true, methods default to auto: false
      auto: options.auto !== undefined ? options.auto : memberType !== 'method',
    };

    // Initialize metadata if it doesn't exist
    if (!context.metadata.fixtureDefinitions) {
      context.metadata.fixtureDefinitions = [];
    }

    // Store the fixture definition
    const definition: FixtureDefinition = {
      name: memberName,
      type: memberType,
      options: finalOptions,
    };

    // For fields, we need to capture the initial value
    if (context.kind === 'field') {
      context.addInitializer(function (this: any) {
        // Store the initial value after field initialization
        const initialValue = this[memberName];
        const definitions = (context.metadata.fixtureDefinitions as FixtureDefinition[]);
        const def = definitions.find(d => d.name === memberName);
        if (def) {
          def.initialValue = initialValue;
        }
      });
    }

    (context.metadata.fixtureDefinitions as FixtureDefinition[]).push(definition);

    return target;
  };
}

/**
 * Namespace object that holds the `define` decorator
 */
export const useDefineNamespace = {
  define,
};
