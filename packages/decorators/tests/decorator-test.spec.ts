import { expect } from "@playwright/test";
import {
  describe,
  test,
  param,
  step,
  beforeEach,
  afterEach,
} from "../src/index";
import { formatter, serializable } from "../src/decorator-test";

// Test that @test decorator discovers methods without "test" prefix
@describe("@test Decorator Basic Tests")
class TestDecoratorBasic {
  @test()
  shouldWorkWithoutTestPrefix() {
    expect(true).toBe(true);
  }

  @test()
  anotherMethodWithoutPrefix() {
    expect(1 + 1).toBe(2);
  }

  @test("Custom test name")
  methodWithCustomName() {
    expect("hello").toBe("hello");
  }
}

// Test that @test decorator works with @param
@describe("@test Decorator with @param")
class TestDecoratorWithParam {
  @param("username")
  username: string = "Alice";

  @param("age")
  age: number = 25;

  @test("User $username test")
  userTest() {
    expect(this.username).toBe("Alice");
  }

  @test("Age is $age")
  ageTest() {
    expect(this.age).toBe(25);
  }

  @test("Multiple params: $username is $age years old")
  multipleParams() {
    expect(this.username).toBeTruthy();
    expect(this.age).toBeGreaterThan(0);
  }
}

// Test that @test decorator works with @step
@describe("@test Decorator with @step")
class TestDecoratorWithStep {
  @param("action")
  action: string = "login";

  @step("Performing $action")
  async performAction() {
    expect(this.action).toBe("login");
  }

  @test("Should execute step")
  async executeStep() {
    await this.performAction();
    expect(true).toBe(true);
  }

  @test("Step with verification")
  async stepWithVerification() {
    await this.performAction();
    expect(this.action).toBeTruthy();
  }
}

// Test mixing @test decorator with test-prefixed methods
@describe("@test Decorator Mixed with Prefix")
class TestDecoratorMixed {
  @test()
  decoratedMethod() {
    expect("decorated").toBe("decorated");
  }

  testPrefixedMethod() {
    expect("prefixed").toBe("prefixed");
  }

  @test("Custom name for decorated")
  anotherDecoratedMethod() {
    expect(true).toBe(true);
  }

  testAnotherPrefixedMethod() {
    expect(false).toBe(false);
  }
}

// Test that @test decorator works with indexed placeholders
@describe("@test Decorator with Indexed Placeholders")
class TestDecoratorIndexed {
  @test("Test with placeholders in name")
  testWithPlaceholders() {
    // Note: Indexed placeholders like $0, $1 work when methods are called with arguments
    // In @describe context, test methods are called without arguments
    expect(true).toBe(true);
  }

  @test("Another test with custom name")
  anotherTest() {
    expect(1 + 1).toBe(2);
  }
}

// Test @test decorator with lifecycle hooks
@describe("@test Decorator with Lifecycle Hooks")
class TestDecoratorLifecycle {
  counter: number = 0;

  @beforeEach()
  setupCounter() {
    this.counter = 10;
  }

  @test()
  shouldHaveCounterInitialized() {
    expect(this.counter).toBe(10);
  }

  @test()
  shouldHaveCounterInitializedAgain() {
    expect(this.counter).toBe(10);
  }

  @afterEach()
  resetCounter() {
    this.counter = 0;
  }
}

// Test @test decorator with async methods
@describe("@test Decorator with Async Methods")
class TestDecoratorAsync {
  @test("Async test without prefix")
  async asyncMethod() {
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(true).toBe(true);
  }

  @test("Another async test")
  async anotherAsyncMethod() {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  }
}

// Test @test decorator with formatters
@describe("@test Decorator with Formatters")
class TestDecoratorFormatters {
  @param("status", (s) => s.toUpperCase())
  status: string = "active";

  @param("count", (c) => `[${c}]`)
  count: number = 5;

  @test("Status is $status")
  statusTest() {
    // Note: formatter only affects display, not the actual value
    expect(this.status).toBe("active");
  }

  @test("Count is $count items")
  countTest() {
    expect(this.count).toBe(5);
  }
}

function someData() {
  return {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
  };
}
// Real-world example: E-commerce tests
@describe("@test Decorator: E-commerce Scenarios")
class TestDecoratorEcommerce {
  @param("product")
  productName: string = "Laptop";

  @param("price")
  price: number = 999.99;

  cart: Array<{ name: string; price: number }> = [];

  beforeEach() {
    this.cart = [];
  }

  @step("Add $product to cart")
  async addToCart() {
    this.cart.push({ name: this.productName, price: this.price });
  }

  @test("Add $product to cart")
  async addProductToCart() {
    await this.addToCart();
    expect(this.cart.length).toBe(1);
    expect(this.cart[0].name).toBe("Laptop");
  }

  @test("Verify $product price is $price")
  async verifyPrice() {
    await this.addToCart();
    expect(this.cart[0].price).toBe(999.99);
  }

  @test("Empty cart initially")
  emptyCart() {
    expect(this.cart.length).toBe(0);
  }

  @test.each([
    [1, 1, formatter(3, (v) => `Number(${v})`)],
    [1, 2, 3],
    [2, 1, 3],
  ], "Expected to be $3 when call $0 + $1")
  emptyCartEach() {
    expect(this.cart.length).toBe(0);
  }
}

// Real-world example: API testing
@describe("@test Decorator: API Testing Scenarios")
class TestDecoratorApi {
  @param("endpoint")
  endpoint: string = "/api/users";

  @param("method", (m) => m.toUpperCase())
  method: string = "get";

  responseStatus: number = 0;
  responseData: any = null;

  @step("Send $method request to $endpoint")
  async sendRequest() {
    // Simulate API call
    this.responseStatus = 200;
    this.responseData = { success: true };
  }

  @test("$method request to $endpoint should return 200")
  async testApiRequest() {
    await this.sendRequest();
    expect(this.responseStatus).toBe(200);
  }

  @test("Response should contain data")
  async testResponseData() {
    await this.sendRequest();
    expect(this.responseData).toBeTruthy();
    expect(this.responseData.success).toBe(true);
  }
}

// Real-world example: Form validation
@describe("@test Decorator: Form Validation Scenarios")
class TestDecoratorFormValidation {
  @param("fieldName")
  fieldName: string = "email";

  @param("fieldValue")
  fieldValue: string = "test@example.com";

  isValid: boolean = false;
  errors: string[] = [];

  beforeEach() {
    this.isValid = false;
    this.errors = [];
  }

  @step("Validate $fieldName field")
  async validateField() {
    if (this.fieldValue && this.fieldValue.length > 0) {
      this.isValid = true;
    } else {
      this.errors.push(`${this.fieldName} is required`);
    }
  }

  @test("$fieldName validation should pass")
  async testValidation() {
    await this.validateField();
    expect(this.isValid).toBe(true);
    expect(this.errors.length).toBe(0);
  }

  @test("Valid $fieldName format")
  async testEmailFormat() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(this.fieldValue)).toBe(true);
  }
}

// Edge case: Empty test name
@describe("@test Decorator Edge Cases")
class TestDecoratorEdgeCases {
  @test()
  methodWithoutCustomName() {
    expect(true).toBe(true);
  }

  @test("")
  methodWithEmptyString() {
    expect(true).toBe(true);
  }

  @test("Test with special characters !@#$%")
  specialCharacters() {
    expect(true).toBe(true);
  }

  @test("Test with numbers 123")
  withNumbers() {
    expect(true).toBe(true);
  }
}
