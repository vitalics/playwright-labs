---
"@playwright-labs/fixture-network": major
---

Initial release — network throttling fixtures for Playwright with custom matchers, built on `@playwright-labs/network-core` (CDP, Chromium only).

**Fixtures**

- `network` — ready-made `NetworkAPI` for the default page
- `useNetwork(page?)` — factory for extra pages/frames; every handle is stopped automatically on test end; repeated calls for the same page return the same handle
- `networkPreset` option — apply a preset or partial condition to every test via `test.use({ networkPreset: "Regular3G" })` or a project's `use` block; `null` (default) applies nothing
- non-Chromium browsers get a descriptive error instead of a cryptic CDP failure
- the full network-core API is re-exported (`NETWORK_PRESETS`, `createNetworkCondition`, `kbps`/`mbps`, ...)

```ts
import {
  test,
  expect,
  createNetworkCondition,
  kbps,
} from "@playwright-labs/fixture-network";

test("dashboard survives slow 3G", async ({ page, network }) => {
  await network.start("Regular3G");
  await page.goto("/dashboard");

  expect(network).toBeNetworkThrottled();
  await expect(page.getByTestId("chart")).toBeVisible({ timeout: 30_000 });
});

test("offline banner", async ({ page, network }) => {
  await page.goto("/");
  await network.start("Offline");

  expect(page).toBeNetworkOffline(); // matchers accept the page too
  await expect(page.getByRole("alert")).toContainText("offline");
});

test("throttle a second page", async ({ context, useNetwork }) => {
  const popup = await context.newPage();
  const network = await useNetwork(popup);
  await network.start(createNetworkCondition({ latency: 800, downloadThroughput: kbps(256) }));
});
```

**Matchers** (accept `NetworkAPI` or the page/frame it was created for, `.not` supported)

| Matcher | Passes when |
|---|---|
| `toBeNetworkStarted()` | any condition is applied |
| `toBeNetworkOffline()` | the applied condition is offline |
| `toBeNetworkThrottled()` | any restriction is active (offline, latency > 0, capped throughput) |
| `toHaveNetworkCondition("Regular3G")` | applied condition equals the preset |
| `toHaveNetworkCondition({ latency: 100 })` | partial field-by-field match |
