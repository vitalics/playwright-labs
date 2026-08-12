# @playwright-labs/fixture-network

Network throttling fixtures for Playwright — emulate 2G/3G/4G/offline per page, assert on the state with custom matchers.

Built on [`@playwright-labs/network-core`](../network-core) (CDP, Chromium only).

## Installation

```bash
pnpm add -D @playwright-labs/fixture-network
```

## Quick start

```ts
import { test, expect } from '@playwright-labs/fixture-network';

test('dashboard under slow 3G', async ({ page, network }) => {
  await network.start('Regular3G');
  await page.goto('/dashboard');

  expect(network).toBeNetworkThrottled();
  await expect(page.getByTestId('chart')).toBeVisible({ timeout: 30_000 });
});

test('offline banner', async ({ page, network }) => {
  await page.goto('/');
  await network.start('Offline');

  expect(page).toBeNetworkOffline();
  await expect(page.getByRole('alert')).toContainText('offline');
});
```

## Fixtures

| Fixture | Type | Behaviour |
|---|---|---|
| `network` | `NetworkAPI` | ready-made handle for the default page |
| `useNetwork` | `(page?: Page \| Frame) => Promise<NetworkAPI>` | factory for extra pages/frames |

Every handle is stopped automatically on test end — no manual cleanup.

`NetworkAPI`: `start(preset | condition)` (returns the resolved frozen condition), `stop()`, `condition`, `started`. Presets: `GPRS`, `Regular2G`, `Good2G`, `Regular3G`, `Good3G`, `Regular4G`, `DSL`, `WiFi`, `Offline`, `NoThrottling`. Custom conditions via `createNetworkCondition` + `kbps`/`mbps` (re-exported from network-core).

## Matchers

All matchers accept the `NetworkAPI` instance **or** the page/frame it was created for. `.not` supported.

| Matcher | Passes when |
|---|---|
| `toBeNetworkStarted()` | any condition is applied |
| `toBeNetworkOffline()` | the applied condition is offline |
| `toBeNetworkThrottled()` | any restriction is active (offline, latency > 0, capped throughput) |
| `toHaveNetworkCondition('Regular3G')` | applied condition equals the preset |
| `toHaveNetworkCondition({ latency: 100 })` | partial field-by-field match |

## Limitations

- **Chromium only** — CDP is unavailable in Firefox/WebKit; `useNetwork` throws a descriptive error there
- throttling applies per page (CDP session), not per browser context

## Related packages

- [`@playwright-labs/network-core`](../network-core) — the underlying CDP primitives

## License

MIT
