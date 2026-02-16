import { test as baseTest, expect } from "@playwright/test";
import { makeDecorators } from "../src/index";
import { test as testDecorator } from "../src/decorator-test";

type Fixture = {
  customValue: number;
  customString: string;
};

// Extend Playwright test with custom fixture
const customTest = baseTest.extend<Fixture>({
  customValue: async ({}, use) => {
    await use(5);
  },
  customString: async ({}, use) => {
    await use("hello");
  },
});

// Create decorators with custom fixture keys using selector function
// The function receives a proxy and you destructure the fixtures you need
const { BaseTest, describe } = makeDecorators(
  customTest,
  ({ page, browser, browserName, customValue, customString }) => ({
    page,
    browser,
    browserName,
    customValue,
    customString,
  }),
);

// Extend BaseTest to add custom fixture types
class CustomBaseTest extends BaseTest {
  // For custom fixtures, we use the raw Playwright test with destructuring
  // This is a limitation of Playwright's fixture system
}

@describe("Custom Fixtures Support")
class CustomFixtureTests extends CustomBaseTest {
  @testDecorator("should access default fixtures via pwSelf")
  async testDefaultFixtures() {
    // Default fixtures work as expected through pwSelf
    expect(this.pwSelf.page).toBeDefined();
    expect(this.pwSelf.browser).toBeDefined();
    expect(this.pwSelf.browserName).toBeDefined();
  }

  @testDecorator("should access default fixtures directly")
  async testDirectAccess() {
    // Default fixtures also injected directly on instance
    expect(this.page).toBeDefined();
    expect(this.browser).toBeDefined();
  }

  @testDecorator("should access custom fixtures via pwSelf")
  async testCustomFixturesViaPwSelf() {
    // Custom fixtures are available in pwSelf
    expect((this.pwSelf as any).customValue).toBe(5);
    expect((this.pwSelf as any).customString).toBe("hello");
  }

  @testDecorator("should access custom fixtures directly on instance")
  async testCustomFixturesDirectly() {
    // Custom fixtures also injected directly on instance
    expect((this as any).customValue).toBe(5);
    expect((this as any).customString).toBe("hello");
  }
}

// For custom fixtures, use regular Playwright test syntax
customTest(
  "should access custom fixtures using test.extend pattern",
  async ({ customValue, customString, page }) => {
    expect(customValue).toBe(5);
    expect(customString).toBe("hello");
    expect(page).toBeDefined();
  },
);
