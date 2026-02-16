import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { CheckboxPage } from "./page-objects/CheckboxPage";

@describe("Checkboxes - State Management")
class CheckboxTests extends BaseTest {
  checkboxPage!: CheckboxPage;

  @beforeEach()
  async setup() {
    this.checkboxPage = new CheckboxPage(this.page);
    await this.checkboxPage.goto();
  }

  @tag("checkbox", "smoke")
  @test("should have two checkboxes")
  async testCheckboxCount() {
    const count = await this.checkboxPage.getCheckboxCount();
    expect(count).toBe(2);
  }

  @tag("checkbox")
  @test("should check an unchecked checkbox")
  async testCheckCheckbox() {
    // First checkbox is unchecked by default
    const initialState = await this.checkboxPage.isChecked(0);
    expect(initialState).toBe(false);

    await this.checkCheckbox(0);

    const newState = await this.checkboxPage.isChecked(0);
    expect(newState).toBe(true);
  }

  @tag("checkbox")
  @test("should uncheck a checked checkbox")
  async testUncheckCheckbox() {
    // Second checkbox is checked by default
    const initialState = await this.checkboxPage.isChecked(1);
    expect(initialState).toBe(true);

    await this.uncheckCheckbox(1);

    const newState = await this.checkboxPage.isChecked(1);
    expect(newState).toBe(false);
  }

  @tag("checkbox")
  @test("should toggle checkbox state")
  async testToggleCheckbox() {
    const initialState = await this.checkboxPage.isChecked(0);
    
    await this.toggleCheckbox(0);
    const stateAfterFirstToggle = await this.checkboxPage.isChecked(0);
    expect(stateAfterFirstToggle).toBe(!initialState);

    await this.toggleCheckbox(0);
    const stateAfterSecondToggle = await this.checkboxPage.isChecked(0);
    expect(stateAfterSecondToggle).toBe(initialState);
  }

  @tag("checkbox")
  @test("should check all checkboxes")
  async testCheckAllCheckboxes() {
    await this.checkCheckbox(0);
    await this.checkCheckbox(1);

    expect(await this.checkboxPage.isChecked(0)).toBe(true);
    expect(await this.checkboxPage.isChecked(1)).toBe(true);
  }

  @tag("checkbox")
  @test("should uncheck all checkboxes")
  async testUncheckAllCheckboxes() {
    await this.uncheckCheckbox(0);
    await this.uncheckCheckbox(1);

    expect(await this.checkboxPage.isChecked(0)).toBe(false);
    expect(await this.checkboxPage.isChecked(1)).toBe(false);
  }

  @step("Check checkbox at index $0")
  async checkCheckbox(index: number) {
    await this.checkboxPage.checkCheckbox(index);
  }

  @step("Uncheck checkbox at index $0")
  async uncheckCheckbox(index: number) {
    await this.checkboxPage.uncheckCheckbox(index);
  }

  @step("Toggle checkbox at index $0")
  async toggleCheckbox(index: number) {
    await this.checkboxPage.toggleCheckbox(index);
  }
}
