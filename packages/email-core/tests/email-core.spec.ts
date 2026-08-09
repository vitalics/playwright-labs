import { expect, test } from "@playwright/test";
import { Readable } from "node:stream";
import {
  type Email,
  EmailProvider,
  emailReaders,
  extractLinks,
  filterEmails,
  type FindEmailOptions,
  NodemailerSender,
  type ReadEmailOptions,
} from "../src";

function email(id: string, overrides: Partial<Email> = {}): Email {
  return {
    id,
    subject: `subject-${id}`,
    from: "sender@example.com",
    to: "me@example.com",
    date: "2026-01-01T00:00:00Z",
    snippet: `snippet-${id}`,
    ...emailReaders(async () => `body-${id}`),
    ...overrides,
  };
}

class StubProvider extends EmailProvider {
  findResults: (Email[] | null)[] = [];
  bodies = new Map<string, string>();
  markedAsRead: string[] = [];

  async findEmail(_options?: FindEmailOptions): Promise<Email[] | null> {
    return this.findResults.length > 1 ? (this.findResults.shift() ?? null) : this.findResults[0]!;
  }

  async readEmail(emailId: string, _options?: ReadEmailOptions): Promise<string> {
    return this.bodies.get(emailId) ?? "";
  }

  async markAsRead(emailId: string): Promise<void> {
    this.markedAsRead.push(emailId);
  }
}

test.describe("extractLinks", () => {
  test("extracts unique links in order of first appearance", () => {
    const html =
      '<a href="https://example.com/confirm?token=1">confirm</a>' +
      "<a href='https://example.com/help'>help</a>" +
      '<a class="x" href = "https://example.com/about">about</a>' +
      '<a href="https://example.com/confirm?token=1">again</a>';

    expect(extractLinks(html)).toEqual([
      "https://example.com/confirm?token=1",
      "https://example.com/help",
      "https://example.com/about",
    ]);
  });

  test("returns an empty array when there are no links", () => {
    expect(extractLinks("plain text")).toEqual([]);
  });
});

test.describe("filterEmails", () => {
  test("applies RegExp filters to subject, from and to", () => {
    const emails = [
      email("id-1", { subject: "qwe123" }),
      email("id-2", { from: "other@example.com" }),
    ];

    expect(filterEmails(emails, { subject: /qwe/ })).toHaveLength(1);
    expect(filterEmails(emails, { from: /^sender@/ })).toHaveLength(1);
    expect(filterEmails(emails, { to: /nope/ })).toHaveLength(0);
  });

  test("ignores string filters (handled server-side)", () => {
    const emails = [email("id-1")];
    expect(filterEmails(emails, { subject: "anything" })).toHaveLength(1);
  });
});

test.describe("emailReaders", () => {
  test("readAsString returns the body", async () => {
    const readers = emailReaders(async () => "<h1>hi</h1>");
    await expect(readers.readAsString()).resolves.toBe("<h1>hi</h1>");
  });

  test("readAsBytes returns the body as a buffer", async () => {
    const readers = emailReaders(async () => "hello");
    const bytes = await readers.readAsBytes();
    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.toString("utf-8")).toBe("hello");
  });

  test("readAsStream streams the body", async () => {
    const readers = emailReaders(async () => "streamed body");
    const stream = readers.readAsStream();
    expect(stream).toBeInstanceOf(Readable);

    let received = "";
    for await (const chunk of stream) {
      received += chunk;
    }
    expect(received).toBe("streamed body");
  });

  test("fetches the body lazily on every call", async () => {
    let calls = 0;
    const readers = emailReaders(async () => {
      calls += 1;
      return `body-${calls}`;
    });

    await expect(readers.readAsString()).resolves.toBe("body-1");
    await expect(readers.readAsString()).resolves.toBe("body-2");
  });
});

test.describe("NodemailerSender", () => {
  function fakeTransporter() {
    const sent: unknown[] = [];
    return {
      sent,
      transporter: {
        sendMail: async (mail: unknown) => {
          sent.push(mail);
          return { messageId: "<msg-1@example.com>" };
        },
        verify: async () => true,
        close: () => {},
      } as unknown as ConstructorParameters<typeof NodemailerSender>[0],
    };
  }

  test("sends an email through the injected transporter", async () => {
    const { transporter, sent } = fakeTransporter();
    const sender = new NodemailerSender(transporter);

    const result = await sender.sendEmail({
      from: "Tester <test@example.com>",
      to: ["a@example.com", "b@example.com"],
      cc: "c@example.com",
      subject: "Hello",
      body: "<h1>Hi</h1>",
      text: "Hi",
      attachments: [{ filename: "notes.txt", content: "file content" }],
    });

    expect(result).toEqual({ messageId: "<msg-1@example.com>" });
    expect(sent).toEqual([
      {
        from: "Tester <test@example.com>",
        to: ["a@example.com", "b@example.com"],
        cc: "c@example.com",
        bcc: undefined,
        subject: "Hello",
        html: "<h1>Hi</h1>",
        text: "Hi",
        attachments: [{ filename: "notes.txt", content: "file content" }],
      },
    ]);
  });

  test("creates a transport from SMTP options", () => {
    const sender = new NodemailerSender({ host: "localhost", port: 1025 });
    expect(sender).toBeInstanceOf(NodemailerSender);
    sender.close();
  });

  test("verify delegates to the transporter", async () => {
    const { transporter } = fakeTransporter();
    const sender = new NodemailerSender(transporter);
    await expect(sender.verify()).resolves.toBeUndefined();
  });
});

test.describe("EmailProvider", () => {
  test("waitForEmail returns the first match immediately", async () => {
    const provider = new StubProvider();
    provider.findResults = [[email("id-1")]];

    await expect(provider.waitForEmail({ subject: /qwe/ })).resolves.toEqual(
      expect.objectContaining({ id: "id-1" }),
    );
  });

  test("waitForEmail polls until a match appears", async () => {
    const provider = new StubProvider();
    provider.findResults = [null, [], [email("id-1")]];

    const result = await provider.waitForEmail({ interval: 5 });
    expect(result.id).toBe("id-1");
  });

  test("waitForEmail emits 'email.receive' with the matched email", async () => {
    const provider = new StubProvider();
    provider.findResults = [[email("id-1")]];

    const received: Email[] = [];
    provider.on("email.receive", (email) => received.push(email));

    await provider.waitForEmail({ interval: 5 });
    expect(received).toHaveLength(1);
    expect(received[0]?.id).toBe("id-1");
  });

  test("waitForEmail throws when nothing matches within the timeout", async () => {
    const provider = new StubProvider();
    provider.findResults = [null];

    await expect(
      provider.waitForEmail({ subject: /qwe/, timeout: 30, interval: 5 }),
    ).rejects.toThrow(/no email matched within 30ms/);
  });

  test("getEmailLinks reads the html body and extracts links", async () => {
    const provider = new StubProvider();
    provider.bodies.set(
      "id-1",
      '<a href="https://example.com/confirm">confirm</a><a href="https://example.com/help">help</a>',
    );

    await expect(provider.getEmailLinks("id-1")).resolves.toEqual([
      "https://example.com/confirm",
      "https://example.com/help",
    ]);
  });

  test("markAsRead delegates to the provider", async () => {
    const provider = new StubProvider();
    await provider.markAsRead("id-1");
    expect(provider.markedAsRead).toEqual(["id-1"]);
  });
});
