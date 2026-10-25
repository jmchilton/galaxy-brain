# issue_24441_tool_shed_upload_dry_run

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_24441_tool_shed_upload_dry_run?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24441_tool_shed_upload_dry_run)

## Status

Implementation in progress (gx_workhorse).

Base: `dev` (`a468ce9de10`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24441_tool_shed_upload_dry_run`.

## Issue

Implements [#24441](https://github.com/galaxyproject/galaxy/issues/24441) (`vault/repositories/galaxy/issues/wip/24441/`).

## Decisions

- Base `dev`: new API feature plus a metadata manager refactor.
- Re-scoped per [scope evaluation](earlier_drafts/1/scope_evaluation.md): tool shed reset mode always isolates sample files (fixes `reset_metadata` sample-only tools / leaked copies / stale samples); dry run reports `installable`. Original scope kept as alt `issue_24441_tool_shed_upload_dry_run_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).
- Deferred to John: `new_data_manager_required` compares the wrong metadata key, so data manager changes never force a new installable revision (also on `release_25.1`/`26.0`). Fix flips a `dev` test assertion and changes real uploads; belongs on its own release-targeted branch. The dry run mirrors today's behavior.
