import {
  type Email as BaseEmail,
  EmailProvider,
  emailReaders,
  filterEmails,
  type FindEmailOptions,
  type ReadEmailOptions,
} from "../email";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import type { Attachment } from "nodemailer/lib/mailer";

/**
 * Attachment for {@link Gmail.sendEmail}. Re-exported from nodemailer —
 * supports `filename`, `content` (string | Buffer | base64), `path`, `href`,
 * `contentType`, `encoding` and `cid` for inline images.
 *
 * @example
 * ```ts
 * await gmail.sendEmail({
 *   to: "user@example.com",
 *   subject: "Report",
 *   body: img({ src: "cid:logo" }),
 *   attachments: [{ path: "./logo.png", cid: "logo" }],
 * });
 * ```
 */
export type GmailAttachment = Attachment;

/**
 * Options for the {@link Gmail} client and the `useGmail` fixture factory.
 *
 * Every value falls back to an environment variable:
 * - `clientId` -> `GMAIL_CLIENT_ID`
 * - `clientSecret` -> `GMAIL_CLIENT_SECRET`
 * - `refreshToken` -> `GMAIL_REFRESH_TOKEN`
 * - `accessToken` -> `GMAIL_ACCESS_TOKEN`
 *
 * Either `accessToken` alone or the full OAuth2 trio
 * (`clientId` + `clientSecret` + `refreshToken`) is required.
 */
export type GmailOptions = {
  /** OAuth2 client id. Env: `GMAIL_CLIENT_ID`. */
  clientId?: string;
  /** OAuth2 client secret. Env: `GMAIL_CLIENT_SECRET`. */
  clientSecret?: string;
  /** OAuth2 refresh token with the `gmail.modify`/`gmail.readonly` + `gmail.send` scopes. Env: `GMAIL_REFRESH_TOKEN`. */
  refreshToken?: string;
  /** Ready-to-use access token. Skips the refresh flow. Env: `GMAIL_ACCESS_TOKEN`. */
  accessToken?: string;
  /** Gmail API user id. @default "me" */
  user?: string;
};

/** A single email found by {@link Gmail.findEmail}. */
export type Email = BaseEmail & {
  /** Gmail thread id. */
  threadId: string;
};

export type { FindEmailOptions, ReadEmailOptions };

/** Options for {@link Gmail.sendEmail}. */
export type SendEmailOptions = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  /** HTML body. Compose it with the `h1`/`table`/... primitives exported from this package. */
  body: string;
  attachments?: GmailAttachment[];
};

/** Result of {@link Gmail.sendEmail}. */
export type SendEmailResult = {
  /** Gmail message id of the sent message. */
  id: string;
  threadId: string;
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

type Auth =
  | { type: "token"; accessToken: string }
  | { type: "oauth2"; clientId: string; clientSecret: string; refreshToken: string };

type ListMessagesResponse = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

type MessagePart = {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: MessagePart[];
};

type Message = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: MessagePart;
};

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function joinAddresses(addresses: string | string[]): string {
  return Array.isArray(addresses) ? addresses.join(", ") : addresses;
}

function header(part: MessagePart | undefined, name: string): string | undefined {
  return part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function collectBodies(part: MessagePart | undefined, into: { text: string[]; html: string[] }): void {
  if (!part) {
    return;
  }
  if (part.mimeType === "text/plain" && part.body?.data) {
    into.text.push(base64UrlDecode(part.body.data));
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    into.html.push(base64UrlDecode(part.body.data));
  }
  for (const child of part.parts ?? []) {
    collectBodies(child, into);
  }
}

/**
 * Minimal Gmail API client used by the `gmail` fixture.
 *
 * Covers the operations a test usually needs:
 * - {@link findEmail} — search the mailbox (`users.messages.list` + metadata)
 * - {@link readEmail} — decode a message body (`users.messages.get`)
 * - {@link sendEmail} — send a MIME message (`users.messages.send`)
 * - {@link markAsRead} — remove the `UNREAD` label (`users.messages.modify`)
 *
 * `waitForEmail` / `getEmailLinks` are inherited from `EmailProvider`
 * (`@playwright-labs/email-core`).
 *
 * Can also be used without the fixture:
 * ```ts
 * const gmail = new Gmail({ accessToken: "ya29...." });
 * ```
 */
export class Gmail extends EmailProvider<Email> {
  #auth: Auth;
  #user: string;
  #token?: { value: string; expiresAt: number };

  constructor(options: GmailOptions = {}) {
    super();
    const accessToken = options.accessToken ?? process.env.GMAIL_ACCESS_TOKEN;
    const clientId = options.clientId ?? process.env.GMAIL_CLIENT_ID;
    const clientSecret = options.clientSecret ?? process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = options.refreshToken ?? process.env.GMAIL_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      this.#auth = { type: "oauth2", clientId, clientSecret, refreshToken };
    } else if (accessToken) {
      this.#auth = { type: "token", accessToken };
    } else {
      throw new Error(
        "fixture-gmail: Gmail credentials are required. " +
          "Pass `accessToken` or the OAuth2 trio (`clientId`, `clientSecret`, `refreshToken`) " +
          "via options or the GMAIL_ACCESS_TOKEN / GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN env variables.",
      );
    }
    this.#user = options.user ?? "me";
  }

  /**
   * Find emails in the mailbox.
   *
   * String filters are translated into a Gmail search query, `RegExp` filters
   * are applied client-side to the message metadata headers.
   *
   * @returns matching emails (newest first, up to `limit`) or `null` when nothing matches.
   * @example
   * ```ts
   * const emails = await gmail.findEmail({ subject: /qwe/ });
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

    const list = await this.#request<ListMessagesResponse>("GET", "/messages", {
      query: { q: queryParts.join(" "), maxResults: limit },
    });
    if (!list.messages?.length) {
      return null;
    }

    const emails = await Promise.all(
      list.messages.slice(0, limit).map((message) => this.#getMetadata(message.id)),
    );

    const filtered = filterEmails(emails, { subject, from, to });

    if (filtered.length) {
      this.emit("email.find", filtered);
    }
    return filtered.length ? filtered : null;
  }

  /**
   * Read and decode the body of an email by its id (see {@link findEmail}).
   *
   * Emits the `"email.read"` event.
   *
   * @returns decoded body — HTML by default, plain text when `format: "text"`
   * or when the message has no HTML part. Empty string when there is no body.
   */
  async readEmail(emailId: string, options: ReadEmailOptions = {}): Promise<string> {
    const format = options.format ?? "html";
    const message = await this.#request<Message>("GET", `/messages/${emailId}`, {
      query: { format: "full" },
    });

    const bodies = { text: [] as string[], html: [] as string[] };
    collectBodies(message.payload, bodies);

    const text = bodies.text.join("\n");
    const html = bodies.html.join("\n");
    const body = format === "html" ? html || text : text || html;
    this.emit("email.read", { id: emailId, body });
    return body;
  }

  /**
   * Mark a message as read (removes the `UNREAD` label via `users.messages.modify`).
   * Requires the `gmail.modify` scope.
   */
  async markAsRead(emailId: string): Promise<void> {
    await this.#request("POST", `/messages/${emailId}/modify`, {
      body: { removeLabelIds: ["UNREAD"] },
    });
  }

  /**
   * Send an email from the authenticated account.
   *
   * `body` is sent as HTML — compose it with the exported primitives
   * (`h1`, `h2`, `table`, `div`, `p`, `img`, ...). Attachments (including
   * inline `cid` images) follow the nodemailer `Attachment` shape.
   *
   * @example
   * ```ts
   * await gmail.sendEmail({
   *   to: "user@example.com",
   *   cc: ["second@example.com"],
   *   subject: "Hello from test",
   *   body: fragment(h1("Hi"), table(tbody(tr(td("it works"))))),
   *   attachments: [{ filename: "report.html", path: "playwright-report/index.html" }],
   * });
   * ```
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const composer = new MailComposer({
      to: joinAddresses(options.to),
      cc: options.cc ? joinAddresses(options.cc) : undefined,
      bcc: options.bcc ? joinAddresses(options.bcc) : undefined,
      subject: options.subject,
      html: options.body,
      attachments: options.attachments,
    });
    composer.compile();
    if (!composer.message) {
      throw new Error("fixture-gmail: failed to compose the email message");
    }
    const raw = await composer.message.build();

    const result = await this.#request<SendEmailResult>("POST", "/messages/send", {
      body: { raw: base64UrlEncode(raw) },
    });
    this.emit("email.send", {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      id: result.id,
    });
    return result;
  }

  async #getMetadata(id: string): Promise<Email> {
    const message = await this.#request<Message>("GET", `/messages/${id}`, {
      query: {
        format: "metadata",
        metadataHeaders: ["Subject", "From", "To", "Date"],
      },
    });
    return {
      id: message.id,
      threadId: message.threadId,
      subject: header(message.payload, "Subject"),
      from: header(message.payload, "From"),
      to: header(message.payload, "To"),
      date: header(message.payload, "Date"),
      snippet: message.snippet ?? "",
      ...emailReaders((options) => this.readEmail(message.id, options)),
    };
  }

  async #accessToken(): Promise<string> {
    if (this.#auth.type === "token") {
      return this.#auth.accessToken;
    }
    if (this.#token && this.#token.expiresAt > Date.now()) {
      return this.#token.value;
    }
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.#auth.clientId,
        client_secret: this.#auth.clientSecret,
        refresh_token: this.#auth.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Gmail: failed to refresh the access token (${response.status}): ${await response.text()}`,
      );
    }
    const data = (await response.json()) as { access_token: string; expires_in?: number };
    this.#token = {
      value: data.access_token,
      expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
    };
    return this.#token.value;
  }

  async #request<T>(
    method: "GET" | "POST",
    path: string,
    options: {
      query?: Record<string, string | number | string[] | undefined>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const token = await this.#accessToken();
    const url = new URL(`${GMAIL_API_BASE}/${this.#user}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === "") {
        continue;
      }
      for (const item of Array.isArray(value) ? value : [value]) {
        url.searchParams.append(key, String(item));
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.body ? { "content-type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      throw new Error(
        `Gmail: API ${method} ${path} failed (${response.status}): ${await response.text()}`,
      );
    }
    return (await response.json()) as T;
  }
}
