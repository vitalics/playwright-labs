import { execSync } from "node:child_process";
import path from "node:path";

const EXAMPLE_DIR = path.resolve(import.meta.dirname);

function waitForUrl(url: string, timeoutMs = 60_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      fetch(url)
        .then((r) => {
          if (r.ok || r.status < 500) {
            resolve();
          } else {
            retry();
          }
        })
        .catch(() => retry());
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(
          new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`),
        );
        return;
      }
      setTimeout(check, 1_000);
    };
    check();
  });
}

export default async function globalSetup() {
  console.log("[example] Starting OTel infrastructure via docker compose…");

  execSync("docker compose up -d --wait", {
    cwd: EXAMPLE_DIR,
    stdio: "inherit",
  });

  console.log("[example] Waiting for OTel Collector health check…");
  await waitForUrl("http://localhost:13133/");

  console.log("[example] Waiting for Jaeger UI…");
  await waitForUrl("http://localhost:16686/");

  console.log("[example] Waiting for Prometheus…");
  await waitForUrl("http://localhost:9090/-/ready");

  console.log("[example] Waiting for Grafana…");
  await waitForUrl("http://localhost:3000/api/health");

  console.log("[example] Infrastructure ready.");
  console.log("[example] UIs available:");
  console.log("[example]   Jaeger    → http://localhost:16686");
  console.log("[example]   Prometheus → http://localhost:9090");
  console.log("[example]   Grafana   → http://localhost:3000");
}
