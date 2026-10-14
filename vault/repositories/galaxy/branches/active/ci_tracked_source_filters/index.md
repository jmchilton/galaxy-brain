# ci_tracked_source_filters

Status: READY — `branches_implemented_needs_ci`. Requested by John on 2026-10-14 following merged PR [#23999](https://github.com/galaxyproject/galaxy/pull/23999). No PR opened.

- [Implementation handoff](implementation_debrief.md)
- [Initial implementation](initial_implementation_debrief.md)
- [Validation](validation.md)
- [Normal review](subagents/normal_review.md)
- [Code-quality review](thermo_nuclear_review.md)
- [Scope evaluation](scope_evaluation.md)

Branch: [ci_tracked_source_filters](https://github.com/jmchilton/galaxy/tree/ci_tracked_source_filters). Commit: `f42c9e5e5452121d9aa7f4ea346312e8dced68cf`. Base: `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` (`origin/dev`).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_tracked_source_filters`.

Restore real lib source triggers and Selenium exclusions while retaining package filters: 59 additions across 25 workflows. All independent reviews passed; scope stays as implemented. Local parsed-filter checks, real Git symlink-path verification and commit-time workflow validation passed. GitHub CI remains pending.

Handoff notes and queue entry committed locally. Vault push deferred to preserve the 94 pre-existing unpublished commits from unrelated work.
