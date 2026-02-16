import {
  describe,
  test,
  BaseTest,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  param,
  step,
} from "../src/index";
import { expect } from "@playwright/test";

// Test 1: Verify all standard fixtures are available
@describe("Fixture Availability Tests")
class FixtureAvailabilityTests extends BaseTest {
  @test("page fixture is defined and functional")
  async testPageFixture() {
    expect(this.page).toBeDefined();
    expect(this.page).not.toBeNull();
    expect(typeof this.page.goto).toBe("function");
    expect(typeof this.page.click).toBe("function");
    expect(typeof this.page.fill).toBe("function");
    expect(typeof this.page.locator).toBe("function");
  }

  @test("context fixture is defined and functional")
  async testContextFixture() {
    expect(this.context).toBeDefined();
    expect(this.context).not.toBeNull();
    expect(typeof this.context.newPage).toBe("function");
    expect(typeof this.context.close).toBe("function");
  }

  @test("browser fixture is defined and functional")
  async testBrowserFixture() {
    expect(this.browser).toBeDefined();
    expect(this.browser).not.toBeNull();
    expect(typeof this.browser.newContext).toBe("function");
    expect(typeof this.browser.close).toBe("function");
  }

  @test("browserName fixture is valid")
  async testBrowserNameFixture() {
    expect(this.browserName).toBeDefined();
    expect(["chromium", "firefox", "webkit"]).toContain(this.browserName);
  }

  @test("request fixture is defined and functional")
  async testRequestFixture() {
    expect(this.request).toBeDefined();
    expect(this.request).not.toBeNull();
    expect(typeof this.request.get).toBe("function");
    expect(typeof this.request.post).toBe("function");
  }
}

// Test 2: Verify fixtures work in beforeEach
@describe("Fixtures in beforeEach")
class FixturesInBeforeEachTests extends BaseTest {
  beforeEachCalled: boolean = false;
  pageUrl: string = "";

  @beforeEach()
  async setupWithFixtures() {
    this.beforeEachCalled = true;
    await this.page.goto("https://example.com");
    this.pageUrl = this.page.url();
  }

  @test("beforeEach has access to page fixture")
  async testBeforeEachPageAccess() {
    expect(this.beforeEachCalled).toBe(true);
    expect(this.pageUrl).toBe("https://example.com/");
  }

  @test("page fixture persists to test method")
  async testPagePersistence() {
    expect(this.page.url()).toBe("https://example.com/");
    const content = await this.page.content();
    expect(content).toBeTruthy();
  }
}

// Test 3: Verify fixtures work in afterEach
@describe("Fixtures in afterEach")
class FixturesInAfterEachTests extends BaseTest {
  afterEachCalled: boolean = false;

  @afterEach()
  async cleanupWithFixtures() {
    this.afterEachCalled = true;
    // Verify we can access page in afterEach
    const url = this.page.url();
    expect(url).toBeTruthy();
  }

  @test("afterEach can access fixtures")
  async testAfterEachFixtures() {
    await this.page.goto("https://example.com");
    expect(this.page).toBeDefined();
    // afterEachCalled will be set after this test completes
  }
}

// Test 4: Verify fixtures work with multiple lifecycle hooks
@describe("Fixtures with Multiple Lifecycle Hooks")
class MultipleLifecycleFixturesTests extends BaseTest {
  setupCount: number = 0;
  cleanupCount: number = 0;

  @beforeEach()
  async setup1() {
    this.setupCount++;
    await this.page.goto("https://example.com");
  }

  @beforeEach()
  async setup2() {
    this.setupCount++;
    expect(this.page.url()).toBe("https://example.com/");
  }

  @afterEach()
  async cleanup1() {
    this.cleanupCount++;
    expect(this.page).toBeDefined();
  }

  @afterEach()
  async cleanup2() {
    this.cleanupCount++;
  }

  @test("multiple lifecycle hooks have fixture access")
  async testMultipleHooks() {
    expect(this.setupCount).toBe(2);
    expect(this.page).toBeDefined();
  }
}

// Test 5: Verify fixtures work with @param decorator
@describe("Fixtures with @param Decorator")
class FixturesWithParamTests extends BaseTest {
  @param("url")
  testUrl: string = "https://example.com";

  @test("can use both fixtures and params")
  async testFixturesAndParams() {
    await this.page.goto(this.testUrl);
    expect(this.page.url()).toBe("https://example.com/");
  }

  @test("params don't interfere with fixtures")
  async testNoInterference() {
    expect(this.testUrl).toBe("https://example.com");
    expect(this.page).toBeDefined();
    expect(this.context).toBeDefined();
  }
}

// Test 6: Verify fixtures work with @step decorator
@describe("Fixtures with @step Decorator")
class FixturesWithStepTests extends BaseTest {
  @step("Navigate to $0")
  async navigateToUrl(url: string) {
    await this.page.goto(url);
  }

  @step("Get page title")
  async getTitle() {
    return await this.page.title();
  }

  @test("fixtures work inside @step methods")
  async testFixturesInStep() {
    await this.navigateToUrl("https://example.com");
    const title = await this.getTitle();
    expect(title).toBe("Example Domain");
  }
}

// Test 7: Verify fixtures are isolated between tests
@describe("Fixture Isolation Between Tests")
class FixtureIsolationTests extends BaseTest {
  @test("test 1 modifies page state")
  async test1() {
    await this.page.goto("https://example.com");
    await this.page.evaluate(() => {
      // @ts-expect-error fix later
      (window as any).testValue = "test1";
    });
    // @ts-expect-error fix later
    const value = await this.page.evaluate(() => (window as any).testValue);
    expect(value).toBe("test1");
  }

  @test("test 2 has clean page state")
  async test2() {
    // Page should be fresh, not carry over state from test1
    const url = this.page.url();
    expect(url).toBe("about:blank");
  }
}

// Test 8: Verify context fixture can create new pages
@describe("Context Fixture Functionality")
class ContextFixtureFunctionalityTests extends BaseTest {
  @test("can create new page from context")
  async testNewPage() {
    const newPage = await this.context.newPage();
    expect(newPage).toBeDefined();
    await newPage.goto("https://example.com");
    expect(newPage.url()).toBe("https://example.com/");
    await newPage.close();
  }

  @test("multiple pages can coexist")
  async testMultiplePages() {
    const pages = this.context.pages();
    expect(pages.length).toBeGreaterThanOrEqual(1);

    const page2 = await this.context.newPage();
    await page2.goto("https://example.com");

    const pagesAfter = this.context.pages();
    expect(pagesAfter.length).toBeGreaterThan(pages.length);

    await page2.close();
  }
}

// Test 9: Verify request fixture for API testing
@describe("Request Fixture for API Testing")
class RequestFixtureTests extends BaseTest {
  @test("can make GET request")
  async testGetRequest() {
    const response = await this.request.get("https://example.com");
    expect(response.ok()).toBe(true);
    expect(response.status()).toBe(200);
  }

  @test("request fixture is independent of page")
  async testRequestIndependence() {
    // Make API request without navigating page
    const response = await this.request.get("https://example.com");
    expect(response.ok()).toBe(true);

    // Page should still be at about:blank
    expect(this.page.url()).toBe("about:blank");
  }
}

// Test 10: Verify fixtures work with inheritance
class BasePageTest extends BaseTest {
  async navigateToExample() {
    await this.page.goto("https://example.com");
  }

  async getPageTitle() {
    return await this.page.title();
  }
}

@describe("Fixtures with Class Inheritance")
class InheritedFixtureTests extends BasePageTest {
  @test("inherited methods have fixture access")
  async testInheritedMethodsWithFixtures() {
    await this.navigateToExample();
    const title = await this.getPageTitle();
    expect(title).toBe("Example Domain");
  }

  @test("child class has direct fixture access")
  async testChildClassFixtures() {
    expect(this.page).toBeDefined();
    expect(this.context).toBeDefined();
    await this.page.goto("https://example.com");
    expect(this.page.url()).toBe("https://example.com/");
  }
}

// Test 11: Verify fixtures work with complex scenarios
@describe("Complex Fixture Scenarios")
class ComplexFixtureTests extends BaseTest {
  @param("username")
  username: string = "testuser";

  @param("password")
  password: string = "testpass";

  @beforeEach()
  async setupTest() {
    await this.page.goto("https://example.com");
  }

  @step("Fill login form")
  async fillLoginForm() {
    // Simulate form filling
    await this.page.evaluate(() => {
      // @ts-expect-error fix later
      (window as any).loginAttempted = true;
    });
  }

  @test("complex scenario with fixtures, params, steps, and lifecycle")
  async testComplexScenario() {
    // Has beforeEach that uses fixtures ✓
    // Has params ✓
    expect(this.username).toBe("testuser");

    // Uses fixtures directly ✓
    expect(this.page.url()).toBe("https://example.com/");

    // Uses step that uses fixtures ✓
    await this.fillLoginForm();

    const attempted = await this.page.evaluate(
      // @ts-expect-error fix later
      () => (window as any).loginAttempted,
    );
    expect(attempted).toBe(true);
  }
}

// Test 12: Verify fixtures work with static beforeAll/afterAll
@describe("Fixtures with Static Lifecycle Hooks")
class StaticLifecycleFixtureTests extends BaseTest {
  static setupRan: boolean = false;

  @beforeAll()
  static async setupAll() {
    // Note: static methods don't have access to instance fixtures
    // They should still work without breaking fixture injection
    this.setupRan = true;
  }

  @test("fixtures work even with static lifecycle hooks")
  async testWithStaticHooks() {
    expect(StaticLifecycleFixtureTests.setupRan).toBe(true);
    expect(this.page).toBeDefined();
    await this.page.goto("https://example.com");
    expect(this.page.url()).toBe("https://example.com/");
  }
}

// Test 13: Verify browser fixture properties
@describe("Browser Fixture Properties")
class BrowserFixturePropertiesTests extends BaseTest {
  @test("browser has correct properties")
  async testBrowserProperties() {
    expect(this.browser.version()).toBeTruthy();
    expect(typeof this.browser.version()).toBe("string");
  }

  @test("browserName matches browser type")
  async testBrowserNameMatches() {
    const browserName = this.browserName;
    expect(["chromium", "firefox", "webkit"]).toContain(browserName);
  }
}

// Test 14: Edge case - no BaseTest extension should still work
@describe("Tests Without BaseTest")
class TestsWithoutBaseTest {
  @test("test without BaseTest still works")
  async testWithoutBaseTest() {
    // This test doesn't extend BaseTest
    // It should still run but won't have fixtures
    expect(true).toBe(true);
  }
}
