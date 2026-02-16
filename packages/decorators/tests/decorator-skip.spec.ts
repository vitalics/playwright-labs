import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { skip } from "../src/decorator-skip";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";

@describe("@skip Decorator Tests")
class SkipDecoratorTests {
  @skip()
  @test("skipped without reason")
  async testSkippedNoReason() {
    // This test should be skipped
    throw new Error("This test should not run");
  }

  @skip("Not implemented yet")
  @test("skipped with reason")
  async testSkippedWithReason() {
    // This test should be skipped with reason
    throw new Error("This test should not run");
  }

  @test("not skipped test")
  async testNotSkipped() {
    // This test should run
    expect(true).toBe(true);
  }

  @skip("Fails in WebKit")
  @test("browser-specific skip")
  async testBrowserSkip() {
    throw new Error("This test should not run");
  }
}

@describe("@skip with different reasons")
class SkipReasonsTests {
  @skip("Feature not ready")
  @test("incomplete feature")
  async testIncompleteFeature() {
    throw new Error("This test should not run");
  }

  @skip("Waiting for API fix")
  @test("blocked by API bug")
  async testBlockedByApi() {
    throw new Error("This test should not run");
  }

  @skip("Performance issues - needs optimization")
  @test("slow test")
  async testSlowPerformance() {
    throw new Error("This test should not run");
  }

  @skip("Flaky test - investigating")
  @test("flaky behavior")
  async testFlakyBehavior() {
    throw new Error("This test should not run");
  }

  @skip("Environment-specific failure")
  @test("fails in CI only")
  async testCiFailure() {
    throw new Error("This test should not run");
  }
}

@describe("@skip with @tag combination")
class SkipTagCombinationTests {
  @tag("regression")
  @skip("Regression test skipped temporarily")
  @test("tagged and skipped")
  async testTaggedAndSkipped() {
    throw new Error("This test should not run");
  }

  @tag("api", "critical")
  @skip("Critical API test disabled")
  @test("multiple tags with skip")
  async testMultipleTagsWithSkip() {
    throw new Error("This test should not run");
  }

  @tag("smoke")
  @test("tagged but not skipped")
  async testTaggedNotSkipped() {
    // This test should run
    expect(true).toBe(true);
  }
}

@describe("@skip Edge Cases")
class SkipEdgeCaseTests {
  @skip("")
  @test("skip with empty reason")
  async testEmptyReason() {
    throw new Error("This test should not run");
  }

  @skip("Very long reason: " + "x".repeat(200))
  @test("skip with long reason")
  async testLongReason() {
    throw new Error("This test should not run");
  }

  @skip("Reason with special characters: !@#$%^&*()")
  @test("skip with special characters")
  async testSpecialCharsReason() {
    throw new Error("This test should not run");
  }

  @skip("Multi-line\nreason\ntext")
  @test("skip with multiline reason")
  async testMultilineReason() {
    throw new Error("This test should not run");
  }
}

@describe("@skip Validation")
class SkipValidationTests {
  @test("regular test 1")
  async testRegular1() {
    expect(1).toBe(1);
  }

  @skip("Skipped")
  @test("skipped test in middle")
  async testSkippedMiddle() {
    throw new Error("This test should not run");
  }

  @test("regular test 2")
  async testRegular2() {
    expect(2).toBe(2);
  }

  @skip("Also skipped")
  @test("another skipped test")
  async testSkipped2() {
    throw new Error("This test should not run");
  }

  @test("regular test 3")
  async testRegular3() {
    expect(3).toBe(3);
  }
}
