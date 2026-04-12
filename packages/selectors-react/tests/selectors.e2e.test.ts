import { test, expect } from "@playwright/test";

import "./globals.e2e";

test.describe("React selector engine — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".btn");
  });

  // ─── Component name ──────────────────────────────────────────────────────────

  test.describe("by component name", () => {
    test("finds all Button components", async ({ page }) => {
      await expect(page.locator("react=Button")).toHaveCount(3);
    });

    test("finds all Counter components", async ({ page }) => {
      await expect(page.locator("react=Counter")).toHaveCount(2);
    });

    test("finds all UserCard components", async ({ page }) => {
      await expect(page.locator("react=UserCard")).toHaveCount(2);
    });

    test("finds ThemedButton class component", async ({ page }) => {
      await expect(page.locator("react=ThemedButton")).toHaveCount(1);
    });

    test("returns 0 for a non-existent component", async ({ page }) => {
      await expect(page.locator("react=NonExistent")).toHaveCount(0);
    });
  });

  // ─── = (equality) ────────────────────────────────────────────────────────────

  test.describe("= operator (props)", () => {
    test("finds buttons by exact label", async ({ page }) => {
      await expect(
        page.locator('react=Button[label="Submit"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=Button[label="Cancel"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=Button[label="Delete"]'),
      ).toHaveCount(1);
    });

    test("finds buttons by exact variant", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant="primary"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=Button[variant="secondary"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=Button[variant="danger"]'),
      ).toHaveCount(1);
    });

    test("explicit props. prefix works identically", async ({ page }) => {
      await expect(
        page.locator('react=Button[props.label="Submit"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=Button[props.variant="primary"]'),
      ).toHaveCount(1);
    });

    test("finds counters by numeric step", async ({ page }) => {
      await expect(page.locator("react=Counter[step=1]")).toHaveCount(1);
      await expect(page.locator("react=Counter[step=5]")).toHaveCount(1);
    });

    test("finds buttons where disabled=false", async ({ page }) => {
      await expect(
        page.locator("react=Button[disabled=false]"),
      ).toHaveCount(2);
    });

    test("returns 0 for a non-matching string value", async ({ page }) => {
      await expect(
        page.locator('react=Button[label="NonExistent"]'),
      ).toHaveCount(0);
    });
  });

  // ─── Truthy check ─────────────────────────────────────────────────────────────

  test.describe("truthy operator [attr]", () => {
    test("finds only the disabled button", async ({ page }) => {
      await expect(page.locator("react=Button[disabled]")).toHaveCount(1);
    });

    test("truthy check on a string prop", async ({ page }) => {
      // All 3 buttons have a non-empty label
      await expect(page.locator("react=Button[label]")).toHaveCount(3);
    });
  });

  // ─── Multiple attributes ──────────────────────────────────────────────────────

  test.describe("multiple attributes", () => {
    test("narrows by combining variant and disabled", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant="danger"][disabled]'),
      ).toHaveCount(1);
    });

    test("narrows by combining variant and label", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant="primary"][label="Submit"]'),
      ).toHaveCount(1);
    });

    test("returns 0 when one condition does not match", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant="primary"][disabled]'),
      ).toHaveCount(0);
    });
  });

  // ─── String operators ─────────────────────────────────────────────────────────

  test.describe("*= (contains)", () => {
    test('finds buttons whose variant contains "ary" (primary, secondary)', async ({
      page,
    }) => {
      await expect(
        page.locator('react=Button[variant*="ary"]'),
      ).toHaveCount(2);
    });
  });

  test.describe("^= (starts with)", () => {
    test('finds button whose variant starts with "prim"', async ({ page }) => {
      await expect(
        page.locator('react=Button[variant^="prim"]'),
      ).toHaveCount(1);
    });
  });

  test.describe("$= (ends with)", () => {
    test('finds button whose variant ends with "ger" (danger)', async ({
      page,
    }) => {
      await expect(
        page.locator('react=Button[variant$="ger"]'),
      ).toHaveCount(1);
    });
  });

  test.describe("|= (exact or hyphen-prefixed)", () => {
    test("finds exact variant match", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant|="primary"]'),
      ).toHaveCount(1);
    });
  });

  test.describe("~= (word in space-separated list)", () => {
    test("matches a label that is a single word", async ({ page }) => {
      await expect(
        page.locator('react=Button[label~="Submit"]'),
      ).toHaveCount(1);
    });
  });

  // ─── Case-insensitive matching ────────────────────────────────────────────────

  test.describe("case-insensitive flag [attr='val' i]", () => {
    test("finds button by uppercased label", async ({ page }) => {
      await expect(
        page.locator('react=Button[label="SUBMIT" i]'),
      ).toHaveCount(1);
    });

    test("finds button by uppercased variant", async ({ page }) => {
      await expect(
        page.locator('react=Button[variant="PRIMARY" i]'),
      ).toHaveCount(1);
    });
  });

  // ─── Nested property path ─────────────────────────────────────────────────────

  test.describe("nested property path a.b", () => {
    test("finds user cards by user.name", async ({ page }) => {
      await expect(
        page.locator('react=UserCard[user.name="Alice"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=UserCard[user.name="Bob"]'),
      ).toHaveCount(1);
    });

    test("finds user cards by user.role", async ({ page }) => {
      await expect(
        page.locator('react=UserCard[user.role="admin"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('react=UserCard[user.role="user"]'),
      ).toHaveCount(1);
    });

    test("combines nested property conditions", async ({ page }) => {
      await expect(
        page.locator('react=UserCard[user.name="Alice"][user.role="admin"]'),
      ).toHaveCount(1);
    });

    test("returns 0 when nested properties do not both match", async ({
      page,
    }) => {
      await expect(
        page.locator('react=UserCard[user.name="Alice"][user.role="user"]'),
      ).toHaveCount(0);
    });

    test("explicit props. prefix with nested path", async ({ page }) => {
      await expect(
        page.locator('react=UserCard[props.user.name="Alice"]'),
      ).toHaveCount(1);
    });
  });

  // ─── State selectors ─────────────────────────────────────────────────────────

  test.describe("state. prefix", () => {
    test("finds all counters with initial state[0]=0", async ({ page }) => {
      await expect(page.locator("react=Counter[state.0=0]")).toHaveCount(2);
    });

    test("finds counter after increment (state[0]=1)", async ({ page }) => {
      await page.locator(".counter").first().locator("button").last().click();
      await expect(page.locator("react=Counter[state.0=1]")).toHaveCount(1);
    });
  });

  // ─── Context selectors ────────────────────────────────────────────────────────

  test.describe("context. prefix", () => {
    test("finds ThemedButton by context theme", async ({ page }) => {
      await expect(
        page.locator('react=ThemedButton[context.theme="dark"]'),
      ).toHaveCount(1);
    });

    test("returns 0 for wrong theme value", async ({ page }) => {
      await expect(
        page.locator('react=ThemedButton[context.theme="light"]'),
      ).toHaveCount(0);
    });
  });

  // ─── Regex matching ────────────────────────────────────────────────────────────

  test.describe("regex matching [attr=/pattern/]", () => {
    test("finds button whose label matches /^S/", async ({ page }) => {
      // Only "Submit" starts with S
      await expect(page.locator("react=Button[label=/^S/]")).toHaveCount(1);
    });

    test("finds user card whose name matches /^A/", async ({ page }) => {
      await expect(
        page.locator("react=UserCard[user.name=/^A/]"),
      ).toHaveCount(1); // Alice
    });

    test("finds buttons whose variant matches /(primary|secondary)/", async ({
      page,
    }) => {
      await expect(
        page.locator("react=Button[variant=/(primary|secondary)/]"),
      ).toHaveCount(2);
    });
  });
});
