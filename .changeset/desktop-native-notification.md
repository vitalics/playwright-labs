---
"@playwright-labs/reporter-desktop-native-notification": major
---

First release of `@playwright-labs/reporter-desktop-native-notification` — a Playwright reporter that sends desktop native notifications when a test run finishes, via [`node-notifier`](https://github.com/mikaelbr/node-notifier) (macOS Notification Center, Windows toast, Linux notify-send).

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["@playwright-labs/reporter-desktop-native-notification", { sound: true }],
  ],
});
```

- Run summary notification with status-derived title (`Playwright — Failed`, `Playwright — Flaky`, …) and counts + wall time in the body (`✓ 12 passed, ✗ 2 failed, ⊘ 1 skipped in 45.3s`).
- `notifyOn: "always" | "success" | "failure"` — notify on every run or only on the outcomes you care about.
- `notifyOnError` — optional immediate notification for global errors.
- CI-aware: notifications are skipped when `process.env.CI` is set, unless `ci: true`.
- `sound`, `icon`, `wait`, `timeout` passthrough to node-notifier.
- Notification failures never fail the test run.
