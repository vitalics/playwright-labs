import { test, expect, selectors } from "@playwright/test";

import "./globals.e2e";

test.describe("Angular selector engine — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait until Angular has bootstrapped and rendered at least the first component
    await page.waitForSelector("app-button");
  });

  // ─── Component name ────────────────────────────────────────────────────────

  test.describe("by component tag name", () => {
    test("finds all app-button components", async ({ page }) => {
      await expect(page.locator("angular=app-button")).toHaveCount(3);
    });

    test("finds all app-counter components", async ({ page }) => {
      await expect(page.locator("angular=app-counter")).toHaveCount(2);
    });

    test("finds all app-user-card components", async ({ page }) => {
      await expect(page.locator("angular=app-user-card")).toHaveCount(2);
    });

    test("returns 0 for a non-existent component", async ({ page }) => {
      await expect(page.locator("angular=app-nonexistent")).toHaveCount(0);
    });
  });

  // ─── = (equality) ──────────────────────────────────────────────────────────

  test.describe("= operator", () => {
    test("finds buttons by exact label", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[label="Submit"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-button[label="Cancel"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-button[label="Delete"]'),
      ).toHaveCount(1);
    });

    test("finds buttons by exact type", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type="primary"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-button[type="secondary"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-button[type="danger"]'),
      ).toHaveCount(1);
    });

    test("finds counters by numeric step", async ({ page }) => {
      await expect(page.locator("angular=app-counter[step=1]")).toHaveCount(1);
      await expect(page.locator("angular=app-counter[step=5]")).toHaveCount(1);
    });

    test("finds buttons where disabled=false", async ({ page }) => {
      // Submit and Cancel have default disabled=false
      await expect(
        page.locator("angular=app-button[disabled=false]"),
      ).toHaveCount(2);
    });

    test("returns 0 for a non-matching string value", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[label="NonExistent"]'),
      ).toHaveCount(0);
    });
  });

  // ─── Truthy check ──────────────────────────────────────────────────────────

  test.describe("truthy operator [attr]", () => {
    test("finds only the disabled button", async ({ page }) => {
      await expect(page.locator("angular=app-button[disabled]")).toHaveCount(1);
    });
  });

  // ─── Multiple attributes ───────────────────────────────────────────────────

  test.describe("multiple attributes", () => {
    test("narrows by combining type and disabled", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type="danger"][disabled]'),
      ).toHaveCount(1);
    });

    test("narrows by combining type and label", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type="primary"][label="Submit"]'),
      ).toHaveCount(1);
    });

    test("returns 0 when one of the conditions does not match", async ({
      page,
    }) => {
      await expect(
        page.locator('angular=app-button[type="primary"][disabled]'),
      ).toHaveCount(0);
    });
  });

  // ─── String operators ──────────────────────────────────────────────────────

  test.describe("*= (contains)", () => {
    test('finds buttons whose type contains "ary" (primary, secondary)', async ({
      page,
    }) => {
      await expect(page.locator('angular=app-button[type*="ary"]')).toHaveCount(
        2,
      );
    });
  });

  test.describe("^= (starts with)", () => {
    test('finds button whose type starts with "prim"', async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type^="prim"]'),
      ).toHaveCount(1);
    });
  });

  test.describe("$= (ends with)", () => {
    test('finds button whose type ends with "ger" (danger)', async ({
      page,
    }) => {
      await expect(page.locator('angular=app-button[type$="ger"]')).toHaveCount(
        1,
      );
    });
  });

  test.describe("|= (exact or hyphen-prefixed)", () => {
    test("finds exact type match", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type|="primary"]'),
      ).toHaveCount(1);
    });
  });

  test.describe("~= (word in space-separated list)", () => {
    test("matches a label that is a single word", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[label~="Submit"]'),
      ).toHaveCount(1);
    });
  });

  // ─── Case-insensitive matching ─────────────────────────────────────────────

  test.describe("case-insensitive flag [attr='val' i]", () => {
    test("finds button by uppercased label", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[label="SUBMIT" i]'),
      ).toHaveCount(1);
    });

    test("finds button by uppercased type", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[type="PRIMARY" i]'),
      ).toHaveCount(1);
    });
  });

  // ─── Nested property path ──────────────────────────────────────────────────

  test.describe("nested property path a.b", () => {
    test("finds user cards by user.name", async ({ page }) => {
      await expect(
        page.locator('angular=app-user-card[user.name="Alice"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-user-card[user.name="Bob"]'),
      ).toHaveCount(1);
    });

    test("finds user cards by user.role", async ({ page }) => {
      await expect(
        page.locator('angular=app-user-card[user.role="admin"]'),
      ).toHaveCount(1);
      await expect(
        page.locator('angular=app-user-card[user.role="user"]'),
      ).toHaveCount(1);
    });

    test("combines nested property conditions", async ({ page }) => {
      await expect(
        page.locator(
          'angular=app-user-card[user.name="Alice"][user.role="admin"]',
        ),
      ).toHaveCount(1);
    });

    test("returns 0 when nested properties do not both match", async ({
      page,
    }) => {
      await expect(
        page.locator(
          'angular=app-user-card[user.name="Alice"][user.role="user"]',
        ),
      ).toHaveCount(0);
    });
  });

  // ─── Regex matching ────────────────────────────────────────────────────────

  test.describe("regex matching [attr=/pattern/]", () => {
    test("finds button whose label matches ^S", async ({ page }) => {
      // Only "Submit" starts with S
      await expect(page.locator("angular=app-button[label=/^S/]")).toHaveCount(
        1,
      );
    });

    test("finds user card whose name matches /^A/i", async ({ page }) => {
      await expect(
        page.locator("angular=app-user-card[user.name=/^A/]"),
      ).toHaveCount(1); // Alice
    });

    test("finds all buttons whose type matches /(primary|secondary)/", async ({
      page,
    }) => {
      await expect(
        page.locator("angular=app-button[type=/(primary|secondary)/]"),
      ).toHaveCount(2);
    });
  });
});
