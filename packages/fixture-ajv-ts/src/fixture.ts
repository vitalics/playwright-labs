import { inspect } from "node:util";

import { expect as baseExpect, test as baseTest } from "@playwright/test";

import { type AnySchemaBuilder, s } from "ajv-ts";

export type AjvTsTestFixture = {
  /**
   * add ability to create custom schemas
   * @example
   * test('my test', ({ schema }) => {
   *   const a = schema.string();
   * });
   */
  schema: typeof s;
};

export const test = baseTest.extend<AjvTsTestFixture>({
  schema: async ({}, use) => {
    await use(s);
  },
});

test("qwe", ({ schema }) => {
  const a = schema.string();
});

export const expect = baseExpect.extend({
  /**
   * **[Custom Matcher]**
   * Compares incoming object with given schema
   * @example
   * import { s } from 'ajv-ts'
   * const StrSchema = s.string()
   * expect("qwe").toMatchSchema(StrSchema) // ok
   * expect(123).toMatchSchema(StrSchema) // error, not string
   */
  toMatchSchema(
    data: unknown,
    schema: AnySchemaBuilder,
    options?: { message?: string },
  ) {
    const assertionName = "toMatchSchema";
    let pass: boolean;

    const result = schema.safeParse(data);
    try {
      baseExpect(result.success, { message: options?.message }).toBe(true);
      pass = true;
    } catch (e) {
      pass = false;
    }

    const message = () =>
      `${this.utils.matcherHint(assertionName, undefined, undefined, {
        isNot: this.isNot,
      })}\n\n` +
      `Actual: ${this.utils.printReceived(JSON.stringify(data))} \n\n` +
      `JSON-schema: ${this.utils.printExpected(
        JSON.stringify(schema.schema),
      )}\n\n` +
      `Errors: ${inspect(result.error, {
        depth: Infinity,
      })}`;

    return {
      message,
      pass,
      name: assertionName,
      expected: schema.schema,
      actual: data,
    };
  },
});
