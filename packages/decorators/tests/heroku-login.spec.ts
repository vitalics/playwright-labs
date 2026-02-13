import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { param } from "../src/decorator-parameter";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { LoginPage } from "./page-objects/LoginPage";

@describe("Login Page - Form Authentication")
class LoginTests extends BaseTest {
  loginPage!: LoginPage;

  @param("validUsername")
  validUsername = "tomsmith";

  @param("validPassword")
  validPassword = "SuperSecretPassword!";

  @beforeEach()
  async setup() {
    this.loginPage = new LoginPage(this.page);
    await this.loginPage.goto();
  }

  @tag("smoke", "authentication")
  @test("should login successfully with valid credentials")
  async testValidLogin() {
    await this.performLogin(this.validUsername, this.validPassword);
    
    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("You logged into a secure area!");
  }

  @tag("authentication", "negative")
  @test("should show error with invalid username")
  async testInvalidUsername() {
    await this.performLogin("invaliduser", this.validPassword);
    
    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(false);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("Your username is invalid!");
  }

  @tag("authentication", "negative")
  @test("should show error with invalid password")
  async testInvalidPassword() {
    await this.performLogin(this.validUsername, "wrongpassword");
    
    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(false);

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("Your password is invalid!");
  }

  @tag("authentication", "negative")
  @test("should show error with empty credentials")
  async testEmptyCredentials() {
    await this.performLogin("", "");
    
    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("Your username is invalid!");
  }

  @tag("authentication")
  @test("should logout successfully")
  async testLogout() {
    await this.performLogin(this.validUsername, this.validPassword);
    
    const isLoggedIn = await this.loginPage.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    await this.performLogout();

    const flashMessage = await this.loginPage.getFlashMessage();
    expect(flashMessage).toContain("You logged out of the secure area!");
  }

  @step("Login with username=$0 and password=$1")
  async performLogin(username: string, password: string) {
    await this.loginPage.login(username, password);
  }

  @step("Logout from the application")
  async performLogout() {
    await this.loginPage.logout();
  }
}
