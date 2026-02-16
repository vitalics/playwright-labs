import { Page } from "@playwright/test";

/**
 * Base Page Object class that all page objects extend.
 * Provides common functionality for all pages.
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a specific path on the site
   */
  async goto(path: string = "") {
    const baseUrl = "https://the-internet.herokuapp.com";
    await this.page.goto(`${baseUrl}${path}`);
  }

  /**
   * Get the current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Wait for page to be loaded
   */
  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}
