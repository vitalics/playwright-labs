import { expect, test } from "../src";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("a11y fixture", () => {
  test("scans the whole page by default", async ({ a11y }) => {
    const results = await a11y.analyze();
    const ids = results.violations.map((violation) => violation.id);
    expect(ids).toContain("image-alt");
    expect(ids).toContain("label");
  });

  test("include accepts a locator", async ({ page, a11y }) => {
    const results = await a11y
      .include(page.locator("#good"))
      .withTags(["wcag2a"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("exclude accepts a locator", async ({ page, a11y }) => {
    const results = await a11y.exclude(page.locator("#bad")).analyze();
    const ids = results.violations.map((violation) => violation.id);
    expect(ids).not.toContain("image-alt");
    expect(ids).not.toContain("label");
  });

  test("locators and selector strings mix", async ({ page, a11y }) => {
    const results = await a11y
      .include("#bad")
      .exclude(page.locator("#no-alt"))
      .analyze();
    const ids = results.violations.map((violation) => violation.id);
    expect(ids).not.toContain("image-alt");
    expect(ids).toContain("label");
  });

  test("include fails loudly when nothing matches", async ({
    page,
    a11y,
  }) => {
    const builder = a11y.include(page.locator("#missing"));
    await expect(builder.analyze()).rejects.toThrow(
      /include locator matched no elements/,
    );
  });

  test("useA11y creates a fresh builder per call", async ({
    page,
    useA11y,
  }) => {
    const scoped = await useA11y().include(page.locator("#bad")).analyze();
    expect(scoped.violations.map((violation) => violation.id)).toContain(
      "image-alt",
    );

    // a new builder is not polluted by the previous include
    const whole = await useA11y().withTags(["wcag2a"]).analyze();
    expect(whole.violations.map((violation) => violation.id)).toContain(
      "label",
    );
  });
});

test.describe("toBeAccessible", () => {
  test("passes for an accessible region", async ({ page }) => {
    await expect(page.locator("#good")).toBeAccessible({ tags: ["wcag2a"] });
  });

  test("fails for a page with violations", async ({ page }) => {
    await expect(page).not.toBeAccessible({ tags: ["wcag2a"] });
  });

  test("supports include/exclude options", async ({ page }) => {
    await expect(page).toBeAccessible({
      exclude: [page.locator("#bad")],
      tags: ["wcag2a"],
    });
    await expect(page).not.toBeAccessible({
      include: ["#bad"],
      tags: ["wcag2a"],
    });
  });

  test("supports disabled rules", async ({ page }) => {
    await expect(page.locator("#bad")).not.toBeAccessible({
      tags: ["wcag2a"],
    });
    await expect(page.locator("#bad")).toBeAccessible({
      tags: ["wcag2a"],
      disableRules: ["image-alt", "label"],
    });
  });
});
