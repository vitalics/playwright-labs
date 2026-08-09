import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  type Email as BaseEmail,
  EmailProvider,
  emailReaders,
  filterEmails,
  type FindEmailOptions,
  type ReadEmailOptions,
} from "../email";

/**
 * Attachment for {@link Mailpit.sendEmail}.
 *
 * `content` is the raw file content (string or Buffer) — it is base64-encoded
 * automatically before sending. Alternatively pass `path` to read a local file.
 *
 * @example
 * ```ts
 * await mailpit.sendEmail({
 *   to: "user@example.com",
 *   subject: "Report",
 *   body: img({ src: "cid:logo" }),
 *   attachments: [{ path: "./logo.png", cid: "logo" }],
 * });
 * ```
 */
export type MailpitAttachment = {
  /** File name shown to the recipient. Defaults to the base name of `path`. */
  filename?: string;
  /** Raw file content (base64-encoded automatically). */
  content?: string | Buffer;
  /** Local file path — read and base64-encoded automatically. */
  path?: string;
  /** MIME content type. Auto-detected by Mailpit when omitted. */
  contentType?: string;
  /** Content-ID — when set, the file is attached inline (`<img src="cid:...">`). */
  cid?: string;
};

/**
 * Options for the {@link Mailpit} client and the `useMailpit` fixture factory.
 *
 * Every value falls back to an environment variable:
 * - `baseUrl` -> `MAILPIT_API_URL`
 * - `username` -> `MAILPIT_USERNAME`
 * - `password` -> `MAILPIT_PASSWORD`
 * - `from` -> `MAILPIT_FROM`
 */
export type MailpitOptions = {
  /**
   * Base URL of the Mailpit HTTP API.
   * Env: `MAILPIT_API_URL`.
   * @default "http://localhost:8025"
   */
  baseUrl?: string;
  /**
   * Basic auth username (required when Mailpit runs with UI basic auth).
   * Env: `MAILPIT_USERNAME`.
   */
  username?: string;
  /** Basic auth password. Env: `MAILPIT_PASSWORD`. */
  password?: string;
  /**
   * Default sender address for {@link Mailpit.sendEmail}
   * (a plain address or `"Name <email@example.com>"`).
   * Env: `MAILPIT_FROM`.
   * @default "playwright@mailpit.local"
   */
  from?: string;
};

/** A single email found by {@link Mailpit.findEmail}. */
export type Email = BaseEmail & {
  /** RFC 5322 `Message-ID` header. */
  messageId: string;
  /** Whether the message is marked as read. */
  read: boolean;
};

export type { FindEmailOptions, ReadEmailOptions };

/** Options for {@link Mailpit.sendEmail}. */
export type SendEmailOptions = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  /** Sender address. Falls back to the client's `from` option. */
  from?: string;
  subject: string;
  /** HTML body. Compose it with the `h1`/`table`/... primitives exported from this package. */
  body: string;
  attachments?: MailpitAttachment[];
};

/** Result of {@link Mailpit.sendEmail}. */
export type SendEmailResult = {
  /** Mailpit database id of the sent message. */
  id: string;
};

const DEFAULT_BASE_URL = "http://localhost:8025";
const DEFAULT_FROM = "playwright@mailpit.local";

type Address = { Address?: string; Name?: string };

type MessageSummary = {
  ID: string;
  MessageID?: string;
  Read?: boolean;
  Subject?: string;
  From?: Address;
  To?: Address[];
  Created?: string;
  Snippet?: string;
};

type MessagesSummary = {
  messages?: MessageSummary[];
  total?: number;
};

type Message = {
  ID: string;
  Subject?: string;
  Text?: string;
  HTML?: string;
};

function toAddress(value: string): { Email: string; Name?: string } {
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (match) {
    const name = match[1]?.trim();
    return { Email: match[2]!.trim(), ...(name ? { Name: name } : {}) };
  }
  return { Email: value.trim() };
}

function formatAddress(address: Address | undefined): string | undefined {
  if (!address?.Address) {
    return undefined;
  }
  return address.Name ? `${address.Name} <${address.Address}>` : address.Address;
}

function formatAddresses(addresses: Address[] | undefined): string | undefined {
  const formatted = (addresses ?? []).map(formatAddress).filter(Boolean);
  return formatted.length ? formatted.join(", ") : undefined;
}

function toArray(addresses: string | string[] | undefined): string[] {
  if (!addresses) {
    return [];
  }
  return Array.isArray(addresses) ? addresses : [addresses];
}

/**
 * Minimal Mailpit API client used by the `mailpit` fixture.
 *
 * Covers the operations a test usually needs:
 * - {@link findEmail} — search the mailbox (`GET /api/v1/search` / `GET /api/v1/messages`)
 * - {@link readEmail} — read a message body (`GET /api/v1/message/{ID}`)
 * - {@link sendEmail} — send a message (`POST /api/v1/send`)
 * - {@link deleteEmails} — clean up the mailbox (`DELETE /api/v1/messages`)
 * - {@link markAsRead} — set read status (`PUT /api/v1/messages`)
 *
 * `waitForEmail` / `getEmailLinks` are inherited from `EmailProvider`
 * (`@playwright-labs/email-core`).
 *
 * Can also be used without the fixture:
 * ```ts
 * const mailpit = new Mailpit({ baseUrl: "http://localhost:8025" });
 * ```
 */
export class Mailpit extends EmailProvider<Email> {
  #baseUrl: string;
  #auth?: string;
  #from: string;

  constructor(options: MailpitOptions = {}) {
    super();
    this.#baseUrl = (
      options.baseUrl ??
      process.env.MAILPIT_API_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/+$/, "");
    const username = options.username ?? process.env.MAILPIT_USERNAME;
    const password = options.password ?? process.env.MAILPIT_PASSWORD;
    if (username !== undefined || password !== undefined) {
      this.#auth = Buffer.from(`${username ?? ""}:${password ?? ""}`).toString("base64");
    }
    this.#from = options.from ?? process.env.MAILPIT_FROM ?? DEFAULT_FROM;
  }

  /**
   * Find emails in the mailbox.
   *
   * String filters are translated into a Mailpit search query, `RegExp` filters
   * are applied client-side to the message summaries.
   *
   * @returns matching emails (newest first, up to `limit`) or `null` when nothing matches.
   * @example
   * ```ts
   * const emails = await mailpit.findEmail({ subject: /qwe/ });
   * ```
   */
  async findEmail(options: FindEmailOptions = {}): Promise<Email[] | null> {
    const { subject, from, to, query, unread, limit = 10 } = options;

    const queryParts: string[] = [];
    if (typeof subject === "string") {
      queryParts.push(`subject:"${subject}"`);
    }
    if (typeof from === "string") {
      queryParts.push(`from:${from}`);
    }
    if (typeof to === "string") {
      queryParts.push(`to:${to}`);
    }
    if (unread) {
      queryParts.push("is:unread");
    }
    if (query) {
      queryParts.push(query);
    }

    const list = queryParts.length
      ? await this.#request<MessagesSummary>("GET", "/api/v1/search", {
          query: { query: queryParts.join(" "), limit },
        })
      : await this.#request<MessagesSummary>("GET", "/api/v1/messages", {
          query: { limit },
        });
    if (!list.messages?.length) {
      return null;
    }

    const emails = list.messages.slice(0, limit).map((message) => ({
      id: message.ID,
      messageId: message.MessageID ?? "",
      subject: message.Subject,
      from: formatAddress(message.From),
      to: formatAddresses(message.To),
      date: message.Created,
      snippet: message.Snippet ?? "",
      read: message.Read ?? false,
      ...emailReaders((options) => this.readEmail(message.ID, options)),
    }));

    const filtered = filterEmails(emails, { subject, from, to });

    if (filtered.length) {
      this.emit("email.find", filtered);
    }
    return filtered.length ? filtered : null;
  }

  /**
   * Read the body of an email by its id (see {@link findEmail}).
   * The special id `"latest"` returns the most recent message.
   *
   * Emits the `"email.read"` event.
   *
   * Note: Mailpit marks the message as read when it is fetched.
   *
   * @returns message body — HTML by default, plain text when `format: "text"`
   * or when the message has no HTML part. Empty string when there is no body.
   */
  async readEmail(emailId: string, options: ReadEmailOptions = {}): Promise<string> {
    const format = options.format ?? "html";
    const message = await this.#request<Message>(
      "GET",
      `/api/v1/message/${encodeURIComponent(emailId)}`,
    );
    const text = message.Text ?? "";
    const html = message.HTML ?? "";
    const body = format === "html" ? html || text : text || html;
    this.emit("email.read", { id: emailId, body });
    return body;
  }

  /**
   * Mark a message as read (`PUT /api/v1/messages` with `Read: true`).
   */
  async markAsRead(emailId: string): Promise<void> {
    await this.#request<string>("PUT", "/api/v1/messages", {
      body: { IDs: [emailId], Read: true },
    });
  }

  /**
   * Send an email through the Mailpit HTTP send API.
   *
   * `body` is sent as HTML — compose it with the exported primitives
   * (`h1`, `h2`, `table`, `div`, `p`, `img`, ...). Attachment `content`
   * (string | Buffer) and `path` files are base64-encoded automatically;
   * use `cid` for inline images.
   *
   * @example
   * ```ts
   * await mailpit.sendEmail({
   *   to: ["a@example.com", "b@example.com"],
   *   cc: "c@example.com",
   *   subject: "Hello from test",
   *   body: fragment(h1("Hi"), table(tbody(tr(td("it works"))))),
   *   attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
   * });
   * ```
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const attachments = await Promise.all(
      (options.attachments ?? []).map(async (attachment) => {
        const content =
          attachment.content ?? (attachment.path ? await readFile(attachment.path) : "");
        const filename =
          attachment.filename ?? (attachment.path ? basename(attachment.path) : undefined);
        if (!filename) {
          throw new Error(
            "fixture-mailpit: attachment `filename` is required when `path` is not set",
          );
        }
        return {
          Filename: filename,
          Content: Buffer.from(content).toString("base64"),
          ...(attachment.contentType ? { ContentType: attachment.contentType } : {}),
          ...(attachment.cid ? { ContentID: attachment.cid } : {}),
        };
      }),
    );

    const result = await this.#request<{ ID: string }>("POST", "/api/v1/send", {
      body: {
        From: toAddress(options.from ?? this.#from),
        To: toArray(options.to).map(toAddress),
        Cc: toArray(options.cc).map(toAddress),
        Bcc: toArray(options.bcc),
        Subject: options.subject,
        HTML: options.body,
        ...(attachments.length ? { Attachments: attachments } : {}),
      },
    });
    this.emit("email.send", {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      id: result.ID,
    });
    return { id: result.ID };
  }

  /**
   * Delete messages from the mailbox.
   *
   * @param ids database ids to delete. When omitted (or empty) **all** messages are deleted.
   * @example
   * ```ts
   * test.beforeEach(async ({ mailpit }) => {
   *   await mailpit.deleteEmails();
   * });
   * ```
   */
  async deleteEmails(ids?: string[]): Promise<void> {
    await this.#request<string>("DELETE", "/api/v1/messages", {
      body: ids?.length ? { IDs: ids } : {},
    });
  }

  async #request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.#baseUrl}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.append(key, String(value));
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...(this.#auth ? { authorization: `Basic ${this.#auth}` } : {}),
        ...(options.body ? { "content-type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      throw new Error(
        `fixture-mailpit: Mailpit API ${method} ${path} failed (${response.status}): ${await response.text()}`,
      );
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  }
}
