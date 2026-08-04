import { expect, test } from "../src/fixture";
import { Gmail } from "../src/gmail";

const ENV_KEYS = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_ACCESS_TOKEN",
] as const;

type MockResponse = { status?: number; body: unknown };
type Handler = (url: string, init?: RequestInit) => MockResponse;

const originalFetch = globalThis.fetch;
let handler: Handler;
let calls: { url: string; init?: RequestInit }[];
let envSnapshot: Record<string, string | undefined>;

function b64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeRaw(init: RequestInit | undefined): string {
  const { raw } = JSON.parse(String(init?.body));
  return Buffer.from(
    String(raw).replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf-8");
}

function metadataMessage(id: string, subject: string) {
  return {
    id,
    threadId: `thread-${id}`,
    snippet: `snippet-${id}`,
    payload: {
      mimeType: "multipart/mixed",
      headers: [
        { name: "Subject", value: subject },
        { name: "From", value: "sender@example.com" },
        { name: "To", value: "me@example.com" },
        { name: "Date", value: "Mon, 1 Jan 2026 00:00:00 +0000" },
      ],
    },
  };
}

test.beforeEach(() => {
  envSnapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  calls = [];
  handler = () => ({ status: 500, body: { error: "unmocked call" } });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const { status = 200, body } = handler(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
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
  test("throws when no credentials are provided", () => {
    expect(() => new Gmail()).toThrow(/GMAIL_ACCESS_TOKEN/);
  });

  test("falls back to environment variables", async () => {
    process.env.GMAIL_CLIENT_ID = "id";
    process.env.GMAIL_CLIENT_SECRET = "secret";
    process.env.GMAIL_REFRESH_TOKEN = "refresh";
    handler = (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return { body: { access_token: "fresh-token", expires_in: 3600 } };
      }
      return { body: { messages: [] } };
    };

    const gmail = new Gmail();
    await gmail.findEmail();

    const tokenCall = calls.find((c) => c.url === "https://oauth2.googleapis.com/token");
    expect(String(tokenCall?.init?.body)).toContain("grant_type=refresh_token");
    expect(String(tokenCall?.init?.body)).toContain("refresh_token=refresh");
  });
});

test.describe("findEmail", () => {
  test("builds a gmail query from string options", async () => {
    handler = (url) => {
      if (url.includes("/messages/")) {
        return { body: metadataMessage("id-1", "qwe") };
      }
      return { body: { messages: [{ id: "id-1", threadId: "thread-id-1" }] } };
    };

    const gmail = new Gmail({ accessToken: "token" });
    const emails = await gmail.findEmail({ subject: "qwe", unread: true });

    const listCall = calls.find((c) => c.url.includes("/messages?"));
    const listUrl = new URL(String(listCall?.url));
    expect(listUrl.searchParams.get("q")).toBe('subject:"qwe" is:unread');
    expect(listUrl.searchParams.get("maxResults")).toBe("10");
    expect(emails).toEqual([
      {
        id: "id-1",
        threadId: "thread-id-1",
        subject: "qwe",
        from: "sender@example.com",
        to: "me@example.com",
        date: "Mon, 1 Jan 2026 00:00:00 +0000",
        snippet: "snippet-id-1",
      },
    ]);
  });

  test("applies RegExp filters client-side", async () => {
    handler = (url) => {
      if (url.includes("/messages/id-1")) {
        return { body: metadataMessage("id-1", "qwe123") };
      }
      if (url.includes("/messages/id-2")) {
        return { body: metadataMessage("id-2", "other subject") };
      }
      return {
        body: {
          messages: [
            { id: "id-1", threadId: "thread-id-1" },
            { id: "id-2", threadId: "thread-id-2" },
          ],
        },
      };
    };

    const gmail = new Gmail({ accessToken: "token" });
    const emails = await gmail.findEmail({ subject: /qwe/ });

    expect(emails).toHaveLength(1);
    expect(emails?.[0]?.id).toBe("id-1");
  });

  test("returns null when the mailbox has no matches", async () => {
    handler = () => ({ body: {} });

    const gmail = new Gmail({ accessToken: "token" });
    await expect(gmail.findEmail({ subject: /qwe/ })).resolves.toBeNull();
  });

  test("returns null when RegExp filters match nothing", async () => {
    handler = (url) => {
      if (url.includes("/messages/id-1")) {
        return { body: metadataMessage("id-1", "other subject") };
      }
      return { body: { messages: [{ id: "id-1", threadId: "thread-id-1" }] } };
    };

    const gmail = new Gmail({ accessToken: "token" });
    await expect(gmail.findEmail({ subject: /qwe/ })).resolves.toBeNull();
  });
});

test.describe("readEmail", () => {
  const fullMessage = {
    id: "id-1",
    threadId: "thread-id-1",
    payload: {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64url("plain body") } },
        { mimeType: "text/html", body: { data: b64url("<h1>html body</h1>") } },
      ],
    },
  };

  test("returns the decoded html body by default", async () => {
    handler = () => ({ body: fullMessage });

    const gmail = new Gmail({ accessToken: "token" });
    await expect(gmail.readEmail("id-1")).resolves.toBe("<h1>html body</h1>");
  });

  test("returns plain text when format is 'text'", async () => {
    handler = () => ({ body: fullMessage });

    const gmail = new Gmail({ accessToken: "token" });
    await expect(gmail.readEmail("id-1", { format: "text" })).resolves.toBe("plain body");
  });

  test("falls back to text when there is no html part", async () => {
    handler = () => ({
      body: {
        id: "id-1",
        threadId: "thread-id-1",
        payload: { mimeType: "text/plain", body: { data: b64url("only text") } },
      },
    });

    const gmail = new Gmail({ accessToken: "token" });
    await expect(gmail.readEmail("id-1")).resolves.toBe("only text");
  });
});

test.describe("sendEmail", () => {
  test("composes a MIME message and posts it base64url-encoded", async () => {
    handler = (url) => {
      expect(url).toContain("/messages/send");
      return { body: { id: "sent-1", threadId: "thread-sent-1" } };
    };

    const gmail = new Gmail({ accessToken: "token" });
    const result = await gmail.sendEmail({
      to: ["a@example.com", "b@example.com"],
      cc: "c@example.com",
      subject: "Hello from test",
      body: "<h1>Hi</h1>",
      attachments: [{ filename: "notes.txt", content: "file content" }],
    });

    expect(result).toEqual({ id: "sent-1", threadId: "thread-sent-1" });

    const sendCall = calls.find((c) => c.url.includes("/messages/send"));
    const headers = sendCall?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer token");
    expect(headers["content-type"]).toBe("application/json");

    const raw = decodeRaw(sendCall?.init);
    expect(raw).toContain("To: a@example.com, b@example.com");
    expect(raw).toContain("Cc: c@example.com");
    expect(raw).toContain("Subject: Hello from test");
    expect(raw).toContain("Content-Type: text/html");
    expect(raw).toContain("filename=notes.txt");
  });
});

test.describe("auth", () => {
  const oauthOptions = {
    clientId: "id",
    clientSecret: "secret",
    refreshToken: "refresh",
  };

  test("refreshes the access token once and caches it", async () => {
    handler = (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return { body: { access_token: "fresh-token", expires_in: 3600 } };
      }
      return { body: { messages: [] } };
    };

    const gmail = new Gmail(oauthOptions);
    await gmail.findEmail();
    await gmail.findEmail();

    const tokenCalls = calls.filter((c) => c.url === "https://oauth2.googleapis.com/token");
    expect(tokenCalls).toHaveLength(1);

    const apiCalls = calls.filter((c) => c.url.includes("gmail.googleapis.com"));
    expect(apiCalls).toHaveLength(2);
    for (const call of apiCalls) {
      expect((call.init?.headers as Record<string, string>).authorization).toBe(
        "Bearer fresh-token",
      );
    }
  });

  test("uses a static access token without the refresh flow", async () => {
    handler = () => ({ body: { messages: [] } });

    const gmail = new Gmail({ accessToken: "static-token" });
    await gmail.findEmail();

    expect(calls.some((c) => c.url === "https://oauth2.googleapis.com/token")).toBe(false);
    expect(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
    ).toBe("Bearer static-token");
  });
});

test.describe("fixture", () => {
  // the fixture is constructed after beforeEach hooks, so the env
  // variable has to be restored here (the outer beforeEach clears it)
  test.beforeEach(() => {
    process.env.GMAIL_ACCESS_TOKEN = "env-token";
  });

  test("gmail fixture creates a client from env variables", async ({ gmail }) => {
    handler = () => ({ body: { messages: [] } });

    expect(gmail).toBeInstanceOf(Gmail);
    await gmail.findEmail();
    expect(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
    ).toBe("Bearer env-token");
  });

  test("useGmail accepts custom options", async ({ useGmail }) => {
    handler = () => ({ body: { messages: [] } });

    const gmail = useGmail({ accessToken: "custom-token" });
    await gmail.findEmail();
    expect(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
    ).toBe("Bearer custom-token");
  });
});
