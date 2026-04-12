import { expect } from "@playwright/test";
import { test } from "../src/fixture";

test.describe("ReactHtmlElement fixture — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ── isComponent ──────────────────────────────────────────────────────────────

  test.describe("isComponent", () => {
    test("returns true for React component root elements", async ({ $r }) => {
      expect(await $r("react=Button").first().isComponent()).toBe(true);
      expect(await $r("react=Counter").first().isComponent()).toBe(true);
      expect(await $r("react=UserCard").first().isComponent()).toBe(true);
    });

    test("returns true for plain DOM elements inside the React tree", async ({
      $r,
    }) => {
      // h1 is inside the App component — its fiber walks up to App
      expect(await $r("h1").isComponent()).toBe(true);
    });

    test("returns false for elements outside the React root", async ({ $r }) => {
      expect(await $r("#static").isComponent()).toBe(false);
    });
  });

  // ── componentName ─────────────────────────────────────────────────────────────

  test.describe("componentName", () => {
    test("returns correct name for function components", async ({ $r }) => {
      expect(await $r("react=Button").first().componentName()).toBe("Button");
      expect(await $r("react=Counter").first().componentName()).toBe("Counter");
      expect(await $r("react=UserCard").first().componentName()).toBe(
        "UserCard",
      );
    });

    test("returns correct name for class components", async ({ $r }) => {
      expect(await $r("react=ThemedButton").componentName()).toBe(
        "ThemedButton",
      );
    });
  });

  // ── props ────────────────────────────────────────────────────────────────────

  test.describe("props", () => {
    test("returns all props for Button components", async ({ $r }) => {
      const props = await $r("react=Button").first().props<{
        label: string;
        disabled: boolean;
        variant: string;
      }>();
      expect(props.label).toBe("Submit");
      expect(props.variant).toBe("primary");
      expect(props.disabled).toBe(false);
    });

    test("returns props for the disabled button", async ({ $r }) => {
      const props = await $r('react=Button[label="Delete"]').props<{
        disabled: boolean;
      }>();
      expect(props.disabled).toBe(true);
    });

    test("returns nested object props for UserCard", async ({ $r }) => {
      const props = await $r('react=UserCard[user.name="Alice"]').props<{
        user: { name: string; role: string };
      }>();
      expect(props.user).toEqual({ name: "Alice", role: "admin" });
    });

    test("returns numeric prop for Counter", async ({ $r }) => {
      const props = await $r("react=Counter").first().props<{ step: number }>();
      expect(props.step).toBe(1);
      const props2 = await $r("react=Counter").nth(1).props<{ step: number }>();
      expect(props2.step).toBe(5);
    });
  });

  // ── prop ─────────────────────────────────────────────────────────────────────

  test.describe("prop", () => {
    test("reads string prop from Button", async ({ $r }) => {
      expect(await $r("react=Button").first().prop("label")).toBe("Submit");
      expect(await $r("react=Button").nth(1).prop("label")).toBe("Cancel");
      expect(await $r("react=Button").nth(2).prop("label")).toBe("Delete");
    });

    test("reads boolean prop from disabled button", async ({ $r }) => {
      expect(
        await $r('react=Button[label="Delete"]').prop("disabled"),
      ).toBe(true);
    });

    test("reads numeric prop from Counter", async ({ $r }) => {
      expect(await $r("react=Counter").first().prop("step")).toBe(1);
      expect(await $r("react=Counter").nth(1).prop("step")).toBe(5);
    });

    test("reads nested object prop from UserCard", async ({ $r }) => {
      expect(
        await $r("react=UserCard").first().prop("user"),
      ).toEqual({ name: "Alice", role: "admin" });
    });

    test("throws for a prop that does not exist", async ({ $r }) => {
      await expect(
        $r("react=Button").first().prop("nonExistent"),
      ).rejects.toThrow("nonExistent");
    });
  });

  // ── state ────────────────────────────────────────────────────────────────────

  test.describe("state", () => {
    test("returns null for stateless components", async ({ $r }) => {
      expect(await $r("react=Button").first().state()).toBeNull();
    });

    test("returns indexed state object for function components with useState", async ({
      $r,
    }) => {
      const state = await $r("react=Counter").first().state<{ "0": number }>();
      expect(state).not.toBeNull();
      expect(state!["0"]).toBe(0);
    });

    test("reflects updated state after increment click", async ({
      page,
      $r,
    }) => {
      await page
        .locator(".counter")
        .first()
        .locator("button")
        .last()
        .click();
      const state = await $r("react=Counter").first().state<{ "0": number }>();
      expect(state!["0"]).toBe(1);
    });

    test("reflects updated state after decrement click", async ({
      page,
      $r,
    }) => {
      await page
        .locator(".counter")
        .first()
        .locator("button")
        .first()
        .click();
      const state = await $r("react=Counter").first().state<{ "0": number }>();
      expect(state!["0"]).toBe(-1);
    });

    test("second counter (step=5) increments by 5", async ({ page, $r }) => {
      await page.locator(".counter").last().locator("button").last().click();
      const state = await $r("react=Counter").nth(1).state<{ "0": number }>();
      expect(state!["0"]).toBe(5);
    });
  });

  // ── context ──────────────────────────────────────────────────────────────────

  test.describe("context", () => {
    test("returns null for function components", async ({ $r }) => {
      expect(await $r("react=Button").first().context()).toBeNull();
      expect(await $r("react=Counter").first().context()).toBeNull();
    });

    test("returns context object for class components", async ({ $r }) => {
      const ctx = await $r("react=ThemedButton").context<{ theme: string }>();
      expect(ctx).not.toBeNull();
      expect(ctx!.theme).toBe("dark");
    });
  });
});
