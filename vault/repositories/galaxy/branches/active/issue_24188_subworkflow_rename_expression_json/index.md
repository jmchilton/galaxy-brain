# issue_24188_subworkflow_rename_expression_json

- [View PR #24224](https://github.com/galaxyproject/galaxy/pull/24224)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24188_subworkflow_rename_expression_json)

Status: `ci_wait` — PR [#24224](https://github.com/galaxyproject/galaxy/pull/24224) ("[26.1] Fix `${label}` renames in subworkflows fed by expression tools") approved by mvdbeek 2026-10-19; re-drafted at John's request pending CI on `cbe21ccd399` (Marius' optional points). Base: `release_26.1` (`b2b1e1deeee`). Fork: `jmchilton/issue_24188_subworkflow_rename_expression_json`. Worktree: `~/projects/worktrees/galaxy/branch/issue_24188_subworkflow_rename_expression_json`.

CI green on `de29da2c1c7`; `cbe21ccd399` passed workflow unit tests and the 4 `replacement_parameters_nested*` framework tests locally, PR CI running.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md)

Fixes [#24188](https://github.com/galaxyproject/galaxy/issues/24188): `${label}` rename inside a subworkflow gives `<galaxy.model.HistoryDatasetAssociation(...)>` when the subworkflow text input is fed by an expression tool. Assigned to John.

[Implementation](implementation_debrief.md) · [Plan](plan.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Collection name review](subagents/collection_name_review.md) · [PR description review](subagents/pr_description_review.md) · [PR description](pr_description.md) · [Rescope](implementation_rescope_debrief.md) · [Rescope review](subagents/rescope_review.md) · [Alt: original scope](alts/original_scope.md) · [Test challenges](test_challenges_debrief.md) · [Codex review](codex_review.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Refactor baseline](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · [Earlier hardening](earlier_drafts/1/) · [Earlier debriefs](earlier_drafts/2/), [3](earlier_drafts/3/)

## Decisions

- Base `release_26.1`: reporter's version; `read_expression_json` / `replace_expression_json_dataset` exist from 26.1. 25.1 and 26.0 have the bug but lack the helpers (the fix would need a backport of the expression.json reader), so no older base.
- One-line fix: resolve the `expression.json` value at storage time (`set_outputs_for_input`), per the thermo-nuclear review. That's the issue's own suggestion. The subworkflow step already waits for its parameter datasets (`_find_collections_to_match`). `modules.py` is untouched. The forward merge to 26.2/dev conflicts in 4 files, all from the test-format commit plus `test_modules.py` typing; see pr_description.md Risk Review Advice.
- Re-scoped per scope evaluation: `subworkflow_progress` pre-reads expression.json for parameter inputs, so filesystem lag delays the whole subworkflow step. Original scope is kept as the alt.
- Accepted tradeoff: while a subworkflow is still scheduling, the expression.json is re-read every iteration. If it is manually purged in that window, the invocation fails. Base already fails then for inner steps that consume the value, so the new exposure is rename-only steps. `DeleteIntermediatesAction` skips active invocations and only deletes, so the automatic path is safe.
- Tests live in framework workflow tests, not API tests (John). The overlapping unit test `test_subworkflow_expression_json_parameter_replacement` was dropped (John). The first commit adds `metadata: {name:}` for Collection outputs in the test format, so collection names can be asserted. It's first so it can split into its own PR if 26.1 reviewers object.
- Dropped the scope evaluation's `InputParameterModule.execute` TODO comment refresh to keep `modules.py` untouched.

## Follow-ups

- A mapped expression collection feeding a subworkflow text input still renders `<HistoryDatasetCollectionAssociation(...)>` in `${label}` renames (needs a per-job replacement dict). Predates this branch.
- `PickValueModule` lacks `get_informal_replacement_parameters`, so the run form doesn't prompt for informal `${x}` used only in native pick_value renames. A separate small 26.1 PR: move ToolModule's PJA scan up to `WorkflowModule`.
- planemo `for_collections()` only recognizes `element_tests`, so a Collection output asserting only `metadata.name` goes to the file checker and fails; the key also needs planemo docs (Marius). [planemo#1745](https://github.com/galaxyproject/planemo/issues/1745).

## Marius' review (2026-10-19)

- Taken in `cbe21ccd399`: inner parameter inputs use `is_data=False`, so the pending/ok check sits next to the expression.json pre-read; pre-read limited to labeled inner inputs, matching `set_outputs_for_input`.
