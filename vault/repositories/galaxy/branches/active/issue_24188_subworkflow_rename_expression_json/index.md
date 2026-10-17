# issue_24188_subworkflow_rename_expression_json

Status: re-scoped (FS-lag pre-read); re-hardening in progress. Base: `release_26.1` (`b2b1e1deeee`). Head: `5ce3acf579c`. Fork: `jmchilton/issue_24188_subworkflow_rename_expression_json`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24188_subworkflow_rename_expression_json`.

Fixes [#24188](https://github.com/galaxyproject/galaxy/issues/24188): `${label}` rename inside a subworkflow gives `<galaxy.model.HistoryDatasetAssociation(...)>` when the subworkflow text input is fed by an expression tool. Assigned to John.

[Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Rescope](implementation_rescope_debrief.md) · [Rescope review](subagents/rescope_review.md) · [Alt: original scope](alts/original_scope.md) · [Earlier hardening](earlier_drafts/1/)

## Decisions

- Base `release_26.1`: reporter's version; `read_expression_json` / `replace_expression_json_dataset` exist from 26.1. 25.1 and 26.0 have the bug but lack the helpers (the fix would need a backport of the expression.json reader), so no older base.
- One-line fix: resolve the `expression.json` value at storage time (`set_outputs_for_input`), per the thermo-nuclear review. That's the issue's own suggestion. The subworkflow step already waits for its parameter datasets (`_find_collections_to_match`). `modules.py` is untouched, and the forward merge to dev is trivial.
- Re-scoped per scope evaluation: `subworkflow_progress` pre-reads expression.json for parameter inputs, so filesystem lag delays the whole subworkflow step. Original scope is kept as the alt.
- Accepted tradeoff: while a subworkflow is still scheduling, the expression.json is re-read every iteration. If it is manually purged in that window, the invocation fails (base wouldn't). `DeleteIntermediatesAction` skips active invocations and only deletes, so the automatic path is safe.
- Dropped the scope evaluation's `InputParameterModule.execute` TODO comment refresh to keep `modules.py` untouched.

## Follow-ups

- A mapped expression collection feeding a subworkflow text input still renders `<HistoryDatasetCollectionAssociation(...)>` in `${label}` renames (needs a per-job replacement dict). Predates this branch.
