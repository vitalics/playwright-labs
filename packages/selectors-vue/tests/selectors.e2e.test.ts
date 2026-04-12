import { test, expect } from "@playwright/test";
import "./globals.e2e";

test.describe("Vue selector engine — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ── Component discovery ──────────────────────────────────────────────────

  test.describe("component discovery", () => {
    test("finds all Button components", async ({ page }) => {
      await expect(page.locator("vue=Button")).toHaveCount(3);
    });

    test("finds all Counter components", async ({ page }) => {
      await expect(page.locator("vue=Counter")).toHaveCount(2);
    });

    test("finds OptionsCounter component", async ({ page }) => {
      await expect(page.locator("vue=OptionsCounter")).toHaveCount(1);
    });

    test("finds all UserCard components", async ({ page }) => {
      await expect(page.locator("vue=UserCard")).toHaveCount(2);
    });

    test("finds ThemedButton component", async ({ page }) => {
      await expect(page.locator("vue=ThemedButton")).toHaveCount(1);
    });

    test("returns 0 for unknown component name", async ({ page }) => {
      await expect(page.locator("vue=NonExistent")).toHaveCount(0);
    });
  });

  // ── = (exact match) ──────────────────────────────────────────────────────

  test.describe("= operator (exact match)", () => {
    test("finds button by exact string prop", async ({ page }) => {
      await expect(page.locator('vue=Button[label="Submit"]')).toHaveCount(1);
      await expect(page.locator('vue=Button[label="Cancel"]')).toHaveCount(1);
      await expect(page.locator('vue=Button[label="Delete"]')).toHaveCount(1);
    });

    test("finds button by variant", async ({ page }) => {
      await expect(
        page.locator('vue=Button[variant="primary"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('vue=Button[variant="danger"]'),
      ).toHaveCount(1);
    });

    test("= false finds disabled=false buttons", async ({ page }) => {
      await expect(
        page.locator("vue=Button[disabled=false]"),
      ).toHaveCount(2);
    });

    test("= true finds disabled=true button", async ({ page }) => {
      await expect(
        page.locator("vue=Button[disabled=true]"),
      ).toHaveCount(1);
    });

    test("finds counter by step prop", async ({ page }) => {
      await expect(page.locator("vue=Counter[step=1]")).toHaveCount(1);
      await expect(page.locator("vue=Counter[step=5]")).toHaveCount(1);
    });
  });

  // ── Explicit props. prefix ───────────────────────────────────────────────

  test.describe("explicit props. prefix", () => {
    test("props.label is equivalent to label", async ({ page }) => {
      await expect(
        page.locator('vue=Button[props.label="Submit"]'),
      ).toHaveCount(1);
    });

    test("props.variant works with nested path", async ({ page }) => {
      await expect(
        page.locator('vue=Button[props.variant="danger"]'),
      ).toHaveCount(1);
    });
  });

  // ── Truthy check ─────────────────────────────────────────────────────────

  test.describe("[attr] truthy check", () => {
    test("finds disabled buttons", async ({ page }) => {
      await expect(page.locator("vue=Button[disabled]")).toHaveCount(1);
    });

    test("finds buttons that have a variant prop", async ({ page }) => {
      // All 3 buttons have variant prop
      await expect(page.locator("vue=Button[variant]")).toHaveCount(3);
    });
  });

  // ── *= (contains) ────────────────────────────────────────────────────────

  test.describe("*= (contains) operator", () => {
    test("finds buttons whose variant contains 'ary'", async ({ page }) => {
      // primary, secondary — 2 matches
      await expect(
        page.locator('vue=Button[variant*="ary"]'),
      ).toHaveCount(2);
    });

    test("finds buttons whose label contains 'el'", async ({ page }) => {
      // Delete, Cancel — 2 matches
      await expect(
        page.locator('vue=Button[label*="el"]'),
      ).toHaveCount(2);
    });
  });

  // ── ^= (starts with) ─────────────────────────────────────────────────────

  test.describe("^= (starts with) operator", () => {
    test("finds button whose variant starts with 'prim'", async ({ page }) => {
      await expect(
        page.locator('vue=Button[variant^="prim"]'),
      ).toHaveCount(1);
    });

    test("finds buttons whose label starts with 'C'", async ({ page }) => {
      await expect(page.locator('vue=Button[label^="C"]')).toHaveCount(1);
    });
  });

  // ── $= (ends with) ───────────────────────────────────────────────────────

  test.describe("$= (ends with) operator", () => {
    test("finds button whose variant ends with 'ger'", async ({ page }) => {
      await expect(
        page.locator('vue=Button[variant$="ger"]'),
      ).toHaveCount(1);
    });
  });

  // ── Case-insensitive flag ────────────────────────────────────────────────

  test.describe("case-insensitive flag [attr='val' i]", () => {
    test("finds button by uppercased label", async ({ page }) => {
      await expect(
        page.locator('vue=Button[label="SUBMIT" i]'),
      ).toHaveCount(1);
    });

    test("finds button by uppercased variant", async ({ page }) => {
      await expect(
        page.locator('vue=Button[variant="PRIMARY" i]'),
      ).toHaveCount(1);
    });
  });

  // ── Regex matching ───────────────────────────────────────────────────────

  test.describe("regex matching [attr=/pattern/]", () => {
    test("finds button whose label matches /^S/", async ({ page }) => {
      await expect(page.locator("vue=Button[label=/^S/]")).toHaveCount(1);
    });

    test("finds user card whose name matches /^A/", async ({ page }) => {
      await expect(
        page.locator("vue=UserCard[user.name=/^A/]"),
      ).toHaveCount(1);
    });

    test("finds buttons whose variant matches /(primary|secondary)/", async ({
      page,
    }) => {
      await expect(
        page.locator("vue=Button[variant=/(primary|secondary)/]"),
      ).toHaveCount(2);
    });
  });

  // ── Nested property path ─────────────────────────────────────────────────

  test.describe("nested property path a.b", () => {
    test("finds user cards by user.name", async ({ page }) => {
      await expect(
        page.locator('vue=UserCard[user.name="Alice"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('vue=UserCard[user.name="Bob"]'),
      ).toHaveCount(1);
    });

    test("finds user cards by user.role", async ({ page }) => {
      await expect(
        page.locator('vue=UserCard[user.role="admin"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('vue=UserCard[user.role="user"]'),
      ).toHaveCount(1);
    });

    test("combines two nested property conditions", async ({ page }) => {
      await expect(
        page.locator('vue=UserCard[user.name="Alice"][user.role="admin"]'),
      ).toHaveCount(1);
    });

    test("returns 0 when nested properties do not both match", async ({
      page,
    }) => {
      await expect(
        page.locator('vue=UserCard[user.name="Alice"][user.role="user"]'),
      ).toHaveCount(0);
    });

    test("explicit props. prefix with nested path", async ({ page }) => {
      await expect(
        page.locator('vue=UserCard[props.user.name="Alice"]'),
      ).toHaveCount(1);
    });
  });

  // ── setup. prefix (Composition API state) ───────────────────────────────

  test.describe("setup. prefix (Composition API state)", () => {
    test("finds all counters with initial count=0", async ({ page }) => {
      await expect(
        page.locator("vue=Counter[setup.count=0]"),
      ).toHaveCount(2);
    });

    test("finds counter after increment", async ({ page }) => {
      await page.locator(".counter").first().locator("button").last().click();
      await expect(
        page.locator("vue=Counter[setup.count=1]"),
      ).toHaveCount(1);
    });

    test("finds ThemedButton by injected theme (inject is in setup state)", async ({
      page,
    }) => {
      await expect(
        page.locator('vue=ThemedButton[setup.theme="dark"]'),
      ).toHaveCount(1);
    });
  });

  // ── data. prefix (Options API data) ─────────────────────────────────────

  test.describe("data. prefix (Options API data)", () => {
    test("finds OptionsCounter with initial data.count=0", async ({ page }) => {
      await expect(
        page.locator("vue=OptionsCounter[data.count=0]"),
      ).toHaveCount(1);
    });

    test("finds OptionsCounter after increment", async ({ page }) => {
      await page
        .locator(".options-counter")
        .locator("button")
        .last()
        .click();
      await expect(
        page.locator("vue=OptionsCounter[data.count=1]"),
      ).toHaveCount(1);
    });
  });

  // ── Multiple attribute conditions ────────────────────────────────────────

  test.describe("multiple attribute conditions", () => {
    test("combines label and variant conditions", async ({ page }) => {
      await expect(
        page.locator('vue=Button[label="Submit"][variant="primary"]'),
      ).toHaveCount(1);
    });

    test("returns 0 when conditions contradict", async ({ page }) => {
      await expect(
        page.locator('vue=Button[label="Submit"][variant="danger"]'),
      ).toHaveCount(0);
    });
  });
});
