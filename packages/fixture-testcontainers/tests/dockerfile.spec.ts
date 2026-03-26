import path from "path";
import { test, expect } from "../src/index.js";

const FIXTURES_DIR = path.join(import.meta.dirname, "fixtures");

test.describe("useContainerFromDockerFile", () => {
  test("builds and starts a container from the context directory", async ({
    useContainerFromDockerFile,
  }) => {
    const container = await useContainerFromDockerFile(FIXTURES_DIR);

    expect(container.getHost()).toBeTruthy();
    expect(container.getId()).toBeTruthy();
  });

  test("built container has labels defined in the Dockerfile", async ({
    useContainerFromDockerFile,
  }) => {
    const container = await useContainerFromDockerFile(FIXTURES_DIR);

    expect(container).toHaveContainerLabel("test.fixture", "true");
    expect(container).toHaveContainerLabel("test.source", "dockerfile");
  });

  test("accepts an explicit Dockerfile path", async ({
    useContainerFromDockerFile,
  }) => {
    // dockerfilePath is relative to the build context, not an absolute path
    const container = await useContainerFromDockerFile(
      FIXTURES_DIR,
      "Dockerfile",
    );

    expect(container.getHost()).toBeTruthy();
  });

  test("ContainerOpts are applied on top of the built image", async ({
    useContainerFromDockerFile,
  }) => {
    const name = `tc-dockerfile-${Date.now()}`;
    const container = await useContainerFromDockerFile(
      FIXTURES_DIR,
      undefined,
      {
        name,
        labels: { "test.runtime": "playwright" },
      },
    );

    expect(container).toHaveContainerName(name);
    expect(container).toHaveContainerLabel("test.runtime", "playwright");
  });
});
