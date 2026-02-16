import { TestType, test as baseTest } from "@playwright/test";

import { makeDescribe } from "./decorator-describe";
import { test } from "./decorator-test";
import { param } from "./decorator-parameter";
import { makeStep } from "./decorator-step";
import { annotate } from "./decorator-annotate";
import { attachment } from "./decorator-attachment";
import { skip } from "./decorator-skip";
import { fixme } from "./decorator-fixme";
import { slow } from "./decorator-slow";
import { tag } from "./decorator-tag";
import { use } from "./decorator-use";
import { timeout } from "./decorator-timeout";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
} from "./decorator-lifecycle";
import { makeBaseTest } from "./baseTest";
import { before, after } from "./decorator-before-after";

type OptsInfered<T extends TestType<any, any>> =
  T extends TestType<infer O1, infer O2> ? O1 & O2 : {};

type Pretty<T> = {
  [K in keyof T]: T[K];
} & {};

export function makeDecorators<
  const T extends TestType<any, any>,
  const Opts extends {} & Record<string, any> = Pretty<OptsInfered<T>>,
>(pwTest: T, fixturesToExtract?: (fixtures: Opts) => Partial<Opts>) {
  // If a selector function is provided, extract the fixture keys
  let fixtureStrings: string[] | undefined;

  if (fixturesToExtract) {
    // Create a proxy that captures accessed property names
    const capturedKeys = new Set<string>();
    const fixtureProxy = new Proxy({} as Opts, {
      get(_target, prop) {
        if (typeof prop === "string") {
          capturedKeys.add(prop);
        }
        return undefined;
      },
    });

    // Call the selector function to capture which fixtures are accessed
    fixturesToExtract(fixtureProxy);

    // Convert the captured keys to an array
    fixtureStrings = Array.from(capturedKeys);
  }

  return {
    describe: makeDescribe<T>(pwTest, fixtureStrings),
    step: makeStep<T>(pwTest),
    BaseTest: makeBaseTest<T>(pwTest, fixtureStrings),
    test,
    param,
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    annotate,
    attachment,
    skip,
    fixme,
    slow,
    tag,
    use,
    before,
    after,
    timeout,
  };
}
