# issue_24441_tool_shed_upload_dry_run

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24441_tool_shed_upload_dry_run?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24441_tool_shed_upload_dry_run)

## Status

Status: `branches_ready_for_final_review`. Polished 2026-10-25 ([debrief](polish_debrief.md)); waiting on John's read-through of [pr_description.md](pr_description.md), [pr_titles.md](pr_titles.md) and [pr_tags.md](pr_tags.md).

No PR yet.

Fork CI green on `574ce683a19`.

Base: `dev` (`a468ce9de10`), head `574ce683a19`; alt `issue_24441_tool_shed_upload_dry_run_alt_original_scope`. Fork: `jmchilton/issue_24441_tool_shed_upload_dry_run`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24441_tool_shed_upload_dry_run`.

## Issue

Implements [#24441](https://github.com/galaxyproject/galaxy/issues/24441) (`vault/repositories/galaxy/issues/wip/24441/`).

## Decisions

- Base `dev`: new API feature plus a metadata manager refactor.
- Re-scoped per [scope evaluation](earlier_drafts/1/scope_evaluation.md): tool shed reset mode always isolates sample files (fixes `reset_metadata` sample-only tools / leaked copies / stale samples); dry run reports `installable`. Original scope kept as alt `issue_24441_tool_shed_upload_dry_run_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)). Second [scope evaluation](scope_evaluation.md): as implemented.
- Deferred to John: `new_data_manager_required` compares the wrong metadata key, so data manager changes never force a new installable revision (also on `release_25.1`, `26.0`, `26.1`, `26.2`). Fix flips a `dev` test assertion and changes real uploads; belongs on its own release-targeted branch. The dry run mirrors today's behavior.
- Deferred to John: real uploads also check `tool_data_table_conf.xml.sample` against the process's in-memory tables (ephemeral, per-worker state); the dry run checks against throwaway tables. Upload-side follow-up options in [scope evaluation](scope_evaluation.md) ([codex review](codex_review.md)).
- Rejections before the commit raise like a real upload; post-commit errors (invalid tools, no utilities, generation failures) return `ok: false`; upload equal to tip returns `no_changes`.
- Reset fix (`4a7ff284e3b` + `b6f362b2bbc`) also extracted onto `release_26.1` as [`reset_metadata_sample_isolation_26.1`](../../merged/reset_metadata_sample_isolation_26.1/index.md) (2026-10-25); once it merges forward, rebase and drop them here, and update the description.
- PR body should note the `reset_metadata` behaviour change (see [rescope debrief](implementation_rescope_debrief.md)).
