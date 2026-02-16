import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Add/Remove Elements page
 */
export class DynamicElementsPage extends BasePage {
  readonly addButton: Locator;
  readonly deleteButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.addButton = page.locator('button:has-text("Add Element")');
    this.deleteButtons = page.locator(".added-manually");
  }

  async goto() {
    await super.goto("/add_remove_elements/");
  }

  async addElement() {
    await this.addButton.click();
  }

  async getElementCount(): Promise<number> {
    return await this.deleteButtons.count();
  }

  async removeElement(index: number = 0) {
    await this.deleteButtons.nth(index).click();
  }

  async removeAllElements() {
    const count = await this.getElementCount();
    for (let i = 0; i < count; i++) {
      await this.removeElement(0);
    }
  }
}
