import { describe, test, timeout, beforeAll, use } from "../src/index";

@describe("Timeout Decorator - Basic Usage")
class TimeoutBasicTest {
  @test("should accept timeout decorator on test method")
  @timeout(5000)
  async testWithTimeout() {
    // This test has a 5 second timeout
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("should work without timeout decorator")
  async testWithoutTimeout() {
    // This test uses default timeout
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

@describe("Timeout Decorator - Class Level")
@timeout(10000)
class TimeoutClassTest {
  @test("test 1 inherits class timeout")
  async test1() {
    // Uses class timeout of 10 seconds
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("test 2 also inherits class timeout")
  async test2() {
    // Uses class timeout of 10 seconds
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

@describe("Timeout Decorator - Method Override")
@timeout(5000)
class TimeoutOverrideTest {
  @test("uses class timeout")
  async testWithClassTimeout() {
    // Uses class timeout: 5 seconds
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("overrides with longer timeout")
  @timeout(15000)
  async testWithLongerTimeout() {
    // Overrides class timeout: 15 seconds
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("overrides with shorter timeout")
  @timeout(2000)
  async testWithShorterTimeout() {
    // Overrides class timeout: 2 seconds
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

@describe("Timeout Decorator - Lifecycle Hooks")
class TimeoutLifecycleTest {
  @beforeAll()
  @timeout(30000)
  static async setupWithTimeout() {
    // beforeAll with 30 second timeout
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("test with timeout")
  @timeout(5000)
  async testMethod() {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

@describe("Timeout Decorator - Field Level")
class TimeoutFieldTest {
  @timeout(3000)
  @use.define()
  testData = { value: "test" };

  @test("should use field with timeout")
  async testWithField() {
    if (!this.testData) {
      throw new Error("testData should be defined");
    }
    if (this.testData.value !== "test") {
      throw new Error("testData value should be 'test'");
    }
  }
}

@describe("Timeout Decorator - Multiple Tests")
@timeout(8000)
class TimeoutMultipleTest {
  @test("fast test 1")
  @timeout(1000)
  async fastTest1() {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  @test("fast test 2")
  @timeout(1000)
  async fastTest2() {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  @test("medium test")
  @timeout(5000)
  async mediumTest() {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  @test("uses class timeout")
  async classTimeoutTest() {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

@describe("Timeout Decorator - Metadata Storage")
class TimeoutMetadataTest {
  @test("should store timeout in metadata")
  @timeout(7000)
  async testMetadataStorage() {
    // The timeout should be stored in the test metadata
    // This test verifies that the decorator doesn't throw errors
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

@describe("Timeout Decorator - Edge Cases")
class TimeoutEdgeCasesTest {
  @test("very short timeout")
  @timeout(100)
  async veryShortTimeout() {
    // Completes within 100ms
  }

  @test("very long timeout")
  @timeout(300000)
  async veryLongTimeout() {
    // Has 5 minute timeout but completes quickly
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  @test("one millisecond timeout")
  @timeout(1)
  async oneMillisecondTimeout() {
    // Immediate completion
  }
}

@describe("Timeout Decorator - Combined with Other Decorators")
@timeout(10000)
class TimeoutCombinedTest {
  @test("timeout with multiple decorators")
  @timeout(5000)
  async testCombined() {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

@describe("Timeout Decorator - Realistic Scenarios")
class TimeoutRealisticTest {
  @test("database operation with timeout")
  @timeout(10000)
  async testDatabaseOperation() {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  @test("API call with timeout")
  @timeout(15000)
  async testApiCall() {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  @test("file operation with timeout")
  @timeout(5000)
  async testFileOperation() {
    // Simulate file operation
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
