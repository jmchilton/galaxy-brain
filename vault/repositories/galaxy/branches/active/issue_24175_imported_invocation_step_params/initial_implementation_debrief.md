# Initial implementation debrief

The branch is `issue_24175_imported_invocation_step_params`, at commit `49219db7b9c`, pushed to `jmchilton`. It is stacked on the parent branch `issue_24178_subworkflow_step_params_export` at `05af01c917f`. It ports item 2 of the spike, adapted to the parent branch's helpers.

## Change

- **`WorkflowRequestInputParameter.resolve_step_parameters()`** (`lib/galaxy/model/__init__.py`) is new.
  - It resolves a step parameter row against the workflow of its own invocation.
  - It returns `(step, params keyed by order index)` using the parent branch's `step_parameters_by_index`.
  - It returns `None` when the workflow doesn't contain the stored outer or inner step id (`KeyError`).
  - A malformed row raises `ValueError` or `TypeError`.
  - The serializer and the request export both use it, so the "step id → portable form" logic lives in one place.
- **Serialize.** `_serialize` adds `order_index` and `step_parameters` (keyed by order index) to `type == "step"` rows.
  - It omits both when the row can't be resolved. This covers re-exporting an invocation that was itself imported from a legacy archive.
  - An export never fails because of a bad row.
- **Import.** In `_import_workflow_invocations` (`lib/galaxy/model/store/__init__.py`), when `order_index` is present the row is re-keyed onto the imported workflow:
  - `name = str(step.id)`
  - `value = dumps(step.step_parameters_by_id(step_parameters))`
  - Each row re-keys against the workflow of its own invocation, the same as `attach_workflow_step`.
- **Request export.** `serialize_workflow_invocation_to_request` (`services/invocations.py`) now calls `resolve_step_parameters()`.
  - On `None` it logs a warning and skips the row. That step then falls back to the workflow's saved values.
  - Malformed rows still raise `InconsistentDatabase`. That now also covers a non-numeric inner id, which used to be an uncaught `ValueError`.
  - The lines it replaces came from the parent branch. The change is the #24175 fix itself, so it is in this commit and not in a `[24178]` commit. A later parent commit that touches those lines will conflict on rebase.

## Store format

- Only the store format changes. There is no database schema change.
- An older Galaxy reading a new archive ignores the extra keys and behaves as before.
- The cross-server id collision (a stale id that silently matches an unrelated step) is fixed for new archives only. Old archives still copy the id verbatim. They are skipped only when the id is unknown on the importing server.

## Tests (red then green)

- **API** (`lib/galaxy_test/api/test_workflows.py`):
  - `test_workflow_request_step_parameters_after_invocation_import[tool_step|subworkflow_tool_step]` returned a 500 on the parent tip in both cases: `KeyError: 2` and `KeyError: 7` in `serialize_workflow_invocation_to_request`. Both now pass.
  - `test_workflow_request_after_import_of_archive_without_step_parameter_order_index` rewrites the downloaded tgz to drop `order_index`/`step_parameters`, imports it, and asserts that `/request` works with `parameters` None.
    - A mutation check, with the parent's service file temporarily restored, gave a 500.
    - The module-level helper `_without_step_parameter_order_index` asserts that it actually stripped something.
- **Unit** (`test/unit/data/model/test_model_store.py`):
  - `test_import_export_invocation_rekeys_step_parameters` failed with `'2' == '4'`.
  - `test_import_invocation_step_parameters_from_archive_without_order_index` failed with `KeyError: 'order_index'`, because the export didn't write it.
  - To support these, `MockWorkflowContentsManager` now round-trips the steps' `order_index`/`type` through the `.gxwf.yml` file. Before, it always rebuilt a single `data_input` step, so `_setup_simple_invocation` couldn't be imported.
- **Green runs:**
  - The related API sweep passed 10 of 10: the new tests, the parent's 3 tests, `test_workflow_request(_recover)`, `test_run_subworkflow_runtime_parameters` and `test_export_reimport_reexport_invocation_with_subworkflow`.
  - The store/export/RO-crate API sweep passed 20 of 20.
  - `test_model_store.py` had 56 passed and 1 xfailed.
  - `test/unit/workflows` had 198 passed and 1 skipped.
  - mypy reported no errors in the changed modules.
  - black, isort and ruff are clean.

## Notes

- The latent `param_map` keyed-by-id bug is not fixed (per the coordinator).
- Environment:
  - The venv uses Python 3.13.
  - API tests ran outside the sandbox, under the global lock.
  - One run hit the `__DATA_FETCH__` 60s timeout under load and passed on rerun.
