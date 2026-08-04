---
"@playwright-labs/reporter-inline": minor
---

Initial release of the inline reporter package. Build a Playwright reporter from plain callbacks (`onBegin`, `onTestBegin`, `onStepBegin`, `onStepEnd`, `onTestEnd`, `onStdOut`, `onStdErr`, `onError`, `onEnd`, `onExit`) instead of writing a class. `onEnd` may return `{ status }` to override the run status, `onExit` is awaited, and the reporter doubles as a typed event emitter for direct subscriptions.
