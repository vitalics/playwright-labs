import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { Gmail, type GmailOptions } from "./gmail";

export type Fixture = {
  /**
   * Factory that creates a `Gmail` client with custom options.
   * Call it inside a test when you need credentials other than
   * the `GMAIL_*` environment variables.
   *
   * @example
   * ```ts
   * test('custom client', async ({ useGmail }) => {
   *   const gmail = useGmail({ accessToken: process.env.OTHER_TOKEN })
   *   await gmail.sendEmail({ to: 'a@b.c', subject: 'hi', body: h1('hello') })
   * })
   * ```
   */
  useGmail(options?: GmailOptions): Gmail;

  /**
   * A ready-to-use `Gmail` client configured from the
   * `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`
   * (or `GMAIL_ACCESS_TOKEN`) environment variables.
   *
   * @example
   * ```ts
   * test('someTest', async ({ gmail }) => {
   *   const emails = await gmail.findEmail({ subject: /qwe/ })
   *   expect(emails).not.toBeNull()
   *   const body = await gmail.readEmail(emails![0].id)
   *   expect(body).toContain('123456')
   * })
   * ```
   */
  gmail: Gmail;
};

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useGmail: async ({}, use) => {
    await use((options?: GmailOptions) => new Gmail(options));
  },

  gmail: async ({ useGmail }, use) => {
    await use(useGmail());
  },
});

export const expect = baseExpect.extend({});
