# ci_tracked_source_filters

Status: DRAFT — `draft_ready`. Requested by John on 2026-10-14 following merged PR [#23999](https://github.com/galaxyproject/galaxy/pull/23999). Draft PR [#24120](https://github.com/galaxyproject/galaxy/pull/24120) opened against `release_26.2` at John's request.

- [Release draft handoff](release_draft_2026-10-14.md)
- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Polish debrief](polish_debrief.md)
- [Polish checklist](polish_checklist.md)
- [Strengthening review](polish_strengthening.md)
- [Implementation handoff](implementation_debrief.md)
- [Initial implementation](initial_implementation_debrief.md)
- [Validation](validation.md)
- [Revision normal review](subagents/simplification_review.md)
- [Initial normal review](subagents/normal_review.md)
- [Initial code-quality review](thermo_nuclear_review.md)
- [Initial scope evaluation](scope_evaluation.md)

Branch: [ci_tracked_source_filters](https://github.com/jmchilton/galaxy/tree/ci_tracked_source_filters). Commit: `b0a8d368d607d2d86300a28d0c9f284516750abf`. Base: `8b729ff0050c32573ad0fa999e5e1b4d015dca8c` (`origin/release_26.2`).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/ci_tracked_source_filters`.

Restore real lib source triggers and Selenium exclusions; remove symlink-alias source filters while retaining real package policies: 59 additions and 23 deletions across 25 workflows. Initial and revision independent reviews passed; John explicitly simplified the source filters to the current tracked layout. Local parsed-filter checks, real Git symlink-path verification and commit-time workflow validation passed. GitHub CI remains pending; the 2026-10-14 live query found no failures. Polishing completed without code changes; John marked the human-read item complete and requested the release-target draft.

Handoff and polish notes and queue updates committed locally. Vault push deferred to preserve the pre-existing unpublished backlog from unrelated work.

Chosen title: `[26.2] Restore CI filters for tracked source paths after the uv workspace migration`. John requested rebase and draft creation on 2026-10-14 at reviewed SHA `b0a8d368d607d2d86300a28d0c9f284516750abf`. Keep this PR in draft pending further instruction; the user explicitly requested a draft.

## TICK — 2026-10-14

All 52 checks settled: 50 successful, two skipped. Mergeable on release_26.2 at b0a8d368d607. Moved to draft_ready; preserve the explicit instruction to keep draft pending further instruction.
