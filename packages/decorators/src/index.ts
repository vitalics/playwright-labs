import { makeDecorators } from "./makeDecorators";
import { test as baseTest } from "@playwright/test";

export {
  DEFAULT_FIXTURE_KEYS,
  DEFAULT_PWSELF_KEYS,
} from "./decorator-describe";
export { makeDecorators } from "./makeDecorators";
export { expect } from "@playwright/test";

export * as pwTest from "@playwright/test";

export const {
  step,
  param,
  describe,
  test,
  beforeEach,
  beforeAll,
  afterEach,
  afterAll,
  tag,
  skip,
  fixme,
  slow,
  annotate,
  attachment,
  use,
  BaseTest,
  timeout,
  before,
  after,
} = makeDecorators(baseTest);

// Export types for use.define
export type {
  UseDefineOptions,
  FixtureDefinition,
} from "./decorator-use-define";
