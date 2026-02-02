import nodemailer, { type TransportOptions } from "nodemailer";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Attachment } from "nodemailer/lib/mailer";

type AuthWithOAuth2 = {
  user: string;
  pass: string;
  type: "OAuth2";
  accessToken: string;
  expires?: string;
};
type Email = `${string}@${string}.${string}`;
type EmailWithName = `"${string}" <${Email}>`;

/** Array of the test cases with its results. This is Array of Array because it helps to organize tables */
export type NodemailerTestCases = [test: TestCase, result: TestResult][];

export type NodemailerReporterOptions = {
  /**
   * When to send email.
   * @default 'on-failure'
   */
  send?: "always" | "never" | "on-failure";
  /**
   * Recipient email address.
   * @example "john.doe@example.com"
   */
  to: Email | Email[] | (string & {}) | string[];
  /**
   * CC email address.
   * @example "john.doe@example.com"
   */
  cc?: Email | Email[] | (string & {}) | string[];
  /**
   * BCC email address.
   * @example "john.doe@example.com"
   */
  bcc?: Email | Email[] | (string & {}) | string[];
  /**
   * is use secure(https).
   * @default true
   */
  secure?: boolean;
  /**
   * Sender email address.
   * @example
   * "John Doe <john.doe@example.com>"
   * @example
   * "reporter@example.com"
   */
  from: EmailWithName | Email | (string & {});
  host?: string;
  port?: number;
  /** @see {@link https://nodemailer.com/smtp/well-known-services#list-of-builtin-services nodemailer built-in services} supported services */
  service?:
    | "1und1"
    | "126"
    | "163"
    | "Aliyun"
    | "AliyunQiye"
    | "AOL"
    | "Bluewin"
    | "DebugMail"
    | "DynectEmail"
    | "Ethereal"
    | "FastMail"
    | "Feishu"
    | "Forward"
    | "GandiMail"
    | "Gmail"
    | "Godaddy"
    | "GodaddyAsia"
    | "GodaddyEurope"
    | "hot"
    | "Hotmail"
    | "iCloud"
    | "Infomaniak"
    | "Loopia"
    | "mail"
    | "Mail"
    | "Mailcatch"
    | "Maildev"
    | "Mailgun"
    | "Mailjet"
    | "Mailosaur"
    | "Mailtrap"
    | "Mandrill"
    | "Naver"
    | "One"
    | "OpenMailBox"
    | "OhMySMTP"
    | "Outlook365"
    | "Postmark"
    | "Proton"
    | "qiye"
    | "QQ"
    | "QQex"
    | "SendCloud"
    | "SendGrid"
    | "SendinBlue"
    | "SendPulse"
    | "SES"
    | "SES-US-EAST-1"
    | "SES-US-WEST-2 "
    | "SES-EU-WEST-1"
    | "SES-AP-SOUTH-1"
    | "SES-AP-NORTHEAST-1"
    | "SES-AP-NORTHEAST-2"
    | "SES-AP-NORTHEAST-3"
    | "SES-AP-SOUTHEAST-1"
    | "SES-AP-SOUTHEAST-2AWS"
    | "Seznam"
    | "Sparkpost"
    | "Tipimail"
    | "Yahoo"
    | "Yandex"
    | "Zoho";
  auth?:
    | {
        user: string;
        pass: string;
      }
    | AuthWithOAuth2
    // todo: improve types
    | Record<string, string>;
  headers?:
    | {
        [key: string]: string;
      }
    | Headers;
  /**
   * Array of attachments to be sent with the email.
   * @example
   *  // 1. Plain text
   * {
   *   filename: "hello.txt",
   *   content: "Hello world!",
   * },
   *
   * // 2. Binary (Buffer)
   * {
   *   filename: "buffer.txt",
   *   content: Buffer.from("Hello world!", "utf8"),
   * },
   *
   * // 3. Local file (streamed)
   * {
   *   filename: "report.pdf",
   *   path: "/absolute/path/to/report.pdf",
   * },
   *
   * // 4. Implicit filename & type (derived from path)
   * {
   *   path: "/absolute/path/to/image.png",
   * },
   *
   * // 5. Readable stream
   * {
   *   filename: "notes.txt",
   *   content: fs.createReadStream("./notes.txt"),
   * },
   *
   * // 6. Custom content‑type
   * {
   *   filename: "data.bin",
   *   content: Buffer.from("deadbeef", "hex"),
   *   contentType: "application/octet-stream",
   * },
   *
   * // 7. Remote file
   * {
   *   filename: "license.txt",
   *   href: "https://raw.githubusercontent.com/nodemailer/nodemailer/master/LICENSE",
   * },
   *
   * // 8. Base64‑encoded string
   * {
   *   filename: "photo.jpg",
   *   content: "/9j/4AAQSkZJRgABAQAAAQABAAD…", // truncated
   *   encoding: "base64",
   * },
   *
   * // 9. Data URI
   * {
   *   path: "data:text/plain;base64,SGVsbG8gd29ybGQ=",
   * },
   *
   * // 10. Pre‑built MIME node
   * {
   *   raw: ["Content-Type: text/plain; charset=utf-8", 'Content-Disposition: attachment; filename="greeting.txt"', "", "Hello world!"].join("\r\n"),
   * },
   */
  attachments?: Attachment[];
  /**
   * Email subject of the email. it can be static and dynamic
   * @example
   * // static subject
   * "Playwright report for test run"
   * @example
   * // dynamic subject
   * (result) => `Playwright report for test run - ${result.status}`
   */
  subject: string | ((result: FullResult) => string);
  /**
   * This function is called when the email is sent. Its not emits if email is not sent (e.g. when `send:"never"`)
   * @param info
   * @returns
   */
  onEmailSend?: (info: SMTPTransport.SentMessageInfo) => void | Promise<void>;
} & (
  | {
      /** text representation of the test results. We highly recommend to use HTML instead of plain text. */
      text:
        | string
        | ((
            result: FullResult,
            testCases: NodemailerTestCases,
          ) => string | Promise<string>);
    }
  | {
      /**
       * An HTML Representation of the test results. You can use testCases info to build tables and lists of the results dynamically
       * @example
       * // attachments example
       * attachments: [
       *   {
       *     filename: 'logo.png',
       *     path: './assets/logo.png',
       *     cid: 'logo@something'
       *   }
       * ],
       * html: '<p><img src="cid:logo@something" alt="Smth logo"></p>'
       * @example
       * // table example
       * html: (result, testCases) => `
       * <table>
       * <thead>
       *  <tr>
       *    <th>Test</th>
       *    <th>Status</th>
       *  </tr>
       * </thead>
       * <tbody>
       * ${testCases.map((testCase, result) => `
       *  <tr>
       *    <td>${testCase.name}</td>
       *    <td>${result.status}</td>
       *  </tr>
       * `).join('')}
       * </tbody>
       * </table>`
       */
      html:
        | string
        | ((
            result: FullResult,
            testCases: NodemailerTestCases,
          ) => string | Promise<string>);
    }
);

export default class EmailReporter implements Reporter {
  readonly #options: Readonly<NodemailerReporterOptions>;
  readonly #testCases: NodemailerTestCases = [];
  #html: string | null = null;
  #text: string | null = null;

  constructor(options: NodemailerReporterOptions) {
    this.#options = options;
  }

  async sendEmail(subject: string) {
    const transportOptions: Partial<NodemailerReporterOptions> = {
      host:
        this.#options.host ?? process.env.PLAYWRIGHT_EMAIL_HOST ?? undefined,
      port:
        this.#options.port ??
        Number(process.env.PLAYWRIGHT_EMAIL_PORT) ??
        undefined,
      secure: this.#options.secure ?? undefined, // true for 465, false for other ports
      auth: this.#options.auth ?? undefined,
      headers: this.#options.headers ?? undefined,
    };

    const transporter = nodemailer.createTransport(
      transportOptions as TransportOptions,
    );

    var to: string;
    if (Array.isArray(this.#options.to)) {
      to = this.#options.to.join(", ");
    } else if (typeof this.#options.to === "string") {
      to = this.#options.to;
    } else {
      throw new TypeError(
        `"to" option should be a string or an array of strings. Got ${typeof this.#options.to}`,
      );
    }
    var cc: string | undefined;
    if (Array.isArray(this.#options.cc)) {
      cc = this.#options.cc.join(", ");
    } else if (typeof this.#options.cc === "string") {
      cc = this.#options.cc;
    }

    var bcc: string | undefined;
    if (Array.isArray(this.#options.bcc)) {
      bcc = this.#options.bcc.join(", ");
    } else if (typeof this.#options.bcc === "string") {
      bcc = this.#options.bcc;
    }

    const info = await transporter.sendMail({
      from: this.#options.from,
      to: to,
      subject: subject,
      text: this.#text ?? undefined,
      html: this.#html ?? undefined,
      attachments: this.#options.attachments ?? undefined,
      cc: cc ?? undefined,
      bcc: bcc ?? undefined,
    });
    return info;
  }

  resolveSubject(result: FullResult) {
    var preparedSubject: string;
    if (typeof this.#options.subject === "function") {
      preparedSubject = this.#options.subject(result);
      if (typeof preparedSubject !== "string") {
        throw new TypeError(
          `"subject" function should return a string. Got ${typeof preparedSubject}`,
        );
      }
    } else if (typeof this.#options.subject === "string") {
      preparedSubject = this.#options.subject;
    } else {
      throw new TypeError(
        `Invalid subject type. Expected string or function. Got ${typeof this.#options.subject}`,
      );
    }
    return preparedSubject;
  }

  async resolveHtml(result: FullResult) {
    var preparedHtml: string;
    if ("html" in this.#options) {
      if (typeof this.#options.html === "function") {
        preparedHtml = await this.#options.html(result, this.#testCases);
        if (typeof preparedHtml !== "string") {
          throw new TypeError(
            `"html" function should return a string. Got ${typeof preparedHtml}`,
          );
        }
      } else if (typeof this.#options.html === "string") {
        preparedHtml = this.#options.html;
      } else {
        throw new TypeError(
          `Invalid html type. Expected string or function. Got ${typeof this.#options.html}`,
        );
      }
      this.#html = preparedHtml;
    }
  }

  async resolveText(result: FullResult) {
    var preparedText: string;
    if ("text" in this.#options) {
      if (typeof this.#options.text === "function") {
        preparedText = await this.#options.text(result, this.#testCases);
        if (typeof preparedText !== "string") {
          throw new TypeError(
            `"text" function should return a string. Got ${typeof preparedText}`,
          );
        }
      } else if (typeof this.#options.text === "string") {
        preparedText = this.#options.text;
      } else {
        throw new TypeError(
          `Invalid text type. Expected string or function. Got ${typeof this.#options.text}`,
        );
      }
      this.#text = preparedText;
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.#testCases.push([test, result]);
  }

  async onEnd(
    result: FullResult,
  ): Promise<{ status?: FullResult["status"] } | undefined> {
    const send = this.#options.send ?? "on-failure";
    if (send === "never") {
      return;
    }

    const subject = this.resolveSubject(result);
    await Promise.all([this.resolveHtml(result), this.resolveText(result)]);
    let info: SMTPTransport.SentMessageInfo | null = null;
    if (send === "on-failure" && result.status === "failed") {
      info = await this.sendEmail(subject);
    }

    if (send === "always") {
      info = await this.sendEmail(subject);
    }
    if (
      this.#options.onEmailSend &&
      typeof this.#options.onEmailSend === "function" &&
      info !== null
    ) {
      await this.#options.onEmailSend(info);
    }
  }
}
