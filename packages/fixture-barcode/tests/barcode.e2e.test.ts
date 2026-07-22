import { test, expect } from "../src/fixture";

test("sample EAN13", async ({ page, useBarcodeDecode }) => {
  await page.goto("");
  const imgLocator = page.locator("#EAN13").locator("img");
  const parsed = await useBarcodeDecode(imgLocator, "ean-13");

  expect(parsed).toBeTruthy();
});

test("sample CODE128", async ({ page, useBarcodeDecode }) => {
  await page.goto("");
  const imgLocator = page.locator("#CODE128").locator("img");
  const parsed = await useBarcodeDecode(imgLocator, "code-128");

  expect(parsed).toBeTruthy();
});
