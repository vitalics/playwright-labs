import { test, expect, NETWORK_PRESETS, NO_THROTTLING } from "../src/index";

test.describe("network fixture", () => {
  test("start applies condition, navigator.onLine reflects offline", async ({
    page,
    network,
  }) => {
    await page.goto("about:blank");
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);

    await network.start("Offline");
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);

    await network.stop();
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  });

  test("start returns the resolved preset", async ({ network }) => {
    const condition = await network.start("Regular3G");
    expect(condition).toBe(NETWORK_PRESETS.Regular3G);
    expect(network.condition).toBe(NETWORK_PRESETS.Regular3G);
  });

  test("useNetwork targets a specific page", async ({
    context,
    useNetwork,
  }) => {
    const other = await context.newPage();
    const network = await useNetwork(other);

    await network.start("Offline");
    expect(await other.evaluate(() => navigator.onLine)).toBe(false);
  });

  test("offline page fails to fetch", async ({ page, network }) => {
    await page.goto("about:blank");
    await network.start("Offline");

    const failed = await page.evaluate(() =>
      fetch("http://127.0.0.1:1/unreachable").then(
        () => false,
        () => true,
      ),
    );
    expect(failed).toBe(true);
  });
});

test.describe("matchers", () => {
  test("toBeNetworkStarted, with .not before start", async ({ network }) => {
    expect(network).not.toBeNetworkStarted();
    await network.start("WiFi");
    expect(network).toBeNetworkStarted();
  });

  test("toBeNetworkOffline", async ({ network }) => {
    await network.start("Offline");
    expect(network).toBeNetworkOffline();

    await network.start("WiFi");
    expect(network).not.toBeNetworkOffline();
  });

  test("toBeNetworkThrottled: presets pass, NoThrottling fails", async ({
    network,
  }) => {
    await network.start("GPRS");
    expect(network).toBeNetworkThrottled();

    await network.start("NoThrottling");
    expect(network).not.toBeNetworkThrottled();
  });

  test("toHaveNetworkCondition: preset name and partial object", async ({
    network,
  }) => {
    await network.start("Regular3G");

    expect(network).toHaveNetworkCondition("Regular3G");
    expect(network).toHaveNetworkCondition({ latency: 100 });
    expect(network).not.toHaveNetworkCondition("WiFi");
    expect(network).not.toHaveNetworkCondition({ offline: true });
  });

  test("toHaveNetworkCondition throws on unknown preset", async ({
    network,
  }) => {
    await network.start("WiFi");
    expect(() =>
      expect(network).toHaveNetworkCondition("LTE" as never),
    ).toThrow(/unknown preset "LTE"/);
  });

  test("matchers accept the page instead of the NetworkAPI", async ({
    page,
    network,
  }) => {
    await network.start("Offline");
    expect(page).toBeNetworkOffline();
    expect(page).toBeNetworkStarted();
    expect(page).toHaveNetworkCondition({ offline: true });
  });

  test("asserting on a page without a network handle throws a hint", async ({
    context,
    network,
  }) => {
    await network.start("WiFi"); // unrelated handle for the default page
    const other = await context.newPage();
    expect(() => expect(other).toBeNetworkStarted()).toThrow(
      /call useNetwork\(page\)/,
    );
  });

  test("stop resets matcher state", async ({ network }) => {
    await network.start("GPRS");
    await network.stop();

    expect(network).not.toBeNetworkStarted();
    expect(network).not.toBeNetworkThrottled();
    expect(network.condition).toBeNull();
  });
});

test.describe("presets sanity", () => {
  test("NoThrottling preset equals NO_THROTTLING constant", () => {
    expect(NETWORK_PRESETS.NoThrottling).toEqual(NO_THROTTLING);
  });
});
