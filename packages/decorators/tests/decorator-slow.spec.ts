import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { slow } from "../src/decorator-slow";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";

@describe("@slow Decorator Tests")
class SlowDecoratorTests extends BaseTest {
  @slow()
  @test("slow without reason")
  async testSlowNoReason() {
    // This test should have 3x timeout
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Waits for external API")
  @test("slow with reason")
  async testSlowWithReason() {
    // This test should have 3x timeout with reason
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @test("not slow test")
  async testNotSlow() {
    // This test should have normal timeout
    expect(true).toBe(true);
  }

  @slow("Heavy rendering in WebKit")
  @test("browser-specific slow")
  async testBrowserSlow() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }
}

@describe("@slow with different reasons")
class SlowReasonsTests extends BaseTest {
  @slow("Large dataset processing")
  @test("dataset processing")
  async testDatasetProcessing() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Multiple API calls")
  @test("api integration")
  async testApiIntegration() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Complex animation sequence")
  @test("animation test")
  async testAnimation() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("File upload and processing")
  @test("file upload")
  async testFileUpload() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Database migration")
  @test("database operations")
  async testDatabaseOperations() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }
}

@describe("@slow with @tag combination")
class SlowTagCombinationTests extends BaseTest {
  @tag("integration")
  @slow("Integration test with external services")
  @test("tagged and slow")
  async testTaggedAndSlow() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @tag("e2e", "critical")
  @slow("Full user flow")
  @test("multiple tags with slow")
  async testMultipleTagsWithSlow() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @tag("smoke")
  @test("tagged but not slow")
  async testTaggedNotSlow() {
    // This test should have normal timeout
    expect(true).toBe(true);
  }
}

@describe("@slow Conditional Tests")
class SlowConditionalTests extends BaseTest {
  @slow((self) => self.browserName === 'webkit', "Slower in WebKit")
  @test("conditional slow - webkit")
  async testConditionalWebKit() {
    // This test should be slow only in WebKit
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow((self) => self.browserName === 'firefox', "Firefox-specific slowness")
  @test("conditional slow - firefox")
  async testConditionalFirefox() {
    // This test should be slow only in Firefox
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow((self) => self.isMobile, "Mobile devices are slower")
  @test("conditional slow - mobile")
  async testConditionalMobile() {
    // This test should be slow only on mobile
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow((self) => self.deviceScaleFactor! > 1, "High DPI displays")
  @test("conditional slow - high dpi")
  async testConditionalHighDPI() {
    // This test should be slow only on high DPI displays
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @test("not conditional slow")
  async testNotConditionalSlow() {
    // This test should have normal timeout
    expect(true).toBe(true);
  }
}

@describe("@slow Edge Cases")
class SlowEdgeCaseTests extends BaseTest {
  @slow("")
  @test("slow with empty reason")
  async testEmptyReason() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Very long reason: " + "x".repeat(200))
  @test("slow with long reason")
  async testLongReason() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Reason with special characters: !@#$%^&*()")
  @test("slow with special characters")
  async testSpecialCharsReason() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @slow("Multi-line\nreason\ntext")
  @test("slow with multiline reason")
  async testMultilineReason() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }
}

@describe("@slow Performance Tests")
class SlowPerformanceTests extends BaseTest {
  @slow("Benchmark test")
  @test("performance benchmark")
  async testBenchmark() {
    // Simulate heavy computation
    await new Promise(resolve => setTimeout(resolve, 200));
    expect(true).toBe(true);
  }

  @slow("Load test with many requests")
  @test("load testing")
  async testLoadTesting() {
    // Simulate multiple operations
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect(true).toBe(true);
  }

  @slow("Memory-intensive operation")
  @test("memory test")
  async testMemoryIntensive() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }
}

@describe("@slow Validation")
class SlowValidationTests extends BaseTest {
  @test("regular test 1")
  async testRegular1() {
    expect(1).toBe(1);
  }

  @slow("Slow test in middle")
  @test("slow test in middle")
  async testSlowMiddle() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @test("regular test 2")
  async testRegular2() {
    expect(2).toBe(2);
  }

  @slow("Another slow test")
  @test("another slow test")
  async testSlow2() {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(true).toBe(true);
  }

  @test("regular test 3")
  async testRegular3() {
    expect(3).toBe(3);
  }
}
