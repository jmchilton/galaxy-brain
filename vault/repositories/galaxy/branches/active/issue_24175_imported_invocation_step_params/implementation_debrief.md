# Implementation debrief

**STATUS: READY.** The branch fixes #24175: **Rerun**, through `GET /api/invocations/{id}/request`, no longer returns a 500 for an imported invocation that has tool step parameters. Only the store format changes; there is no schema change.

- **Head:** `5f914857f95` on `jmchilton/issue_24175_imported_invocation_step_params`.
- **Base:** stacked on `issue_24178_subworkflow_step_params_export` at `5cf81e75c12`, its finalized tip.
- **Size:** 4 commits, +117/−8 across 4 files.
- **Parent code:** no `[24178]` commits; this branch doesn't edit parent-branch code.

## Final implementation

- **`WorkflowRequestInputParameter.resolve_step_parameters()`** (`model/__init__.py`) maps a step parameter row to `(step, params keyed by order index)`.
  - It uses the parent's `WorkflowStep.step_parameters_by_index`.
  - It returns `None` when the workflow lacks the stored outer or inner step id.
  - It raises `ValueError` for a malformed row.
  - The serializer and the request export both use it.
- **`_serialize`** adds `order_index` and `step_parameters` to step rows that resolve. Rows that don't resolve export as before, so export never fails.
- **Import** (`model/store/__init__.py`) re-keys rows that carry `order_index` onto the imported workflow: `step_by_index` plus the parent's `step_parameters_by_id`. Other rows are copied as before.
- **Request export** (`services/invocations.py`) skips rows that don't resolve, logs a warning, and continues. Malformed rows still raise `InconsistentDatabase`.

## Decisions

- **Old archives.** Archives exported before this fix have no `order_index`, so `/request` skips their rows and **Rerun** opens with the workflow's saved values. This follows the issue's proposal. Reviewers may prefer a 4xx that tells the user the parameters were lost; a 4xx would also block the rerun.
- **Wider than the issue describes.** The skip also covers an unknown *inner* subworkflow step id, which was a 500 on the parent. The PR description should say so.
- **Cross-server collisions.** These are fixed only for new archives. For an old archive, a stale id that happens to match an unrelated step can still be picked up, and re-exporting it spreads the wrong `order_index`. Dropping rows without `order_index` at import would close this. I left it as a question for John; the scope evaluation says it can follow later.
- **Not fixed here:** the latent `param_map` keyed-by-id bug in `workflow_run_config_to_request`.
- **Backport:** a possible `release_26.2` backport candidate. I haven't acted on it.

## Tests

- **Red to green (API, `test_workflows.py`):** `test_workflow_request_step_parameters_after_invocation_import[tool_step|subworkflow_tool_step]`.
  - On the parent tip both cases returned a 500 (`KeyError: 2` and `KeyError: 7`). Both now pass.
- **Old archives (API):** `test_workflow_request_after_import_of_archive_without_step_parameter_order_index`.
  - It strips `order_index` from the downloaded tgz, imports it, and checks that `/request` returns 200 with `parameters` None. It then re-exports the imported invocation.
  - Mutation checks: without the service skip the test gets a 500, and without the `_serialize` guard the re-export fails.
- **Unit tests dropped.** The test challenge dropped the model-store unit tests because the API tests cover the same paths end to end. `test_model_store.py` is unchanged from the parent.
- **Last green runs:**
  - Related API sweep: 12/12.
  - Store/export/RO-crate API sweep: 20/20 at `5f914857f95`.
  - `test_model_store.py` and `test/unit/workflows`: pass.
  - mypy reports no errors in the changed modules.
  - black, isort, ruff and pre-commit are clean.

## Reviews

- [Normal review](subagents/normal_review.md)
- [Test challenges](test_challenges_debrief.md)
- [Codex](codex_review.md): no findings.
- [Thermo-nuclear](thermo_nuclear_review.md): 3 small simplifications applied.
- [Scope evaluation](scope_evaluation.md): keep the scope as implemented.
- No UI changes, so no screenshots.

## Questions for John

- Drop step rows without `order_index` at import, as a follow-up?
- A non-blocking "step params lost" notice in the request model, maybe with #24177?
- File the `param_map` bug as its own issue?
