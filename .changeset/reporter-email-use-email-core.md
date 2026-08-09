---
"@playwright-labs/reporter-email": patch
---

Internal refactor: the string HTML primitives (`h`, `fragment`, `h1`–`h6`, `table`, `div`, `img`, ...) now come from `@playwright-labs/email-core` instead of a local copy — same named exports, same output (including the `IS_DEBUG` newline behavior). Also drops a leftover demo snippet that ran `console.log` on import.
