import { type Formatter } from "./formatStringTemplate";

/**
 * Represents the context for a parameter used in step name formatting.
 *
 * @template Value - The type of the parameter value
 *
 * @property name - The name used in the step template (e.g., "username")
 * @property originalName - The original property name in the class
 * @property value - The actual value of the parameter at runtime
 * @property formatter - The function used to format the value as a string
 */
export type ParamContext<Value> = {
  name: string;
  originalName: string;
  value: Value;
  formatter: Formatter<Value>;
};

/**
 * A map of parameter names to their contexts, used by the @step decorator
 * to resolve named placeholders like `$username` in step templates.
 */
export type ParamContextMap = Record<string, ParamContext<any>>;

/**
 * Decorator for marking class properties as named parameters for use in `@step` and `@test` templates.
 *
 * When a property is decorated with `@param`, it can be referenced in `@step` and `@test` templates
 * using the `$name` syntax. The decorator allows you to:
 * - Give the parameter a custom name for use in templates
 * - Apply custom formatting to control how the value appears in step names
 * - Use class properties dynamically in test step descriptions
 *
 * **Key Features:**
 * - Works seamlessly with the `@step` and `@test` decorators
 * - Supports custom formatters for value transformation
 * - Type-safe parameter names (prevents spaces in names)
 * - Automatically uses property name if no custom name provided
 * - Values are resolved at runtime when the method is called
 *
 * **Limitations:**
 * - Cannot be used on static properties
 * - Cannot be used on private properties
 * - Parameter names cannot contain spaces
 * - Requires the class to have metadata support (automatic in decorators)
 *
 * @template Name - The custom name for the parameter (must not contain spaces)
 * @template TT - The class type
 * @template V - The type of the property value
 * @template F - The formatter function type
 *
 * @param name - Optional custom name for the parameter. If not provided, uses the property name.
 *               Must be a single word without spaces.
 * @param formatter - Optional function to format the value as a string. Defaults to String().
 *
 * @returns A decorator function that registers the parameter for use in `@step` templates
 *
 * @throws {Error} If used on static properties
 * @throws {Error} If used on private properties
 * @throws {Error} If the class doesn't support metadata
 *
 * @example
 * // Basic usage with default property name
 * class UserActions {
 *   *\@param()
 *   username: string = "john_doe";
 *
 *   *\@step("Login as $username")
 *   async login() {
 *     // Step will display: "Login as john_doe"
 *   }
 * }
 *
 * @example
 * // Custom parameter name
 * class UserActions {
 *   *\@param("user")
 *   userName: string = "john_doe";
 *
 *   *\@step("Login as $user")
 *   async login() {
 *     // Step will display: "Login as john_doe"
 *   }
 * }
 *
 * @example
 * // Custom formatter for sensitive data
 * class UserActions {
 *   *\@param("username")
 *   email: string = "user@example.com";
 *
 *   *\@param("password", (pwd) => "*".repeat(pwd.length))
 *   password: string = "secret123";
 *
 *   *\@step("Login with $username and password $password")
 *   async login() {
 *     // Step will display: "Login with user@example.com and password *********"
 *   }
 * }
 *
 * @example
 * // Multiple parameters with different formatters
 * class CartActions {
 *   *\@param("items", (arr) => `${arr.length} items`)
 *   cartItems: any[] = [{id: 1}, {id: 2}];
 *
 *   *\@param("total", (amount) => `$${amount.toFixed(2)}`)
 *   totalAmount: number = 99.99;
 *
 *   *\@step("Checkout cart with $items totaling $total")
 *   async checkout() {
 *     // Step will display: "Checkout cart with 2 items totaling $99.99"
 *   }
 * }
 *
 * @example
 * // Combining with indexed parameters
 * class ApiActions {
 *   *\@param("endpoint")
 *   apiEndpoint: string = "/api/users";
 *
 *   *\@step("GET request to $endpoint with query $0")
 *   async fetchData(query: string) {
 *     // If called with fetchData("active=true")
 *     // Step will display: "GET request to /api/users with query active=true"
 *   }
 * }
 *
 * @example
 * // Dynamic values that change per test
 * class TestConfig {
 *   *\@param("env", (v) => v.toUpperCase())
 *   environment: string = "staging";
 *
 *   *\@param("browser")
 *   browserName: string = "chromium";
 *
 *   *\@step("Running test in $env using $browser")
 *   async setup() {
 *     // Step will display: "Running test in STAGING using chromium"
 *   }
 *
 *   changeEnvironment(newEnv: string) {
 *     this.environment = newEnv;
 *     // Next time setup() is called, step name will reflect new value
 *   }
 * }
 *
 * @example
 * // Object formatting
 * class UserProfile {
 *   *\@param("user", (u) => `${u.firstName} ${u.lastName}`)
 *   currentUser: { firstName: string; lastName: string } = {
 *     firstName: "John",
 *     lastName: "Doe"
 *   };
 *
 *   *\@step("View profile for $user")
 *   async viewProfile() {
 *     // Step will display: "View profile for John Doe"
 *   }
 * }
 *
 * @example
 * // Type-safe error: spaces not allowed
 * class Example {
 *   //@ts-expect-error - Cannot create parameter with spaces
 *   *\@param("user name")
 *   userName: string = "test";
 * }
 *
 * @see {@link step} - The decorator that uses `@param` parameters in templates
 * @see {@link test} - The decorator that uses `@param` parameters in templates
 * @see {@link Formatter} - The type definition for formatter functions
 * @see {@link ParamContext} - The runtime context for each parameter
 */
export function param<
  const Name extends string,
  const TT,
  const V,
  const F extends Formatter<V> = Formatter<V>,
>(
  name?: Name extends `${string} ${string}`
    ? ["Cannot create parameter with spaces. Use one word", never]
    : Name,
  formatter?: F,
) {
  return function (_: any, context: ClassFieldDecoratorContext<TT, V>) {
    const newName = name ?? context.name.toString();
    if (newName.includes(" " as never)) {
      throw new TypeError("Cannot create parameter with spaces. Use one word");
    }
    if (context.static) {
      throw new Error("Static properties cannot be decorated with @param");
    }
    if (context.private) {
      throw new Error("Private properties cannot be decorated with @param");
    }
    if (!context.metadata) {
      throw new Error("Cannot decorate a property without metadata");
    }
    context.addInitializer(function () {
      // Initialize params object if it doesn't exist
      if (!context!.metadata!.params) {
        context!.metadata!.params = {};
      }
      // Add this parameter to the params object (don't overwrite existing params)
      (context.metadata!.params as any)[newName as string] = {
        name: newName,
        originalName: context.name,
        formatter: formatter ?? String,
      };
    });
  };
}
