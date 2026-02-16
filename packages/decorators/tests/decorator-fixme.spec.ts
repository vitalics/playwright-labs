import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { fixme } from "../src/decorator-fixme";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";

@describe("@fixme Decorator Tests")
class FixmeDecoratorTests extends BaseTest {
  @fixme()
  @test("fixme without reason")
  async testFixmeNoReason() {
    // This test should be marked as fixme
    throw new Error("This test should not run");
  }

  @fixme("Known bug - race condition")
  @test("fixme with reason")
  async testFixmeWithReason() {
    // This test should be marked as fixme with reason
    throw new Error("This test should not run");
  }

  @test("not fixme test")
  async testNotFixme() {
    // This test should run
    expect(true).toBe(true);
  }

  @fixme("Fails in WebKit - needs investigation")
  @test("browser-specific fixme")
  async testBrowserFixme() {
    throw new Error("This test should not run");
  }
}

@describe("@fixme with different reasons")
class FixmeReasonsTests extends BaseTest {
  @fixme("Intermittent failure - timing issue")
  @test("flaky test")
  async testFlakyTest() {
    throw new Error("This test should not run");
  }

  @fixme("API returns incorrect data")
  @test("api bug")
  async testApiBug() {
    throw new Error("This test should not run");
  }

  @fixme("CSS selector changed in new version")
  @test("selector outdated")
  async testSelectorOutdated() {
    throw new Error("This test should not run");
  }

  @fixme("Race condition in async code")
  @test("async race condition")
  async testAsyncRaceCondition() {
    throw new Error("This test should not run");
  }

  @fixme("Memory leak in component")
  @test("memory leak issue")
  async testMemoryLeak() {
    throw new Error("This test should not run");
  }
}

@describe("@fixme with @tag combination")
class FixmeTagCombinationTests extends BaseTest {
  @tag("critical")
  @fixme("Critical bug - priority fix")
  @test("tagged and fixme")
  async testTaggedAndFixme() {
    throw new Error("This test should not run");
  }

  @tag("regression", "flaky")
  @fixme("Regression test is flaky")
  @test("multiple tags with fixme")
  async testMultipleTagsWithFixme() {
    throw new Error("This test should not run");
  }

  @tag("smoke")
  @test("tagged but not fixme")
  async testTaggedNotFixme() {
    // This test should run
    expect(true).toBe(true);
  }
}

@describe("@fixme Conditional Tests")
class FixmeConditionalTests extends BaseTest {
  @fixme((self) => self.browserName === 'webkit', "Only fails in WebKit")
  @test("conditional fixme - webkit")
  async testConditionalWebKit() {
    // This test should be marked as fixme only in WebKit
    // When marked as fixme, this error won't cause the test to fail
    if (this.browserName === 'webkit') {
      throw new Error("This test fails in WebKit");
    }
    expect(true).toBe(true);
  }

  @fixme((self) => self.browserName === 'chromium', "Chromium-specific bug")
  @test("conditional fixme - chromium")
  async testConditionalChromium() {
    // This test should be marked as fixme only in Chromium
    // When marked as fixme, this error won't cause the test to fail
    if (this.browserName === 'chromium') {
      throw new Error("This test fails in Chromium");
    }
    expect(true).toBe(true);
  }

  @fixme((self) => self.isMobile, "Mobile-specific issue")
  @test("conditional fixme - mobile")
  async testConditionalMobile() {
    // This test should be marked as fixme only on mobile
    // When marked as fixme, this error won't cause the test to fail
    if (this.isMobile) {
      throw new Error("This test fails on mobile");
    }
    expect(true).toBe(true);
  }

  @test("not conditional fixme")
  async testNotConditionalFixme() {
    // This test should run
    expect(true).toBe(true);
  }
}

@describe("@fixme Edge Cases")
class FixmeEdgeCaseTests extends BaseTest {
  @fixme("")
  @test("fixme with empty reason")
  async testEmptyReason() {
    throw new Error("This test should not run");
  }

  @fixme("Very long reason: " + "x".repeat(200))
  @test("fixme with long reason")
  async testLongReason() {
    throw new Error("This test should not run");
  }

  @fixme("Reason with special characters: !@#$%^&*()")
  @test("fixme with special characters")
  async testSpecialCharsReason() {
    throw new Error("This test should not run");
  }

  @fixme("Multi-line\nreason\ntext")
  @test("fixme with multiline reason")
  async testMultilineReason() {
    throw new Error("This test should not run");
  }
}

@describe("@fixme Validation")
class FixmeValidationTests extends BaseTest {
  @test("regular test 1")
  async testRegular1() {
    expect(1).toBe(1);
  }

  @fixme("Needs fixing")
  @test("fixme test in middle")
  async testFixmeMiddle() {
    throw new Error("This test should not run");
  }

  @test("regular test 2")
  async testRegular2() {
    expect(2).toBe(2);
  }

  @fixme("Also needs fixing")
  @test("another fixme test")
  async testFixme2() {
    throw new Error("This test should not run");
  }

  @test("regular test 3")
  async testRegular3() {
    expect(3).toBe(3);
  }
}
