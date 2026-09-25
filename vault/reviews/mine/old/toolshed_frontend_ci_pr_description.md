## What

Adds a CI gate for `lib/tool_shed/webapp/frontend` and fixes the three things that were already broken behind its absence.

## Why

`.github/workflows/toolshed.yaml` is the only workflow that touches this package, and all it does is `pnpm install --frozen-lockfile && make client` — and `make client` is `pnpm build`. Nothing has ever run `pnpm lint` or `pnpm test:run` against it.

So nobody noticed that on `dev` today:

- `RevisionsTab > invalid tools > shows invalid tool paths when revision is expanded` fails. It asserts `expect(wrapper.text()).toContain(invalidTools[0])`, but `invalid_tools` entries are `{tool_config, error_message}` objects, so `toContain` is comparing a string against an object and can never pass. The component renders `tool_config`; the assertion just never named it.
- `pnpm lint` reports two `prettier/prettier` errors.

## The prettier fight

Worth calling out separately, because it is why the lint gate could not simply be switched on.

This package pins `prettier@^2.8.1`. `client/` and the repository's own pre-commit hook both use `prettier@3.6.2`. Prettier 3 defaults `trailingComma` to `all`; prettier 2 defaults it to `es5`. The result is that committing anything under this directory lets the pre-commit hook add trailing commas, which `eslint-plugin-prettier` then reports as errors — the two tools undo each other on every commit.

Moved to `prettier@^3.6.2` and `eslint-plugin-prettier@^5` (v4 does not support prettier 3), and reformatted: 19 lines across 15 files, all trailing commas. The pre-commit hook now passes on this directory instead of rewriting it.

Also added a `.prettierignore` for `*.json`, mirroring the hook's `exclude_types: [json]`. Without it `pnpm format` rewrites ~260 lines of JSON test fixtures that nothing lints and nothing else formats.

## Node

New `.node_version` (22.20.0, same as `client/`), read by both the new workflow and the existing frontend build step in `toolshed.yaml`, which had no `actions/setup-node` at all and was building on whatever the runner image shipped. Quasar 2.33 declares `engines: node >= 22`, so this stops being cosmetic as soon as that lands.

## The workflow

`.github/workflows/toolshed_frontend.yaml`, modelled on `client-unit.yaml` and `js_lint.yaml`: path-filtered to the frontend, `permissions: {}`, `persist-credentials: false`, node from `.node_version`, pnpm from `packageManager`, then typecheck, eslint, vitest. Build stays where it is in `toolshed.yaml` rather than being duplicated here.

`zizmor --persona=auditor` is clean on the new file. It reports one pre-existing unpinned `postgres:18` in `toolshed.yaml`, untouched here.

## Verified

Under node 22.20.0 and the pinned pnpm 10.26.1:

- `pnpm install --frozen-lockfile` clean, lockfile unchanged afterwards.
- `pnpm typecheck` clean.
- `pnpm lint` — 0 errors (10 warnings, see below).
- `pnpm test:run` — 95 passed, 0 failed. It was 94/1 before.
- `pnpm build` clean.
- `pre-commit` prettier passes on the changed files, which it did not before.

## Noticed, not fixed here

- Ten `@typescript-eslint/no-non-null-assertion` warnings remain. The gate runs plain `pnpm lint`, so warnings do not fail it. Adding `--max-warnings 0` would be the obvious follow-up once those are cleaned up.
- `dev`'s committed lockfile carries `libc:` fields that pnpm 10.26.1 — the version `packageManager` pins — strips on install, so some earlier commit used a newer pnpm than the file declares.
- `typescript@^4.3.2` and `vue-tsc@1.8.27` here versus `^5.7.3` and `2.2.12` in `client/`. Out of scope, but that gap is what keeps this package on old tooling generally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
