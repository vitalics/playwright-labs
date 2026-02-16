import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { DropdownPage } from "./page-objects/DropdownPage";

@describe("Dropdown - Selection Tests")
class DropdownTests extends BaseTest {
  dropdownPage!: DropdownPage;

  @beforeEach()
  async setup() {
    this.dropdownPage = new DropdownPage(this.page);
    await this.dropdownPage.goto();
  }

  @tag("dropdown", "smoke")
  @test("should have all expected options")
  async testDropdownOptions() {
    const options = await this.dropdownPage.getAllOptions();

    expect(options).toHaveLength(3);
    expect(options).toContain("Please select an option");
    expect(options).toContain("Option 1");
    expect(options).toContain("Option 2");
  }

  @tag("dropdown")
  @test("should select Option 1")
  async testSelectOption1() {
    await this.selectOption("1");

    const selectedValue = await this.dropdownPage.getSelectedOption();
    expect(selectedValue).toBe("1");

    const selectedText = await this.dropdownPage.getSelectedOptionText();
    expect(selectedText).toBe("Option 1");
  }

  @tag("dropdown")
  @test("should select Option 2")
  async testSelectOption2() {
    await this.selectOption("2");

    const selectedValue = await this.dropdownPage.getSelectedOption();
    expect(selectedValue).toBe("2");

    const selectedText = await this.dropdownPage.getSelectedOptionText();
    expect(selectedText).toBe("Option 2");
  }

  @tag("dropdown")
  @test("should change selection from Option 1 to Option 2")
  async testChangeSelection() {
    // Select Option 1
    await this.selectOption("1");
    let selectedValue = await this.dropdownPage.getSelectedOption();
    expect(selectedValue).toBe("1");

    // Change to Option 2
    await this.selectOption("2");
    selectedValue = await this.dropdownPage.getSelectedOption();
    expect(selectedValue).toBe("2");
  }

  @tag("dropdown")
  @test("should maintain selection after page interaction")
  async testSelectionPersistence() {
    await this.selectOption("1");

    // Interact with page
    await this.page.evaluate(() => {
      // @ts-ignore fix later
      document.body.click();
    });

    const selectedValue = await this.dropdownPage.getSelectedOption();
    expect(selectedValue).toBe("1");
  }

  @step("Select option with value $0")
  async selectOption(value: string) {
    await this.dropdownPage.selectOption(value);
  }
}
