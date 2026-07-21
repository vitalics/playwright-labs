# @playwright-labs/reporter-desktop-native-notification

## 1.0.1

### Patch Changes

- Updated dependencies [2c8022d]
  - @playwright-labs/reporter-core@1.1.0

## 1.0.0

### Major Changes

- 7aba50f: First release of `@playwright-labs/reporter-desktop-native-notification` — a Playwright reporter that sends desktop native notifications when a test run finishes, via [`node-notifier`](https://github.com/mikaelbr/node-notifier) (macOS Notification Center, Windows toast, Linux notify-send).

  ```ts
  // playwright.config.ts
  import { defineConfig } from "@playwright/test";

  export default defineConfig({
    reporter: [
      ["list"],
      [
        "@playwright-labs/reporter-desktop-native-notification",
        { sound: true },
      ],
    ],
  });
  ```

  - Run summary notification with status-derived title (`Playwright — Failed`, `Playwright — Flaky`, …) and counts + wall time in the body (`✓ 12 passed, ✗ 2 failed, ⊘ 1 skipped in 45.3s`).
  - `message` option — replace the built-in body with a static string or a `(result, testCases) => string` template (same contract as reporter-email's `text`/`html`, powered by `@playwright-labs/reporter-core`).
  - `notifyOn: "always" | "success" | "failure"` — notify on every run or only on the outcomes you care about.
  - `notifyOnError` — optional immediate notification for global errors.
  - CI-aware: notifications are skipped when `process.env.CI` is set, unless `ci: true`.
  - `sound`, `icon`, `wait`, `timeout` passthrough to node-notifier.
  - Notification failures never fail the test run.

### Patch Changes

- Updated dependencies [e5fb985]
  - @playwright-labs/reporter-core@1.0.0
