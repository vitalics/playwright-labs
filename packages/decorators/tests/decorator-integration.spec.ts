import { test, expect } from "@playwright/test";

import { param, step } from "../src/index";

test.describe("Decorator Integration Tests", () => {
  test.describe("@param and @step basic integration", () => {
    test("should use @param decorated property in @step", async () => {
      class TestClass {
        @param("username")
        userName: string = "john_doe";

        @step("Login as $username")
        async login() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.login();
      // Test passes if step executes without error
    });

    test("should use multiple @param decorated properties", async () => {
      class TestClass {
        @param("username")
        userName: string = "admin";

        @param("role")
        userRole: string = "administrator";

        @step("Login as $username with role $role")
        async login() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.login();
      // Test passes if step executes without error
    });

    test("should use custom name in @param", async () => {
      class TestClass {
        @param("user")
        internalUserName: string = "test_user";

        @step("Authenticated as $user")
        async authenticate() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.authenticate();
      // Test passes if step executes without error
    });
  });

  test.describe("@param with custom formatters", () => {
    test("should apply JSON.stringify formatter from @param", async () => {
      class TestClass {
        @param("data", JSON.stringify)
        userData: object = { id: 1, name: "John" };

        @step("Process user data: $data")
        async processData() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.processData();
      // Test passes if step executes without error
    });

    test("should apply toUpperCase formatter from @param", async () => {
      class TestClass {
        @param("name", (v) => v.toUpperCase())
        userName: string = "john";

        @step("User $name logged in")
        async login() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.login();
      // Test passes if step executes without error
    });

    test("should apply custom formatter to multiple params", async () => {
      class TestClass {
        @param("first", (v) => v.toUpperCase())
        firstName: string = "john";

        @param("last", (v) => v.toLowerCase())
        lastName: string = "DOE";

        @step("Full name: $first $last")
        async displayName() {
          // Step implementation
        }
      }

      const instance = new TestClass();
      await instance.displayName();
      // Test passes if step executes without error
    });
  });

  test.describe("@step with indexed arguments", () => {
    test("should use $0 indexed placeholder", async () => {
      class TestClass {
        @step("Processing item $0")
        async processItem(itemId: string) {
          expect(itemId).toBe("item-123");
        }
      }

      const instance = new TestClass();
      await instance.processItem("item-123");
    });

    test("should use multiple indexed placeholders", async () => {
      class TestClass {
        @step("Transfer $0 from $1 to $2")
        async transfer(amount: number, from: string, to: string) {
          expect(amount).toBe(100);
          expect(from).toBe("account-1");
          expect(to).toBe("account-2");
        }
      }

      const instance = new TestClass();
      await instance.transfer(100, "account-1", "account-2");
    });

    test("should handle out-of-order indexed placeholders", async () => {
      class TestClass {
        @step("Result: $2, Input: $0, Operation: $1")
        async calculate(input: number, operation: string, result: number) {
          expect(input).toBe(10);
          expect(operation).toBe("square");
          expect(result).toBe(100);
        }
      }

      const instance = new TestClass();
      await instance.calculate(10, "square", 100);
    });
  });

  test.describe("@step with custom formatters", () => {
    test("should apply custom formatter to indexed argument", async () => {
      class TestClass {
        @step("User: $0", JSON.stringify)
        async displayUser(user: object) {
          expect(user).toEqual({ id: 1, name: "John" });
        }
      }

      const instance = new TestClass();
      await instance.displayUser({ id: 1, name: "John" });
    });

    test("should apply multiple custom formatters", async () => {
      class TestClass {
        @step("Name: $0, Age: $1", (v) => v.toUpperCase(), (v) => `${v} years`)
        async displayInfo(name: string, age: number) {
          expect(name).toBe("john");
          expect(age).toBe(25);
        }
      }

      const instance = new TestClass();
      await instance.displayInfo("john", 25);
    });

    test("should handle partial custom formatters", async () => {
      class TestClass {
        @step(
          "First: $0, Second: $1, Third: $2",
          (v) => v.toUpperCase(),
          undefined,
          (v) => v.toLowerCase(),
        )
        async process(a: string, b: string, c: string) {
          expect(a).toBe("hello");
          expect(b).toBe("WORLD");
          expect(c).toBe("TEST");
        }
      }

      const instance = new TestClass();
      await instance.process("hello", "WORLD", "TEST");
    });
  });

  test.describe("Mixed: @param and indexed arguments", () => {
    test("should mix @param and $0 placeholders", async () => {
      class TestClass {
        @param("username")
        userName: string = "admin";

        @step("User $username performs action: $0")
        async performAction(action: string) {
          expect(action).toBe("delete");
        }
      }

      const instance = new TestClass();
      await instance.performAction("delete");
    });

    test("should handle multiple @params and multiple indexed args", async () => {
      class TestClass {
        @param("user")
        userName: string = "admin";

        @param("role")
        userRole: string = "admin";

        @step("User $user with role $role performs: $0 on $1")
        async performAction(action: string, target: string) {
          expect(action).toBe("update");
          expect(target).toBe("settings");
        }
      }

      const instance = new TestClass();
      await instance.performAction("update", "settings");
    });

    test("should handle @param with formatter and indexed args with formatters", async () => {
      class TestClass {
        @param("status", (v) => v.toUpperCase())
        status: string = "active";

        @step(
          "Status: $status, User: $0, ID: $1",
          (v) => v.toLowerCase(),
          (v) => `#${v}`,
        )
        async display(user: string, id: number) {
          expect(user).toBe("JOHN");
          expect(id).toBe(123);
        }
      }

      const instance = new TestClass();
      await instance.display("JOHN", 123);
    });
  });

  test.describe("Real-world scenarios", () => {
    test("should handle login scenario with @param", async () => {
      class LoginPage {
        @param("username")
        userName: string = "test@example.com";

        @param("password", (pwd) => "*".repeat(pwd.length))
        password: string = "secret123";

        @step("Login with username $username and password $password")
        async login() {
          expect(this.userName).toBe("test@example.com");
          expect(this.password).toBe("secret123");
        }
      }

      const page = new LoginPage();
      await page.login();
    });

    test("should handle API request scenario", async () => {
      class ApiClient {
        @param("baseUrl")
        baseUrl: string = "https://api.example.com";

        @param("token", (t) => `Bearer ${t}`)
        authToken: string = "abc123";

        @step("Send $0 request to $baseUrl/$1 with auth $token")
        async request(method: string, endpoint: string) {
          expect(method).toBe("POST");
          expect(endpoint).toBe("users");
          expect(this.authToken).toBe("abc123");
        }
      }

      const client = new ApiClient();
      await client.request("POST", "users");
    });

    test("should handle test configuration scenario", async () => {
      class TestConfig {
        @param("env", (v) => v.toUpperCase())
        environment: string = "staging";

        @param("browser")
        browserName: string = "chromium";

        @param("config", JSON.stringify)
        settings: object = { headless: true, timeout: 30000 };

        @step("Running on $env using $browser with config $config")
        async setup() {
          expect(this.environment).toBe("staging");
          expect(this.browserName).toBe("chromium");
          expect(this.settings).toEqual({ headless: true, timeout: 30000 });
        }
      }

      const config = new TestConfig();
      await config.setup();
    });

    test("should handle database query scenario", async () => {
      class Database {
        @param("table")
        tableName: string = "users";

        @param("operation", (v) => v.toUpperCase())
        operationType: string = "select";

        @step("Execute $operation on table $table with filter $0")
        async query(filter: string) {
          expect(filter).toBe("id = 123");
        }
      }

      const db = new Database();
      await db.query("id = 123");
    });

    test("should handle e-commerce checkout scenario", async () => {
      class CheckoutFlow {
        @param("cart", (items) => `${items.length} items`)
        cartItems: any[] = [{ id: 1 }, { id: 2 }, { id: 3 }];

        @param("total", (amount) => `$${amount.toFixed(2)}`)
        totalAmount: number = 99.99;

        @step("Checkout with $cart, total $total, using payment method $0")
        async checkout(paymentMethod: string) {
          expect(paymentMethod).toBe("credit_card");
          expect(this.cartItems.length).toBe(3);
        }
      }

      const checkout = new CheckoutFlow();
      await checkout.checkout("credit_card");
    });
  });

  test.describe("Edge cases", () => {
    test("should handle @param with null value", async () => {
      class TestClass {
        @param("value")
        nullValue: any = null;

        @step("Value is $value")
        async process() {
          expect(this.nullValue).toBeNull();
        }
      }

      const instance = new TestClass();
      await instance.process();
    });

    test("should handle @param with undefined value", async () => {
      class TestClass {
        @param("value")
        undefinedValue: any = undefined;

        @step("Value is $value")
        async process() {
          expect(this.undefinedValue).toBeUndefined();
        }
      }

      const instance = new TestClass();
      await instance.process();
    });

    test("should handle @param with complex object", async () => {
      class TestClass {
        @param("config", JSON.stringify)
        complexConfig: any = {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          boolean: true,
        };

        @step("Using config $config")
        async configure() {
          expect(this.complexConfig.nested.deep.value).toBe(123);
        }
      }

      const instance = new TestClass();
      await instance.configure();
    });

    test("should handle step with no placeholders", async () => {
      class TestClass {
        @param("unused")
        unusedParam: string = "not-used";

        @step("Simple step with no parameters")
        async simpleStep() {
          // Just executes
        }
      }

      const instance = new TestClass();
      await instance.simpleStep();
    });

    test("should handle multiple instances with different param values", async () => {
      class TestClass {
        @param("id")
        instanceId: string;

        constructor(id: string) {
          this.instanceId = id;
        }

        @step("Instance $id performing action")
        async action() {
          // Each instance has its own id
        }
      }

      const instance1 = new TestClass("instance-1");
      const instance2 = new TestClass("instance-2");

      await instance1.action();
      expect(instance1.instanceId).toBe("instance-1");

      await instance2.action();
      expect(instance2.instanceId).toBe("instance-2");
    });

    test("should handle dynamic property updates", async () => {
      class TestClass {
        @param("counter")
        count: number = 0;

        @step("Counter value is $counter")
        async display() {
          // Counter can be updated between calls
        }

        incrementCounter() {
          this.count++;
        }
      }

      const instance = new TestClass();
      await instance.display();
      expect(instance.count).toBe(0);

      instance.incrementCounter();
      await instance.display();
      expect(instance.count).toBe(1);
    });
  });

  test.describe("Error handling", () => {
    test("should throw error for missing indexed argument", async () => {
      class TestClass {
        @step("Value: $0")
        async process() {
          // Missing required argument
        }
      }

      const instance = new TestClass();
      await expect(instance.process()).rejects.toThrow("Missing argument");
    });

    test("should throw error for missing named parameter", async () => {
      class TestClass {
        // No @param decorator for 'username'
        @step("Login as $username")
        async login() {
          // Missing parameter in context
        }
      }

      const instance = new TestClass();
      await expect(instance.login()).rejects.toThrow("Missing parameter");
    });

    test("should handle formatter that throws error", async () => {
      class TestClass {
        @param("value", () => {
          throw new Error("Formatter error");
        })
        someValue: string = "test";

        @step("Value: $value")
        async process() {
          // Formatter throws
        }
      }

      const instance = new TestClass();
      await expect(instance.process()).rejects.toThrow("Formatter error");
    });
  });
});
