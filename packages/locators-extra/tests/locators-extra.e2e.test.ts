import { expect, test } from "@playwright/test";

import {
  LocatorExtra,
  isLocator,
  registerRealizer,
  selectorRealization,
  selectorRealizationAll,
} from "../src";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("isLocator", () => {
  test("returns true for a locator", async ({ page }) => {
    expect(isLocator(page.locator("li"))).toBe(true);
    expect(isLocator(page.getByRole("button"))).toBe(true);
    expect(LocatorExtra.is(page.locator("li").first())).toBe(true);
  });

  test("returns false for non-locators", async ({ page }) => {
    expect(isLocator(page)).toBe(false);
    expect(isLocator(page.mainFrame())).toBe(false);
    expect(isLocator("li")).toBe(false);
    expect(isLocator(null)).toBe(false);
    expect(isLocator(undefined)).toBe(false);
    expect(isLocator({})).toBe(false);
  });

  test("narrows the type", async ({ page }) => {
    const value: unknown = page.locator(".target");
    if (isLocator(value)) {
      // compile-time check: `value` is Locator here
      await expect(value).toHaveText("two");
    } else {
      throw new Error("expected a locator");
    }
  });
});

test.describe("selectorRealization", () => {
  test("css: id is used as an anchor", async ({ page }) => {
    expect(await selectorRealization(page.locator("#root"), "css")).toBe(
      "#root",
    );
  });

  test("css: round-trips to the same element", async ({ page }) => {
    const css = await selectorRealization(page.locator(".target"), "css");
    expect(css).toBe("#root > ul > li:nth-of-type(2)");
    await expect(page.locator(css)).toHaveText("two");
  });

  test("xpath: round-trips to the same element", async ({ page }) => {
    const xpath = await selectorRealization(page.locator(".target"), "xpath");
    expect(xpath).toBe("/html/body/div[1]/ul/li[2]");
    await expect(page.locator(`xpath=${xpath}`)).toHaveText("two");
  });

  test("tag: returns lower-case tag name", async ({ page }) => {
    expect(await selectorRealization(page.getByRole("button"), "tag")).toBe(
      "button",
    );
    expect(await LocatorExtra.tag(page.locator(".target"))).toBe("li");
  });

  test("defaults to css", async ({ page }) => {
    expect(await selectorRealization(page.locator(".target"))).toBe(
      "#root > ul > li:nth-of-type(2)",
    );
  });
});

test.describe("selectorRealizationAll", () => {
  test("returns a unique selector per matched element", async ({ page }) => {
    const selectors = await selectorRealizationAll(page.locator("li"), "css");
    expect(selectors).toHaveLength(3);
    expect(new Set(selectors).size).toBe(3);
    for (const [index, selector] of selectors.entries()) {
      await expect(page.locator(selector)).toHaveCount(1);
      await expect(page.locator(selector)).toHaveText(
        ["one", "two", "three"][index],
      );
    }
  });

  test("resolves to empty array when nothing matches", async ({ page }) => {
    expect(await selectorRealizationAll(page.locator(".missing"))).toEqual([]);
  });
});

test.describe("custom realizers", () => {
  test("registered kind is applied in the page", async ({ page }) => {
    registerRealizer("class", (el) => `.${el.classList[0]}`);
    expect(await selectorRealization(page.locator(".target"), "class")).toBe(
      ".target",
    );
    expect(
      await selectorRealizationAll(page.locator(".target"), "class"),
    ).toEqual([".target"]);
  });

  test("unknown kind throws with a hint", async ({ page }) => {
    await expect(
      selectorRealization(page.locator(".target"), "react"),
    ).rejects.toThrow(/Unknown selector kind "react"/);
  });
});
