import { Mailpit } from "@playwright-labs/email-core/providers/mailpit";
import { expect, test } from "../src/fixture";

const ENV_KEYS = [
  "MAILPIT_API_URL",
  "MAILPIT_USERNAME",
  "MAILPIT_PASSWORD",
  "MAILPIT_FROM",
] as const;

const originalFetch = globalThis.fetch;
let calls: { url: string; init?: RequestInit }[];
let envSnapshot: Record<string, string | undefined>;

test.beforeEach(() => {
  envSnapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ messages: [] }), {
      status: 200,
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

test.describe("fixture", () => {
  // the fixture is constructed after beforeEach hooks, so the env
  // variable has to be restored here (the outer beforeEach clears it)
  test.beforeEach(() => {
    process.env.MAILPIT_API_URL = "http://env-mailpit:8025";
  });

  test("mailpit fixture creates a client from env variables", async ({ mailpit }) => {
    expect(mailpit).toBeInstanceOf(Mailpit);
    await mailpit.findEmail();
    expect(calls[0]?.url).toMatch(/^http:\/\/env-mailpit:8025\//);
  });

  test("useMailpit accepts custom options", async ({ useMailpit }) => {
    const mailpit = useMailpit({ baseUrl: "http://custom:8025" });
    await mailpit.findEmail();
    expect(calls[0]?.url).toMatch(/^http:\/\/custom:8025\//);
  });
});
