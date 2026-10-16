# Re-scope debrief

John approved the scope evaluation's expansion, A, B and C ([evaluation](earlier_drafts/1/scope_evaluation.md)). It is implemented on top of `a171dbed419`, and the head is `8f358dbb341`, pushed. The original scope is kept as `jmchilton/issue_24178_subworkflow_step_params_export_alt_original_scope` at `a171dbed419`. That branch is not tracked and has no worktree.

## What changed

- **A, the `param_map` lookup** (`run_request.py`, `workflow_run_config_to_request`). The lookup changed from `.get(step.order_index)` to `.get(step.id)`.
  - Subworkflow invocations now record their own STEP_PARAMETERS rows, so their `/request` export carries them.
  - This also removes a collision on small DBs: when an outer step id equalled the subworkflow step's `order_index`, that step's params leaked into the subworkflow invocation. The unit test reproduces this collision.
  - The scheduler now re-applies the recorded params to inner steps, as it already did for top-level steps.
- **B, unknown outer index.** With `parameters_normalized`, any `parameters` key that isn't a top-level `order_index` now returns a 400: `Step parameters reference unknown workflow step index '<key>'.`
  - The legacy path is untouched.
  - The producers I checked only send valid indices: the run form (top-level `order_index` is always contiguous after `attach_ordered_steps`), the export, the populators, batch mode, and the existing API tests.
- **C, the shared resolver.**
  - **Signature:** `WorkflowRequestInputParameter.resolve_step_parameters(self) -> tuple[WorkflowStep, dict[str, Any]] | None`, in `lib/galaxy/model/__init__.py`.
  - **Return value:** the row's step and its params in request form, with subworkflow params re-keyed to `"<inner order_index>|name"`.
  - **`None`:** the outer or inner step id is not in the invocation's workflow.
  - **`ValueError`:** a malformed row, meaning a missing name or value, a non-numeric id, or bad JSON.
  - **Name and placement:** kept from #24175 on purpose. Only the docstring differs, because #24175's mention of `order_index` archives belongs to that branch.
  - **This branch's export:** `ValueError` and `None` each become an `InconsistentDatabase` 500 with `log.error`. #24175 swaps the `None` branch for skip-with-warning, and #24176's `recover_step_parameters()` becomes a loop that skips on `ValueError`/`None`.

## Tests (red → green)

- **API:**
  - `test_workflow_request_subworkflow_step_parameters_rerun` now also asserts that the subworkflow invocation's own `/request` has `{"1": {"num_lines": 2}}`. It was red with `None`.
  - `test_run_subworkflow_runtime_parameters_invalid_key` is parametrized over `(parameters, err_msg)`, with a new `unknown_outer_index` case. It was red with a 200.
- **Unit:**
  - `test_resolve_step_parameters` pins the `None`/`ValueError` contract.
  - `test_subworkflow_invocation_records_its_own_step_parameters` covers the collision. It was red: `{'seed': 'outer'}` leaked in.
- **Green evidence:**
  - API: 35 related `test_workflows.py` cases pass, covering request, subworkflow, replace-params, batch, deleted-dataset and legacy parameter-input tests. After the review fixes, 11 targeted cases were re-run and pass.
  - Unit: `test/unit/workflows` gives 197 passed, 1 skipped.
  - mypy is clean on the touched files and on `../test/unit/workflows`, run from `lib/`. Pre-commit is clean.

## Review

[Normal review](subagents/normal_review.md). It found one must-fix (unit test mypy), one should-fix (log the malformed-row 500) and two nits. All are fixed in `8f358dbb341`.

## For the PR description

- **New behaviour:** subworkflow invocations record their own step params.
- **API tightening:** an unknown outer index with `parameters_normalized` now returns a 400.
- **Typed 500:** the export's unknown-step 500 is now a typed `InconsistentDatabase` with a log line.

## Sibling notes

- **#24175:** drop its own `resolve_step_parameters`; this branch's version is the same apart from the docstring. Keep its `_serialize`, the import re-keying and the skip in the export. It should add a nested-invocation import case, because subworkflow invocations now carry rows.
- **#24176:** `recover_step_parameters()` should loop over `parameter.resolve_step_parameters()` and skip, with a warning, on `ValueError` or `None`.

## Moved to `earlier_drafts/1/`

`test_challenges_debrief.md`, `codex_review.md`, `thermo_nuclear_review.md`, `scope_evaluation.md` and `subagents/normal_review*.md`.
