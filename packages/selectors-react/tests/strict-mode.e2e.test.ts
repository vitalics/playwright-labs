/**
 * StrictMode compatibility tests.
 *
 * React 18 StrictMode (development only) deliberately double-invokes render
 * functions, mounts/unmounts/remounts effects, and runs state initialisers
 * twice to help surface side-effects. This makes fiber-tree introspection more
 * challenging:
 *
 *  1. After a commit, React's double-buffering means __reactFiber$... may point
 *     to the alternate (stale) fiber — not the current one.
 *  2. The extra unmount/remount cycle shifts which fiber is "current" at any
 *     given time.
 *
 * The fix (checking FiberRootNode.current) must hold under StrictMode as well.
 * These tests run the same app at /strict.html (StrictMode wrapper) and verify
 * that all selector-engine, fixture, and matcher functionality behaves
 * identically to the non-strict build.
 */

import { expect as baseExpect } from "@playwright/test";
import { test } from "../src/fixture";
import { expect } from "../src/matchers";

const STRICT_URL = "/strict.html";

test.describe("React StrictMode — component discovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("finds all Button components", async ({ page }) => {
    await baseExpect(page.locator("react=Button")).toHaveCount(3);
  });

  test("finds all Counter components", async ({ page }) => {
    await baseExpect(page.locator("react=Counter")).toHaveCount(2);
  });

  test("finds all UserCard components", async ({ page }) => {
    await baseExpect(page.locator("react=UserCard")).toHaveCount(2);
  });

  test("finds ThemedButton class component", async ({ page }) => {
    await baseExpect(page.locator("react=ThemedButton")).toHaveCount(1);
  });
});

test.describe("React StrictMode — props", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("reads string props from Button", async ({ $r }) => {
    expect(await $r("react=Button").first().prop("label")).toBe("Submit");
    expect(await $r("react=Button").nth(1).prop("label")).toBe("Cancel");
    expect(await $r("react=Button").nth(2).prop("label")).toBe("Delete");
  });

  test("reads boolean disabled prop", async ({ $r }) => {
    expect(await $r("react=Button[disabled]").prop("disabled")).toBe(true);
    expect(await $r("react=Button[disabled=false]").first().prop("disabled")).toBe(false);
  });

  test("reads numeric step from Counter", async ({ $r }) => {
    expect(await $r("react=Counter").first().prop("step")).toBe(1);
    expect(await $r("react=Counter").nth(1).prop("step")).toBe(5);
  });

  test("reads nested object user from UserCard", async ({ $r }) => {
    expect(await $r('react=UserCard[user.name="Alice"]').prop("user")).toEqual({
      name: "Alice",
      role: "admin",
    });
  });
});

test.describe("React StrictMode — selectors (props prefix)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("= operator finds by exact prop value", async ({ page }) => {
    await baseExpect(page.locator('react=Button[label="Submit"]')).toHaveCount(1);
    await baseExpect(page.locator('react=Button[variant="danger"]')).toHaveCount(1);
  });

  test("explicit props. prefix works", async ({ page }) => {
    await baseExpect(
      page.locator('react=Button[props.label="Submit"]'),
    ).toHaveCount(1);
  });

  test("truthy check [disabled]", async ({ page }) => {
    await baseExpect(page.locator("react=Button[disabled]")).toHaveCount(1);
  });

  test("nested path user.name", async ({ page }) => {
    await baseExpect(
      page.locator('react=UserCard[user.name="Alice"]'),
    ).toHaveCount(1);
    await baseExpect(
      page.locator('react=UserCard[user.name="Bob"]'),
    ).toHaveCount(1);
  });

  test("*= contains operator", async ({ page }) => {
    await baseExpect(page.locator('react=Button[variant*="ary"]')).toHaveCount(2);
  });

  test("regex matching", async ({ page }) => {
    await baseExpect(page.locator("react=Button[label=/^S/]")).toHaveCount(1);
  });

  test("case-insensitive flag", async ({ page }) => {
    await baseExpect(
      page.locator('react=Button[label="SUBMIT" i]'),
    ).toHaveCount(1);
  });
});

test.describe("React StrictMode — state (double-buffering fix)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("reads initial state 0 from Counter", async ({ $r }) => {
    const state = await $r("react=Counter").first().state<{ "0": number }>();
    expect(state).not.toBeNull();
    expect(state!["0"]).toBe(0);
  });

  test("selector state.0=0 finds both counters initially", async ({ page }) => {
    await baseExpect(page.locator("react=Counter[state.0=0]")).toHaveCount(2);
  });

  test("state updates correctly after increment in StrictMode", async ({
    page,
    $r,
  }) => {
    await page.locator(".counter").first().locator("button").last().click();
    const state = await $r("react=Counter").first().state<{ "0": number }>();
    expect(state!["0"]).toBe(1);
  });

  test("selector state.0=1 finds the incremented counter in StrictMode", async ({
    page,
  }) => {
    await page.locator(".counter").first().locator("button").last().click();
    await baseExpect(page.locator("react=Counter[state.0=1]")).toHaveCount(1);
  });

  test("state updates correctly after decrement in StrictMode", async ({
    page,
    $r,
  }) => {
    await page.locator(".counter").first().locator("button").first().click();
    const state = await $r("react=Counter").first().state<{ "0": number }>();
    expect(state!["0"]).toBe(-1);
  });

  test("second counter increments by step=5 in StrictMode", async ({
    page,
    $r,
  }) => {
    await page.locator(".counter").last().locator("button").last().click();
    const state = await $r("react=Counter").nth(1).state<{ "0": number }>();
    expect(state!["0"]).toBe(5);
  });

  test("multiple increments accumulate correctly in StrictMode", async ({
    page,
    $r,
  }) => {
    const incBtn = page.locator(".counter").first().locator("button").last();
    await incBtn.click();
    await incBtn.click();
    await incBtn.click();
    const state = await $r("react=Counter").first().state<{ "0": number }>();
    expect(state!["0"]).toBe(3);
  });
});

test.describe("React StrictMode — context", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("reads context from class component in StrictMode", async ({ $r }) => {
    const ctx = await $r("react=ThemedButton").context<{ theme: string }>();
    expect(ctx).not.toBeNull();
    expect(ctx!.theme).toBe("dark");
  });

  test("context selector finds ThemedButton", async ({ page }) => {
    await baseExpect(
      page.locator('react=ThemedButton[context.theme="dark"]'),
    ).toHaveCount(1);
  });

  test("returns null context for function components in StrictMode", async ({
    $r,
  }) => {
    expect(await $r("react=Button").first().context()).toBeNull();
    expect(await $r("react=Counter").first().context()).toBeNull();
  });
});

test.describe("React StrictMode — matchers", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STRICT_URL);
    await page.waitForSelector(".btn");
  });

  test("toBeReactComponent passes for React elements", async ({ page }) => {
    await expect(page.locator("react=Button").first()).toBeReactComponent();
    await expect(page.locator("react=Counter").first()).toBeReactComponent();
  });

  test("toBeReactComponent fails outside the React root", async ({ page }) => {
    await expect(page.locator("#static")).not.toBeReactComponent();
  });

  test("toHaveReactProp detects declared props", async ({ page }) => {
    await expect(page.locator("react=Button").first()).toHaveReactProp("label");
    await expect(page.locator("react=Button").first()).toHaveReactProp(
      "label",
      "Submit",
    );
  });

  test("toBeReactProp matches prop value", async ({ page }) => {
    await expect(
      page.locator('react=Button[label="Delete"]'),
    ).toBeReactProp("disabled", true);
    await expect(
      page.locator("react=Counter").first(),
    ).toBeReactProp("step", 1);
  });

  test("toHaveReactState detects initial state on Counter", async ({ page }) => {
    await expect(page.locator("react=Counter").first()).toHaveReactState("0");
    await expect(page.locator("react=Counter").first()).toHaveReactState(
      "0",
      0,
    );
  });

  test("toBeReactState reflects state after click in StrictMode", async ({
    page,
  }) => {
    const counter = page.locator(".counter").first();
    await counter.locator("button").last().click();
    await expect(page.locator("react=Counter").first()).toBeReactState("0", 1);
  });

  test("toHaveReactContext detects context on class component", async ({
    page,
  }) => {
    await expect(page.locator("react=ThemedButton")).toHaveReactContext(
      "theme",
      "dark",
    );
  });
});
