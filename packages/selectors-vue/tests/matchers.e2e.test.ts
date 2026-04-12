import { expect as baseExpect } from "@playwright/test";
import { test } from "../src/fixture";
import { expect } from "../src/matchers";

test.describe("Vue custom matchers — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ── toBeVueComponent ────────────────────────────────────────────────────

  test.describe("toBeVueComponent", () => {
    test("passes for elements matched by Vue selector", async ({ page }) => {
      await expect(page.locator("vue=Button").first()).toBeVueComponent();
      await expect(page.locator("vue=Counter").first()).toBeVueComponent();
      await expect(page.locator("vue=ThemedButton")).toBeVueComponent();
    });

    test("fails for static element outside the Vue root", async ({ page }) => {
      await expect(page.locator("#static")).not.toBeVueComponent();
    });
  });

  // ── toHaveVueProp ────────────────────────────────────────────────────────

  test.describe("toHaveVueProp", () => {
    test("detects declared prop by name", async ({ page }) => {
      await expect(page.locator("vue=Button").first()).toHaveVueProp("label");
      await expect(page.locator("vue=Button").first()).toHaveVueProp("variant");
    });

    test("detects declared prop with exact value", async ({ page }) => {
      await expect(page.locator("vue=Button").first()).toHaveVueProp(
        "label",
        "Submit",
      );
      await expect(page.locator("vue=Button").last()).toHaveVueProp(
        "disabled",
        true,
      );
    });

    test("fails when prop does not exist", async ({ page }) => {
      await expect(
        page.locator("vue=Button").first(),
      ).not.toHaveVueProp("nonExistent");
    });

    test("fails when value does not match", async ({ page }) => {
      await expect(
        page.locator("vue=Button").first(),
      ).not.toHaveVueProp("label", "Delete");
    });
  });

  // ── toBeVueProp ──────────────────────────────────────────────────────────

  test.describe("toBeVueProp", () => {
    test("matches exact string prop value", async ({ page }) => {
      await expect(
        page.locator('vue=Button[label="Delete"]'),
      ).toBeVueProp("disabled", true);
      await expect(
        page.locator("vue=Counter").first(),
      ).toBeVueProp("step", 1);
    });

    test("matches nested object prop", async ({ page }) => {
      await expect(
        page.locator('vue=UserCard[user.name="Alice"]'),
      ).toBeVueProp("user", { name: "Alice", role: "admin" });
    });

    test("fails when value does not match", async ({ page }) => {
      await expect(
        page.locator("vue=Button").first(),
      ).not.toBeVueProp("label", "Cancel");
    });
  });

  // ── toHaveVueSetup ────────────────────────────────────────────────────────

  test.describe("toHaveVueSetup", () => {
    test("detects initial count=0 on Counter", async ({ page }) => {
      await expect(page.locator("vue=Counter").first()).toHaveVueSetup("count");
      await expect(page.locator("vue=Counter").first()).toHaveVueSetup(
        "count",
        0,
      );
    });

    test("detects injected theme on ThemedButton", async ({ page }) => {
      await expect(page.locator("vue=ThemedButton")).toHaveVueSetup("theme");
      await expect(page.locator("vue=ThemedButton")).toHaveVueSetup(
        "theme",
        "dark",
      );
    });

    test("fails for Options API component without setup state", async ({
      page,
    }) => {
      await expect(
        page.locator("vue=OptionsCounter"),
      ).not.toHaveVueSetup("count");
    });
  });

  // ── toBeVueSetup ─────────────────────────────────────────────────────────

  test.describe("toBeVueSetup", () => {
    test("reflects state after increment click", async ({ page }) => {
      const counter = page.locator(".counter").first();
      await counter.locator("button").last().click();
      await expect(page.locator("vue=Counter").first()).toBeVueSetup("count", 1);
    });

    test("fails when setup state value does not match", async ({ page }) => {
      await expect(
        page.locator("vue=Counter").first(),
      ).not.toBeVueSetup("count", 99);
    });
  });

  // ── toHaveVueData ─────────────────────────────────────────────────────────

  test.describe("toHaveVueData", () => {
    test("detects initial count=0 in OptionsCounter data", async ({ page }) => {
      await expect(
        page.locator("vue=OptionsCounter"),
      ).toHaveVueData("count");
      await expect(
        page.locator("vue=OptionsCounter"),
      ).toHaveVueData("count", 0);
    });

    test("fails for Composition API component", async ({ page }) => {
      await expect(
        page.locator("vue=Counter").first(),
      ).not.toHaveVueData("count");
    });
  });

  // ── toBeVueData ───────────────────────────────────────────────────────────

  test.describe("toBeVueData", () => {
    test("reflects data after increment click", async ({ page }) => {
      await page
        .locator(".options-counter")
        .locator("button")
        .last()
        .click();
      await expect(page.locator("vue=OptionsCounter")).toBeVueData("count", 1);
    });

    test("fails when data value does not match", async ({ page }) => {
      await expect(
        page.locator("vue=OptionsCounter"),
      ).not.toBeVueData("count", 99);
    });
  });

  // ── toMatchVueSnapshot ────────────────────────────────────────────────────

  test.describe("toMatchVueSnapshot", () => {
    test("matches exact DOM snapshot of a UserCard", async ({ page }) => {
      const html = await page
        .locator("vue=UserCard")
        .first()
        .evaluate((el) => el.outerHTML);
      await expect(page.locator("vue=UserCard").first()).toMatchVueSnapshot(
        html,
      );
    });

    test("fails when snapshot does not match", async ({ page }) => {
      await expect(
        page.locator("vue=UserCard").first(),
      ).not.toMatchVueSnapshot("<div>wrong snapshot</div>");
    });
  });

  // ── Combined usage ────────────────────────────────────────────────────────

  test.describe("combined usage with baseExpect", () => {
    test("count selector and toHaveVueSetup after multiple clicks", async ({
      page,
    }) => {
      const incBtn = page.locator(".counter").first().locator("button").last();
      await incBtn.click();
      await incBtn.click();
      await baseExpect(
        page.locator("vue=Counter[setup.count=2]"),
      ).toHaveCount(1);
      await expect(page.locator("vue=Counter").first()).toHaveVueSetup(
        "count",
        2,
      );
    });
  });
});
