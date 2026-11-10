---
upstream_base_branch: main
pr: 766
related_records: foundry/branches/issue-775-verification-workflow-lint
---
# Bump planemo pin to 0.75.48

- [Open PR](https://github.com/galaxyproject/foundry/pull/766)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-765-bump-planemo)

## Status

Branch `issue-765-bump-planemo` on `jmchilton`, base `main`; `~/projects/worktrees/foundry/branch/issue-765-bump-planemo`. Closes #765.

PR [#766](https://github.com/galaxyproject/foundry/pull/766) merged 2026-11-09.

CI green at `01d2b587`, including all verification workflows under 0.75.48 on release_26.1. The continue-on-error lint step exits 2 identically under 0.75.47 (pre-existing: `planemo lint` on `.gxwf.yml`). Locally `check-vendored` fails on this machine only; the gxwf-pi-harness container test passes.

## Follow-ups

- Verification lint step: tracked as [#775](https://github.com/galaxyproject/foundry/issues/775), branch `issue-775-verification-workflow-lint`.
- `check:planemo-cli` output depends on unpinned click; click 8.4 vs 8.5 changes flag defaults in the CLI pages.
