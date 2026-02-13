import { describe } from "../src/decorator-describe";
import { test, serializable } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { annotate } from "../src/decorator-annotate";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { LoginPage } from "./page-objects/LoginPage";

@describe("Login Page - Data-Driven Tests")
class DataDrivenLoginTests extends BaseTest {
  loginPage!: LoginPage;

  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.loginPage.goto();
  }

  @tag("authentication", "data-driven", "negative")
  @test.each([
    ["", "", "Your username is invalid!"],
    ["invaliduser", "SuperSecretPassword!", "Your username is invalid!"],
    ["tomsmith", "wrongpassword", "Your password is invalid!"],
    ["", "SuperSecretPassword!", "Your username is invalid!"],
    ["tomsmith", "", "Your password is invalid!"],
  ], "should show error for invalid credentials: $0 / $1")
  async testInvalidLoginCombinations(
    username: string,
    password: string,
    expectedMessage: string,
  ) {
    await this.performLogin(username, password);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain(expectedMessage);

    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(false);
  }

  @tag("authentication", "data-driven")
  @test.each([
    [serializable((val: string) => `Option ${val}`)("1")],
    [serializable((val: string) => `Option ${val}`)("2")]
  ], "should test with dropdown option $0")
  async testWithDropdownOption(option: string) {
    // This test demonstrates using serializable for parameterized tests
    await this.performLogin("tomsmith", "SuperSecretPassword!");
    expect(await this.loginPage.isLoggedIn()).toBe(true);
  }

  @tag("authentication", "security")
  @annotate("security-test", "Tests SQL injection prevention")
  @test.each([
      ["admin' OR '1'='1", "password"],
      ["admin'--", "password"],
      ["' OR 1=1--", ""],
    ], "should prevent SQL injection with username: $0")
  async testSQLInjectionPrevention(username: string, password: string) {
    await this.performLogin(username, password);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("Your username is invalid!");

    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(false);
  }

  @tag("authentication", "security")
  @annotate("security-test", "Tests XSS prevention")
  @test.each([
      ["<script>alert('XSS')</script>", "password"],
      ["<img src=x onerror=alert('XSS')>", "password"],
      ["javascript:alert('XSS')", "password"],
    ], "should prevent XSS attacks with username: $0")
  async testXSSPrevention(username: string, password: string) {
    await this.performLogin(username, password);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("Your username is invalid!");

    // Verify no script execution
    const alertsTriggered = await this.page.evaluate(() => {
      return (window as any).alertTriggered || false;
    });
    expect(alertsTriggered).toBe(false);
  }

  @tag("authentication", "boundary")
  @test.each([
    ["a", "b"], // Minimum length
    ["a".repeat(100), "b".repeat(100)], // Long credentials
    ["user@example.com", "pass123"], // Email format
    ["user.name", "pass-word_123"], // Special chars
  ], "should handle edge case credentials: $0 / $1")
  async testEdgeCaseCredentials(username: string, password: string) {
    await this.performLogin(username, password);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toBeTruthy();
  }

  @step("Login with username=$0 and password=$1")
  async performLogin(username: string, password: string) {
    await this.loginPage.login(username, password);
  }
}
