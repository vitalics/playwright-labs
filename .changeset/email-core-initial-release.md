---
"@playwright-labs/email-core": minor
---

Initial release. Shared email primitives extracted from `@playwright-labs/fixture-gmail` / `@playwright-labs/fixture-mailpit` into their own dependency-free package (no `@playwright/test` peer dependency):

- `EmailProvider<T>` — abstract base class (an `EventEmitter`) implementing `waitForEmail(options)` (polls `findEmail` until a match or `timeout`, default 30s/1s interval) and `getEmailLinks(id)` (unique `href` extraction from the HTML body) on top of the abstract `findEmail` / `readEmail` / `markAsRead`. Emits typed events: `email.send`, `email.receive`, `email.read`, `email.find` (`EmailProviderEvents`).
- `EmailProviderAPI` — the interface every email provider exposes.
- Shared types: `Email` (with bound `readAsStream()` / `readAsBytes()` / `readAsString()` body readers), `FindEmailOptions`, `ReadEmailOptions`, `WaitForEmailOptions`.
- Helpers: `extractLinks(html)`, `emailReaders(read)` (builds the `Email` `readAs*` methods) and `filterEmails(emails, { subject, from, to })` for client-side `RegExp` filtering.
- `NodemailerSender` — provider-agnostic SMTP sending via nodemailer (accepts SMTP options or an existing `Transporter`), with `verify()`/`close()`.
- String HTML body primitives (`h`, `fragment`, `h1`–`h6`, `table`, `div`, `img`, ...) shared with `reporter-email`.
- Provider clients under `src/providers/` (one file per provider), exposed as subpath exports — `@playwright-labs/email-core/providers/gmail` (`Gmail`) and `@playwright-labs/email-core/providers/mailpit` (`Mailpit`).

```ts
import { EmailProvider, type Email, type FindEmailOptions } from "@playwright-labs/email-core";
import { Gmail } from "@playwright-labs/email-core/providers/gmail";
import { Mailpit } from "@playwright-labs/email-core/providers/mailpit";
```
