---
"@playwright-labs/reporter-core": minor
---

`BaseReporter` now extends a typed `EventEmitter`. Every reporter hook is emitted as an event — `begin`, `test.begin`, `step.begin`, `step.end`, `test.end`, `stdErr`, `stdOut`, `error`, `end`, `exit` — plus `reporter.init` (emitted from the constructor with the extra constructor args) and `reporter.dispose` (via `Symbol.dispose`). The constructor accepts `{ captureRejections }`, forwarded to the underlying `EventEmitter`.
