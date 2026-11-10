---
upstream_base_branch: main
---

# Bump Playwright to 1.65 for ubuntu-26.04 runners

- [Open PR](https://github.com/jmchilton/galaxy-tool-util-ts/compare/main...playwright_ubuntu_2604)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/playwright_ubuntu_2604)

## Status

Implemented and pushed at `b62910e6`, branched from `origin/main` `5327f62c`.

No PR yet.

No CI yet; it only runs on PRs. Locally, e2e gave 7 passed / 26 skipped (same as the last green `main` run), core browser tests passed, and lint and `changeset status` passed.

## Notes

- Why: `ubuntu-latest` now resolves to `ubuntu-26.04`. Playwright 1.59.1's `install --with-deps chromium` fails with "Playwright does not support chromium on ubuntu26.04-x64" ([run](https://github.com/jmchilton/galaxy-tool-util-ts/actions/runs/42734365864/job/129559846382), on dependabot PR #222). 26.04 is officially supported from 1.61.0.
- Changes: `playwright` and `@playwright/test` ranges raised to `^1.64.1` (lock resolves 1.65.0), plus an empty changeset.
- Worktree: `~/projects/worktrees/galaxy-tool-util-ts/branch/playwright_ubuntu_2604`.
