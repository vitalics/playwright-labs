import { test, expect } from "../src/fixture";

test("sample QRCode", async ({ page, useQRCodeDecode }) => {
  await page.goto("");
  const imgLocator = page.locator("#QRCode").locator("img");
  const parsed = await useQRCodeDecode(imgLocator);

  expect(parsed?.data).toBeTruthy();
});
