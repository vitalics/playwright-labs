/**
 * Example Playwright config using the built-in PlaywrightReportEmail template.
 *
 * Prerequisites:
 *   pnpm install   (inside examples/)
 *   pnpm ci:pretest
 *
 * Start a local mail server to receive the report:
 *   docker run -p 1080:1080 -p 1025:1025 maildev/maildev
 *   open http://localhost:1080
 *
 * Preview the email template in the browser (no SMTP needed):
 *   pnpm email:preview
 */
import { defineConfig } from "@playwright/test";
import React from "react";
import { type ReporterOptions } from "@playwright-labs/reporter-email";
import PlaywrightReportEmail from "@playwright-labs/reporter-email/templates/base";

export default defineConfig({
  testDir: "./tests",

  reporter: [
    ["list"],

    [
      "@playwright-labs/reporter-email",
      {
        /**
         * Local Maildev — swap for your real SMTP service in CI.
         * @see https://nodemailer.com/smtp/well-known-services
         */
        service: "Maildev",
        port: 1025,

        from: "playwright@example.com",
        to: "team@example.com",

        /**
         * "always"    — send after every run (good for demos)
         * "on-failure" — send only when at least one test fails (recommended for CI)
         */
        send: "always",

        subject: (result) =>
          `[Playwright] ${result.status.toUpperCase()} — ${new Date().toLocaleDateString()}`,

        html: (result, testCases) =>
          React.createElement(PlaywrightReportEmail, { result, testCases }),
      } satisfies ReporterOptions,
    ],
  ],
});
