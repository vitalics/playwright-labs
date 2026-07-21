---
title: Simulate Human-Like Input with ghost-cursor
impact: LOW
impactDescription: helps anti-bot-sensitive flows pass mouse-movement heuristics, but costs speed and reliability on ordinary tests
tags: ghost-cursor, mouse, anti-bot, human-like, input
---

## Simulate Human-Like Input with ghost-cursor

**Impact: LOW (helps anti-bot-sensitive flows pass mouse-movement heuristics, but costs speed and reliability on ordinary tests)**

Playwright's native `locator.click()` teleports the mouse to the target and clicks instantly. That is exactly what you want for 99% of tests — but some pages score "humanness" by observing pointer trajectories: login forms behind bot protection, CAPTCHA-adjacent flows, fraud-scored checkouts. The `@playwright-labs/ghost-cursor` package generates realistic Bézier-curve mouse paths with overshoot, jitter, and Fitts's-law timing on top of the native `page.mouse` API, and `@playwright-labs/fixture-ghost-cursor` wires it into `@playwright/test` via `test.extend`. Use it surgically on the flows that need it — never as a blanket replacement for native clicks.

## When to Use

- **Use ghost-cursor when**: A specific flow is gated by anti-bot heuristics that track mouse movement (e.g., a login or signup form that rejects instantaneous clicks)
- **Use the `ghostCursor` fixture when**: You need a ready-to-use cursor with default options in a test
- **Use the `useGhostCursor` factory when**: You need custom options — `visible` overlay for debugging, `performRandomMoves` for idle movement, or `defaultOptions` like `hesitate` and `waitForClick`
- **Consider alternatives when**: The target is your own application with no bot detection — native `locator.click()` is faster, auto-waits for actionability, and is far less flaky
- **Required for**: Tests against third-party or production-like environments where you cannot disable bot protection and the flow fails with plain Playwright clicks

## Guidelines

### Do

- Restrict ghost-cursor to the few tests that actually hit anti-bot heuristics — tag or group them so the cost is visible
- Prefer the `ghostCursor` / `useGhostCursor` fixtures from `@playwright-labs/fixture-ghost-cursor` over calling `createCursor(page)` manually — the fixture keeps cursor creation consistent and mergeable via `mergeTests`
- Keep using web-first assertions (`expect(page).toHaveURL(...)`, `toBeVisible()`) after every cursor action — ghost-cursor changes *how* you click, not *how* you assert
- Tune realism through `defaultOptions` when a flow needs it: `click: { hesitate: 100, waitForClick: 50 }` adds human-like pauses around the press
- Use `useGhostCursor({ visible: true })` or `installMouseHelper()` locally to watch the trajectory while developing the test
- Resolve role-based locators to handles with `locator.elementHandle()` when you want ghost-cursor to click a locator you already have — cursor methods accept a CSS/XPath selector or an `ElementHandle`

### Don't

- Don't apply ghost-cursor to every test in the suite — Bézier path generation plus realistic delays make each click noticeably slower than `locator.click()`, and the suite pays for it with zero benefit
- Don't expect ghost-cursor to replace web-first assertions or auto-waiting — it is an input simulation tool, not a waiting strategy
- Don't expect cursor actions to auto-wait for actionability like `locator.click()` does — `page.mouse` dispatches raw events; use the `waitForSelector` option or wait for the element explicitly first
- Don't enable `performRandomMoves: true` in CI unless a heuristic genuinely requires idle movement — background motion adds runtime and non-determinism to every test that uses the cursor
- Don't fake typing with the mouse — ghost-cursor has no keyboard API; click the field with the cursor, then use `page.fill()` or `page.keyboard` as usual
- Don't treat ghost-cursor as a CAPTCHA solver — it only makes mouse movement look human; it does not defeat challenges, fingerprinting, or rate limiting

### Tool Usage Patterns

- **Install**: `npm install @playwright-labs/ghost-cursor @playwright-labs/fixture-ghost-cursor`
- **Standalone**: `createCursor(page, options?)` from `@playwright-labs/ghost-cursor` — for scripts without the test runner
- **Fixtures**: `ghostCursor` (default options) and `useGhostCursor(options?)` (factory) from `@playwright-labs/fixture-ghost-cursor`
- **Movement**: `move(selector)`, `moveTo({ x, y })`, `moveBy({ x, y })`, `getLocation()`
- **Clicking**: `click(selector?, options?)`, `mouseDown()`, `mouseUp()` with `ClickOptions` — `hesitate`, `waitForClick`, `button`, `clickCount`
- **Scrolling**: `scroll({ y })`, `scrollTo('bottom')`, `scrollIntoView(selector)` with `ScrollOptions` — `scrollSpeed`, `scrollDelay`
- **Realism tuning** (`MoveOptions`): `overshootThreshold`, `moveSpeed`, `moveDelay`, `randomizeMoveDelay`, `paddingPercentage`, `useTimestamps`, `maxTries`, `waitForSelector`
- **Debug**: `visible: true` cursor option, or `installMouseHelper()` / `removeMouseHelper()` on an existing cursor

## Edge Cases and Constraints

### Limitations

- Cursor actions go through `page.mouse`, bypassing Playwright's actionability checks (visible, stable, enabled, receives events). A native `locator.click()` that waits and retries is strictly more reliable against ordinary UI.
- Selectors are CSS/XPath strings or `ElementHandle`s — there is no `Locator` overload. Convert with `await locator.elementHandle()` when starting from a role locator.
- Human-like timing is deliberate latency: `hesitate`, `waitForClick`, `moveDelay`, and randomized movement all add wall-clock time per action. Across hundreds of tests this compounds into minutes of CI time.
- Ghost-cursor simulates the mouse only. Keyboard input, file uploads, and drag-and-drop still need the native `page.keyboard`, `setInputFiles()`, or manual `mouseDown`/`move`/`mouseUp` sequences.

### Edge Cases

1. **Element moves during the approach**: The path is computed up front; if the target shifts (lazy layout, animation), the click can land off-target. `MoveOptions.maxTries` (default `10`) retries when element intersection fails — wait for layout stability before clicking.
2. **Long-distance moves**: Overshoot is applied only above `overshootThreshold` (default `500` px). If a heuristic expects overshoot on shorter moves, lower the threshold via `defaultOptions.move`.
3. **Detached elements**: If the selector resolves but the element detaches before the cursor arrives, the click hits stale coordinates. Pass `waitForSelector` in options or assert visibility first.
4. **Headless vs. headed**: Trajectories work in both modes, but `visible: true` and `installMouseHelper()` are only useful when you can see the browser — strip them from CI runs.

### What Breaks If Ignored

- **Applied everywhere**: Suite runtime inflates measurably, and tests get flakier because raw `page.mouse` events skip actionability checks — you traded the most reliable click in Playwright for a slower one with no anti-bot to impress
- **Treated as a waiting strategy**: Clicks fire against elements that are not ready yet — intermittent `misclick` failures that no amount of `hesitate` will fix
- **Expected to defeat bot detection alone**: Mouse trajectories are one signal among many (fingerprints, TLS, timing, reputation) — the flow still gets blocked and the test fails anyway

**Incorrect (ghost-cursor applied indiscriminately, assertions replaced by hope):**

```typescript
import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

test("add item to cart", async ({ page, ghostCursor }) => {
  await page.goto("/products");

  // ❌ Own application, no bot protection — native click is faster and auto-waits
  await ghostCursor.click("text=Add to cart");

  // ❌ Raw mouse click with no actionability check, then a hard-coded wait
  //    instead of a web-first assertion — flaky and slow at the same time
  await ghostCursor.click("#checkout");
  await page.waitForTimeout(3000);

  // ❌ Ghost-cursor everywhere: every test in the suite pays the trajectory
  //    tax for zero anti-bot benefit
  expect(page.url()).toContain("/confirmation"); // ❌ non-retrying assertion
});
```

**Why this fails:**
- Every cursor click generates and plays a Bézier path with realistic delays — pure overhead where no heuristic is watching
- `page.mouse` events do not wait for the element to be visible, stable, or enabled, so the click races the UI
- `waitForTimeout` + a non-retrying `page.url()` assertion reintroduces exactly the flakiness web-first assertions exist to prevent

**Correct (ghost-cursor scoped to the anti-bot-sensitive flow, web-first assertions everywhere):**

```typescript
// tests/fixtures.ts
import { mergeTests, test as base } from "@playwright/test";
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ✅ Merge once — every spec can opt into ghostCursor per test
export const test = mergeTests(base, ghostTest);
export { expect } from "@playwright/test";
```

```typescript
// tests/login.spec.ts
import { test, expect } from "./fixtures";

test("login behind bot protection", async ({ page, ghostCursor }) => {
  await page.goto("https://app.example.com/login");

  // ✅ Human-like approach + click on the protected form only
  await ghostCursor.click("#username");
  await page.fill("#username", "user@example.com"); // keyboard stays native

  await ghostCursor.click("#password");
  await page.fill("#password", "s3cret");

  // ✅ hesitate/waitForClick add realistic pauses around the press
  await ghostCursor.click("#submit", { hesitate: 120, waitForClick: 60 });

  // ✅ Web-first assertion — ghost-cursor changes the click, never the check
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("ordinary settings page — no ghost-cursor", async ({ page }) => {
  await page.goto("/settings");

  // ✅ No anti-bot here: native locator click auto-waits and is faster
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();
});
```

**Why this works:**
- The trajectory cost is paid only by the test that faces the anti-bot heuristic; the rest of the suite keeps native speed and auto-waiting
- `page.fill()` handles typing — ghost-cursor owns the mouse, Playwright owns the keyboard
- Web-first assertions retry until the condition holds, so the test stays deterministic regardless of how long the human-like click took

## Common Mistakes

### Mistake 1: Using ghost-cursor as the default click for the whole suite

```typescript
// tests/fixtures.ts
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ❌ Re-exporting the ghost test as THE test — every spec now clicks
//    with Bézier paths, even plain CRUD screens
export const test = ghostTest;
```

**Why this is wrong**: Each `ghostCursor.click()` generates a path, replays it with inter-frame delays, and skips actionability checks. Multiplied across a suite, this is slower and flakier than the native click it replaced, with no anti-bot audience.

**How to fix**:

```typescript
// tests/fixtures.ts
import { mergeTests, test as base } from "@playwright/test";
import { test as ghostTest } from "@playwright-labs/fixture-ghost-cursor";

// ✅ Base test stays the default; ghostCursor is available on demand
export const test = mergeTests(base, ghostTest);

// tests that need it destructure { ghostCursor }; everyone else
// keeps using locator.click()
```

### Mistake 2: Expecting ghost-cursor to wait for the element

```typescript
test("checkout", async ({ page, ghostCursor }) => {
  await page.goto("/cart");
  // ❌ Button is rendered by a slow API call — the raw mouse click fires
  //    at whatever is under the cursor right now
  await ghostCursor.click("#place-order");
});
```

**Why this is wrong**: `page.mouse` dispatches events immediately. Without Playwright's actionability checks, the click races rendering and lands on nothing — or worse, on the wrong element.

**How to fix**:

```typescript
test("checkout", async ({ page, ghostCursor }) => {
  await page.goto("/cart");

  // ✅ Wait explicitly first — web-first — then let the cursor do its work
  const placeOrder = page.getByRole("button", { name: "Place order" });
  await expect(placeOrder).toBeVisible();
  await expect(placeOrder).toBeEnabled();

  // ✅ Or pass waitForSelector so the cursor waits before moving
  await ghostCursor.click("#place-order", { waitForSelector: 5000 });
});
```

### Mistake 3: Trying to type or solve challenges with the cursor

```typescript
test("signup", async ({ page, ghostCursor }) => {
  // ❌ ghost-cursor has no keyboard API — this clicks the field and stops
  await ghostCursor.click("#email");
  // ...now what? there is no cursor.type()
});
```

**Why this is wrong**: The package simulates mouse movement, clicks, and scrolling only. Keyboard input is out of scope, and no amount of realistic mouse motion passes an actual CAPTCHA challenge.

**How to fix**:

```typescript
test("signup", async ({ page, ghostCursor }) => {
  // ✅ Cursor handles the human-like approach; native APIs handle the rest
  await ghostCursor.click("#email");
  await page.fill("#email", "new@example.com");
  await page.keyboard.press("Tab");
  await page.fill("#password", "s3cret");
});
```

### Mistake 4: Leaving debug aids on in CI

```typescript
test("protected flow", async ({ page, useGhostCursor }) => {
  // ❌ visible overlay + random idle moves in CI: slower, non-deterministic,
  //    and nobody is watching the browser
  const cursor = useGhostCursor({ visible: true, performRandomMoves: true });
  await cursor.click("#submit");
});
```

**Why this is wrong**: `visible` injects a debug overlay you cannot see in headless CI, and `performRandomMoves` keeps the mouse wandering between actions — extra runtime and entropy in an environment that needs determinism.

**How to fix**:

```typescript
test("protected flow", async ({ page, useGhostCursor }) => {
  // ✅ Debug locally with the overlay; CI gets the default, deterministic cursor
  const cursor = useGhostCursor({
    visible: !!process.env.DEBUG_CURSOR,
  });
  await cursor.click("#submit");
});
```

## Advanced Patterns

### Custom realism profiles with defaultOptions

```typescript
import { test, expect } from "@playwright-labs/fixture-ghost-cursor";

test("fraud-scored checkout", async ({ page, useGhostCursor }) => {
  // ✅ One profile applied to every cursor call in this test
  const cursor = useGhostCursor({
    start: { x: 100, y: 100 },
    defaultOptions: {
      move: { overshootThreshold: 300, moveDelay: 50 },
      click: { hesitate: 100, waitForClick: 50 },
    },
  });

  await page.goto("/checkout");
  await cursor.scrollIntoView("#payment-form");
  await cursor.click("#card-number");
  await page.fill("#card-number", "4242424242424242");
  await cursor.click("#pay", { hesitate: 150 });

  await expect(page).toHaveURL(/\/order-confirmed/);
});
```

**When to use this pattern**: A specific flow is scored on interaction cadence and you need consistent hesitation/overshoot tuning across several cursor actions — set it once in `defaultOptions` instead of repeating options per call.

### Combining role locators with cursor movement

```typescript
import { test, expect } from "./fixtures";

test("protected form with role locators", async ({ page, ghostCursor }) => {
  await page.goto("/signup");

  const submit = page.getByRole("button", { name: "Create account" });
  // ✅ Web-first waiting on the locator, human-like click via its handle
  await expect(submit).toBeVisible();
  await ghostCursor.click(await submit.elementHandle());

  await expect(page).toHaveURL(/\/welcome/);
});
```

**When to use this pattern**: Your suite is standardized on role-based locators (see locator-role-based) but one flow needs human-like input — resolve the locator to an `ElementHandle` and keep both worlds.

### Inspecting trajectories with the math utilities

```typescript
import { path, overshoot, type Vector } from "@playwright-labs/ghost-cursor";

// ✅ Generate and assert on the raw trajectory in a unit test of your own
//    tooling — no browser required
const start: Vector = { x: 0, y: 0 };
const end: Vector = { x: 600, y: 400 };
const points = path(start, end);

console.assert(points[0].x === 0 && points.at(-1)!.x === 600);
```

**When to use this pattern**: Debugging or documenting what the cursor actually does — `path(start, end)`, `bezierCurve`, and `overshoot` are exported for exactly this kind of offline inspection.

## Integration with Other Best Practices

- **assertion-web-first**: Non-negotiable alongside ghost-cursor. The cursor changes how input is delivered; assertions must still auto-retry (`toHaveURL`, `toBeVisible`) or the added latency turns into race conditions.
- **stable-auto-waiting**: Ghost-cursor bypasses Playwright's built-in auto-waiting for clicks. Compensate with explicit web-first waits on the target before every cursor action, or use the `waitForSelector` option.
- **locator-role-based**: Cursor methods take CSS/XPath selectors or `ElementHandle`s. Keep authoring role-based locators and convert with `elementHandle()` at the boundary instead of falling back to brittle CSS everywhere.
- **parallel-test-isolation**: Each `ghostCursor` fixture instance is bound to the test's own `page`, so parallel workers never share cursor state — but remember each worker pays the speed cost independently.
- **Scale considerations**: At 100+ tests, even a few seconds of trajectory time per protected flow is fine; applied suite-wide it adds many minutes. Keep ghost-cursor usage countable on one hand per project.

Reference: [@playwright-labs/ghost-cursor](https://github.com/vitalics/playwright-labs/tree/main/packages/ghost-cursor) and [@playwright-labs/fixture-ghost-cursor](https://github.com/vitalics/playwright-labs/tree/main/packages/fixture-ghost-cursor)
