import { describe } from "../src/decorator-describe";
import { test } from "../src/decorator-test";
import { beforeEach } from "../src/decorator-lifecycle";
import { step } from "../src/decorator-step";
import { tag } from "../src/decorator-tag";
import { expect } from "@playwright/test";
import { BaseTest } from "../src/baseTest";
import { DynamicElementsPage } from "./page-objects/DynamicElementsPage";

@describe("Dynamic Elements - Add/Remove Elements")
class DynamicElementsTests extends BaseTest {
  dynamicPage!: DynamicElementsPage;

  @beforeEach()
  async setup() {
    this.dynamicPage = new DynamicElementsPage(this.page);
    await this.dynamicPage.goto();
  }

  @tag("dynamic", "smoke")
  @test("should add a single element")
  async testAddSingleElement() {
    const initialCount = await this.dynamicPage.getElementCount();
    expect(initialCount).toBe(0);

    await this.addElements(1);

    const newCount = await this.dynamicPage.getElementCount();
    expect(newCount).toBe(1);
  }

  @tag("dynamic")
  @test("should add multiple elements")
  async testAddMultipleElements() {
    await this.addElements(5);

    const count = await this.dynamicPage.getElementCount();
    expect(count).toBe(5);
  }

  @tag("dynamic")
  @test("should remove an element")
  async testRemoveElement() {
    await this.addElements(3);
    
    let count = await this.dynamicPage.getElementCount();
    expect(count).toBe(3);

    await this.removeElement(0);

    count = await this.dynamicPage.getElementCount();
    expect(count).toBe(2);
  }

  @tag("dynamic")
  @test("should remove all elements")
  async testRemoveAllElements() {
    await this.addElements(5);

    let count = await this.dynamicPage.getElementCount();
    expect(count).toBe(5);

    await this.removeAllElements();

    count = await this.dynamicPage.getElementCount();
    expect(count).toBe(0);
  }

  @tag("dynamic")
  @test("should handle adding and removing elements sequentially")
  async testSequentialAddRemove() {
    // Add 3 elements
    await this.addElements(3);
    expect(await this.dynamicPage.getElementCount()).toBe(3);

    // Remove 1 element
    await this.removeElement(0);
    expect(await this.dynamicPage.getElementCount()).toBe(2);

    // Add 2 more elements
    await this.addElements(2);
    expect(await this.dynamicPage.getElementCount()).toBe(4);

    // Remove all elements
    await this.removeAllElements();
    expect(await this.dynamicPage.getElementCount()).toBe(0);
  }

  @step("Add $0 element(s)")
  async addElements(count: number) {
    for (let i = 0; i < count; i++) {
      await this.dynamicPage.addElement();
    }
  }

  @step("Remove element at index $0")
  async removeElement(index: number) {
    await this.dynamicPage.removeElement(index);
  }

  @step("Remove all elements")
  async removeAllElements() {
    await this.dynamicPage.removeAllElements();
  }
}
