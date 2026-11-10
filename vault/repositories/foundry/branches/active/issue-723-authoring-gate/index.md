---
upstream_base_branch: main
related_records:
  - foundry/issues/723
  - foundry/branches/issue-678-capability-gap-route
---
# Authoring gate: author only on a discovery miss

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...jmchilton:foundry:issue-723-authoring-gate)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-723-authoring-gate)

## Status

Branch on `jmchilton`, base `origin/main` at `94ce4ea2`, head `c771c6a9`. Worktree `~/projects/worktrees/foundry/branch/issue-723-authoring-gate`.

No PR. Built off AnastasiaSee's draft [#773](https://github.com/galaxyproject/foundry/pull/773) for her to adopt (maintainer edits are allowed on her branch).

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (#768, also red on `main`).

## Decisions

- John, 2026-11-10: keep #773's authoring gate and drop its `unsuitable` status; the #678 half is [#778](https://github.com/galaxyproject/foundry/pull/778). No `unsuitable` text or history left in source.
- Rebuilt on current `main`: her gate commit `ad0104fc` cherry-picked with her authorship. Her `043f6d73` (`unsuitable` in `discover-shed-tool`) dropped, not reverted.
- Gate: author only on `miss`, or on a `weak` candidate the caller's confirmation rejected (matches #778's `advance` wording). The discovery result is a declared `galaxy-tool-pin` input.
- Scenarios rewritten for the domain review's concrete-fixture rule, from pinned nf-core/rnaseq 3.24.0: `FASTP` hits `iuc/fastp/fastp`; `MULTIQC_CUSTOM_BIOTYPE` (`bin/mqc_features_stat.py`) and `DESEQ2_QC` (`bin/deseq2_qc.r`) miss. Checked with `gxwf tool-search` on 2026-11-10.
