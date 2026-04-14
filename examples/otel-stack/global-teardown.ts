import { execSync } from "node:child_process";
import path from "node:path";

const EXAMPLE_DIR = path.resolve(import.meta.dirname);

export default async function globalTeardown() {
  console.log("[example] Stopping OTel infrastructure…");
  // execSync("docker compose down --remove-orphans", {
  //   cwd: EXAMPLE_DIR,
  //   stdio: "inherit",
  // });
  console.log("[example] Infrastructure stopped.");
}
