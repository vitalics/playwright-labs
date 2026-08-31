import { expect } from "@playwright/test";
import { selectorRealization } from "@playwright-labs/locators-extra";

// importing ../src registers the "vue" realizer (side effect) and the
// vue= engine (worker fixture)
import { test } from "../src";

test.describe("VueRealizer — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  test("realizes an element into vue=ComponentName", async ({ page }) => {
    const selector = await selectorRealization(
      page.locator(".btn").first(),
      "vue",
    );
    expect(selector).toBe("vue=Button");
  });

  test("realized selector round-trips through the vue engine", async ({
    page,
  }) => {
    const selector = await selectorRealization(
      page.locator(".btn").first(),
      "vue",
    );
    await expect(page.locator(selector)).toHaveCount(3);
  });

  test("walks up to the nearest named component", async ({ page }) => {
    // an inner element of UserCard realizes to the card component
    const inner = page.locator("vue=UserCard").first().locator("*").first();
    const selector = await selectorRealization(inner, "vue");
    expect(selector).toMatch(/^vue=/);
    await expect(page.locator(selector)).toHaveCount(2);
  });

  test("throws for non-vue elements", async ({ page }) => {
    await page.setContent("<div id='plain'>no vue here</div>");
    await expect(
      selectorRealization(page.locator("#plain"), "vue"),
    ).rejects.toThrow(/no Vue component instance/);
  });
});
