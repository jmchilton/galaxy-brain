---
upstream_base_branch: main
pr: 766
---
# Bump planemo pin to 0.75.48

- [Open PR](https://github.com/galaxyproject/foundry/pull/766)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-765-bump-planemo)

## Status

Branch `issue-765-bump-planemo` on `jmchilton`, base `main`; `~/projects/worktrees/foundry/branch/issue-765-bump-planemo`. Closes #765.

PR [#766](https://github.com/galaxyproject/foundry/pull/766) is open and not a draft. John asked for it on 2026-11-09.

CI pending at `01d2b587`. Locally, `make check` is green except `check-vendored`, which fails on this machine only; the gxwf-pi-harness container test passes against a locally built 0.75.48 image.
