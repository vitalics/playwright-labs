import { expect, test } from "@playwright/test";

import { isCredential } from "../src/types.js";

test.describe("isCredential", () => {
  test("accepts a minimal valid credential", () => {
    expect(
      isCredential({
        credentialId: "c1",
        isResidentCredential: true,
        privateKey: "key",
        signCount: 0,
      }),
    ).toBe(true);
  });

  test("accepts a credential with optional fields present", () => {
    expect(
      isCredential({
        credentialId: "c1",
        isResidentCredential: false,
        rpId: "localhost",
        privateKey: "key",
        userHandle: "handle",
        signCount: 3,
        userName: "dave@example.com",
        userDisplayName: "Dave",
      }),
    ).toBe(true);
  });

  test("survives a JSON round trip", () => {
    const credential = {
      credentialId: "c1",
      isResidentCredential: true,
      privateKey: "key",
      signCount: 0,
    };

    expect(isCredential(JSON.parse(JSON.stringify(credential)))).toBe(true);
  });

  test.describe("rejects malformed input", () => {
    for (const [name, value] of Object.entries({
      null: null,
      undefined: undefined,
      string: "not-an-object",
      "empty object": {},
      "missing privateKey": {
        credentialId: "c1",
        isResidentCredential: true,
        signCount: 0,
      },
      "wrong signCount type": {
        credentialId: "c1",
        isResidentCredential: true,
        privateKey: "key",
        signCount: "0",
      },
      "wrong isResidentCredential type": {
        credentialId: "c1",
        isResidentCredential: "true",
        privateKey: "key",
        signCount: 0,
      },
    })) {
      test(name, () => {
        expect(isCredential(value)).toBe(false);
      });
    }
  });
});
