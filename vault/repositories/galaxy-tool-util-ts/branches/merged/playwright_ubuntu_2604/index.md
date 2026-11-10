---
upstream_base_branch: main
pr: 223
---

# Bump Playwright to 1.65 for ubuntu-26.04 runners

- [PR #223](https://github.com/jmchilton/galaxy-tool-util-ts/pull/223)
- [View on GitHub](https://github.com/jmchilton/galaxy-tool-util-ts/tree/playwright_ubuntu_2604)

## Status

Merged at `b62910e6`; worktree removed.

PR #223 merged into `main` on 2026-11-10.

## Notes

- Why: `ubuntu-latest` now resolves to `ubuntu-26.04`. Playwright 1.59.1's `install --with-deps chromium` fails with "Playwright does not support chromium on ubuntu26.04-x64" ([run](https://github.com/jmchilton/galaxy-tool-util-ts/actions/runs/42734365864/job/129559846382), on dependabot PR #222). 26.04 is officially supported from 1.61.0.
- Changes: `playwright` and `@playwright/test` ranges raised to `^1.64.1` (lock resolves 1.65.0), plus an empty changeset.
