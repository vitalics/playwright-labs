import { expect } from "@playwright/test";
import { selectorRealization } from "@playwright-labs/locators-extra";

// importing ../src registers the "react" realizer (side effect) and the
// react= engine (worker fixture)
import { test } from "../src";

test.describe("ReactRealizer — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  test("realizes an element into react=ComponentName", async ({ page }) => {
    const selector = await selectorRealization(
      page.locator(".btn").first(),
      "react",
    );
    expect(selector).toBe("react=Button");
  });

  test("realized selector round-trips through the react engine", async ({
    page,
  }) => {
    const selector = await selectorRealization(
      page.locator(".btn").first(),
      "react",
    );
    await expect(page.locator(selector)).toHaveCount(3);
  });

  test("walks up to the nearest named component", async ({ page }) => {
    // an inner element of UserCard realizes to the card component
    const inner = page.locator("react=UserCard").first().locator("*").first();
    const selector = await selectorRealization(inner, "react");
    expect(selector).toMatch(/^react=/);
    await expect(page.locator(selector)).toHaveCount(2);
  });

  test("throws for non-react elements", async ({ page }) => {
    await page.setContent("<div id='plain'>no react here</div>");
    await expect(
      selectorRealization(page.locator("#plain"), "react"),
    ).rejects.toThrow(/no React fiber/);
  });
});
