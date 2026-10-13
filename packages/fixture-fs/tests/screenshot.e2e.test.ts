import { expect, test } from "../src/index";

test("screenshot interop — page.screenshot() into the virtual FS", async ({
  page,
  fs,
}) => {
  await page.setContent("<h1>fixture-fs</h1>");

  await fs.write("shot.png", await page.screenshot());

  await expect(fs).toExist("shot.png");
  const stat = await fs.stat("shot.png");
  expect(stat.size).toBeGreaterThan(0);
});
