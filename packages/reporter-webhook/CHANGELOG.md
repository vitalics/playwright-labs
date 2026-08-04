# @playwright-labs/reporter-webhook

## 0.2.0

### Minor Changes

- 7e9a4f3: Initial release of the webhook reporter package. POSTs Playwright lifecycle events (`begin`, `test.begin`, `test.end`, `error`, `end`) to any webhook URL as JSON `{ event, data }` bodies with JSON-safe payload summaries. Supports an `events` filter, `eventPrefix` namespacing, custom `headers`, and a `body` callback to reshape payloads for any receiver. Delivery failures from earlier hooks are collected and rethrown from `onEnd`.

### Patch Changes

- Updated dependencies [7e9a4f3]
  - @playwright-labs/reporter-core@1.2.0
