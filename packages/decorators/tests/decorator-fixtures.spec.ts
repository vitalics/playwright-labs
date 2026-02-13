import { describe, test, BaseTest, beforeEach, afterEach } from "../src/index";
import { expect } from "@playwright/test";

// Basic fixture usage
@describe("Playwright Fixtures Support")
class BasicFixtureTests extends BaseTest {
  @test("page fixture is available")
  async testPageFixture() {
    expect(this.page).toBeDefined();
    expect(typeof this.page.goto).toBe("function");
  }

  @test("context fixture is available")
  async testContextFixture() {
    expect(this.context).toBeDefined();
    expect(typeof this.context.newPage).toBe("function");
  }

  @test("browser fixture is available")
  async testBrowserFixture() {
    expect(this.browser).toBeDefined();
    expect(this.browserName).toBeDefined();
    expect(["chromium", "firefox", "webkit"]).toContain(this.browserName);
  }

  @test("request fixture is available")
  async testRequestFixture() {
    expect(this.request).toBeDefined();
    expect(typeof this.request.get).toBe("function");
  }
}

// Using fixtures in lifecycle hooks
@describe("Fixtures in Lifecycle Hooks")
class FixtureLifecycleTests extends BaseTest {
  pageTitle: string = "";

  @beforeEach()
  async setupPage() {
    await this.page.goto("https://example.com");
    this.pageTitle = await this.page.title();
  }

  @test("beforeEach can use page fixture")
  async testBeforeEachFixture() {
    expect(this.pageTitle).toBeTruthy();
    expect(this.page.url()).toBe("https://example.com/");
  }

  @test("page fixture works in multiple tests")
  async testMultipleTests() {
    const content = await this.page.content();
    expect(content).toContain("Example Domain");
  }
}

// Combining fixtures with @param decorator
@describe("Fixtures with @param")
class FixtureParamTests extends BaseTest {
  @test("can use both fixtures and params")
  async testFixturesAndParams() {
    // Use page fixture
    await this.page.goto("https://example.com");
    
    // Verify page works
    const title = await this.page.title();
    expect(title).toBe("Example Domain");
  }
}
