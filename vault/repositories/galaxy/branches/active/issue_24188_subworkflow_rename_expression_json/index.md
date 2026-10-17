# issue_24188_subworkflow_rename_expression_json

Status: implemented, normal review done; hardening in progress. Base: `release_26.1` (`b2b1e1deeee`). Head: `3e9b3664f9e`. Fork: `jmchilton/issue_24188_subworkflow_rename_expression_json`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24188_subworkflow_rename_expression_json`.

Fixes [#24188](https://github.com/galaxyproject/galaxy/issues/24188): `${label}` rename inside a subworkflow gives `<galaxy.model.HistoryDatasetAssociation(...)>` when the subworkflow text input is fed by an expression tool. Assigned to John.

[Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md)

## Decisions

- Base `release_26.1`: reporter's version; `read_expression_json` / `replace_expression_json_dataset` exist from 26.1. 25.1 and 26.0 have the bug but lack the helpers (the fix would need a backport of the expression.json reader), so no older base.
- All runtime replacements are resolved (not only names the PJAs reference). This keeps the second-order `${}` substitution after `#{input}` expansion working, per the Codex review.
- Forward merge to dev: keep the `effective_replacement_dict(step)` call in `ToolModule.execute` before dev's `_capture_workflow_tool_request_state`, so delayed iterations don't create orphan ToolRequests.

## Follow-ups

- A mapped expression collection feeding a subworkflow text input still renders `<HistoryDatasetCollectionAssociation(...)>` in `${label}` renames (needs a per-job replacement dict). Predates this branch.
