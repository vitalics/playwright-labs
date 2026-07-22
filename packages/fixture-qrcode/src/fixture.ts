import {
  expect as baseExpect,
  test as baseTest,
  Locator,
  LocatorScreenshotOptions,
} from "@playwright/test";
import {
  QRCodeDecoder,
  type DecodedQRCode,
} from "@playwright-labs/qrcode-core";

export type Fixture = {
  useQRCodeDecode(
    locator: Locator,
    options?: LocatorScreenshotOptions,
  ): Promise<DecodedQRCode | null>;
};

const decoder = new QRCodeDecoder();

async function decodeLocator(
  locator: Locator,
  options?: LocatorScreenshotOptions,
): Promise<DecodedQRCode | null> {
  const screen = await locator.screenshot(options);
  return decoder.decode(screen);
}

export const test = baseTest.extend<Fixture>({
  useQRCodeDecode: async ({}, use) => {
    use(async (loc, opts) => {
      return decodeLocator(loc, opts);
    });
  },
});

function matchesExpected(
  decoded: string | null,
  expected?: string | RegExp,
): boolean {
  if (decoded === null) return false;
  if (expected === undefined) return true;
  return expected instanceof RegExp
    ? expected.test(decoded)
    : decoded === expected;
}

export const expect = baseExpect.extend({
  async toHaveQRCode(
    locator: Locator,
    expected?: string | RegExp,
    options?: LocatorScreenshotOptions,
  ) {
    const assertionName = "toHaveQRCode";
    let decoded: string | null = null;
    let error: unknown;
    try {
      decoded = (await decodeLocator(locator, options))?.data ?? null;
    } catch (e) {
      error = e;
    }

    const pass = matchesExpected(decoded, expected);
    return {
      name: assertionName,
      pass,
      expected,
      actual: decoded,
      message: () => {
        if (error) {
          return `${assertionName}: failed to decode QR code: ${String(error)}`;
        }
        const expectation = this.isNot ? "not to contain" : "to contain";
        return `Expected locator ${expectation} QR code ${this.utils.printExpected(expected ?? "<any>")}, decoded: ${this.utils.printReceived(decoded)}`;
      },
    };
  },
});
