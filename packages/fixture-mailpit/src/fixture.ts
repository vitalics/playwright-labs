import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { Mailpit, type MailpitOptions } from "@playwright-labs/email-core/providers/mailpit";

export type Fixture = {
  /**
   * Factory that creates a `Mailpit` client with custom options.
   * Call it inside a test when you need a server other than
   * the `MAILPIT_*` environment variables / `http://localhost:8025`.
   *
   * @example
   * ```ts
   * test('custom client', async ({ useMailpit }) => {
   *   const mailpit = useMailpit({ baseUrl: 'http://mailpit:8025' })
   *   await mailpit.sendEmail({ to: 'a@b.c', subject: 'hi', body: h1('hello') })
   * })
   * ```
   */
  useMailpit(options?: MailpitOptions): Mailpit;

  /**
   * A ready-to-use `Mailpit` client configured from the
   * `MAILPIT_API_URL` / `MAILPIT_USERNAME` / `MAILPIT_PASSWORD` / `MAILPIT_FROM`
   * environment variables (defaults to `http://localhost:8025`).
   *
   * @example
   * ```ts
   * test('someTest', async ({ mailpit }) => {
   *   const emails = await mailpit.findEmail({ subject: /qwe/ })
   *   expect(emails).not.toBeNull()
   *   const body = await mailpit.readEmail(emails![0].id)
   *   expect(body).toContain('123456')
   * })
   * ```
   */
  mailpit: Mailpit;
};

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useMailpit: async ({}, use) => {
    await use((options?: MailpitOptions) => new Mailpit(options));
  },

  mailpit: async ({ useMailpit }, use) => {
    await use(useMailpit());
  },
});

export const expect = baseExpect.extend({});
