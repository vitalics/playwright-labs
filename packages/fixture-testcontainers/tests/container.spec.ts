import { test, expect } from "../src/index.js";
import { GenericContainer, Wait } from "testcontainers";

test.describe("useContainer", () => {
  test.describe("image argument", () => {
    test("accepts an image name string", async ({ useContainer }) => {
      const container = await useContainer("nginx:alpine");

      expect(container.getHost()).toBeTruthy();
      expect(container.getId()).toBeTruthy();
    });

    test("accepts a pre-configured GenericContainer instance", async ({
      useContainer,
    }) => {
      const generic = new GenericContainer("nginx:alpine").withExposedPorts(80);

      const container = await useContainer(generic);

      expect(container.getMappedPort(80)).toBeGreaterThan(0);
    });

    test("starts multiple containers independently", async ({ useContainer }) => {
      const [c1, c2] = await Promise.all([
        useContainer("nginx:alpine"),
        useContainer("redis:alpine"),
      ]);

      expect(c1.getHost()).toBeTruthy();
      expect(c2.getHost()).toBeTruthy();
      expect(c1.getId()).not.toBe(c2.getId());
    });
  });

  test.describe("ports option", () => {
    test("maps a single port to a random host port", async ({ useContainer }) => {
      const container = await useContainer("nginx:alpine", { ports: 80 });

      const mappedPort = container.getMappedPort(80);
      expect(mappedPort).toBeGreaterThan(0);
      expect(mappedPort).toBeLessThan(65536);
    });

    test("maps multiple ports at once", async ({ useContainer }) => {
      // Override wait strategy so testcontainers does not wait for 443 to be
      // bound — nginx only listens on 80, but the port binding is still created.
      const container = await useContainer("nginx:alpine", {
        ports: [80, 443],
        waitStrategy: Wait.forLogMessage(/nginx/),
      });

      expect(container.getMappedPort(80)).toBeGreaterThan(0);
      expect(container.getMappedPort(443)).toBeGreaterThan(0);
    });
  });

  test.describe("environment option", () => {
    test("env vars are accessible inside the container", async ({ useContainer }) => {
      const container = await useContainer("alpine:3.19", {
        environment: { MY_VAR: "hello_world" },
        command: ["sleep", "infinity"],
      });

      const result = await container.exec(["sh", "-c", "echo $MY_VAR"]);

      expect(result.output.trim()).toBe("hello_world");
    });

    test("multiple env vars are all set", async ({ useContainer }) => {
      const container = await useContainer("alpine:3.19", {
        environment: { FOO: "foo", BAR: "bar" },
        command: ["sleep", "infinity"],
      });

      const foo = await container.exec(["sh", "-c", "echo $FOO"]);
      const bar = await container.exec(["sh", "-c", "echo $BAR"]);

      expect(foo.output.trim()).toBe("foo");
      expect(bar.output.trim()).toBe("bar");
    });
  });

  test.describe("name option", () => {
    test("sets the Docker container name", async ({ useContainer }) => {
      const name = `tc-fixture-${Date.now()}`;
      const container = await useContainer("nginx:alpine", { name });

      expect(container.getName()).toContain(name);
    });
  });

  test.describe("labels option", () => {
    test("sets Docker labels on the container", async ({ useContainer }) => {
      const container = await useContainer("nginx:alpine", {
        labels: { "test.suite": "fixture", "test.env": "ci" },
      });

      const labels = container.getLabels();
      expect(labels["test.suite"]).toBe("fixture");
      expect(labels["test.env"]).toBe("ci");
    });
  });

  test.describe("command option", () => {
    test("overrides the default container command", async ({ useContainer }) => {
      const container = await useContainer("alpine:3.19", {
        command: ["sh", "-c", "echo overridden && sleep infinity"],
        waitStrategy: Wait.forLogMessage("overridden"),
      });

      expect(container.getId()).toBeTruthy();
    });
  });

  test.describe("waitStrategy option", () => {
    test("delays start until a log message appears", async ({ useContainer }) => {
      const container = await useContainer("nginx:alpine", {
        waitStrategy: Wait.forLogMessage(/start worker process/),
      });

      expect(container.getId()).toBeTruthy();
    });
  });
});
