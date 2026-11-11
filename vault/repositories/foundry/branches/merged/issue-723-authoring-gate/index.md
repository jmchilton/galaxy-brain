---
upstream_base_branch: main
related_records:
  - foundry/issues/723
  - foundry/branches/issue-678-capability-gap-route
pr: 773
---
# Authoring gate: author only on a discovery miss

- [PR #773](https://github.com/galaxyproject/foundry/pull/773)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-723-authoring-gate)

## Status

Pushed to AnastasiaSee's `fix/723-authoring-gate` with her go-ahead on #773, plus a second `main` merge after #778 and #785, head `3c34e72f`. Worktree `~/projects/worktrees/foundry/branch/issue-723-authoring-gate`.

#773 merged 2026-11-11 as `3060503e`, on John's instruction; follow-ups go in new PRs. [pr_description.md](pr_description.md) was never used.

Fork CI (`Packages`) was waiting for approval and didn't run. Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (#783 missing from the roadmap, also red on `main`).

## Decisions

- John, 2026-11-10: keep #773's authoring gate and drop its `unsuitable` status; the #678 half is [#778](https://github.com/galaxyproject/foundry/pull/778). No `unsuitable` text left in source. She agreed on #773 (2026-11-11) to our pushing to her branch.
- On her branch: merge `main`, revert `043f6d73`, then the gate and scenario commits.
- Gate: author only on `miss`, or on a `weak` candidate the caller's confirmation rejected (matches #778's `advance` wording). The discovery result is a declared `galaxy-tool-pin` input.
- Scenarios from pinned nf-core/rnaseq 3.24.0: `FASTP` hits `iuc/fastp/fastp`; `FQ_LINT` and `RIBODETECTOR` have no Tool Shed wrapper (`gxwf tool-search`, 2026-11-10). Processes that call `bin/` scripts were rejected as fixtures: the Nextflow summary carries only `script_excerpt`, not the script, and vendoring guidance is #710.
- Open: the "container-only evidence is mapped" eval property has no scenario; nf-core modules always carry `environment.yml`.
