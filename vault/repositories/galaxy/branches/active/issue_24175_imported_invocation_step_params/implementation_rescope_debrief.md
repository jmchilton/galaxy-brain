# Re-scope debrief — 2026-10-16

This re-scope follows the [scope evaluation](earlier_drafts/1/scope_evaluation.md) ("modest expansion"), with John's cross-branch decisions taking precedence where they differ: the shared resolver lives in #24178, #24176 isn't restacked, the stack stays on `dev`, and the "params lost" notice is out of scope.

- **Original scope:** preserved as `jmchilton/issue_24175_imported_invocation_step_params_alt_original_scope` @ `00f0d68ec9d`. It has no worktree and no MY_BRANCHES entry.
- **New head:** `b4bb27e259a`, on parent #24178 @ `b53a5d9fe8b`. I rebased onto `8f358dbb341` first; the parent then moved again, so I rebased a second time.

## What changed

1. **Rebase onto the parent's shared resolver.** I dropped this branch's copy of `WorkflowRequestInputParameter.resolve_step_parameters()` and use the parent's verbatim. In the `/request` export (`services/invocations.py`), the parent's `None` → `InconsistentDatabase` branch becomes a skip with a warning. The parent's `ValueError` handling (`log.error` + `from e`) is kept. `_serialize` (`order_index` + index-keyed params) and the import re-keying are unchanged. The only conflicts were the docstring and the service branch.
2. **Expansion (a): drop unmappable rows at import.** `_import_workflow_invocations` now branches once on `type == STEP`:
   - With an `order_index`, the row is re-keyed onto the imported workflow.
   - Without one, the row is dropped with a warning. That covers both legacy archives and rows the exporter couldn't resolve.

   Import always builds a fresh `Workflow`, so these rows could never map. Dropping them closes the cross-server id collision, and a re-export can no longer give a wrong step a valid-looking `order_index`.

   I kept the `_serialize` guard and the `/request` skip. Invocations imported before the fix already have stale ids in their databases, so neither is provably dead.
3. **Expansion (b): nested coverage.** Since the parent's `param_map` fix, subworkflow invocations have their own STEP_PARAMETERS rows. The `subworkflow_tool_step` import case now also checks that the imported subworkflow invocation's `/request` returns `{"1": {"num_lines": 2}}`.

## Tests (red → green)

- **Red at `1fbba009bc9` + new tests:**
  - The legacy test failed on the new assertion that the re-exported archive has no step rows: the row with stale id `16` was carried over.
  - The nested case, with the import re-key disabled, failed with `None == {'1': {'num_lines': 2}}`.
- **Green:**
  - API sweep: 19/19 (`workflow_request`, step/runtime params, invocation export/store/crate/import) on the final rebase.
  - `test/integration/test_workflow_tasks.py`: 13/14. `test_workflow_invocation_pdf_report` fails with a 501 because there's no local PDF service; this is environmental and unrelated.
  - `test_model_store.py` and `test/unit/workflows`: 252 pass.
  - black, isort, ruff, pre-commit and mypy (from `lib/`) are clean for the touched files.
- **Review follow-up:** `test_import_export_invocation` now carries a stale step row. Mutation checks: without the `_serialize` guard export fails, and without the drop import fails.

## Review

[Normal review](subagents/normal_review.md): no blockers. I applied the "should" and four nits. I left the silent `ValueError` in `_serialize` as it is, and the `/request` skip stays untested at the API level (stale rows can no longer be created through the API).

Earlier review debriefs are in `earlier_drafts/1/`.
