import {
  expect as baseExpect,
  test as baseTest,
  Locator,
  LocatorScreenshotOptions,
} from "@playwright/test";
import { BarcodeDecoder, type Barcode } from "@playwright-labs/barcode-core";

export type { Barcode };

export type Fixture = {
  useBarcodeDecode(
    locator: Locator,
    barcode: Barcode,
    options?: LocatorScreenshotOptions,
  ): Promise<string>;
};

const decoder = new BarcodeDecoder();

async function decodeLocator(
  locator: Locator,
  barcode: Barcode,
  options?: LocatorScreenshotOptions,
): Promise<string> {
  const screen = await locator.screenshot(options);
  return decoder.decode(barcode, screen);
}

export const test = baseTest.extend<Fixture>({
  useBarcodeDecode: async ({}, use) => {
    use(async (loc, barcode, opts) => {
      return decodeLocator(loc, barcode, opts);
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
  async toHaveBarcode(
    locator: Locator,
    barcode: Barcode,
    expected?: string | RegExp,
    options?: LocatorScreenshotOptions,
  ) {
    const assertionName = "toHaveBarcode";
    let decoded: string | null = null;
    let error: unknown;
    try {
      decoded = await decodeLocator(locator, barcode, options);
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
        if (error && !this.isNot) {
          return `${assertionName}: failed to decode ${barcode}: ${String(error)}`;
        }
        const expectation = this.isNot ? "not to contain" : "to contain";
        return `Expected locator ${expectation} ${barcode} barcode ${this.utils.printExpected(expected ?? "<any>")}, decoded: ${this.utils.printReceived(decoded)}`;
      },
    };
  },
});
