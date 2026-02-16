import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Dropdown page
 */
export class DropdownPage extends BasePage {
  readonly dropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.dropdown = page.locator("#dropdown");
  }

  async goto() {
    await super.goto("/dropdown");
  }

  async selectOption(value: string) {
    await this.dropdown.selectOption(value);
  }

  async getSelectedOption(): Promise<string> {
    return await this.dropdown.inputValue();
  }

  async getSelectedOptionText(): Promise<string> {
    const value = await this.getSelectedOption();
    const option = this.dropdown.locator(`option[value="${value}"]`);
    return await option.textContent() || "";
  }

  async getAllOptions(): Promise<string[]> {
    const options = await this.dropdown.locator("option").allTextContents();
    return options;
  }
}
