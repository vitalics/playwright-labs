---
"@playwright-labs/fixture-otel": minor
---

Fix: issue with attaching parent for `spanId` for `withSpan` function (#49). Example:

```ts
import { withSpan } from "@playwright-labs/fixture-otel";

test('some test', () => {
  withSpan("parent", (parentSpan) => {
    withSpan("child", (childSpan) => {
      // implementation
    });
  });
});
})
```

Before:

```md
[test span]
├── parent
└── child
```

After:

```md
[test]
└── parent
    └── child
```
