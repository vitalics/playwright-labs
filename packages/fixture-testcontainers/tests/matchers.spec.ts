import path from "path";
import { test, expect } from "../src/index.js";
import { Wait } from "testcontainers";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

test.describe("toBeContainerRunning", () => {
  test("passes for a started container", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    await expect(container).toBeContainerRunning();
  });
});

test.describe("toBeContainerStarted", () => {
  test("passes for a running container", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    await expect(container).toBeContainerStarted();
  });

  test("negation passes after container.stop()", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");
    await container.stop({ remove: false });

    await expect(container).not.toBeContainerStarted();
  });
});

test.describe("toBeContainerStopped", () => {
  test("passes after container.stop()", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");
    await container.stop({ remove: false });

    await expect(container).toBeContainerStopped();
  });

  test("negation passes for a running container", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    await expect(container).not.toBeContainerStopped();
  });
});

test.describe("toMatchContainerLogMessage", () => {
  test("passes when logs contain a matching string", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      waitStrategy: Wait.forLogMessage(/nginx/),
    });

    await expect(container).toMatchContainerLogMessage("nginx");
  });

  test("passes when logs match a RegExp", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      waitStrategy: Wait.forLogMessage(/start worker process/),
    });

    await expect(container).toMatchContainerLogMessage(/start worker process/i);
  });

  test("negation passes when string is absent from logs", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    await expect(container).not.toMatchContainerLogMessage(
      "FATAL_ERROR_THAT_DOES_NOT_EXIST",
    );
  });
});

test.describe("toBeContainerHealthy", () => {
  test("passes when HEALTHCHECK reports healthy", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      healthCheck: {
        test: ["CMD-SHELL", "exit 0"],
        interval: 1_000,
        timeout: 3_000,
        retries: 3,
      },
      waitStrategy: Wait.forHealthCheck(),
    });

    await expect(container).toBeContainerHealthy();
  });
});

test.describe("toHaveContainerLabel", () => {
  test("passes when label key is present", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      labels: { "app.tier": "web" },
    });

    expect(container).toHaveContainerLabel("app.tier");
  });

  test("passes when label key and value match", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      labels: { "app.env": "staging" },
    });

    expect(container).toHaveContainerLabel("app.env", "staging");
  });

  test("negation passes when label key is absent", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).not.toHaveContainerLabel("nonexistent.label");
  });

  test("negation passes when label value does not match", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", {
      labels: { "app.env": "staging" },
    });

    expect(container).not.toHaveContainerLabel("app.env", "production");
  });
});

test.describe("toBeContainerPort", () => {
  test("passes for an exposed and mapped port", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toBeContainerPort(80);
  });

  test("negation passes when port is not mapped", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).not.toBeContainerPort(9999);
  });
});

test.describe("toHaveContainerName", () => {
  test("passes for an exact name string", async ({ useContainer }) => {
    const name = `tc-name-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    expect(container).toHaveContainerName(name);
  });

  test("negation passes when name does not match exactly", async ({ useContainer }) => {
    const name = `tc-name-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    // substring — should NOT pass for toHaveContainerName (exact match only)
    expect(container).not.toHaveContainerName("tc-name");
  });
});

test.describe("toHaveContainerNetwork", () => {
  test("passes for the default bridge network", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).toHaveContainerNetwork("bridge");
  });

  test("negation passes for a non-connected network", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).not.toHaveContainerNetwork("nonexistent-network");
  });
});

test.describe("toHaveContainerUser", () => {
  test("passes when the exact user matches", async ({ useContainer }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toHaveContainerUser("nobody");
  });

  test("passes when any non-empty user is set (no argument)", async ({
    useContainer,
  }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toHaveContainerUser();
  });
});

test.describe("toMatchContainerUser", () => {
  test("passes for a substring of the user", async ({ useContainer }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toMatchContainerUser("no");
  });

  test("passes for a matching RegExp", async ({ useContainer }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toMatchContainerUser(/^nobody$/);
  });

  test("negation passes when user does not contain the substring", async ({
    useContainer,
  }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).not.toMatchContainerUser("root");
  });
});

test.describe("toMatchContainerPortInRange", () => {
  test("passes when mapped port is within bounded range", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, { min: 1024, max: 65535 });
  });

  test("passes with only lower bound", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, { min: 1024 });
  });

  test("passes with only upper bound", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, { max: 65535 });
  });

  test("passes with empty range object (any port)", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, {});
  });

  test("passes with null bounds (any port)", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, { min: null, max: null });
  });

  test("passes with ±Infinity bounds (any port)", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80, { min: -Infinity, max: Infinity });
  });

  test("passes without range argument (any mapped port)", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).toMatchContainerPortInRange(80);
  });

  test("negation passes when mapped port is outside range", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine", { ports: 80 });

    expect(container).not.toMatchContainerPortInRange(80, { min: 1, max: 1023 });
  });

  test("negation passes when port is not exposed", async ({ useContainer }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).not.toMatchContainerPortInRange(9999, { min: 1024, max: 65535 });
  });
});

test.describe("toMatchContainerName", () => {
  test("passes for a substring of the name", async ({ useContainer }) => {
    const name = `tc-match-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    expect(container).toMatchContainerName("tc-match");
  });

  test("passes for a matching RegExp", async ({ useContainer }) => {
    const name = `tc-match-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    expect(container).toMatchContainerName(/tc-match-\d+/);
  });

  test("negation passes when name does not contain the substring", async ({
    useContainer,
  }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).not.toMatchContainerName("nonexistent-string-xyz");
  });
});

test.describe("Intl.Collator support", () => {
  const caseInsensitive = new Intl.Collator("en", { sensitivity: "base" });

  test("toMatchContainerLogMessage: case-insensitive match via collator", async ({
    useContainer,
  }) => {
    const container = await useContainer("nginx:alpine", {
      waitStrategy: Wait.forLogMessage(/nginx/),
    });

    // logs contain "nginx" (lowercase) — collator makes "NGINX" match too
    await expect(container).toMatchContainerLogMessage("NGINX", caseInsensitive);
  });

  test("toMatchContainerName: case-insensitive match via collator", async ({
    useContainer,
  }) => {
    const name = `tc-collator-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    expect(container).toMatchContainerName("TC-COLLATOR", caseInsensitive);
  });

  test("toHaveContainerName: case-insensitive exact match via collator", async ({
    useContainer,
  }) => {
    const name = `tc-collator-exact-${Date.now()}`;
    const container = await useContainer("nginx:alpine", { name });

    expect(container).toHaveContainerName(name.toUpperCase(), caseInsensitive);
  });

  test("toHaveContainerLabel: case-insensitive value match via collator", async ({
    useContainer,
  }) => {
    const container = await useContainer("nginx:alpine", {
      labels: { "app.env": "Staging" },
    });

    expect(container).toHaveContainerLabel("app.env", "staging", caseInsensitive);
  });

  test("toMatchContainerUser: case-insensitive substring via collator", async ({
    useContainer,
  }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toMatchContainerUser("NOBODY", caseInsensitive);
  });

  test("toHaveContainerUser: case-insensitive exact match via collator", async ({
    useContainer,
  }) => {
    const container = await useContainer("alpine:3.19", {
      user: "nobody",
      command: ["sleep", "infinity"],
    });

    await expect(container).toHaveContainerUser("NOBODY", caseInsensitive);
  });

  test("toHaveContainerNetwork: case-insensitive network match via collator", async ({
    useContainer,
  }) => {
    const container = await useContainer("nginx:alpine");

    expect(container).toHaveContainerNetwork("BRIDGE", caseInsensitive);
  });
});

test.describe("Intl.Collator fr locale", () => {
  const frCollator = new Intl.Collator("fr", { sensitivity: "base" });

  test("toMatchContainerLogMessage: finds 'bonjour' in logs with fr collator (case-insensitive)", async ({
    useContainerFromDockerFile,
  }) => {
    const container = await useContainerFromDockerFile(
      FIXTURES_DIR,
      "Dockerfile.french",
      { waitStrategy: Wait.forLogMessage("Bonjour") },
    );

    await expect(container).toMatchContainerLogMessage("bonjour", frCollator);
  });
});
