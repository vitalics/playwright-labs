# lock — Example

A runnable example showing how `@playwright-labs/fixture-lock` gives parallel Playwright workers exclusive, serialized access to a shared resource.

## What this example covers

| Feature | Where to look |
|---------|--------------|
| One lock server for the whole run (`globalSetup`) | `playwright.config.ts`, `global-setup.ts` |
| 4 parallel workers taking turns on one shared account | `tests/shared-account.spec.ts` |
| Proof of mutual exclusion — an exclusive (`wx`) marker file per holder | `tests/shared-account.spec.ts` |
| Publish data once, read it back by `id` only | `tests/readback-and-early-release.spec.ts` |
| Early `release()` to unblock waiters before test teardown | `tests/readback-and-early-release.spec.ts` |
| `useLock("id")` for an id nobody published → `data` is `undefined` | `tests/readback-and-early-release.spec.ts` |

## Quick start

```sh
# From the monorepo root:
pnpm --filter @playwright-labs/fixture-lock build
pnpm --filter lock-example test

# Or from this directory:
pnpm test
```

No external services needed — `global-setup.ts` starts an in-process `HttpLockServer` and exports `LOCK_SERVER_URL` to all workers.

## What to look at in the output

The four `admin changes …` tests run on four workers at once, but their durations grow (≈300ms, ≈600ms, ≈900ms, …): each one waits in `useLock` until the previous holder releases `admin-account`. If two of them ever held the lock together, the exclusive marker file would make the second one fail.

## Project structure

```
lock/
├── playwright.config.ts                 # fullyParallel, 4 workers, globalSetup
├── global-setup.ts                      # re-exports @playwright-labs/fixture-lock/global-setup
└── tests/
    ├── shared-account.spec.ts           # contention on one id across workers
    └── readback-and-early-release.spec.ts
```
