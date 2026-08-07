---
"@playwright-labs/sql-core": patch
"@playwright-labs/fixture-sql": patch
---

Bump `better-sqlite3` dev dependency from `^9.6.0` to `^11.0.0`. 9.6.0's native bindings call V8/Node-API functions removed in newer V8 headers, so it fails to build on Node 24. 11.x builds cleanly and is already what CI and `examples/sql` use.
