import { test } from "@playwright/test";
import { expect } from "../src/matchers";
import "./globals.e2e";

test.describe("Angular custom matchers — e2e", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("app-button");
  });

  // ── toBeNgComponent ────────────────────────────────────────────────────────

  test.describe("toBeNgComponent", () => {
    test("passes for Angular component host elements", async ({ page }) => {
      await expect(page.locator("app-button").first()).toBeNgComponent();
      await expect(page.locator("app-counter").first()).toBeNgComponent();
      await expect(page.locator("app-user-card").first()).toBeNgComponent();
    });

    test("fails for plain DOM elements that are not component hosts", async ({
      page,
    }) => {
      // <h1> is rendered inside app-root's template — not a component host
      await expect(page.locator("h1").first()).not.toBeNgComponent();
    });
  });

  // ── toHaveInput ────────────────────────────────────────────────────────────

  test.describe("toHaveInput", () => {
    test("detects declared @Input() properties on app-button", async ({
      page,
    }) => {
      const btn = page.locator("app-button").first();
      await expect(btn).toHaveNgInput("label");
      await expect(btn).toHaveNgInput("disabled");
      await expect(btn).toHaveNgInput("type");
    });

    test("detects @Input() step on app-counter", async ({ page }) => {
      await expect(page.locator("app-counter").first()).toHaveNgInput("step");
    });

    test("detects @Input() user on app-user-card", async ({ page }) => {
      await expect(page.locator("app-user-card").first()).toHaveNgInput("user");
    });

    test("fails for a non-existent input", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toHaveNgInput(
        "nonExistent",
      );
    });
  });

  // ── toHaveOutput ──────────────────────────────────────────────────────────

  test.describe("toHaveOutput", () => {
    test("detects @Output() clicked on app-button", async ({ page }) => {
      await expect(page.locator("app-button").first()).toHaveNgOutput(
        "clicked",
      );
    });

    test("fails for a non-existent output", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toHaveNgOutput(
        "nonExistent",
      );
    });

    test("fails for an input name passed as output", async ({ page }) => {
      // "label" is an @Input, not an @Output
      await expect(page.locator("app-button").first()).not.toHaveNgOutput(
        "label",
      );
    });
  });

  // ── toBeInput ─────────────────────────────────────────────────────────────

  test.describe("toBeInput", () => {
    test("matches string @Input values on app-button", async ({ page }) => {
      await expect(
        page.locator('angular=app-button[label="Submit"]'),
      ).toBeNgInput("label", "Submit");
      await expect(
        page.locator('angular=app-button[label="Cancel"]'),
      ).toBeNgInput("label", "Cancel");
      await expect(
        page.locator('angular=app-button[label="Delete"]'),
      ).toBeNgInput("label", "Delete");
    });

    test("matches boolean @Input on the disabled button", async ({ page }) => {
      await expect(page.locator("angular=app-button[disabled]")).toBeNgInput(
        "disabled",
        true,
      );
    });

    test("matches numeric @Input step on app-counter", async ({ page }) => {
      const [counter1, counter2] = await page.locator("app-counter").all();
      await expect(counter1).toBeNgInput("step", 1);
      await expect(counter2).toBeNgInput("step", 5);
    });

    test("matches nested object @Input on app-user-card", async ({ page }) => {
      await expect(
        page.locator('angular=app-user-card[user.name="Alice"]'),
      ).toBeNgInput("user", {
        name: "Alice",
        role: "admin",
      });
      await expect(
        page.locator('angular=app-user-card[user.name="Bob"]'),
      ).toBeNgInput("user", {
        name: "Bob",
        role: "user",
      });
    });

    test("fails when value does not match", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toBeNgInput(
        "label",
        "WrongLabel",
      );
    });
  });

  // ── toHaveOutput (EventEmitter cannot be value-checked via toBeOutput) ─────

  test.describe("toBeOutput — EventEmitter", () => {
    test("fails with a descriptive error for EventEmitter outputs", async ({
      page,
    }) => {
      const btn = page.locator("app-button").first();
      let errorMessage = "";
      try {
        await expect(btn).toBeNgOutput("clicked", undefined);
      } catch (e: unknown) {
        errorMessage = String(e);
      }
      // Should mention that EventEmitters have no current value
      expect(errorMessage).toContain("EventEmitter");
    });
  });

  // ── toHaveSignal ──────────────────────────────────────────────────────────

  test.describe("toHaveSignal", () => {
    test("detects signal count on app-counter", async ({ page }) => {
      await expect(page.locator("app-counter").first()).toHaveNgSignal("count");
    });

    test("fails for a regular (non-signal) numeric property", async ({
      page,
    }) => {
      // step is a regular @Input() number, not a signal
      await expect(page.locator("app-counter").first()).not.toHaveNgSignal(
        "step",
      );
    });

    test("fails for an @Input() that is not a signal", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toHaveNgSignal(
        "label",
      );
    });
  });

  // ── toBeSignal ────────────────────────────────────────────────────────────

  test.describe("toBeSignal", () => {
    test("initial count signal equals 0", async ({ page }) => {
      const [counter1, counter2] = await page.locator("app-counter").all();
      await expect(counter1).toBeNgSignal("count", 0);
      await expect(counter2).toBeNgSignal("count", 0);
    });

    test("count signal updates after increment (step=1)", async ({ page }) => {
      // First counter has step=1
      const counter = page.locator("app-counter").first();
      const incrementBtn = counter.locator("button").last();
      await incrementBtn.click();
      await expect(counter).toBeNgSignal("count", 1);
    });

    test("count signal updates after increment (step=5)", async ({ page }) => {
      // Second counter has step=5
      const counter = page.locator("app-counter").last();
      const incrementBtn = counter.locator("button").last();
      await incrementBtn.click();
      await expect(counter).toBeNgSignal("count", 5);
    });

    test("count signal decrements correctly", async ({ page }) => {
      const counter = page.locator("app-counter").first();
      const decrementBtn = counter.locator("button").first();
      await decrementBtn.click();
      await expect(counter).toBeNgSignal("count", -1);
    });

    test("fails when signal value does not match", async ({ page }) => {
      const counter = page.locator("app-counter").first();
      await expect(counter).not.toBeNgSignal("count", 99);
    });
  });

  // ── toBeNgRouterOutlet ────────────────────────────────────────────────────

  test.describe("toBeNgRouterOutlet", () => {
    test("passes for the router-outlet element", async ({ page }) => {
      await expect(page.locator("router-outlet")).toBeNgRouterOutlet();
    });

    test("fails for regular DOM elements", async ({ page }) => {
      await expect(page.locator("h1")).not.toBeNgRouterOutlet();
    });

    test("fails for Angular component hosts (not an outlet)", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toBeNgRouterOutlet();
    });
  });

  // ── toBeNgIf ──────────────────────────────────────────────────────────────
  //
  // Note: *ngIf is a structural directive compiled to <ng-template> in Angular.
  // The NgIf directive instance lives on the template anchor (comment node),
  // not on the rendered element. These tests verify the matcher correctly
  // rejects elements that do NOT host an NgIf directive.

  test.describe("toBeNgIf", () => {
    test("fails for regular DOM elements (no NgIf directive)", async ({ page }) => {
      await expect(page.locator("h1")).not.toBeNgIf();
    });

    test("fails for Angular component hosts (no NgIf directive)", async ({ page }) => {
      await expect(page.locator("app-button").first()).not.toBeNgIf();
    });

    test("fails for router-outlet (no NgIf directive)", async ({ page }) => {
      await expect(page.locator("router-outlet")).not.toBeNgIf();
    });
  });

  // ── toBeNgFor ─────────────────────────────────────────────────────────────
  //
  // Note: *ngFor is a structural directive compiled to <ng-template> in Angular.
  // The NgForOf directive instance lives on the template anchor (comment node),
  // not on the rendered list items. These tests verify the matcher correctly
  // rejects elements that do NOT host an NgForOf directive.

  test.describe("toBeNgFor", () => {
    test("fails for regular DOM elements (no NgForOf directive)", async ({ page }) => {
      await expect(page.locator("h1")).not.toBeNgFor();
    });

    test("fails for rendered list items (directive is on template, not items)", async ({ page }) => {
      await expect(page.locator(".tag-item").first()).not.toBeNgFor();
    });

    test("fails for Angular component hosts (no NgForOf directive)", async ({ page }) => {
      await expect(page.locator("app-counter").first()).not.toBeNgFor();
    });
  });
});
