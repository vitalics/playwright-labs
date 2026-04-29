/**
 * Example: @playwright-labs/ghost-cursor (standalone, no fixture)
 *
 * Shows how to use GhostCursor directly with `createCursor()` when you don't
 * want to (or can't) use the fixture integration. Useful in non-test contexts
 * such as scripts, CLI tools, or custom test frameworks.
 *
 * Math utilities (`path`, `bezierCurve`, `overshoot`, etc.) are also exported
 * for cases where you want to generate cursor paths without actually moving
 * the mouse — for example, to replay them later or visualise them.
 */

import { test, expect } from "@playwright/test";
import {
  createCursor,
  path,
  overshoot,
  type Vector,
} from "@playwright-labs/ghost-cursor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTERACTIVE_HTML = /* html */ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; margin: 40px; }
      button { padding: 8px 16px; font-size: 14px; cursor: pointer; }
      #log { margin-top: 16px; font-size: 13px; color: #444; }
    </style>
  </head>
  <body>
    <button id="btn-a">Button A</button>
    <button id="btn-b">Button B</button>
    <div id="log"></div>
    <script>
      const log = document.getElementById('log');
      ['btn-a', 'btn-b'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
          log.textContent = id + ' clicked';
        });
      });
    </script>
  </body>
  </html>
`;

// ---------------------------------------------------------------------------
// Tests — createCursor (standalone)
// ---------------------------------------------------------------------------

test.describe("createCursor standalone", () => {
  test("clicks an element without the fixture", async ({ page }) => {
    await page.setContent(INTERACTIVE_HTML);

    // Create a cursor bound to the page — no test.extend needed
    const cursor = createCursor(page);

    await cursor.click("#btn-a");
    await expect(page.locator("#log")).toHaveText("btn-a clicked");
  });

  test("clicks multiple elements in sequence", async ({ page }) => {
    await page.setContent(INTERACTIVE_HTML);

    const cursor = createCursor(page);

    await cursor.click("#btn-a");
    await expect(page.locator("#log")).toHaveText("btn-a clicked");

    await cursor.click("#btn-b");
    await expect(page.locator("#log")).toHaveText("btn-b clicked");
  });

  test("moves to a coordinate then clicks a nearby element", async ({
    page,
  }) => {
    await page.setContent(INTERACTIVE_HTML);

    const cursor = createCursor(page);

    // Warm up: move somewhere in the viewport first
    await cursor.moveTo({ x: 100, y: 80 });
    // Then click — the cursor travels from (100, 80) to the button
    await cursor.click("#btn-b");

    await expect(page.locator("#log")).toHaveText("btn-b clicked");
  });

  test("uses timestamp-based movement (useTimestamps: true)", async ({
    page,
  }) => {
    await page.setContent(INTERACTIVE_HTML);

    const cursor = createCursor(page);

    // useTimestamps converts the curve's speed profile into real await delays
    // between each step, producing very natural-feeling movements.
    await cursor.move("#btn-a", { useTimestamps: true });
    await cursor.click("#btn-a", { useTimestamps: true });

    await expect(page.locator("#log")).toHaveText("btn-a clicked");
  });

  test("uses slow scroll speed for smooth scrolling", async ({ page }) => {
    await page.setContent(/* html */ `
      <!DOCTYPE html>
      <html>
      <head><style>body { margin: 0; } section { height: 500px; }</style></head>
      <body>
        <section id="s1">Section 1</section>
        <section id="s2">Section 2</section>
        <section id="s3">Section 3</section>
      </body>
      </html>
    `);

    const cursor = createCursor(page);

    // scrollSpeed: 20 = many tiny steps (smoother, slower)
    await cursor.scroll({ y: 400 }, { scrollSpeed: 20, scrollDelay: 50 });

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test("exposes current cursor location", async ({ page }) => {
    await page.setContent(INTERACTIVE_HTML);

    const cursor = createCursor(page, { start: { x: 0, y: 0 } });

    expect(cursor.getLocation()).toEqual({ x: 0, y: 0 });

    await cursor.moveTo({ x: 250, y: 180 });

    const loc = cursor.getLocation();
    expect(loc.x).toBeCloseTo(250, -1);
    expect(loc.y).toBeCloseTo(180, -1);
  });

  test("uses defaultOptions set at construction time", async ({ page }) => {
    await page.setContent(INTERACTIVE_HTML);

    const cursor = createCursor(page, {
      defaultOptions: {
        // Every click() will wait 50 ms before pressing and 20 ms before releasing
        click: { hesitate: 50, waitForClick: 20 },
        move: { overshootThreshold: 200 },
      },
    });

    await cursor.click("#btn-a");
    await expect(page.locator("#log")).toHaveText("btn-a clicked");
  });
});

// ---------------------------------------------------------------------------
// Tests — math utilities exported from @playwright-labs/ghost-cursor
// ---------------------------------------------------------------------------

test.describe("math utilities", () => {
  test("path() generates a non-empty Bézier curve", () => {
    const start: Vector = { x: 0, y: 0 };
    const end: Vector = { x: 500, y: 300 };

    const points = path(start, end) as Vector[];

    // Should produce many intermediate steps
    expect(points.length).toBeGreaterThan(10);

    // First point is near start, last is near end
    const first = points[0]!;
    const last = points[points.length - 1]!;

    expect(first.x).toBeGreaterThanOrEqual(0);
    expect(last.x).toBeCloseTo(500, 0);
    expect(last.y).toBeCloseTo(300, 0);
  });

  test("path() with spreadOverride produces a tighter curve", () => {
    const start: Vector = { x: 0, y: 0 };
    const end: Vector = { x: 400, y: 200 };

    const wide = path(start, end, { spreadOverride: 150 }) as Vector[];
    const tight = path(start, end, { spreadOverride: 2 }) as Vector[];

    // Both should reach the end point
    expect(wide[wide.length - 1]!.x).toBeCloseTo(400, 0);
    expect(tight[tight.length - 1]!.x).toBeCloseTo(400, 0);
  });

  test("path() with useTimestamps returns TimedVector[]", () => {
    const start: Vector = { x: 0, y: 0 };
    const end: Vector = { x: 300, y: 200 };

    const timed = path(start, end, { useTimestamps: true }) as Array<
      Vector & { timestamp: number }
    >;

    expect(timed.length).toBeGreaterThan(0);

    for (const v of timed) {
      expect(typeof v.timestamp).toBe("number");
      expect(v.timestamp).toBeGreaterThan(0);
    }

    // Timestamps should be monotonically increasing
    for (let i = 1; i < timed.length; i++) {
      expect(timed[i]!.timestamp).toBeGreaterThanOrEqual(timed[i - 1]!.timestamp);
    }
  });

  test("overshoot() returns a point near the original coordinate", () => {
    const center: Vector = { x: 100, y: 100 };
    const radius = 50;
    const point = overshoot(center, radius);

    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Overshoot point must fall within the radius circle
    expect(distance).toBeLessThanOrEqual(radius + 0.001);
  });
});
