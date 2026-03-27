import { test, expect } from "@playwright/test";
import React from "react";
import type { FullResult } from "@playwright/test/reporter";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import EmailReporter, { type NodemailerReporterOptions } from "../src/reporter";

const mockResult: FullResult = {
  status: "failed",
  duration: 1000,
  startTime: new Date(),
};

function makeReporter(options: Partial<NodemailerReporterOptions>) {
  return new EmailReporter({
    from: "from@test.com",
    to: "to@test.com",
    subject: "Test",
    send: "never",
    html: "<p>default</p>",
    ...options,
  } as NodemailerReporterOptions);
}

/** Subclass that stubs sendEmail so tests never hit a real SMTP server */
class StubReporter extends EmailReporter {
  readonly calls: string[] = [];

  override async sendEmail(subject: string): Promise<SMTPTransport.SentMessageInfo> {
    this.calls.push(subject);
    return { messageId: "stub" } as SMTPTransport.SentMessageInfo;
  }
}

function makeStubReporter(options: Partial<NodemailerReporterOptions>) {
  return new StubReporter({
    from: "from@test.com",
    to: "to@test.com",
    subject: "Test",
    html: "<p>default</p>",
    ...options,
  } as NodemailerReporterOptions);
}

// ---------------------------------------------------------------------------
// resolveSubject
// ---------------------------------------------------------------------------
test.describe("resolveSubject", () => {
  test("returns static string", () => {
    const reporter = makeReporter({});
    expect(reporter.resolveSubject(mockResult)).toBe("Test");
  });

  test("evaluates function with result", () => {
    const reporter = makeReporter({
      subject: (r) => `Status: ${r.status}`,
    });
    expect(reporter.resolveSubject(mockResult)).toBe("Status: failed");
  });
});

// ---------------------------------------------------------------------------
// resolveHtml — string input
// ---------------------------------------------------------------------------
test.describe("resolveHtml — string", () => {
  test("resolves static string", async () => {
    const reporter = makeReporter({ html: "<p>hello</p>" });
    expect(await reporter.resolveHtml(mockResult)).toBe("<p>hello</p>");
  });

  test("resolves function returning string", async () => {
    const reporter = makeReporter({ html: () => "<p>dynamic</p>" });
    expect(await reporter.resolveHtml(mockResult)).toBe("<p>dynamic</p>");
  });

  test("resolves async function returning string", async () => {
    const reporter = makeReporter({ html: async () => "<p>async</p>" });
    expect(await reporter.resolveHtml(mockResult)).toBe("<p>async</p>");
  });

  test("returns undefined when html option is absent", async () => {
    const reporter = new EmailReporter({
      from: "from@test.com",
      to: "to@test.com",
      subject: "Test",
      send: "never",
      text: "plain",
    });
    expect(await reporter.resolveHtml(mockResult)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// resolveHtml — ReactElement input
// ---------------------------------------------------------------------------
test.describe("resolveHtml — ReactElement", () => {
  test("renders static ReactElement", async () => {
    const reporter = makeReporter({
      html: React.createElement("p", null, "react content"),
    });
    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("react content");
    expect(html).toContain("<p>");
  });

  test("renders ReactElement returned from function", async () => {
    const reporter = makeReporter({
      html: () => React.createElement("div", { className: "wrap" }, "from fn"),
    });
    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("from fn");
    expect(html).toContain("div");
  });

  test("renders ReactElement from async function", async () => {
    const reporter = makeReporter({
      html: async () => React.createElement("span", null, "async react"),
    });
    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("async react");
  });

  test("renders nested elements", async () => {
    const reporter = makeReporter({
      html: React.createElement(
        "table",
        null,
        React.createElement(
          "tbody",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("td", null, "Test Name"),
            React.createElement("td", null, "passed"),
          ),
        ),
      ),
    });
    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("<table");
    expect(html).toContain("<td");
    expect(html).toContain("Test Name");
    expect(html).toContain("passed");
  });

  test("passes testCases to function", async () => {
    const reporter = makeReporter({
      html: (_r, testCases) =>
        React.createElement("p", null, `${testCases.length} tests`),
    });
    const html = await reporter.resolveHtml(mockResult);
    expect(html).toContain("0 tests");
  });
});

// ---------------------------------------------------------------------------
// resolveText
// ---------------------------------------------------------------------------
test.describe("resolveText", () => {
  test("resolves static string", async () => {
    const reporter = makeReporter({ text: "plain text" });
    expect(await reporter.resolveText(mockResult)).toBe("plain text");
  });

  test("resolves function returning string", async () => {
    const reporter = makeReporter({
      text: (r) => `Result: ${r.status}`,
    });
    expect(await reporter.resolveText(mockResult)).toBe("Result: failed");
  });

  test("returns undefined when text option is absent", async () => {
    const reporter = makeReporter({ html: "<p>x</p>" });
    expect(await reporter.resolveText(mockResult)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// send option
// ---------------------------------------------------------------------------
test.describe("send option", () => {
  test("never — does not call sendEmail", async () => {
    const reporter = makeStubReporter({ send: "never" });
    await reporter.onEnd(mockResult);
    expect(reporter.calls).toHaveLength(0);
  });

  test("always — calls sendEmail regardless of status", async () => {
    const reporter = makeStubReporter({ send: "always" });
    await reporter.onEnd({ ...mockResult, status: "passed" });
    expect(reporter.calls).toHaveLength(1);
  });

  test("on-failure — skips when status is passed", async () => {
    const reporter = makeStubReporter({ send: "on-failure" });
    await reporter.onEnd({ ...mockResult, status: "passed" });
    expect(reporter.calls).toHaveLength(0);
  });

  test("on-failure — sends when status is failed", async () => {
    const reporter = makeStubReporter({ send: "on-failure" });
    await reporter.onEnd({ ...mockResult, status: "failed" });
    expect(reporter.calls).toHaveLength(1);
  });
});
