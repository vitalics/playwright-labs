export default async function globalTeardown() {
  // The stack is intentionally left running so the uploaded objects can be
  // explored in the MinIO console (http://localhost:9001) and verified with
  // `pnpm verify`. Stop it with `pnpm infra:down`.
  console.log("[example] MinIO left running — `pnpm verify` to check uploads, `pnpm infra:down` to stop.");
}
