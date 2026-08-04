# @playwright-labs/reporter-inline

## 0.2.0

### Minor Changes

- 7e9a4f3: Initial release of the inline reporter package. Build a Playwright reporter from plain callbacks (`onBegin`, `onTestBegin`, `onStepBegin`, `onStepEnd`, `onTestEnd`, `onStdOut`, `onStdErr`, `onError`, `onEnd`, `onExit`) instead of writing a class. `onEnd` may return `{ status }` to override the run status, `onExit` is awaited, and the reporter doubles as a typed event emitter for direct subscriptions.

### Patch Changes

- Updated dependencies [7e9a4f3]
  - @playwright-labs/reporter-core@1.2.0
