import { test } from "@playwright/test";
import { expect } from "../src/matchers";
import "./globals.e2e";

test.describe("React custom matchers — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ── toBeReactComponent ────────────────────────────────────────────────────────

  test.describe("toBeReactComponent", () => {
    test("passes for React component root elements", async ({ page }) => {
      await expect(page.locator("react=Button").first()).toBeReactComponent();
      await expect(page.locator("react=Counter").first()).toBeReactComponent();
      await expect(
        page.locator("react=UserCard").first(),
      ).toBeReactComponent();
      await expect(
        page.locator("react=ThemedButton"),
      ).toBeReactComponent();
    });

    test("passes for plain DOM elements inside the React tree", async ({
      page,
    }) => {
      // h1 is inside App — walking up its fiber reaches the App component
      await expect(page.locator("h1")).toBeReactComponent();
    });

    test("fails for elements outside the React root (no fiber)", async ({
      page,
    }) => {
      await expect(page.locator("#static")).not.toBeReactComponent();
    });
  });

  // ── toHaveReactProp ───────────────────────────────────────────────────────────

  test.describe("toHaveReactProp", () => {
    test("detects props on Button components", async ({ page }) => {
      const btn = page.locator("react=Button").first();
      await expect(btn).toHaveReactProp("label");
      await expect(btn).toHaveReactProp("disabled");
      await expect(btn).toHaveReactProp("variant");
    });

    test("detects step prop on Counter", async ({ page }) => {
      await expect(page.locator("react=Counter").first()).toHaveReactProp(
        "step",
      );
    });

    test("detects user prop on UserCard", async ({ page }) => {
      await expect(
        page.locator("react=UserCard").first(),
      ).toHaveReactProp("user");
    });

    test("fails for a non-existent prop", async ({ page }) => {
      await expect(
        page.locator("react=Button").first(),
      ).not.toHaveReactProp("nonExistent");
    });

    test("matches with expected value", async ({ page }) => {
      await expect(
        page.locator('react=Button[label="Submit"]'),
      ).toHaveReactProp("label", "Submit");
      await expect(
        page.locator('react=Button[label="Submit"]'),
      ).toHaveReactProp("disabled", false);
    });
  });

  // ── toBeReactProp ─────────────────────────────────────────────────────────────

  test.describe("toBeReactProp", () => {
    test("matches string prop values on Button", async ({ page }) => {
      await expect(
        page.locator('react=Button[label="Submit"]'),
      ).toBeReactProp("label", "Submit");
      await expect(
        page.locator('react=Button[label="Cancel"]'),
      ).toBeReactProp("label", "Cancel");
      await expect(
        page.locator('react=Button[label="Delete"]'),
      ).toBeReactProp("label", "Delete");
    });

    test("matches boolean prop on the disabled button", async ({ page }) => {
      await expect(
        page.locator("react=Button[disabled]"),
      ).toBeReactProp("disabled", true);
    });

    test("matches numeric prop on Counter", async ({ page }) => {
      const [c1, c2] = await page.locator("react=Counter").all();
      await expect(c1).toBeReactProp("step", 1);
      await expect(c2).toBeReactProp("step", 5);
    });

    test("matches nested object prop on UserCard", async ({ page }) => {
      await expect(
        page.locator('react=UserCard[user.name="Alice"]'),
      ).toBeReactProp("user", { name: "Alice", role: "admin" });
      await expect(
        page.locator('react=UserCard[user.name="Bob"]'),
      ).toBeReactProp("user", { name: "Bob", role: "user" });
    });

    test("fails when value does not match", async ({ page }) => {
      await expect(
        page.locator("react=Button").first(),
      ).not.toBeReactProp("label", "WrongLabel");
    });
  });

  // ── toHaveReactState ──────────────────────────────────────────────────────────

  test.describe("toHaveReactState", () => {
    test("detects state on Counter (hook index 0)", async ({ page }) => {
      await expect(
        page.locator("react=Counter").first(),
      ).toHaveReactState("0");
    });

    test("matches initial count value", async ({ page }) => {
      await expect(
        page.locator("react=Counter").first(),
      ).toHaveReactState("0", 0);
    });

    test("fails for components with no state", async ({ page }) => {
      // Button has no useState — state path "0" should not exist
      await expect(
        page.locator("react=Button").first(),
      ).not.toHaveReactState("0");
    });
  });

  // ── toBeReactState ────────────────────────────────────────────────────────────

  test.describe("toBeReactState", () => {
    test("initial count state equals 0", async ({ page }) => {
      const [c1, c2] = await page.locator("react=Counter").all();
      await expect(c1).toBeReactState("0", 0);
      await expect(c2).toBeReactState("0", 0);
    });

    test("count state updates after increment (step=1)", async ({ page }) => {
      const counter = page.locator(".counter").first();
      await counter.locator("button").last().click();
      await expect(
        page.locator("react=Counter").first(),
      ).toBeReactState("0", 1);
    });

    test("count state updates after increment (step=5)", async ({ page }) => {
      const counter = page.locator(".counter").last();
      await counter.locator("button").last().click();
      await expect(
        page.locator("react=Counter").nth(1),
      ).toBeReactState("0", 5);
    });

    test("count state decrements correctly", async ({ page }) => {
      const counter = page.locator(".counter").first();
      await counter.locator("button").first().click();
      await expect(
        page.locator("react=Counter").first(),
      ).toBeReactState("0", -1);
    });

    test("fails when state value does not match", async ({ page }) => {
      await expect(
        page.locator("react=Counter").first(),
      ).not.toBeReactState("0", 99);
    });
  });

  // ── toHaveReactContext ────────────────────────────────────────────────────────

  test.describe("toHaveReactContext", () => {
    test("detects context key on ThemedButton class component", async ({
      page,
    }) => {
      await expect(
        page.locator("react=ThemedButton"),
      ).toHaveReactContext("theme");
    });

    test("matches context value", async ({ page }) => {
      await expect(
        page.locator("react=ThemedButton"),
      ).toHaveReactContext("theme", "dark");
    });

    test("fails for function components (context not accessible via fibers)", async ({
      page,
    }) => {
      await expect(
        page.locator("react=Button").first(),
      ).not.toHaveReactContext("theme");
    });

    test("fails when context value does not match", async ({ page }) => {
      await expect(
        page.locator("react=ThemedButton"),
      ).not.toHaveReactContext("theme", "light");
    });
  });

  // ── toMatchReactSnapshot ──────────────────────────────────────────────────────

  test.describe("toMatchReactSnapshot", () => {
    test("matches exact DOM snapshot of a UserCard", async ({ page }) => {
      const snapshot = `<div class="user-card"><strong>Alice</strong><span>admin</span></div>`;
      await expect(
        page.locator('react=UserCard[user.name="Alice"]'),
      ).toMatchReactSnapshot(snapshot);
    });

    test("fails when snapshot does not match", async ({ page }) => {
      const wrongSnapshot = `<div class="user-card"><strong>Wrong</strong></div>`;
      await expect(
        page.locator('react=UserCard[user.name="Alice"]'),
      ).not.toMatchReactSnapshot(wrongSnapshot);
    });
  });
});
