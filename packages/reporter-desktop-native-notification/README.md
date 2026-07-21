# @playwright-labs/reporter-desktop-native-notification

Desktop native notifications for [Playwright](https://playwright.dev) test runs, powered by [node-notifier](https://github.com/mikaelbr/node-notifier). Get a native notification when a run finishes — macOS Notification Center, Windows toast notifications, and Linux `notify-send`.

## Features

- **Run summary notification** — passed/failed/timed out/skipped counts and wall-clock duration
- **Cross-platform** — macOS (Notification Center), Windows (toast), Linux (`notify-send`)
- **Configurable trigger** — notify on every run, only on failure, or only on success
- **CI-aware** — silent on CI unless you opt in
- **Instant error notifications** — optionally notified on every global Playwright `onError`
- **Never fails your run** — notification errors are swallowed, a warning is printed

## Requirements

- Playwright >= 1.13.0
- Node.js >= 18

## Install

```bash
npm i -D @playwright-labs/reporter-desktop-native-notification
```

## Setup

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["@playwright-labs/reporter-desktop-native-notification"],
  ],
});
```

All options are optional — an empty options object uses the defaults shown below.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `notifyOn` | `'always' \| 'success' \| 'failure'` | `'always'` | When to send the run summary notification |
| `title` | `string` | derived from run status, e.g. `'Playwright — Failed'` | Notification title |
| `message` | `string \| ((result, testCases) => string \| Promise<string>)` | built-in counts summary | Notification body — static or a template called with the run result and all test cases (same contract as reporter-email's `text`/`html`) |
| `sound` | `boolean` | `false` | Play the default notification sound |
| `icon` | `string` | — | Path to a custom app icon |
| `wait` | `boolean` | `false` | Wait for the user to dismiss/click the notification |
| `timeout` | `number` | `10` | Seconds before the notification expires |
| `ci` | `boolean` | `false` | Send notifications when running in CI (`process.env.CI` is set) |
| `notifyOnError` | `boolean` | `false` | Also fire an immediate notification for each global `onError` |

### Example

```typescript
export default defineConfig({
  reporter: [
    [
      "@playwright-labs/reporter-desktop-native-notification",
      {
        notifyOn: "failure",
        sound: true,
        timeout: 15,
        notifyOnError: true,
      },
    ],
  ],
});
```

## Notification text

The title is derived from the run status unless `title` is set: `Playwright — Passed`, `Playwright — Failed`, `Playwright — Timed out`, `Playwright — Interrupted`.

The message lists the non-zero result groups (the passed count is always shown) plus the wall-clock duration:

```
✓ 12 passed, ✗ 2 failed, ⏱ 1 timed out, ⊘ 3 skipped in 45.3s
```

If no test results were reported at all:

```
No tests run in 45.3s
```

## CI behavior

Notifications are **skipped when `process.env.CI` is set** — desktop notifications rarely make sense on a headless CI agent. Set `ci: true` to opt back in:

```typescript
["@playwright-labs/reporter-desktop-native-notification", { ci: true }]
```

## Error handling

A notification failure never fails the test run: errors from `node-notifier` are swallowed and a one-line warning is printed to the console.

## License

MIT
