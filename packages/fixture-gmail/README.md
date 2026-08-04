# Playwright Gmail support

Gmail fixture for Playwright/test — find, read and send emails straight from your tests via the [Gmail API](https://developers.google.com/gmail/api).

```ts
test("someTest", async ({ gmail }) => {
  const emails = await gmail.findEmail({ subject: /qwe/ });
  expect(emails).not.toBeNull();

  const body = await gmail.readEmail(emails![0].id);
  expect(body).toContain("123456");
});
```

## Installation

```bash
npm i -D @playwright/test @playwright-labs/fixture-gmail
```

```bash
pnpm add -D @playwright/test @playwright-labs/fixture-gmail
```

```bash
yarn add -D @playwright/test @playwright-labs/fixture-gmail
```

## Authentication

The client talks to the Gmail API with an OAuth2 access token. Two setups are supported:

1. **Refresh token (recommended)** — the client exchanges it for a short-lived access token and caches it:
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
2. **Static access token** — used as-is (expires in ~1 hour, fine for local runs):
   - `GMAIL_ACCESS_TOKEN`

To get a refresh token: create a Google Cloud project, enable the **Gmail API**, create OAuth2 credentials (web application), then authorize the `https://mail.google.com/` scope (e.g. via the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) with your own client id/secret) and exchange the authorization code for tokens.

Values can also be passed directly via options:

```ts
const gmail = useGmail({ clientId, clientSecret, refreshToken });
// or
const gmail = useGmail({ accessToken });
```

## Fixture

- `gmail: Gmail` — ready-to-use client configured from the `GMAIL_*` env variables.
- `useGmail(options?: GmailOptions): Gmail` — factory for a client with custom options.

```ts
import { test, expect } from "@playwright-labs/fixture-gmail";

test("custom client", async ({ useGmail }) => {
  const gmail = useGmail({ accessToken: process.env.SECOND_ACCOUNT_TOKEN });
  await gmail.sendEmail({ to: "a@b.c", subject: "hi", body: "<h1>hello</h1>" });
});
```

## API

### `findEmail(options?): Promise<Email[] | null>`

Searches the mailbox and returns matching emails (newest first) or `null` when nothing matches.

| Option    | Type                | Description                                                                 |
| --------- | ------------------- | --------------------------------------------------------------------------- |
| `subject` | `string \| RegExp`  | String -> Gmail query `subject:"..."`, `RegExp` -> client-side header filter |
| `from`    | `string \| RegExp`  | Sender filter (same rules as `subject`)                                      |
| `to`      | `string \| RegExp`  | Recipient filter (same rules as `subject`)                                   |
| `query`   | `string`            | Raw Gmail search query, e.g. `"newer_than:1h has:attachment"`                |
| `unread`  | `boolean`           | Adds `is:unread` to the query                                                |
| `limit`   | `number`            | Max messages to inspect (default `10`)                                       |

`Email` contains `id`, `threadId`, `subject`, `from`, `to`, `date` and `snippet`.

### `readEmail(emailId, options?): Promise<string>`

Returns the decoded body of a message. HTML is preferred by default; pass `{ format: "text" }` for plain text. Falls back to the other format when the preferred part is absent.

### `sendEmail(options): Promise<{ id, threadId }>`

```ts
await gmail.sendEmail({
  to: ["a@example.com", "b@example.com"],
  cc: "c@example.com",
  bcc: "d@example.com",
  subject: "Test report",
  body, // HTML string
  attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
});
```

`attachments` follow the nodemailer [`Attachment`](https://nodemailer.com/message/attachments) shape — `filename`, `content` (string | Buffer | base64), `path`, `href`, `contentType`, and `cid` for inline images.

## Body primitives

The package re-exports the same string HTML primitives as `@playwright-labs/reporter-email` — every helper returns a string, so they compose by plain nesting:

`h`, `fragment`, `html`, `head`, `title`, `body`, `div`, `p`, `a`, `img`, `ul`, `li`, `table`, `thead`, `tbody`, `tr`, `td`, `th`, `h1`–`h6`, `br`, `hr`.

```ts
import { div, fragment, h1, table, tbody, td, thead, tr, img } from "@playwright-labs/fixture-gmail";

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

await gmail.sendEmail({
  to: "team@example.com",
  subject: "Report",
  body,
  attachments: [{ path: "./logo.png", cid: "logo" }],
});
```

## License

MIT
