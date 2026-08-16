import { expect, test } from "@playwright/test";

import { dnd } from "../src";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("dnd", () => {
  test("drags to a target locator", async ({ page }) => {
    await dnd(page.locator("#draggable"), { to: page.locator("#dropzone") });
    await expect(page.locator("#dnd-status")).toHaveText(/^dropped/);
  });

  test("drags to absolute coordinates", async ({ page }) => {
    await dnd(page.locator("#draggable"), { x: 400, y: 500 });
    await expect(page.locator("#dnd-status")).toHaveText(
      /^released at 400,500/,
    );
    const box = await page.locator("#draggable").boundingBox();
    // the page script centers the box on the cursor
    expect(box?.x).toBeCloseTo(375, 0);
    expect(box?.y).toBeCloseTo(475, 0);
  });

  test("emits intermediate mousemove events", async ({ page }) => {
    await dnd(page.locator("#draggable"), { x: 400, y: 500, steps: 20 });
    const status = await page.locator("#dnd-status").textContent();
    const moves = Number(/after (\d+) moves/.exec(status ?? "")?.[1]);
    expect(moves).toBeGreaterThanOrEqual(20);
  });

  test("respects targetPosition", async ({ page }) => {
    // top-left corner of the dropzone (200, 280) + (5, 5) is still inside
    await dnd(page.locator("#draggable"), {
      to: page.locator("#dropzone"),
      targetPosition: { x: 5, y: 5 },
    });
    await expect(page.locator("#dnd-status")).toHaveText(/^dropped/);
  });

  test("aborted signal rejects before touching the page", async ({ page }) => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      dnd(page.locator("#draggable"), {
        to: page.locator("#dropzone"),
        signal: controller.signal,
      }),
    ).rejects.toThrow(/abort/i);
    await expect(page.locator("#dnd-status")).toHaveText("idle");
  });

  test("invisible target fails with a clear error", async ({ page }) => {
    await expect(
      dnd(page.locator("#draggable"), {
        to: page.locator("#missing"),
        timeout: 500,
      }),
    ).rejects.toThrow();
  });
});
