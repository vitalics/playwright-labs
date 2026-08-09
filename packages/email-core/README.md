# email-core

Shared email primitives and provider clients for the `@playwright-labs/fixture-*` email packages (`fixture-gmail`, `fixture-mailpit`, ...) — no `@playwright/test` peer.

- `EmailProvider<T>` — abstract base class (an `EventEmitter`) implementing `waitForEmail` (polling with `timeout`/`interval`, emits `"find.email"`) and `getEmailLinks` (HTML `href` extraction) on top of the abstract `findEmail` / `readEmail` / `markAsRead`.
- `EmailProviderAPI` — the interface every email provider exposes (`findEmail()` without filters lists the whole mailbox).
- Shared types: `Email`, `FindEmailOptions`, `ReadEmailOptions`, `WaitForEmailOptions`.
- Helpers: `extractLinks(html)`, `filterEmails(emails, { subject, from, to })` (client-side `RegExp` filtering), `emailReaders(read)` (builds the `Email` `readAsStream` / `readAsBytes` / `readAsString` methods).
- String HTML body primitives (`h1`–`h6`, `table`, `div`, `img`, ...) shared with `reporter-email`.
- Provider clients under `src/providers/` (one file per provider), exposed as subpath exports.
- `NodemailerSender` — provider-agnostic SMTP sending via nodemailer.

## Events

`EmailProvider` is an `EventEmitter` with typed events:

| Event            | Payload                          | Emitted when                                    |
| ---------------- | -------------------------------- | ----------------------------------------------- |
| `email.send`     | `{ to, cc?, bcc?, subject, id? }` | the provider's `sendEmail` succeeded            |
| `email.receive`  | `Email`                          | `waitForEmail` matched an incoming email         |
| `email.read`     | `{ id, body }`                   | an email body was read via `readEmail`           |
| `email.find`     | `Email[]`                        | `findEmail` returned at least one match          |

```ts
const mailpit = new Mailpit();
mailpit.on("email.receive", (email) => console.log("got:", email.subject));
const email = await mailpit.waitForEmail({ subject: /verify/i });
```

## Sending via SMTP (nodemailer)

`NodemailerSender` wraps a nodemailer transport — pass SMTP options or an existing `Transporter`:

```ts
import { NodemailerSender, fragment, h1 } from "@playwright-labs/email-core";

const sender = new NodemailerSender({ host: "localhost", port: 1025 });
const { messageId } = await sender.sendEmail({
  from: "Tester <test@example.com>",
  to: ["a@example.com", "b@example.com"],
  cc: "c@example.com",
  subject: "Report",
  body: fragment(h1("Hi")), // HTML; optional `text` fallback
  attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
});
await sender.verify(); // optional connection check
sender.close();
```

`attachments` follow the nodemailer [`Attachment`](https://nodemailer.com/message/attachments) shape (`filename`, `content`, `path`, `cid`, ...).

## Email readers

Every `Email` returned by `findEmail` / `waitForEmail` carries bound body readers — they fetch the body lazily via the provider's `readEmail`:

```ts
const email = await mailpit.waitForEmail({ subject: /verify/i });

const html = await email.readAsString();   // body as string (HTML preferred)
const bytes = await email.readAsBytes();   // body as Buffer
for await (const chunk of email.readAsStream()) {
  // body as a Readable stream
}
```

Providers build them with the exported `emailReaders(read)` helper — spread it into the email object your `findEmail` returns.

## Installation

```bash
npm i @playwright-labs/email-core
```

## Providers

Each provider lives in its own file and is importable via a subpath export:

| Subpath                                    | Client    | Notes                                             |
| ------------------------------------------ | --------- | ------------------------------------------------- |
| `@playwright-labs/email-core/providers/gmail`   | `Gmail`   | Gmail API (OAuth2), MIME send via nodemailer      |
| `@playwright-labs/email-core/providers/mailpit` | `Mailpit` | Mailpit HTTP API — find/read/send/delete/markRead |

```ts
import { Gmail } from "@playwright-labs/email-core/providers/gmail";
import { Mailpit } from "@playwright-labs/email-core/providers/mailpit";
```

The providers are re-exported by their fixture packages (`@playwright-labs/fixture-gmail`, `@playwright-labs/fixture-mailpit`) together with the `test`/`expect` fixtures — use the fixture packages in tests, and the subpath exports when you need a standalone client.

## Usage

Extend `EmailProvider` to build your own provider client:

```ts
import { EmailProvider, type Email, type FindEmailOptions } from "@playwright-labs/email-core";

class MyProvider extends EmailProvider {
  async findEmail(options?: FindEmailOptions) { /* ... */ }
  async readEmail(emailId: string) { /* ... */ }
  async markAsRead(emailId: string) { /* ... */ }
}

const provider = new MyProvider();
const email = await provider.waitForEmail({ subject: /verify/i });
const [confirmUrl] = await provider.getEmailLinks(email.id);
```

## License

MIT
