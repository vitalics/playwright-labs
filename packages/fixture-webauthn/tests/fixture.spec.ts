import { expect, test } from "../src/fixture.js";
import { WebAuthn } from "../src/webauthn.js";

test.describe("webauthn fixture", () => {
  test("provides a ready-to-use WebAuthn instance", async ({ webauthn }) => {
    expect(webauthn).toBeInstanceOf(WebAuthn);
    expect(webauthn.isEnabled).toBe(false);

    await webauthn.enable();

    expect(webauthn).toBeWebAuthnEnabled();
  });

  test("useWebAuthn() creates independent instances", async ({
    useWebAuthn,
    page,
  }) => {
    const a = await useWebAuthn(page);
    const b = await useWebAuthn(page);

    await a.enable();

    expect(a).toBeWebAuthnEnabled();
    expect(b).not.toBeWebAuthnEnabled();
  });

  test("addVirtualAuthenticator() end to end via the fixture", async ({
    webauthn,
  }) => {
    await webauthn.enable();

    const authenticator = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    });

    expect(webauthn).toHaveVirtualAuthenticators(1);
    await expect(authenticator).toHaveCredentials(0);
  });
});
