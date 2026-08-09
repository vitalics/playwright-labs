# Playwright Mailpit support

Mailpit fixture for Playwright/test — find, read, send and delete emails straight from your tests via the [Mailpit API](https://mailpit.axllent.org/docs/api-v1/).

```ts
test("someTest", async ({ mailpit }) => {
  const email = await mailpit.waitForEmail({ subject: /verification/i });

  const [confirmUrl] = await mailpit.getEmailLinks(email.id);
  await page.goto(confirmUrl!);
});
```

## Installation

```bash
npm i -D @playwright/test @playwright-labs/fixture-mailpit
```

```bash
pnpm add -D @playwright/test @playwright-labs/fixture-mailpit
```

```bash
yarn add -D @playwright/test @playwright-labs/fixture-mailpit
```

## Configuration

The client talks to the Mailpit HTTP API. Everything falls back to environment variables:

| Option     | Env variable      | Default                   | Description                                    |
| ---------- | ----------------- | ------------------------- | ---------------------------------------------- |
| `baseUrl`  | `MAILPIT_API_URL` | `http://localhost:8025`   | Mailpit HTTP API base URL                      |
| `username` | `MAILPIT_USERNAME` | —                         | Basic auth username (when UI auth is enabled)  |
| `password` | `MAILPIT_PASSWORD` | —                         | Basic auth password                            |
| `from`     | `MAILPIT_FROM`    | `playwright@mailpit.local` | Default sender address for `sendEmail`         |

Run Mailpit locally with Docker:

```bash
docker run -d -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Values can also be passed directly via options:

```ts
const mailpit = useMailpit({ baseUrl: "http://mailpit:8025", username, password });
```

## Fixture

- `mailpit: Mailpit` — ready-to-use client configured from the `MAILPIT_*` env variables.
- `useMailpit(options?: MailpitOptions): Mailpit` — factory for a client with custom options.

```ts
import { test, expect } from "@playwright-labs/fixture-mailpit";

test.beforeEach(async ({ mailpit }) => {
  await mailpit.deleteEmails(); // clean mailbox between tests
});
```

## API

### `findEmail(options?): Promise<Email[] | null>`

Searches the mailbox and returns matching emails (newest first) or `null` when nothing matches.

| Option    | Type               | Description                                                                                     |
| --------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `subject` | `string \| RegExp` | String -> Mailpit query `subject:"..."`, `RegExp` -> client-side filter                          |
| `from`    | `string \| RegExp` | Sender filter (same rules as `subject`)                                                          |
| `to`      | `string \| RegExp` | Recipient filter (same rules as `subject`)                                                       |
| `query`   | `string`           | Raw Mailpit [search query](https://mailpit.axllent.org/docs/usage/search-filters/), e.g. `"has:attachment"` |
| `unread`  | `boolean`          | Adds `is:unread` to the query                                                                    |
| `limit`   | `number`           | Max messages to inspect (default `10`)                                                           |

`Email` contains `id`, `messageId`, `subject`, `from`, `to`, `date`, `snippet` and `read` — plus bound body readers: `email.readAsString()`, `email.readAsBytes()` and `email.readAsStream()`.

### `waitForEmail(options?): Promise<Email>`

Polls `findEmail` until at least one email matches and returns the newest one. Accepts all `findEmail` options plus `timeout` (default `30000` ms) and `interval` (default `1000` ms). Throws when nothing matches within the timeout.

```ts
const email = await mailpit.waitForEmail({ to: user.email, subject: /verify/i });
```

### `readEmail(emailId, options?): Promise<string>`

Returns the body of a message — HTML by default; pass `{ format: "text" }` for plain text. Falls back to the other format when the preferred part is absent. The special id `"latest"` reads the most recent message. Note: Mailpit marks the message as read when it is fetched.

### `getEmailLinks(emailId): Promise<string[]>`

Reads the email's HTML body and returns all unique `href` values — handy for confirmation/reset links:

```ts
const [confirmUrl] = await mailpit.getEmailLinks(email.id);
await page.goto(confirmUrl!);
```

### `sendEmail(options): Promise<{ id }>`

Sends a message via the Mailpit HTTP send API (`POST /api/v1/send`).

```ts
await mailpit.sendEmail({
  to: ["a@example.com", "b@example.com"],
  cc: "c@example.com",
  bcc: "d@example.com",
  from: "Tester <test@example.com>", // optional, falls back to the client's `from`
  subject: "Test report",
  body, // HTML string
  attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
});
```

Attachments accept `content` (string | Buffer, base64-encoded automatically) or a local file `path`, plus `contentType` and `cid` for inline images.

### `deleteEmails(ids?): Promise<void>`

Deletes the given message ids — or **all** messages when called without arguments.

### `markAsRead(emailId): Promise<void>`

Marks a message as read (`PUT /api/v1/messages` with `Read: true`).

## Body primitives

The package re-exports the same string HTML primitives as `@playwright-labs/reporter-email` — every helper returns a string, so they compose by plain nesting:

`h`, `fragment`, `html`, `head`, `title`, `body`, `div`, `p`, `a`, `img`, `ul`, `li`, `table`, `thead`, `tbody`, `tr`, `td`, `th`, `h1`–`h6`, `br`, `hr`.

```ts
import { div, fragment, h1, table, tbody, td, thead, tr, img } from "@playwright-labs/fixture-mailpit";

const body = div(
  fragment(
    h1("Playwright Test Report"),
    table(
      fragment(
        thead(tr(fragment(td("Test"), td("Status")))),
        tbody(tr(fragment(td("login.spec.ts"), td("passed")))),
      ),
    ),
    img({ src: "cid:logo" }), // inline image from attachments
  ),
);

await mailpit.sendEmail({
  to: "team@example.com",
  subject: "Report",
  body,
  attachments: [{ path: "./logo.png", cid: "logo" }],
});
```

## License

MIT
