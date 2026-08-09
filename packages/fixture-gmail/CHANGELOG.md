# @playwright-labs/fixture-gmail

## 0.3.0

### Minor Changes

- 65be558: Add `waitForEmail`, `getEmailLinks` and `markAsRead`:
  - `waitForEmail({ subject, from, to, query, unread, limit, timeout, interval })` — polls `findEmail` until at least one email matches (default 30s timeout, 1s interval) and returns the newest matching email; throws when nothing matches within the timeout.
  - `getEmailLinks(id)` — reads the email's HTML body and returns all unique `href` values, handy for confirmation/reset links.
  - `markAsRead(id)` — removes the `UNREAD` label via `users.messages.modify` (requires the `gmail.modify` scope).

  ```ts
  const email = await gmail.waitForEmail({
    to: user.email,
    subject: /verify/i,
  });
  const [confirmUrl] = await gmail.getEmailLinks(email.id);
  await page.goto(confirmUrl!);
  ```

  Internal: the `Gmail` client and the shared email primitives (`EmailProvider` base class, `Email`/`FindEmailOptions`/... types, HTML body builders) now live in the new `@playwright-labs/email-core` package (`@playwright-labs/email-core/providers/gmail`) and are re-exported from here — the public API keeps working as before.

### Patch Changes

- Updated dependencies [65be558]
  - @playwright-labs/email-core@1.0.0

## 0.2.0

### Minor Changes

- 7f21ad1: Initial release of the Gmail fixture package. Provides the `gmail` fixture and `useGmail` factory — find (`findEmail` with string/RegExp filters), read (`readEmail`) and send (`sendEmail`) emails via the Gmail API straight from tests, plus string HTML body primitives (`h1`–`h6`, `table`, `div`, `img`, ...) shared with `reporter-email`.
