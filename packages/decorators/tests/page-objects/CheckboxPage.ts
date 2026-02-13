import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Checkboxes page
 */
export class CheckboxPage extends BasePage {
  readonly checkboxes: Locator;

  constructor(page: Page) {
    super(page);
    this.checkboxes = page.locator('input[type="checkbox"]');
  }

  async goto() {
    await super.goto("/checkboxes");
  }

  async checkCheckbox(index: number) {
    const checkbox = this.checkboxes.nth(index);
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  async uncheckCheckbox(index: number) {
    const checkbox = this.checkboxes.nth(index);
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
  }

  async isChecked(index: number): Promise<boolean> {
    return await this.checkboxes.nth(index).isChecked();
  }

  async toggleCheckbox(index: number) {
    await this.checkboxes.nth(index).click();
  }

  async getCheckboxCount(): Promise<number> {
    return await this.checkboxes.count();
  }
}
