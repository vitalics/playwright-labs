import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { BaseTest } from "../src/baseTest";
import { expect } from "@playwright/test";

@describe("All Playwright Fixtures Availability")
class AllFixturesTests extends BaseTest {
  @test("should have access to all test-scoped fixtures")
  async testPlaywrightTestArgs() {
    // Test PlaywrightTestArgs fixtures
    expect(this.pwSelf.page).toBeDefined();
    expect(typeof this.pwSelf.page.goto).toBe("function");

    expect(this.pwSelf.context).toBeDefined();
    expect(typeof this.pwSelf.context.newPage).toBe("function");

    expect(this.pwSelf.request).toBeDefined();
    expect(typeof this.pwSelf.request.get).toBe("function");
  }

  @test("should have access to all worker-scoped fixtures")
  async testPlaywrightWorkerArgs() {
    // Test PlaywrightWorkerArgs fixtures
    expect(this.pwSelf.browser).toBeDefined();
    expect(typeof this.pwSelf.browser.newContext).toBe("function");

    expect(this.pwSelf.browserName).toBeDefined();
    expect(["chromium", "firefox", "webkit"]).toContain(
      this.pwSelf.browserName,
    );
  }

  @test("should have access to test configuration options")
  async testPlaywrightTestOptions() {
    // Test PlaywrightTestOptions - these are configuration values
    expect(this.acceptDownloads).toBeDefined();
    expect(typeof this.acceptDownloads).toBe("boolean");

    expect(this.bypassCSP).toBeDefined();
    expect(typeof this.bypassCSP).toBe("boolean");

    expect(this.ignoreHTTPSErrors).toBeDefined();
    expect(typeof this.ignoreHTTPSErrors).toBe("boolean");

    expect(this.isMobile).toBeDefined();
    expect(typeof this.isMobile).toBe("boolean");

    expect(this.javaScriptEnabled).toBeDefined();
    expect(typeof this.javaScriptEnabled).toBe("boolean");

    // Viewport can be null or an object
    if (this.pwSelf.viewport !== null && this.pwSelf.viewport !== undefined) {
      expect(this.pwSelf.viewport).toHaveProperty("width");
      expect(this.pwSelf.viewport).toHaveProperty("height");
    }

    // colorScheme is defined
    expect(this.colorScheme).toBeDefined();
  }

  @test("should have access to worker configuration options")
  async testPlaywrightWorkerOptions() {
    // Test PlaywrightWorkerOptions
    expect(this.headless).toBeDefined();
    expect(typeof this.headless).toBe("boolean");

    // screenshot option is defined
    expect(this.screenshot).toBeDefined();
    expect(["off", "on", "only-on-failure", "on-first-failure"]).toContain(
      this.screenshot,
    );

    // trace option is defined
    expect(this.trace).toBeDefined();

    // video option is defined
    expect(this.video).toBeDefined();
  }

  @test("should be able to use locale fixture")
  async testLocaleFixture() {
    expect(this.locale).toBeDefined();
    expect(typeof this.locale).toBe("string");
    // Common locale format like 'en-US'
    expect(this.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  }

  @test("should be able to use viewport fixture")
  async testViewportFixture() {
    // Viewport is available (can be null if disabled)
    if (this.pwSelf.viewport) {
      expect(this.pwSelf.viewport).toHaveProperty("width");
      expect(this.pwSelf.viewport).toHaveProperty("height");
      expect(typeof this.pwSelf.viewport.width).toBe("number");
      expect(typeof this.pwSelf.viewport.height).toBe("number");
    }
  }

  @test("should be able to use userAgent fixture")
  async testUserAgentFixture() {
    // userAgent can be undefined or a string
    if (this.pwSelf.userAgent !== undefined) {
      expect(typeof this.pwSelf.userAgent).toBe("string");
      expect(this.pwSelf.userAgent.length).toBeGreaterThan(0);
    }
  }

  @test("should be able to use deviceScaleFactor fixture")
  async testDeviceScaleFactorFixture() {
    if (this.pwSelf.deviceScaleFactor !== undefined) {
      expect(typeof this.pwSelf.deviceScaleFactor).toBe("number");
      expect(this.pwSelf.deviceScaleFactor).toBeGreaterThan(0);
    }
  }

  @test("should be able to use hasTouch fixture")
  async testHasTouchFixture() {
    expect(this.hasTouch).toBeDefined();
    expect(typeof this.hasTouch).toBe("boolean");
  }

  @test("should be able to use offline fixture")
  async testOfflineFixture() {
    expect(this.offline).toBeDefined();
    expect(typeof this.offline).toBe("boolean");
  }

  @test("should be able to access extraHTTPHeaders")
  async testExtraHTTPHeaders() {
    // extraHTTPHeaders can be undefined or an object
    if (this.pwSelf.extraHTTPHeaders) {
      expect(typeof this.pwSelf.extraHTTPHeaders).toBe("object");
    }
  }

  @test("should be able to access geolocation")
  async testGeolocation() {
    // geolocation can be undefined or an object with longitude/latitude
    if (this.pwSelf.geolocation) {
      expect(this.pwSelf.geolocation).toHaveProperty("longitude");
      expect(this.pwSelf.geolocation).toHaveProperty("latitude");
    }
  }

  @test("should be able to access permissions")
  async testPermissions() {
    // permissions can be undefined or an array
    if (this.pwSelf.permissions) {
      expect(Array.isArray(this.pwSelf.permissions)).toBe(true);
    }
  }

  @test("should be able to access baseURL")
  async testBaseURL() {
    // baseURL can be undefined or a string
    if (this.pwSelf.baseURL) {
      expect(typeof this.pwSelf.baseURL).toBe("string");
    }
  }

  @test("should be able to access storageState")
  async testStorageState() {
    // storageState can be undefined, string, or object
    if (this.pwSelf.storageState) {
      const isStringOrObject =
        typeof this.pwSelf.storageState === "string" ||
        typeof this.pwSelf.storageState === "object";
      expect(isStringOrObject).toBe(true);
    }
  }

  @test("should be able to access timeout options")
  async testTimeoutOptions() {
    // actionTimeout and navigationTimeout can be undefined or numbers
    if (this.pwSelf.actionTimeout !== undefined) {
      expect(typeof this.pwSelf.actionTimeout).toBe("number");
    }

    if (this.pwSelf.navigationTimeout !== undefined) {
      expect(typeof this.pwSelf.navigationTimeout).toBe("number");
    }
  }

  @test("should be able to access serviceWorkers option")
  async testServiceWorkersOption() {
    // serviceWorkers can be 'allow' or 'block'
    if (this.pwSelf.serviceWorkers) {
      expect(["allow", "block"]).toContain(this.pwSelf.serviceWorkers);
    }
  }

  @test("should be able to access testIdAttribute")
  async testTestIdAttribute() {
    // testIdAttribute can be undefined or a string
    if (this.pwSelf.testIdAttribute) {
      expect(typeof this.pwSelf.testIdAttribute).toBe("string");
    }
  }

  @test("should be able to access browser channel")
  async testBrowserChannel() {
    // channel can be undefined or a string like 'chrome', 'msedge'
    if (this.pwSelf.channel) {
      expect(typeof this.pwSelf.channel).toBe("string");
    }
  }

  @test("all core fixtures work together in real scenario")
  async testRealWorldScenario() {
    // Verify we can use multiple fixtures together
    expect(this.pwSelf.page).toBeDefined();
    expect(this.pwSelf.context).toBeDefined();
    expect(this.pwSelf.browser).toBeDefined();
    expect(this.pwSelf.browserName).toBeDefined();
    expect(this.pwSelf.request).toBeDefined();

    // Navigate using page fixture
    await this.pwSelf.page.goto("https://example.com");

    // Check title
    const title = await this.pwSelf.page.title();
    expect(title).toBeTruthy();

    // Use context fixture
    const pages = this.pwSelf.context.pages();
    expect(pages.length).toBeGreaterThan(0);

    // Use browser fixture
    const browserVersion = this.pwSelf.browser.version();
    expect(browserVersion).toBeTruthy();

    // Use request fixture for API call
    const response = await this.pwSelf.request.get("https://example.com");
    expect(response.ok()).toBe(true);
  }
}
