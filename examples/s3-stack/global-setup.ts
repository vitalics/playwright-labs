import { execSync } from "node:child_process";
import path from "node:path";

const EXAMPLE_DIR = path.resolve(import.meta.dirname);

function waitForUrl(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then((r) => (r.ok ? resolve() : retry()))
        .catch(() => retry());
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`));
        return;
      }
      setTimeout(check, 1_000);
    };
    check();
  });
}

export default async function globalSetup() {
  console.log("[example] Starting MinIO via docker compose…");

  execSync("docker compose up -d --wait", {
    cwd: EXAMPLE_DIR,
    stdio: "inherit",
  });

  console.log("[example] Waiting for MinIO…");
  await waitForUrl("http://localhost:9000/minio/health/ready");

  console.log("[example] Infrastructure ready.");
  console.log("[example] MinIO console → http://localhost:9001 (minioadmin / minioadmin)");
}
