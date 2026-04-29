/**
 * Example: @playwright-labs/fixture-ghost-cursor
 *
 * `test` and `expect` come from the fixture package, which extends the base
 * Playwright `test` with two fixtures:
 *
 *   ghostCursor        — ready-to-use cursor with default options
 *   useGhostCursor()   — factory for a cursor with custom options
 *
 * All cursor operations produce natural Bézier-curve mouse paths so that
 * browser bot-detection heuristics see human-like pointer events.
 */

import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal page with a few interactive elements. */
const FORM_HTML = /* html */ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; margin: 40px; }
      input, button { display: block; margin: 8px 0; padding: 6px 12px; font-size: 14px; }
      #result { margin-top: 12px; color: green; font-weight: bold; }
    </style>
  </head>
  <body>
    <h1>Ghost Cursor Demo</h1>
    <input id="username" type="text" placeholder="Username" />
    <input id="password" type="password" placeholder="Password" />
    <button id="submit">Log in</button>
    <div id="result"></div>
    <script>
      document.getElementById('submit').addEventListener('click', () => {
        const u = document.getElementById('username').value;
        document.getElementById('result').textContent = u ? 'Logged in as ' + u : 'Missing username';
      });
    </script>
  </body>
  </html>
`;

/** Tall page for scroll tests. */
const SCROLL_HTML = /* html */ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: sans-serif; margin: 0; }
      section { height: 600px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
      section:nth-child(odd) { background: #eef; }
    </style>
  </head>
  <body>
    <section id="top">Top section</section>
    <section id="mid">Middle section</section>
    <section id="bottom">Bottom section</section>
  </body>
  </html>
`;

// ---------------------------------------------------------------------------
// Tests — ghostCursor (default fixture)
// ---------------------------------------------------------------------------

test.describe("ghostCursor fixture", () => {
  test("moves to an element and clicks it", async ({
    page,
    ghostCursor,
  }) => {
    await page.setContent(FORM_HTML);

    // Ghost cursor moves to #submit along a natural Bézier path then clicks.
    await ghostCursor.click("#submit");

    // The button handler fires even without filling the inputs.
    await expect(page.locator("#result")).toHaveText("Missing username");
  });

  test("fills a form with human-like cursor movements", async ({
    page,
    ghostCursor,
  }) => {
    await page.setContent(FORM_HTML);

    // Move to username field, click, then type
    await ghostCursor.click("#username");
    await page.fill("#username", "alice");

    // Move to password field naturally (not via teleportation)
    await ghostCursor.click("#password");
    await page.fill("#password", "s3cr3t");

    // Click the submit button
    await ghostCursor.click("#submit");

    await expect(page.locator("#result")).toHaveText("Logged in as alice");
  });

  test("moves to absolute coordinates", async ({ page, ghostCursor }) => {
    await page.setContent(FORM_HTML);

    // moveTo uses the same Bézier path as move() but targets a raw coordinate
    await ghostCursor.moveTo({ x: 200, y: 150 });

    const loc = ghostCursor.getLocation();
    expect(loc.x).toBeCloseTo(200, -1);
    expect(loc.y).toBeCloseTo(150, -1);
  });

  test("moves relative to current position", async ({ page, ghostCursor }) => {
    await page.setContent(FORM_HTML);

    await ghostCursor.moveTo({ x: 100, y: 100 });
    await ghostCursor.moveBy({ x: 80, y: 40 });

    const loc = ghostCursor.getLocation();
    expect(loc.x).toBeCloseTo(180, -1);
    expect(loc.y).toBeCloseTo(140, -1);
  });

  test("scrolls down a tall page", async ({ page, ghostCursor }) => {
    await page.setContent(SCROLL_HTML);

    // Scroll 500 px downward in smooth steps
    await ghostCursor.scroll({ y: 500 }, { scrollSpeed: 30 });

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test("scrolls to the bottom then back to top", async ({
    page,
    ghostCursor,
  }) => {
    await page.setContent(SCROLL_HTML);

    await ghostCursor.scrollTo("bottom");
    const afterBottom = await page.evaluate(() => window.scrollY);
    expect(afterBottom).toBeGreaterThan(100);

    await ghostCursor.scrollTo("top");
    const afterTop = await page.evaluate(() => window.scrollY);
    // Chrome's scroll animation does not guarantee pixel-perfect positioning
    // for a single large wheel step. We verify the cursor moved back
    // to the top region (within 10 % of the original distance).
    expect(afterTop).toBeLessThan(afterBottom * 0.1);
  });

  test("scrolls an off-screen element into view", async ({
    page,
    ghostCursor,
  }) => {
    await page.setContent(SCROLL_HTML);

    // #bottom is initially off-screen (page starts at top, section height 600 px)
    await ghostCursor.scrollIntoView("#bottom");

    const isVisible = await page
      .locator("#bottom")
      .evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });

    expect(isVisible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — useGhostCursor (factory fixture)
// ---------------------------------------------------------------------------

test.describe("useGhostCursor factory", () => {
  test("creates a cursor with a custom start position", async ({
    page,
    useGhostCursor,
  }) => {
    await page.setContent(FORM_HTML);

    // Start the cursor at a specific coordinate instead of the default (0, 0)
    const cursor = useGhostCursor({ start: { x: 300, y: 200 } });

    expect(cursor.getLocation()).toEqual({ x: 300, y: 200 });

    await cursor.click("#submit");
    await expect(page.locator("#result")).toHaveText("Missing username");
  });

  test("applies default move options to every call", async ({
    page,
    useGhostCursor,
  }) => {
    await page.setContent(FORM_HTML);

    // defaultOptions are merged into every cursor method invocation
    const cursor = useGhostCursor({
      defaultOptions: {
        click: { hesitate: 50, waitForClick: 30 },
        move: { overshootThreshold: 300 },
      },
    });

    await cursor.click("#username");
    await page.fill("#username", "bob");
    await cursor.click("#submit");

    await expect(page.locator("#result")).toHaveText("Logged in as bob");
  });

  test("uses XPath selector to find elements", async ({
    page,
    useGhostCursor,
  }) => {
    await page.setContent(FORM_HTML);

    const cursor = useGhostCursor();

    // XPath selectors starting with // are auto-detected
    await cursor.click("//button[@id='submit']");
    await expect(page.locator("#result")).toHaveText("Missing username");
  });

  test("uses an ElementHandle directly", async ({ page, useGhostCursor }) => {
    await page.setContent(FORM_HTML);

    const cursor = useGhostCursor();
    const handle = await page.$("#submit");

    // Pass an already-resolved ElementHandle instead of a selector string
    await cursor.click(handle!);
    await expect(page.locator("#result")).toHaveText("Missing username");
  });

  test("right-clicks using custom mouse button", async ({
    page,
    useGhostCursor,
  }) => {
    await page.setContent(/* html */ `
      <!DOCTYPE html>
      <body>
        <div id="box" style="width:100px;height:100px;background:red;"></div>
        <div id="menu" style="display:none;">Context menu</div>
        <script>
          document.getElementById('box').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            document.getElementById('menu').style.display = 'block';
          });
        </script>
      </body>
    `);

    const cursor = useGhostCursor();
    await cursor.click("#box", { button: "right" });
    await expect(page.locator("#menu")).toBeVisible();
  });
});
