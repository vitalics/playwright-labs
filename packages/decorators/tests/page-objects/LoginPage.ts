import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Login (Form Authentication) page
 */
export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly flashMessage: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator("#username");
    this.passwordInput = page.locator("#password");
    this.loginButton = page.locator('button[type="submit"]');
    this.flashMessage = page.locator("#flash");
    this.logoutButton = page.locator('a[href="/logout"]');
  }

  async goto() {
    await super.goto("/login");
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getFlashMessage(): Promise<string> {
    return await this.flashMessage.textContent() || "";
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.logoutButton.isVisible();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
