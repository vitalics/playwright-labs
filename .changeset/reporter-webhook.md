---
"@playwright-labs/reporter-webhook": minor
---

Initial release of the webhook reporter package. POSTs Playwright lifecycle events (`begin`, `test.begin`, `test.end`, `error`, `end`) to any webhook URL as JSON `{ event, data }` bodies with JSON-safe payload summaries. Supports an `events` filter, `eventPrefix` namespacing, custom `headers`, and a `body` callback to reshape payloads for any receiver. Delivery failures from earlier hooks are collected and rethrown from `onEnd`.
