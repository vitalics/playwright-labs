import nodemailer, { type SentMessageInfo, type Transporter } from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * Attachment for {@link NodemailerSender.sendEmail}. Re-exported from
 * nodemailer — supports `filename`, `content` (string | Buffer | base64),
 * `path`, `href`, `contentType`, `encoding` and `cid` for inline images.
 */
export type NodemailerAttachment = Attachment;

/**
 * SMTP transport options for {@link NodemailerSender} (`host`, `port`,
 * `secure`, `auth`, ...). Re-exported from nodemailer.
 */
export type NodemailerTransportOptions = SMTPTransport.Options;

/** Options for {@link NodemailerSender.sendEmail}. */
export type NodemailerSendOptions = {
  /** Sender address (plain or `"Name <email@example.com>"`). */
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  /** HTML body. Compose it with the `h1`/`table`/... primitives exported from this package. */
  body: string;
  /** Optional plain-text alternative. */
  text?: string;
  attachments?: NodemailerAttachment[];
};

/** Result of {@link NodemailerSender.sendEmail}. */
export type NodemailerSendResult = {
  /** RFC 5322 `Message-ID` of the sent message. */
  messageId: string;
};

/**
 * Provider-agnostic email sender built on nodemailer — the SMTP counterpart
 * of the provider clients.
 *
 * Pass plain SMTP options (a transport is created internally) or an existing
 * nodemailer `Transporter` (useful for custom transports and for tests).
 *
 * @example
 * ```ts
 * const sender = new NodemailerSender({ host: "localhost", port: 1025 });
 * await sender.sendEmail({
 *   from: "Tester <test@example.com>",
 *   to: "user@example.com",
 *   subject: "Report",
 *   body: fragment(h1("Hi"), table(tbody(tr(td("it works"))))),
 *   attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
 * });
 * ```
 */
export class NodemailerSender {
  #transporter: Transporter;

  constructor(options: NodemailerTransportOptions | Transporter) {
    this.#transporter =
      typeof (options as Transporter).sendMail === "function"
        ? (options as Transporter)
        : nodemailer.createTransport(options);
  }

  /**
   * Send an email through the configured transport.
   *
   * @returns the `Message-ID` assigned to the sent message.
   */
  async sendEmail(options: NodemailerSendOptions): Promise<NodemailerSendResult> {
    const info: SentMessageInfo = await this.#transporter.sendMail({
      from: options.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: options.body,
      text: options.text,
      attachments: options.attachments,
    });
    return { messageId: info.messageId };
  }

  /**
   * Verify the SMTP connection configuration (delegates to
   * nodemailer's `transporter.verify()`).
   *
   * @throws when the connection or authentication fails.
   */
  async verify(): Promise<void> {
    await this.#transporter.verify();
  }

  /**
   * Close the underlying transport (only relevant for pooled transports).
   */
  close(): void {
    this.#transporter.close();
  }
}
