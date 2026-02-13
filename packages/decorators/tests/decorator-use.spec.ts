import { describe, test, use, BaseTest } from "../src/index";
import { expect } from "@playwright/test";

@describe("@use Decorator Tests")
class UseDecoratorTests extends BaseTest {
  @use({ locale: "en-US" })
  @test("should apply method-level use")
  async testMethodLevelUse() {
    expect(this.locale).toBe("en-US");
  }

  @use({ viewport: { width: 800, height: 600 } })
  @test("should configure viewport")
  async testViewportConfig() {
    expect(this.viewport).toEqual({ width: 800, height: 600 });
  }

  @test("should use default fixtures without @use")
  async testDefaultFixtures() {
    // Default fixtures should still work
    expect(this.page).toBeDefined();
    expect(this.browserName).toBeDefined();
  }
}

@describe("Mobile Tests with Class-Level @use")
@use({ isMobile: true, viewport: { width: 375, height: 667 } })
class MobileTests extends BaseTest {
  @test("should have mobile viewport from class-level @use")
  async testClassLevelUse() {
    expect(this.isMobile).toBe(true);
    expect(this.viewport).toEqual({ width: 375, height: 667 });
  }

  @use({ locale: "fr-FR" })
  @test("should override with method-level @use")
  async testMethodOverride() {
    // Mobile settings from class-level
    expect(this.isMobile).toBe(true);
    // Locale from method-level
    expect(this.locale).toBe("fr-FR");
  }
}

@describe("Dark Mode Tests")
@use({ colorScheme: "dark" })
class DarkModeTests extends BaseTest {
  @test("should use dark color scheme")
  async testDarkMode() {
    // Note: Class-level @use applies to all tests in this class
    expect(this.colorScheme).toBe("dark");
  }

  @test("should also use dark color scheme")
  async testDarkMode2() {
    // Class-level fixture configuration applies to all tests
    expect(this.colorScheme).toBe("dark");
  }
}
