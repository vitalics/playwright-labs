import { expect, test } from "../src/fixture.js";
import { WebAuthn } from "../src/webauthn.js";

test.describe("webauthn fixture", () => {
  test("provides a ready-to-use WebAuthn instance", async ({ webauthn }) => {
    expect(webauthn).toBeInstanceOf(WebAuthn);
    expect(webauthn.isEnabled).toBe(false);

    await webauthn.enable();

    expect(webauthn).toBeWebAuthnEnabled();
  });

  test("matchers accept the Page a WebAuthn was created for", async ({
    webauthn,
    page,
  }) => {
    expect(page).not.toBeWebAuthnEnabled();

    await webauthn.enable();
    const authenticator = await webauthn.addVirtualAuthenticator({
      protocol: "ctap2",
      transport: "internal",
    });

    expect(page).toBeWebAuthnEnabled();
    expect(page).toHaveVirtualAuthenticators(1);

    await authenticator.remove();

    expect(page).toHaveVirtualAuthenticators(0);
  });

  test("matchers throw a clear error for a Page with no WebAuthn created on it", async ({
    page,
  }) => {
    const otherPage = await page.context().newPage();

    expect(() => expect(otherPage).toBeWebAuthnEnabled()).toThrow(
      /No WebAuthn instance found for this page/,
    );

    await otherPage.close();
  });

  test("useWebAuthn() and its matchers also accept a Frame", async ({
    useWebAuthn,
    page,
  }) => {
    const frame = page.mainFrame();
    const webauthn = await useWebAuthn(frame);

    expect(frame).not.toBeWebAuthnEnabled();

    await webauthn.enable();

    expect(frame).toBeWebAuthnEnabled();
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
