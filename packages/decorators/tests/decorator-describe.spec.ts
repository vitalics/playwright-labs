import { test as baseTest, expect } from "@playwright/test";
import { describe, param, step, test, beforeEach, afterEach, beforeAll, afterAll } from "../src/index";

// Track execution order for lifecycle tests
let executionOrder: string[] = [];
baseTest.beforeEach(() => {
  executionOrder = [];
});

// Basic test class
@describe()
class BasicTests {
  @test()
  testSimpleAssertion() {
    expect(1 + 1).toBe(2);
  }

  @test()
  testAnotherAssertion() {
    expect("hello").toBe("hello");
  }
}

// Custom describe name
@describe("Custom Suite Name")
class CustomNameTests {
  @test()
  testWithCustomName() {
    expect(true).toBe(true);
  }
}

// Lifecycle hooks
@describe("Lifecycle Tests")
class LifecycleTests {
  counter: number = 0;

  @beforeEach()
  setupCounter() {
    executionOrder.push("beforeEach");
    this.counter = 10;
  }

  @afterEach()
  resetCounter() {
    executionOrder.push("afterEach");
    this.counter = 0;
  }

  @test()
  testCounterInitialized() {
    executionOrder.push("test1");
    expect(this.counter).toBe(10);
  }

  @test()
  testCounterStillInitialized() {
    executionOrder.push("test2");
    expect(this.counter).toBe(10);
  }
}

// BeforeAll and AfterAll hooks
let beforeAllRan = false;
let afterAllRan = false;

@describe("BeforeAll and AfterAll Tests")
class BeforeAfterAllTests {
  @beforeAll()
  static setupAll() {
    beforeAllRan = true;
  }

  @afterAll()
  static teardownAll() {
    afterAllRan = true;
  }

  @test()
  testBeforeAllExecuted() {
    expect(beforeAllRan).toBe(true);
  }
}

// Helper methods
@describe("Tests with Helper Methods")
class HelperMethodTests {
  // Helper method - should not become a test
  async helperLogin(username: string) {
    return `Logged in as ${username}`;
  }

  // Helper method - should not become a test
  calculateSum(a: number, b: number): number {
    return a + b;
  }

  @test()
  async testUsingHelperMethod() {
    const result = await this.helperLogin("testuser");
    expect(result).toBe("Logged in as testuser");
  }

  @test()
  testUsingCalculation() {
    const sum = this.calculateSum(5, 3);
    expect(sum).toBe(8);
  }
}

// Instance properties
@describe("Tests with Instance Properties")
class InstancePropertyTests {
  userName: string = "default";
  count: number = 0;

  @beforeEach()
  setupProperties() {
    this.userName = "testuser";
    this.count = 0;
  }

  @test()
  testPropertyAccess() {
    expect(this.userName).toBe("testuser");
  }

  @test()
  testPropertyModification() {
    this.count++;
    expect(this.count).toBe(1);
  }

  @test()
  testPropertyIsolation() {
    // Each test gets a fresh instance
    expect(this.count).toBe(0);
  }
}

// Integration with @param decorator
@describe("Tests with @param decorator")
class ParamDecoratorTests {
  @param("apiUrl")
  baseUrl: string = "https://api.example.com";

  @param("version")
  apiVersion: string = "v1";

  @test()
  testParamValues() {
    expect(this.baseUrl).toBe("https://api.example.com");
    expect(this.apiVersion).toBe("v1");
  }
}

// Integration with @step decorator
@describe("Tests with @step decorator")
class StepDecoratorTests {
  actionResult: string = "";

  @step("Perform action $0")
  async performAction(action: string) {
    this.actionResult = `Action performed: ${action}`;
  }

  @test()
  async testStepExecution() {
    await this.performAction("login");
    expect(this.actionResult).toBe("Action performed: login");
  }
}

// Combined @param and @step
@describe("Combined @param and @step")
class CombinedDecoratorsTests {
  @param("endpoint")
  apiEndpoint: string = "/users";

  requestResult: string = "";

  @step("Request to $endpoint/$0")
  async makeRequest(resource: string) {
    this.requestResult = `${this.apiEndpoint}/${resource}`;
  }

  @test()
  async testCombinedDecorators() {
    await this.makeRequest("123");
    expect(this.requestResult).toBe("/users/123");
  }
}

// Async tests
@describe("Async Tests")
class AsyncTests {
  @test()
  async testAsyncOperation() {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  }

  @test()
  async testDelayedOperation() {
    const result = await new Promise((resolve) =>
      setTimeout(() => resolve("done"), 10),
    );
    expect(result).toBe("done");
  }
}

// Error handling
@describe("Error Handling Tests")
class ErrorHandlingTests {
  @test()
  testThrowingError() {
    expect(() => {
      throw new Error("Expected error");
    }).toThrow("Expected error");
  }

  @test()
  async testAsyncError() {
    await expect(Promise.reject(new Error("Async error"))).rejects.toThrow(
      "Async error",
    );
  }
}

// Multiple setup in beforeEach
@describe("BeforeEach Setup Tests")
class BeforeEachSetupTests {
  value1: number = 0;
  value2: string = "";

  @beforeEach()
  setupValues() {
    this.value1 = 10;
    this.value2 = "initialized";
  }

  @test()
  testBothValuesSet() {
    expect(this.value1).toBe(10);
    expect(this.value2).toBe("initialized");
  }
}

// Test name formatting
@describe("Test Name Formatting")
class TestNameFormattingTests {
  @test()
  testSimpleName() {
    expect(true).toBe(true);
  }

  @test()
  testUserCanLogin() {
    // Should become "User Can Login"
    expect(true).toBe(true);
  }

  @test()
  testAPIEndpointReturnsValidJSON() {
    // Should become "API Endpoint Returns Valid JSON"
    expect(true).toBe(true);
  }
}

// Nested instance creation
@describe("Instance Isolation Tests")
class InstanceIsolationTests {
  static instanceCount = 0;
  instanceId: number;

  constructor() {
    InstanceIsolationTests.instanceCount++;
    this.instanceId = InstanceIsolationTests.instanceCount;
  }

  @test()
  testFirstInstance() {
    // Each test should get its own instance
    expect(typeof this.instanceId).toBe("number");
  }

  @test()
  testSecondInstance() {
    // Each test should get its own instance
    expect(typeof this.instanceId).toBe("number");
  }
}

// Real-world example: Login flow
@describe("Login Flow Tests")
class LoginFlowTests {
  @param("username")
  testUser: string = "test@example.com";

  @param("password", (pwd) => "*".repeat(pwd.length))
  testPassword: string = "secret123";

  isLoggedIn: boolean = false;

  @step("Login with credentials $username")
  async login() {
    // Simulate login
    this.isLoggedIn = true;
    return this.isLoggedIn;
  }

  @step("Logout user $username")
  async logout() {
    this.isLoggedIn = false;
  }

  @test()
  async testSuccessfulLogin() {
    expect(this.isLoggedIn).toBe(false);
    await this.login();
    expect(this.isLoggedIn).toBe(true);
  }

  @test()
  async testLogoutAfterLogin() {
    await this.login();
    expect(this.isLoggedIn).toBe(true);
    await this.logout();
    expect(this.isLoggedIn).toBe(false);
  }
}

// Real-world example: Shopping cart
@describe("Shopping Cart Tests")
class ShoppingCartTests {
  cart!: { items: any[]; total: number };

  @beforeEach()
  setupCart() {
    this.cart = { items: [], total: 0 };
  }

  @afterEach()
  cleanupCart() {
    this.cart = { items: [], total: 0 };
  }

  addItem(id: number, price: number) {
    this.cart.items.push({ id, price });
    this.cart.total += price;
  }

  removeItem(id: number) {
    const index = this.cart.items.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.cart.total -= this.cart.items[index].price;
      this.cart.items.splice(index, 1);
    }
  }

  @test()
  testAddItemToCart() {
    this.addItem(1, 29.99);
    expect(this.cart.items.length).toBe(1);
    expect(this.cart.total).toBe(29.99);
  }

  @test()
  testRemoveItemFromCart() {
    this.addItem(1, 29.99);
    this.addItem(2, 39.99);
    this.removeItem(1);
    expect(this.cart.items.length).toBe(1);
    expect(this.cart.total).toBeCloseTo(39.99);
  }

  @test()
  testCartStartsEmpty() {
    expect(this.cart.items.length).toBe(0);
    expect(this.cart.total).toBe(0);
  }
}

// Real-world example: API client
@describe("API Client Tests")
class ApiClientTests {
  @param("baseUrl")
  apiUrl: string = "https://api.example.com";

  @param("authToken", (token) => `Bearer ${token}`)
  token: string = "abc123";

  lastResponse: any = null;

  @step("GET request to $baseUrl/$0")
  async get(endpoint: string) {
    this.lastResponse = {
      url: `${this.apiUrl}/${endpoint}`,
      auth: this.token,
    };
  }

  @step("POST request to $baseUrl/$0")
  async post(endpoint: string, data: any) {
    this.lastResponse = {
      url: `${this.apiUrl}/${endpoint}`,
      auth: this.token,
      data,
    };
  }

  @test()
  async testGetRequest() {
    await this.get("users");
    expect(this.lastResponse.url).toBe("https://api.example.com/users");
    expect(this.lastResponse.auth).toBe("abc123");
  }

  @test()
  async testPostRequest() {
    await this.post("users", { name: "John" });
    expect(this.lastResponse.url).toBe("https://api.example.com/users");
    expect(this.lastResponse.data).toEqual({ name: "John" });
  }
}

// Edge case: Empty test class
@describe("Empty Test Suite")
class EmptyTestSuite {
  // No test methods
  helperMethod() {
    return "helper";
  }
}

// Edge case: Only lifecycle hooks
@describe("Only Lifecycle Hooks")
class OnlyLifecycleHooks {
  @beforeEach()
  setup() {
    // Setup
  }

  @afterEach()
  cleanup() {
    // Cleanup
  }
}

// Verify lifecycle hooks work correctly within a single suite
@describe("Lifecycle Hook Verification")
class LifecycleVerificationTests {
  setupRan: boolean = false;
  cleanupRan: boolean = false;

  @beforeEach()
  setup() {
    this.setupRan = true;
  }

  @afterEach()
  cleanup() {
    this.cleanupRan = true;
  }

  @test()
  testSetupRan() {
    expect(this.setupRan).toBe(true);
  }

  @test()
  testCleanupWillRun() {
    // Cleanup runs after this test
    expect(this.setupRan).toBe(true);
  }
}
