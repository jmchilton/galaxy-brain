---
upstream_base_branch: main
related_records:
  - foundry/issues/723
  - foundry/branches/issue-678-capability-gap-route
---
# Authoring gate: author only on a discovery miss

- [Open PR](https://github.com/AnastasiaSee/foundry/compare/fix/723-authoring-gate...jmchilton:foundry:issue-723-authoring-gate)
- [View on GitHub](https://github.com/jmchilton/foundry/tree/issue-723-authoring-gate)

## Status

Branch on `jmchilton`, fast-forward from #773's head `043f6d73` (main merged in), head `53d1b93e`. Worktree `~/projects/worktrees/foundry/branch/issue-723-authoring-gate`.

PR into `AnastasiaSee/foundry:fix/723-authoring-gate` not yet opened: the agent's `gh pr create` was blocked by the permission check; body in [pr_description.md](pr_description.md).

Local `make -k check` green except `check-vendored` (machine-only) and `validate-roadmap` (#768, also red on `main`).

## Decisions

- John, 2026-11-10: keep #773's authoring gate and drop its `unsuitable` status; the #678 half is [#778](https://github.com/galaxyproject/foundry/pull/778). No `unsuitable` text left in source. John's #773 comment says we'd push changes to her branch if she's fine with it; this goes as a PR into her branch instead.
- On her branch: merge `main`, revert `043f6d73`, then the gate and scenario commits.
- Gate: author only on `miss`, or on a `weak` candidate the caller's confirmation rejected (matches #778's `advance` wording). The discovery result is a declared `galaxy-tool-pin` input.
- Scenarios from pinned nf-core/rnaseq 3.24.0: `FASTP` hits `iuc/fastp/fastp`; `FQ_LINT` and `RIBODETECTOR` have no Tool Shed wrapper (`gxwf tool-search`, 2026-11-10). Processes that call `bin/` scripts were rejected as fixtures: the Nextflow summary carries only `script_excerpt`, not the script, and vendoring guidance is #710.
- Open: the "container-only evidence is mapped" eval property has no scenario; nf-core modules always carry `environment.yml`.
