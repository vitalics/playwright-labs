# @playwright-labs/fixture-mailpit

## 0.1.0

### Minor Changes

- 65be558: Initial release of the Mailpit fixture package — find, read, send and delete emails straight from tests via the [Mailpit API](https://mailpit.axllent.org/docs/api-v1/):
  - `mailpit` fixture and `useMailpit(options)` factory, configured from the `MAILPIT_API_URL` / `MAILPIT_USERNAME` / `MAILPIT_PASSWORD` / `MAILPIT_FROM` env variables (defaults to `http://localhost:8025`, optional basic auth).
  - `findEmail({ subject, from, to, query, unread, limit })` — string filters are translated into a Mailpit search query, `RegExp` filters are applied client-side; returns `Email[] | null`.
  - `waitForEmail({ ..., timeout, interval })` — polls `findEmail` until a match (default 30s timeout) and returns the newest matching email.
  - `readEmail(id, { format })` — HTML by default, plain text on demand; supports the special `"latest"` id.
  - `getEmailLinks(id)` — extracts unique `href` values from an email's HTML body (confirmation/reset links).
  - `sendEmail({ to, cc, bcc, from, subject, body, attachments })` — sends via the Mailpit HTTP send API; attachment `content` (string | Buffer) and `path` files are base64-encoded automatically, `cid` for inline images.
  - `deleteEmails(ids?)` — deletes the given messages, or the whole mailbox when called without arguments.
  - `markAsRead(id)` — sets the read status via `PUT /api/v1/messages`.
  - String HTML body primitives (`h1`–`h6`, `table`, `div`, `img`, ...) shared with `reporter-email`.

  The `Mailpit` client and the shared email primitives (`EmailProvider` base class, common types, HTML body builders) come from `@playwright-labs/email-core` (`@playwright-labs/email-core/providers/mailpit`) and are re-exported.

  ```ts
  import { test, expect } from "@playwright-labs/fixture-mailpit";

  test("confirm email", async ({ mailpit, page }) => {
    const email = await mailpit.waitForEmail({
      to: user.email,
      subject: /verify/i,
    });
    const [confirmUrl] = await mailpit.getEmailLinks(email.id);
    await page.goto(confirmUrl!);
  });
  ```

### Patch Changes

- Updated dependencies [65be558]
  - @playwright-labs/email-core@1.0.0
