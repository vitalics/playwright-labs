import { expect } from "@playwright/test";
import { test } from "../src/fixture";

test.describe("NgHtmlElement fixture — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("app-button");
  });

  // ── isComponent ──────────────────────────────────────────────────────────────

  test.describe("isComponent", () => {
    test("returns true for Angular component hosts", async ({ $ng }) => {
      expect(await $ng("app-button").first().isComponent()).toBe(true);
      expect(await $ng("app-counter").first().isComponent()).toBe(true);
      expect(await $ng("app-user-card").first().isComponent()).toBe(true);
    });

    test("returns false for plain DOM elements", async ({ $ng }) => {
      expect(await $ng("h1").isComponent()).toBe(false);
      expect(await $ng("section").first().isComponent()).toBe(false);
    });
  });

  // ── directives ───────────────────────────────────────────────────────────────

  test.describe("directives", () => {
    test("returns RouterOutlet for router-outlet element", async ({ $ng }) => {
      const names = await $ng("router-outlet").directives();
      expect(names.some((n) => n.includes("RouterOutlet"))).toBe(true);
    });

    test("returns empty array for plain DOM elements", async ({ $ng }) => {
      const names = await $ng("h1").directives();
      expect(names).toEqual([]);
    });
  });

  // ── inputs ───────────────────────────────────────────────────────────────────

  test.describe("inputs", () => {
    test("returns all @Input names for app-button", async ({ $ng }) => {
      const names = await $ng("app-button").first().inputs();
      expect(names).toContain("label");
      expect(names).toContain("disabled");
      expect(names).toContain("type");
    });

    test("returns @Input names for app-counter", async ({ $ng }) => {
      const names = await $ng("app-counter").first().inputs();
      expect(names).toContain("step");
    });

    test("returns @Input names for app-user-card", async ({ $ng }) => {
      const names = await $ng("app-user-card").first().inputs();
      expect(names).toContain("user");
    });

    test("returns empty array for plain DOM elements", async ({ $ng }) => {
      expect(await $ng("h1").inputs()).toEqual([]);
    });
  });

  // ── input ────────────────────────────────────────────────────────────────────

  test.describe("input", () => {
    test("reads string @Input from app-button", async ({ $ng }) => {
      expect(await $ng("app-button").first().input("label")).toBe("Submit");
      expect(await $ng("app-button").nth(1).input("label")).toBe("Cancel");
      expect(await $ng("app-button").nth(2).input("label")).toBe("Delete");
    });

    test("reads boolean @Input from disabled button", async ({ $ng }) => {
      expect(await $ng("angular=app-button[disabled]").input("disabled")).toBe(
        true,
      );
    });

    test("reads numeric @Input step from app-counter", async ({ $ng }) => {
      expect(await $ng("app-counter").first().input("step")).toBe(1);
      expect(await $ng("app-counter").nth(1).input("step")).toBe(5);
    });

    test("reads nested object @Input from app-user-card", async ({ $ng }) => {
      expect(await $ng("app-user-card").first().input("user")).toEqual({
        name: "Alice",
        role: "admin",
      });
    });

    test("throws for a property that does not exist", async ({ $ng }) => {
      await expect(
        $ng("app-button").first().input("nonExistent"),
      ).rejects.toThrow("nonExistent");
    });
  });

  // ── outputs ──────────────────────────────────────────────────────────────────

  test.describe("outputs", () => {
    test("returns all @Output names for app-button", async ({ $ng }) => {
      const names = await $ng("app-button").first().outputs();
      expect(names).toContain("clicked");
    });

    test("does not include @Input names in outputs", async ({ $ng }) => {
      const names = await $ng("app-button").first().outputs();
      expect(names).not.toContain("label");
      expect(names).not.toContain("disabled");
    });

    test("returns empty array for plain DOM elements", async ({ $ng }) => {
      expect(await $ng("h1").outputs()).toEqual([]);
    });
  });

  // ── signals ──────────────────────────────────────────────────────────────────

  test.describe("signals", () => {
    test("returns signal names for app-counter", async ({ $ng }) => {
      const names = await $ng("app-counter").first().signals();
      expect(names).toContain("count");
    });

    test("does not include regular @Input properties as signals", async ({
      $ng,
    }) => {
      const names = await $ng("app-counter").first().signals();
      expect(names).not.toContain("step");
    });

    test("returns empty array for components with no signals", async ({
      $ng,
    }) => {
      expect(await $ng("app-button").first().signals()).toEqual([]);
    });
  });

  // ── signal ───────────────────────────────────────────────────────────────────

  test.describe("signal", () => {
    test("reads initial signal value from app-counter", async ({ $ng }) => {
      expect(await $ng("app-counter").first().signal("count")).toBe(0);
    });

    test("reflects signal value after increment click", async ({
      page,
      $ng,
    }) => {
      await page
        .locator("app-counter")
        .first()
        .locator("button")
        .last()
        .click();
      expect(await $ng("app-counter").first().signal("count")).toBe(1);
    });

    test("reflects signal value after decrement click", async ({
      page,
      $ng,
    }) => {
      await page
        .locator("app-counter")
        .first()
        .locator("button")
        .first()
        .click();
      expect(await $ng("app-counter").first().signal<number>("count")).toBe(-1);
    });

    test("second counter (step=5) increments by 5", async ({ page, $ng }) => {
      await page.locator("app-counter").last().locator("button").last().click();
      expect(await $ng("app-counter").nth(1).signal("count")).toBe(5);
    });

    test("throws for a property that is not a WritableSignal", async ({
      $ng,
    }) => {
      await expect($ng("app-counter").first().signal("step")).rejects.toThrow(
        "WritableSignal",
      );
    });

    test("throws for a property that does not exist", async ({ $ng }) => {
      await expect(
        $ng("app-counter").first().signal("nonExistent"),
      ).rejects.toThrow("nonExistent");
    });
  });

  // ── detectChanges ─────────────────────────────────────────────────────────────

  test.describe("detectChanges", () => {
    test("completes without error on a component host", async ({ $ng }) => {
      await $ng("app-counter").first().detectChanges();
    });
  });
});
