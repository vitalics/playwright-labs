# Ajv-ts fixture

## Get started

1. Install the package(s)

```sh
pnpm i @playwright/test
pnpm i ajv-ts
pnpm i @playwright-labs/fixture-ajv-ts
```

2. Add (or create) in your fixture

```ts
// file: fixture.ts
import { mergeExpects, mergeTests } from "@playwright/test";
import {
  expect as ajvTsExpect,
  test as ajvTsTests,
} from "@playwright-labs/fixture-ajv-ts";

export const expect = mergeExpects(ajvTsExpect);
export const test = mergeTests(ajvTsTests);
```

3. Use it!

```ts
import { test, expect } from "./fixture";

test("use some schema", async ({ schema }) => {
  const mySchema = schema.string();
  expect("qwe").toMatchSchema(mySchema); // OK
});
```

4. Or define schema separately and use it for test:

```ts
// api-response.ts
import { s } from "ajv-ts";

export const someResponse = s.object({
  data: s.string().or(s.number()),
});
```

```ts
import { someResponse } from "./api-response";
import { test, expect } from "./fixture";

test("use some schema", async () => {
  const resp = await fetch("https://example.com/data.json");
  expect(await resp.json()).toMatchSchema(someResponse);
});
```
