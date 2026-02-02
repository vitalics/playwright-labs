import { allLocales, Faker, type Randomizer } from "@faker-js/faker";
import { expect as baseExpect, test as baseTest } from "@playwright/test";

export type Fixture = {
  useFaker(options?: {
    /**
     * Locale to use for generating fake data.
     * @default 'en_US'
     */
    locale?: keyof typeof allLocales;
    randomizer?: Randomizer;
    seed?: number;
  }): Faker & Disposable;

  faker: Faker & Disposable;
};

const DEFAULT_LOCALE = "en_US";

export const test = baseTest.extend<Fixture>({
  // biome-ignore lint/correctness/noEmptyPattern: playwright default behavior
  useFaker: async ({}, use) => {
    let faker: (Faker & Disposable) | null = null;
    return use((options) => {
      const locale = allLocales[options?.locale ?? DEFAULT_LOCALE];
      faker = new Faker({
        locale,
        randomizer: options?.randomizer,
        seed: options?.seed,
      }) as never;

      Reflect.set(faker, Symbol.dispose, function (this: typeof faker) {
        if (faker) {
          faker = null;
        }
      });

      return faker;
    });
  },

  faker: async ({ useFaker }, use) => {
    const f = useFaker();
    await use(f);
    f[Symbol.dispose]();
  },
});

export const expect = baseExpect.extend({});
