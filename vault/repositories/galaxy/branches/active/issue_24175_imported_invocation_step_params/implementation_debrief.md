# Implementation debrief

**STATUS: READY.** The branch fixes #24175: **Rerun** (`GET /api/invocations/{id}/request`) no longer returns a 500 for an imported invocation that has tool step parameters. Only the store format changes; there is no migration and no API schema change.

- **Head:** `301e92ededd` on `jmchilton/issue_24175_imported_invocation_step_params`.
- **Base:** stacked on `issue_24178_subworkflow_step_params_export` @ `b53a5d9fe8b`.
- **Original scope:** kept as `jmchilton/issue_24175_imported_invocation_step_params_alt_original_scope` @ `00f0d68ec9d`.
- **Size:** 8 commits, about 37 lines of implementation plus tests. Re-scope details are in [implementation_rescope_debrief.md](implementation_rescope_debrief.md).

## Final implementation

- **Export** (`WorkflowRequestInputParameter._serialize`): a step row that resolves through the parent's `resolve_step_parameters()` also carries `order_index` and order-index-keyed `step_parameters`. Rows that don't resolve, or are malformed, export as before, so export never fails.
- **Import** (`_import_workflow_invocations`): one branch on `type == STEP`.
  - A row with `order_index` is re-keyed onto the imported workflow, using `step_by_index` and the parent's `step_parameters_by_id`. Subworkflow invocations re-key against their own imported workflow.
  - A row without `order_index` is dropped with a warning. These come from older archives, or from rows the exporter couldn't resolve. Import always builds a fresh workflow, so such rows can never map. Dropping them closes cross-server id collisions and stops a wrong step from being re-exported.
- **`/request`** (`services/invocations.py`): where the parent raises `InconsistentDatabase` for an unknown step, this branch skips the row with a warning. That case only arises for invocations imported before the fix, which already exist in databases. The parent's malformed-row 500 (`log.error` + `from e`) is kept.

## Decisions

- The `_serialize` guard and the `/request` skip stay as defensive code for invocations imported before the fix. The strengthened unit test covers the guard. The `/request` skip has no test, because the API can no longer create stale rows.
- For those rows, Rerun opens with the workflow's saved values. The "step params lost" notice is out of scope, per John.
- The resolver lives in #24178 and #24176 is not restacked onto this branch (John). The stack stays on `dev`; a `release_26.2` backport is John's call after merge.
- The PR description should note one widening: the `/request` skip also covers an unknown *inner* subworkflow step id.

## Tests

- **API (`test_workflows.py`):**
  - `test_workflow_request_step_parameters_after_invocation_import[tool_step|subworkflow_tool_step]`. The nested case also checks the imported subworkflow invocation's own `/request`.
  - `test_workflow_request_after_import_of_archive_without_step_parameter_order_index`. It checks that `/request` returns 200 with `parameters` None, and that the re-exported archive has no step rows.
  - Against the parent's code, all 3 fail at `/request` with the 500. All 3 pass on the head.
- **Unit:** the existing `test_import_export_invocation` was strengthened with a stale step row. It fails without the `_serialize` guard (export `TypeError`) and without the import drop.
- **Last runs:**
  - API sweep: 19/19 at `b4bb27e259a`, and the 3 target cases pass at `301e92ededd`.
  - Extraction/reimport sweep: 10 passed, 1 skipped.
  - `test/integration/test_workflow_tasks.py`: 13/14. The PDF report test fails with a 501 because there's no local PDF service; this is environmental.
  - `test_model_store.py` and `test/unit/workflows`: pass.
  - black, isort, ruff, pre-commit and mypy (from `lib/`) are clean.

## Reviews

- [Normal review (re-scope)](subagents/normal_review.md): no blockers. I applied the "should" and 4 of the 5 nits.
- [Test challenges](test_challenges_debrief.md): one helper fix, so the legacy test goes red at its own assertion.
- [Codex](codex_review.md): no findings.
- [Thermo-nuclear](thermo_nuclear_review.md): one cleanup in the import loop.
- [Scope evaluation](scope_evaluation.md): **keep scope as implemented.**
- No UI changes, so no screenshots. The first-round reviews are in `earlier_drafts/1/`.
