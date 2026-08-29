import { expect } from "@playwright/test";
import { selectorRealization } from "@playwright-labs/locators-extra";

// importing ../src registers the "angular" realizer (side effect) and the
// angular= engine (worker fixture)
import { test } from "../src";

test.describe("AngularRealizer — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("app-button");
  });

  test("realizes an element into angular=<host-tag-name>", async ({
    page,
  }) => {
    const selector = await selectorRealization(
      page.locator("app-button").first(),
      "angular",
    );
    expect(selector).toBe("angular=app-button");
  });

  test("realized selector round-trips through the angular engine", async ({
    page,
  }) => {
    const selector = await selectorRealization(
      page.locator("app-button").first(),
      "angular",
    );
    await expect(page.locator(selector)).toHaveCount(3);
  });

  test("walks up to the nearest component host", async ({ page }) => {
    // an inner element of app-user-card realizes to the card component
    const inner = page
      .locator("angular=app-user-card")
      .first()
      .locator("*")
      .first();
    const selector = await selectorRealization(inner, "angular");
    expect(selector).toMatch(/^angular=/);
    await expect(page.locator(selector)).toHaveCount(2);
  });

  test("throws for non-angular elements", async ({ page }) => {
    await page.setContent("<div id='plain'>no angular here</div>");
    await expect(
      selectorRealization(page.locator("#plain"), "angular"),
    ).rejects.toThrow(/no Angular component owns the element/);
  });
});
