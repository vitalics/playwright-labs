# @playwright-labs/network-core

Network condition emulation for Chromium over CDP — presets (GPRS → WiFi, offline), a validated condition factory, and a `NetworkAPI` handle with async-dispose cleanup.

## Installation

```bash
pnpm add -D @playwright-labs/network-core
```

## Quick start

```ts
import { test } from '@playwright/test';
import { NetworkAPI, createNetworkCondition, kbps } from '@playwright-labs/network-core';

test('page under slow 3G', async ({ page, context }) => {
  const session = await context.newCDPSession(page);
  await using network = new NetworkAPI(session);

  await network.start('Regular3G');          // preset by name
  await page.goto('/dashboard');
  // ...assertions under throttling...

  // scope exit (async dispose) restores normal networking
});
```

## Presets

`GPRS`, `Regular2G`, `Good2G`, `Regular3G`, `Good3G`, `Regular4G`, `DSL`, `WiFi`, `Offline`, `NoThrottling` — exported as `NETWORK_PRESETS`, names typed as `NetworkPreset`.

| Preset | Download | Upload | Latency |
|---|---|---|---|
| GPRS | 50 Kbps | 20 Kbps | 500 ms |
| Regular2G | 250 Kbps | 50 Kbps | 300 ms |
| Good2G | 450 Kbps | 150 Kbps | 150 ms |
| Regular3G | 750 Kbps | 250 Kbps | 100 ms |
| Good3G | 1.5 Mbps | 750 Kbps | 40 ms |
| Regular4G | 4 Mbps | 3 Mbps | 20 ms |
| DSL | 2 Mbps | 1 Mbps | 5 ms |
| WiFi | 30 Mbps | 15 Mbps | 2 ms |

## Custom conditions

```ts
import { createNetworkCondition, kbps, mbps } from '@playwright-labs/network-core';

const flaky = createNetworkCondition({
  latency: 800,
  downloadThroughput: kbps(256),
  uploadThroughput: kbps(64),
});
await network.start(flaky);
```

- omitted fields mean "no restriction" (`-1` throughput, `0` latency, online)
- validation: `latency >= 0`, throughput `>= 0` or `-1` (disable), finite numbers only — invalid input throws `TypeError` before any CDP call
- results are frozen

## `NetworkAPI`

| Member | Behaviour |
|---|---|
| `start(preset \| condition)` | applies and returns the resolved frozen `NetworkCondition`; enables the CDP `Network` domain on first call |
| `stop()` | restores normal networking; idempotent |
| `condition` | currently applied condition or `null` |
| `started` | boolean |
| `await using` / `Symbol.asyncDispose` | `stop()` on scope exit |

## Limitations

- **Chromium only** — CDP sessions are not available for Firefox/WebKit
- throttling applies per CDP session (page), not per context

## License

MIT
