---
title: "Component Introspection"
description: "Use the framework selector packages to inspect React, Vue, and Angular component state from Playwright tests."
---

The selector packages all follow the same model: register a framework-aware selector engine in the worker, then expose a typed wrapper around a Playwright `Locator`.

<Steps>
<Step>

### Pick the framework package

<Tabs items={["React", "Vue", "Angular"]}>
<Tab value="React">

```bash
pnpm add -D @playwright-labs/selectors-react
```

</Tab>
<Tab value="Vue">

```bash
pnpm add -D @playwright-labs/selectors-vue
```

</Tab>
<Tab value="Angular">

```bash
pnpm add -D @playwright-labs/selectors-angular
```

</Tab>
</Tabs>

</Step>
<Step>

### Use the framework-specific helper in tests

<Tabs items={["React", "Vue", "Angular"]}>
<Tab value="React">

```ts
import { test, expect } from "@playwright-labs/selectors-react";

test("reads props and state", async ({ page, $r }) => {
  await page.goto("/");
  await expect(page.locator("react=Button")).toBeReactComponent();
  await expect(await $r("react=Counter").first().state<{ "0": number }>()).toEqual({ "0": 0 });
});
```

</Tab>
<Tab value="Vue">

```ts
import { test, expect } from "@playwright-labs/selectors-vue";

test("reads setup state", async ({ page, $v }) => {
  await page.goto("/");
  await expect(page.locator("vue=Button")).toBeVueComponent();
  await expect(await $v("vue=Counter").first().setup<{ count: number }>()).toEqual({ count: 0 });
});
```

</Tab>
<Tab value="Angular">

```ts
import { test, expect } from "@playwright-labs/selectors-angular";

test("reads inputs and signals", async ({ page, $ng }) => {
  await page.goto("/");
  await expect(await $ng("app-button").inputs()).toContain("label");
  await expect(await $ng("app-counter").signal<number>("count")).toBe(0);
});
```

</Tab>
</Tabs>

</Step>
<Step>

### Run against a debug-friendly build

The example apps under [`examples/selectors-react`](/workspace/home/playwright-labs/examples/selectors-react), [`examples/selectors-vue`](/workspace/home/playwright-labs/examples/selectors-vue), and [`examples/selectors-angular`](/workspace/home/playwright-labs/examples/selectors-angular) are intentionally simple development builds. That matters because the selector engines rely on framework internals such as React fiber metadata, Vue app instances, or Angular’s `window.ng`.

</Step>
</Steps>

<Callout type="warn">Do not assume selector introspection will behave the same in heavily optimized production bundles. The source code in `packages/selectors-*/src/fixture.ts` is explicit about those runtime dependencies.</Callout>
