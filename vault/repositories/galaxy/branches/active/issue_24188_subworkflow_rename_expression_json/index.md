# issue_24188_subworkflow_rename_expression_json

Status: implemented, normal review done; hardening in progress. Base: `release_26.1` (`b2b1e1deeee`). Head: `87867681d6e`. Fork: `jmchilton/issue_24188_subworkflow_rename_expression_json`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24188_subworkflow_rename_expression_json`.

Fixes [#24188](https://github.com/galaxyproject/galaxy/issues/24188): `${label}` rename inside a subworkflow gives `<galaxy.model.HistoryDatasetAssociation(...)>` when the subworkflow text input is fed by an expression tool. Assigned to John.

[Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md)

## Decisions

- Base `release_26.1`: reporter's version; `read_expression_json` / `replace_expression_json_dataset` exist from 26.1. 25.1 and 26.0 have the bug but lack the helpers (the fix would need a backport of the expression.json reader), so no older base.
- One-line fix: resolve the `expression.json` value at storage time (`set_outputs_for_input`), per the thermo-nuclear review. That's the issue's own suggestion. The subworkflow step already waits for its parameter datasets (`_find_collections_to_match`). `modules.py` is untouched, and the forward merge to dev is trivial.
- Accepted edge: if shared-filesystem lag hides a finished expression.json, the read delays the inner input step. An unconnected step like `__BUILD_LIST__` can then rename with a literal `${label}`. The earlier head delayed the PJA step instead, at +14/-18 across 2 files. Revisit if this shows up.

## Follow-ups

- A mapped expression collection feeding a subworkflow text input still renders `<HistoryDatasetCollectionAssociation(...)>` in `${label}` renames (needs a per-job replacement dict). Predates this branch.
