# issue_24188_subworkflow_rename_expression_json

Status: not started — branch created. Base: `release_26.1` (`b2b1e1deeee`). Worktree: `~/projects/worktrees/galaxy/branch/issue_24188_subworkflow_rename_expression_json`.

Fixes [#24188](https://github.com/galaxyproject/galaxy/issues/24188): `${label}` rename inside a subworkflow gives `<galaxy.model.HistoryDatasetAssociation(...)>` when the subworkflow text input is fed by an expression tool. Assigned to John.

[Plan](plan.md)

## Decisions

- Base `release_26.1`: reporter's version; `read_expression_json` / `replace_expression_json_dataset` exist from 26.1. 25.1 and 26.0 have the bug but lack the helpers, and the fix adds a scheduling delay, so no older base.
