# ci_tracked_source_filters

Status: READY — `branches_implemented_needs_ci`. Requested by John on 2026-10-14 following merged PR [#23999](https://github.com/galaxyproject/galaxy/pull/23999). No PR opened.

- [Implementation handoff](implementation_debrief.md)
- [Initial implementation](initial_implementation_debrief.md)
- [Validation](validation.md)
- [Revision normal review](subagents/simplification_review.md)
- [Initial normal review](subagents/normal_review.md)
- [Initial code-quality review](thermo_nuclear_review.md)
- [Initial scope evaluation](scope_evaluation.md)

Branch: [ci_tracked_source_filters](https://github.com/jmchilton/galaxy/tree/ci_tracked_source_filters). Commit: `b0a8d368d607d2d86300a28d0c9f284516750abf`. Base: `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` (`origin/dev`).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_tracked_source_filters`.

Restore real lib source triggers and Selenium exclusions; remove symlink-alias source filters while retaining real package policies: 59 additions and 23 deletions across 25 workflows. Initial and revision independent reviews passed; John explicitly simplified the source filters to the current tracked layout. Local parsed-filter checks, real Git symlink-path verification and commit-time workflow validation passed. GitHub CI remains pending.

Handoff notes and queue entry committed locally. Vault push deferred to preserve the 94 pre-existing unpublished commits from unrelated work.
