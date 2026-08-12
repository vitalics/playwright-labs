# @playwright-labs/network-core

## 1.0.0

### Major Changes

- 3d0b324: Initial release — network condition emulation for Chromium over CDP.
  - `NETWORK_PRESETS` — `GPRS`, `Regular2G`, `Good2G`, `Regular3G`, `Good3G`, `Regular4G`, `DSL`, `WiFi`, `Offline`, `NoThrottling` (names typed as `NetworkPreset`)
  - `createNetworkCondition(partial)` — validated, frozen conditions; omitted fields mean "no restriction"; invalid input (`latency < 0`, negative throughput other than `-1`, `NaN`/`Infinity`) throws `TypeError` before any CDP call
  - `kbps()` / `mbps()` — human-friendly throughput helpers (bytes/sec conversion)
  - `NetworkAPI` — `start(preset | condition)` accepts partial conditions, applies and returns the resolved condition, `stop()` restores normal networking (idempotent), `condition`/`started` getters, `await using` support (async dispose restores networking on scope exit); the CDP `Network` domain is enabled lazily once

  ```ts
  import {
    NetworkAPI,
    createNetworkCondition,
    kbps,
  } from "@playwright-labs/network-core";

  const session = await context.newCDPSession(page);
  await using network = new NetworkAPI(session);

  await network.start("Regular3G"); // preset
  await network.start(
    createNetworkCondition({
      // custom
      latency: 800,
      downloadThroughput: kbps(256),
    }),
  );
  // scope exit restores normal networking
  ```

  \*_NOTE:_ Chromium only — CDP sessions are not available for Firefox/WebKit.
