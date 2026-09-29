Supersedes #22856. Stacked on #23668 — review that first; this branch contains its commit.

## What

Bumps vitest in the Tool Shed frontend from 1.6.1 to 3.2.7, and `@vitest/ui` with it.

## Why not just merge #22856

Two reasons.

It targets 3.2.6 and has not been rebased since July. More importantly, it moves `vitest` to `^3.2.6` while leaving `@vitest/ui` at `^1.0.0` — but vitest's peer range for `@vitest/ui` is an exact version match, so that PR lands the two on incompatible majors. `pnpm test:ui` is the only thing that would notice, which is presumably why it went unremarked.

## Why 3.2.7 and not 4 or 5

vitest 4 peers on `vite ^6 || ^7 || ^8`; this package is on vite 5. So 3.x is the ceiling until vite moves, and vite does not move alone:

- `@quasar/vite-plugin@1.x` accepts vite up to ^7, so vite 7 + vitest 4 is reachable today.
- Going to vite 8 — where `client/` already is, on vitest ^4.1.5 — requires `@quasar/vite-plugin@2`, which peers on `quasar ^2.24.0`. This package is on quasar 2.18.6.

So the ordering is: quasar to 2.24+, then `@quasar/vite-plugin` 2 and vite 8, then vitest 4 and parity with `client/`. The quasar half of that is #23666. Nothing here blocks or depends on it — this is the part that can land once #23668 does.

## Why it is stacked

Rebased onto #23668 deliberately. On `dev` alone, nothing in CI runs these tests — the Toolshed workflow only builds the frontend — so a test-runner bump would have been verifiable by hand and nowhere else. With #23668 underneath, the "Tool Shed frontend" workflow runs `pnpm test:run` against this change, which is the only way the bump is actually gated.

It also means the suite is green rather than green-except-one: #23668 fixes the pre-existing `RevisionsTab` invalid-tools assertion, which was broken independently of the test runner.

The rebase was clean, including the lockfile, and both dependency sets resolve as intended — vitest 3.2.7, `@vitest/ui` 3.2.7, prettier 3.6.2, eslint-plugin-prettier 5.5.6.

## Verified

Under node 22.20.0 and the pinned pnpm 10.26.1, on the rebased branch:

- `pnpm install --frozen-lockfile` clean, lockfile unchanged afterwards.
- `pnpm typecheck` clean.
- `pnpm lint` — 0 errors.
- `pnpm test:run` — 95 passed, 0 failed.
- `pnpm build` clean.

Before the rebase, against `dev`: 94 passed, 1 failed — identical to the vitest 1.6.1 baseline, same test and same message. So the bump itself changed no behaviour; the difference above is #23668's test fix, not vitest 3.

No config changes were needed: `vitest.config.ts` and `vitest.setup.ts` work unmodified across the three majors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
