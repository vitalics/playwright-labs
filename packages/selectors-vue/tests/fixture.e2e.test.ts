import { expect as baseExpect } from "@playwright/test";
import { test } from "../src/fixture";
import { expect } from "../src/matchers";

test.describe("VueHtmlElement fixture — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ── $v fixture basics ──────────────────────────────────────────────────

  test.describe("$v fixture", () => {
    test("standard Locator methods work on VueHtmlElement via Proxy", async ({
      $v,
    }) => {
      // count() is a standard Locator method forwarded by the Proxy
      expect(await $v("vue=Button").count()).toBe(3);
    });

    test("nth() narrows to the correct element", async ({ $v }) => {
      expect(await $v("vue=Button").nth(1).prop("label")).toBe("Cancel");
    });

    test("first() narrows to the first element", async ({ $v }) => {
      expect(await $v("vue=Button").first().prop("label")).toBe("Submit");
    });

    test("last() narrows to the last element", async ({ $v }) => {
      expect(await $v("vue=Button").last().prop("label")).toBe("Delete");
    });
  });

  // ── componentName ──────────────────────────────────────────────────────

  test.describe("componentName()", () => {
    test("returns the component name for Button", async ({ $v }) => {
      const name = await $v("vue=Button").first().componentName();
      expect(name).toBe("Button");
    });

    test("returns the component name for Counter", async ({ $v }) => {
      const name = await $v("vue=Counter").first().componentName();
      expect(name).toBe("Counter");
    });

    test("returns the explicitly set name for OptionsCounter", async ({
      $v,
    }) => {
      const name = await $v("vue=OptionsCounter").componentName();
      expect(name).toBe("OptionsCounter");
    });
  });

  // ── props ──────────────────────────────────────────────────────────────

  test.describe("props()", () => {
    test("returns all props for Button", async ({ $v }) => {
      const props = await $v("vue=Button").first().props<{
        label: string;
        variant: string;
        disabled: boolean;
      }>();
      expect(props.label).toBe("Submit");
      expect(props.variant).toBe("primary");
      expect(props.disabled).toBe(false);
    });

    test("returns user object prop for UserCard", async ({ $v }) => {
      const props = await $v('vue=UserCard[user.name="Alice"]').props<{
        user: { name: string; role: string };
      }>();
      expect(props.user).toEqual({ name: "Alice", role: "admin" });
    });
  });

  // ── prop ───────────────────────────────────────────────────────────────

  test.describe("prop()", () => {
    test("reads string props from Button", async ({ $v }) => {
      expect(await $v("vue=Button").first().prop("label")).toBe("Submit");
      expect(await $v("vue=Button").nth(1).prop("label")).toBe("Cancel");
      expect(await $v("vue=Button").last().prop("label")).toBe("Delete");
    });

    test("reads boolean disabled prop", async ({ $v }) => {
      expect(await $v("vue=Button[disabled=true]").prop("disabled")).toBe(true);
      expect(
        await $v("vue=Button[disabled=false]").first().prop("disabled"),
      ).toBe(false);
    });

    test("reads numeric step from Counter", async ({ $v }) => {
      expect(await $v("vue=Counter").first().prop("step")).toBe(1);
      expect(await $v("vue=Counter").nth(1).prop("step")).toBe(5);
    });

    test("reads nested object user from UserCard", async ({ $v }) => {
      expect(
        await $v('vue=UserCard[user.name="Alice"]').prop("user"),
      ).toEqual({ name: "Alice", role: "admin" });
    });
  });

  // ── setup (Composition API) ────────────────────────────────────────────

  test.describe("setup()", () => {
    test("reads initial count=0 from Counter", async ({ $v }) => {
      const state = await $v("vue=Counter").first().setup<{ count: number }>();
      expect(state).not.toBeNull();
      expect(state!.count).toBe(0);
    });

    test("reads injected theme from ThemedButton", async ({ $v }) => {
      const state = await $v("vue=ThemedButton").setup<{ theme: string }>();
      expect(state).not.toBeNull();
      expect(state!.theme).toBe("dark");
    });

    test("returns null for Options API component without setup", async ({
      $v,
    }) => {
      const state = await $v("vue=OptionsCounter").setup();
      expect(state).toBeNull();
    });

    test("count updates after increment click", async ({ page, $v }) => {
      await page.locator(".counter").first().locator("button").last().click();
      const state = await $v("vue=Counter").first().setup<{ count: number }>();
      expect(state!.count).toBe(1);
    });

    test("count updates after decrement click", async ({ page, $v }) => {
      await page.locator(".counter").first().locator("button").first().click();
      const state = await $v("vue=Counter").first().setup<{ count: number }>();
      expect(state!.count).toBe(-1);
    });

    test("second counter increments by step=5", async ({ page, $v }) => {
      await page.locator(".counter").last().locator("button").last().click();
      const state = await $v("vue=Counter").nth(1).setup<{ count: number }>();
      expect(state!.count).toBe(5);
    });

    test("multiple increments accumulate", async ({ page, $v }) => {
      const incBtn = page.locator(".counter").first().locator("button").last();
      await incBtn.click();
      await incBtn.click();
      await incBtn.click();
      const state = await $v("vue=Counter").first().setup<{ count: number }>();
      expect(state!.count).toBe(3);
    });
  });

  // ── data (Options API) ────────────────────────────────────────────────

  test.describe("data()", () => {
    test("reads initial count=0 from OptionsCounter", async ({ $v }) => {
      const d = await $v("vue=OptionsCounter").data<{ count: number }>();
      expect(d).not.toBeNull();
      expect(d!.count).toBe(0);
    });

    test("returns null for Composition API component", async ({ $v }) => {
      const d = await $v("vue=Counter").first().data();
      expect(d).toBeNull();
    });

    test("count updates after increment click", async ({ page, $v }) => {
      await page
        .locator(".options-counter")
        .locator("button")
        .last()
        .click();
      const d = await $v("vue=OptionsCounter").data<{ count: number }>();
      expect(d!.count).toBe(1);
    });

    test("count updates after decrement click", async ({ page, $v }) => {
      await page
        .locator(".options-counter")
        .locator("button")
        .first()
        .click();
      const d = await $v("vue=OptionsCounter").data<{ count: number }>();
      expect(d!.count).toBe(-1);
    });
  });
});
