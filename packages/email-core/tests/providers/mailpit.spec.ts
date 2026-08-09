import { expect, test } from "@playwright/test";
import { Mailpit } from "../../src/providers/mailpit";

const ENV_KEYS = [
  "MAILPIT_API_URL",
  "MAILPIT_USERNAME",
  "MAILPIT_PASSWORD",
  "MAILPIT_FROM",
] as const;

type MockResponse = { status?: number; body: unknown; contentType?: string };
type Handler = (url: string, init?: RequestInit) => MockResponse;

const originalFetch = globalThis.fetch;
let handler: Handler;
let calls: { url: string; init?: RequestInit }[];
let envSnapshot: Record<string, string | undefined>;

function summaryMessage(id: string, subject: string) {
  return {
    ID: id,
    MessageID: `<${id}@mailpit.local>`,
    Read: false,
    Subject: subject,
    From: { Name: "Sender", Address: "sender@example.com" },
    To: [{ Name: "", Address: "me@example.com" }],
    Created: "2026-01-01T00:00:00Z",
    Snippet: `snippet-${id}`,
  };
}

test.beforeEach(() => {
  envSnapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  calls = [];
  handler = () => ({ status: 500, body: "unmocked call" });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const { status = 200, body, contentType = "application/json" } = handler(url, init);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": contentType },
    });
  }) as typeof fetch;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    const value = envSnapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

test.describe("constructor", () => {
  test("defaults to http://localhost:8025 without auth", async () => {
    handler = () => ({ body: { messages: [] } });

    const mailpit = new Mailpit();
    await mailpit.findEmail();

    expect(calls[0]?.url).toMatch(/^http:\/\/localhost:8025\//);
    expect(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
    ).toBeUndefined();
  });

  test("falls back to environment variables", async () => {
    process.env.MAILPIT_API_URL = "http://mailpit:8025/";
    process.env.MAILPIT_USERNAME = "user";
    process.env.MAILPIT_PASSWORD = "pass";
    handler = () => ({ body: { messages: [] } });

    const mailpit = new Mailpit();
    await mailpit.findEmail();

    expect(calls[0]?.url).toMatch(/^http:\/\/mailpit:8025\//);
    expect((calls[0]?.init?.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from("user:pass").toString("base64")}`,
    );
  });
});

test.describe("findEmail", () => {
  test("builds a mailpit search query from string options", async () => {
    handler = (url) => {
      if (url.includes("/api/v1/search")) {
        return { body: { messages: [summaryMessage("id-1", "qwe")] } };
      }
      return { status: 500, body: "unexpected call" };
    };

    const mailpit = new Mailpit();
    const emails = await mailpit.findEmail({ subject: "qwe", unread: true });

    const searchUrl = new URL(String(calls[0]?.url));
    expect(searchUrl.searchParams.get("query")).toBe('subject:"qwe" is:unread');
    expect(searchUrl.searchParams.get("limit")).toBe("10");
    expect(emails).toEqual([
      expect.objectContaining({
        id: "id-1",
        messageId: "<id-1@mailpit.local>",
        subject: "qwe",
        from: "Sender <sender@example.com>",
        to: "me@example.com",
        date: "2026-01-01T00:00:00Z",
        snippet: "snippet-id-1",
        read: false,
      }),
    ]);
  });

  test("lists messages without a query when no filters are given", async () => {
    handler = (url) => {
      if (url.includes("/api/v1/messages")) {
        return { body: { messages: [summaryMessage("id-1", "qwe")] } };
      }
      return { status: 500, body: "unexpected call" };
    };

    const mailpit = new Mailpit();
    const emails = await mailpit.findEmail();

    expect(calls[0]?.url).toContain("/api/v1/messages?");
    expect(emails).toHaveLength(1);
  });

  test("applies RegExp filters client-side", async () => {
    handler = () => ({
      body: {
        messages: [summaryMessage("id-1", "qwe123"), summaryMessage("id-2", "other subject")],
      },
    });

    const mailpit = new Mailpit();
    const emails = await mailpit.findEmail({ subject: /qwe/ });

    expect(emails).toHaveLength(1);
    expect(emails?.[0]?.id).toBe("id-1");
  });

  test("returns null when the mailbox has no matches", async () => {
    handler = () => ({ body: {} });

    const mailpit = new Mailpit();
    await expect(mailpit.findEmail({ subject: /qwe/ })).resolves.toBeNull();
  });

  test("returns null when RegExp filters match nothing", async () => {
    handler = () => ({ body: { messages: [summaryMessage("id-1", "other subject")] } });

    const mailpit = new Mailpit();
    await expect(mailpit.findEmail({ subject: /qwe/ })).resolves.toBeNull();
  });
});

test.describe("readEmail", () => {
  const message = {
    ID: "id-1",
    Subject: "qwe",
    Text: "plain body",
    HTML: "<h1>html body</h1>",
  };

  test("returns the html body by default", async () => {
    handler = () => ({ body: message });

    const mailpit = new Mailpit();
    await expect(mailpit.readEmail("id-1")).resolves.toBe("<h1>html body</h1>");
    expect(calls[0]?.url).toContain("/api/v1/message/id-1");
  });

  test("returns plain text when format is 'text'", async () => {
    handler = () => ({ body: message });

    const mailpit = new Mailpit();
    await expect(mailpit.readEmail("id-1", { format: "text" })).resolves.toBe("plain body");
  });

  test("falls back to text when there is no html part", async () => {
    handler = () => ({ body: { ID: "id-1", Text: "only text" } });

    const mailpit = new Mailpit();
    await expect(mailpit.readEmail("id-1")).resolves.toBe("only text");
  });

  test("supports the special 'latest' id", async () => {
    handler = () => ({ body: message });

    const mailpit = new Mailpit();
    await mailpit.readEmail("latest");
    expect(calls[0]?.url).toContain("/api/v1/message/latest");
  });
});

test.describe("sendEmail", () => {
  test("posts a JSON message to the send API", async () => {
    handler = (url) => {
      expect(url).toContain("/api/v1/send");
      return { body: { ID: "sent-1" } };
    };

    const mailpit = new Mailpit({ from: "Tester <test@example.com>" });
    const result = await mailpit.sendEmail({
      to: ["a@example.com", "b@example.com"],
      cc: "c@example.com",
      subject: "Hello from test",
      body: "<h1>Hi</h1>",
      attachments: [{ filename: "notes.txt", content: "file content" }],
    });

    expect(result).toEqual({ id: "sent-1" });

    const sendCall = calls.find((c) => c.url.includes("/api/v1/send"));
    const headers = sendCall?.init?.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse(String(sendCall?.init?.body));
    expect(body.From).toEqual({ Email: "test@example.com", Name: "Tester" });
    expect(body.To).toEqual([{ Email: "a@example.com" }, { Email: "b@example.com" }]);
    expect(body.Cc).toEqual([{ Email: "c@example.com" }]);
    expect(body.Subject).toBe("Hello from test");
    expect(body.HTML).toBe("<h1>Hi</h1>");
    expect(body.Attachments).toEqual([
      {
        Filename: "notes.txt",
        Content: Buffer.from("file content").toString("base64"),
      },
    ]);
  });

  test("uses the default sender address", async () => {
    handler = () => ({ body: { ID: "sent-1" } });

    const mailpit = new Mailpit();
    await mailpit.sendEmail({ to: "a@example.com", subject: "s", body: "b" });

    const body = JSON.parse(String(calls[0]?.init?.body));
    expect(body.From).toEqual({ Email: "playwright@mailpit.local" });
  });
});

test.describe("markAsRead", () => {
  test("sets the read status via PUT /api/v1/messages", async () => {
    handler = () => ({ body: "ok", contentType: "text/plain" });

    const mailpit = new Mailpit();
    await mailpit.markAsRead("id-1");

    expect(calls[0]?.init?.method).toBe("PUT");
    expect(calls[0]?.url).toContain("/api/v1/messages");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      IDs: ["id-1"],
      Read: true,
    });
  });
});

test.describe("deleteEmails", () => {
  test("deletes all messages when no ids are given", async () => {
    handler = () => ({ body: "ok", contentType: "text/plain" });

    const mailpit = new Mailpit();
    await mailpit.deleteEmails();

    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/api/v1/messages");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({});
  });

  test("deletes only the given ids", async () => {
    handler = () => ({ body: "ok", contentType: "text/plain" });

    const mailpit = new Mailpit();
    await mailpit.deleteEmails(["id-1", "id-2"]);

    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ IDs: ["id-1", "id-2"] });
  });
});

test.describe("email readers", () => {
  test("emails returned by findEmail expose readAs* methods", async () => {
    handler = (url) => {
      if (url.includes("/api/v1/message/id-1")) {
        return { body: { ID: "id-1", HTML: "<h1>html body</h1>" } };
      }
      return { body: { messages: [summaryMessage("id-1", "qwe")] } };
    };

    const mailpit = new Mailpit();
    const email = (await mailpit.findEmail({ subject: /qwe/ }))![0]!;

    await expect(email.readAsString()).resolves.toBe("<h1>html body</h1>");
    await expect(email.readAsBytes()).resolves.toEqual(Buffer.from("<h1>html body</h1>"));

    let streamed = "";
    for await (const chunk of email.readAsStream()) {
      streamed += chunk;
    }
    expect(streamed).toBe("<h1>html body</h1>");
  });
});

test.describe("waitForEmail", () => {
  test("returns the first match immediately", async () => {
    handler = () => ({ body: { messages: [summaryMessage("id-1", "qwe")] } });

    const mailpit = new Mailpit();
    const email = await mailpit.waitForEmail({ subject: /qwe/ });

    expect(email.id).toBe("id-1");
    expect(calls).toHaveLength(1);
  });

  test("polls until a match appears", async () => {
    let attempt = 0;
    handler = () => {
      attempt += 1;
      return attempt < 3
        ? { body: { messages: [] } }
        : { body: { messages: [summaryMessage("id-1", "qwe")] } };
    };

    const mailpit = new Mailpit();
    const email = await mailpit.waitForEmail({ subject: /qwe/, interval: 5 });

    expect(email.id).toBe("id-1");
    expect(calls).toHaveLength(3);
  });

  test("throws when nothing matches within the timeout", async () => {
    handler = () => ({ body: { messages: [] } });

    const mailpit = new Mailpit();
    await expect(
      mailpit.waitForEmail({ subject: /qwe/, timeout: 30, interval: 5 }),
    ).rejects.toThrow(/no email matched within 30ms/);
  });
});

test.describe("getEmailLinks", () => {
  test("extracts unique links from the html body", async () => {
    handler = () => ({
      body: {
        ID: "id-1",
        HTML: '<a href="https://example.com/confirm?token=1">confirm</a>' +
          "<a href='https://example.com/help'>help</a>" +
          '<a href="https://example.com/confirm?token=1">again</a>',
      },
    });

    const mailpit = new Mailpit();
    await expect(mailpit.getEmailLinks("id-1")).resolves.toEqual([
      "https://example.com/confirm?token=1",
      "https://example.com/help",
    ]);
  });

  test("returns an empty array when the body has no links", async () => {
    handler = () => ({ body: { ID: "id-1", Text: "no links here" } });

    const mailpit = new Mailpit();
    await expect(mailpit.getEmailLinks("id-1")).resolves.toEqual([]);
  });
});

test.describe("events", () => {
  test("emits 'email.find' only when emails match", async () => {
    handler = () => ({ body: { messages: [summaryMessage("id-1", "qwe")] } });

    const mailpit = new Mailpit();
    const found: unknown[][] = [];
    mailpit.on("email.find", (emails) => found.push(emails));

    await mailpit.findEmail({ subject: /qwe/ });
    await mailpit.findEmail({ subject: /nope/ });

    expect(found).toHaveLength(1);
    expect(found[0]?.[0]).toMatchObject({ id: "id-1" });
  });

  test("emits 'email.read' with the body", async () => {
    handler = () => ({ body: { ID: "id-1", HTML: "<h1>hi</h1>" } });

    const mailpit = new Mailpit();
    const events: unknown[] = [];
    mailpit.on("email.read", (event) => events.push(event));

    await mailpit.readEmail("id-1");
    expect(events).toEqual([{ id: "id-1", body: "<h1>hi</h1>" }]);
  });

  test("emits 'email.send' after sending", async () => {
    handler = () => ({ body: { ID: "sent-1" } });

    const mailpit = new Mailpit();
    const events: unknown[] = [];
    mailpit.on("email.send", (event) => events.push(event));

    await mailpit.sendEmail({ to: "a@example.com", subject: "Hi", body: "<h1>hi</h1>" });
    expect(events).toEqual([
      { to: "a@example.com", subject: "Hi", id: "sent-1" },
    ]);
  });
});

test.describe("errors", () => {
  test("throws with the server response on non-ok status", async () => {
    handler = () => ({ status: 400, body: "invalid query", contentType: "text/plain" });

    const mailpit = new Mailpit();
    await expect(mailpit.findEmail({ query: "!!!" })).rejects.toThrow(
      /Mailpit API GET \/api\/v1\/search failed \(400\): invalid query/,
    );
  });
});
