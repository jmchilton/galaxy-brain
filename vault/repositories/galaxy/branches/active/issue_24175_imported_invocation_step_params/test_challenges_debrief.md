# Test challenges debrief (re-scope)

Scope: this branch's own tests (`git diff b53a5d9fe8b..HEAD`). I made one small change in commit `0836b29c98e`, since pushed. The legacy-archive helper now checks that the archive has step-parameter rows, where it used to check that it stripped an `order_index`. With the old check, the legacy test went red on the parent inside the helper, because the parent never writes `order_index`. Now it goes red at `/request` with the bug's 500. I also pulled the "step rows" filter into `_step_parameter_rows()`, which the helper and the re-export assertion share. Everything else stays as it was.

Not acted on:
- **The `/request` skip in the service has no test.** The API can no longer create stale rows, because import drops them, and a service-level unit test would need heavy fixtures. It stays covered by reasoning, as the normal review decided.
- **The hard-coded `invocation["steps"][1]` in the subworkflow case.** Order index 1 is the only subworkflow step in `WORKFLOW_NESTED_RUNTIME_PARAMETER`, so the index is stable.
- **E2E.** The change is server-only and the bug is entirely in the `/request` response, which the API tests pin.

<details>
<summary>Details</summary>

## Unit test: strengthened `test_import_export_invocation` (`test_model_store.py`)

- It isn't testing the implementation directly. It checks observable store behaviour: export succeeds, and the imported invocation has no step rows.
- It covers two paths the API can no longer reach:
  - The `_serialize` guard for a row that doesn't resolve.
  - The import drop for a row without `order_index`.
- It strengthens an existing test rather than adding a dedicated one, which is what John prefers. It adds no new mocks; it uses the existing `_mock_app`.
- **Red on parent impl** (I swapped in the parent's three implementation files with `git show`): `assert not [<WorkflowRequestInputParameter(2)>]`. That is its own assertion, as required.
- An earlier mutation check is in the re-scope debrief: without the `_serialize` guard, export raises `TypeError`.

## API tests (`test_workflows.py`)

- **All HTTP calls go through populators:** `run_workflow`, `download_invocation_to_store`, `create_invocation_from_store`, `invocation_to_request` and `get_invocation`. No URL is hit raw, so no new helper is needed.
- **The tar helpers stay at module level.** Nothing in the populators rewrites an archive, and `reupload_contents` only checks member names. `_invocations_attrs` and `_is_invocations_attrs` follow the store's own `invocations_attrs` naming, even though the file is called `invocation_attrs.txt`. That mismatch is intentional, not a typo.
- **`test_workflow_request_step_parameters_after_invocation_import[tool_step|subworkflow_tool_step]`:** kept. This is the regression test for the bug.
  - Red on the parent: both cases return a 500 with `saved workflow step parameters reference an unknown workflow step`.
- **`test_workflow_request_after_import_of_archive_without_step_parameter_order_index`:** kept, with the helper fix described above.
  - The re-export assertion is the only one that tells "dropped at import" apart from "skipped at `/request`". The re-scope mutation check confirmed it fails when the drop is disabled.
  - Red on the parent: the same 500 at `/request`. Before the fix it failed with `archive had no step parameters with an order_index` inside the helper.
- **Overlap between the unit test and the legacy API test on the import drop:** acceptable.
  - The API test covers the user's scenario: an old archive, then a rerun that returns 200.
  - The unit test adds the `_serialize` guard, which nothing else can reach.

## Runs

- **Green** (new head, under the lock): 3 API cases, 3 passed.
- **Red** (parent's `model/__init__.py`, `model/store/__init__.py` and `services/invocations.py` swapped in, tests from the new head): 3 API cases, 3 failed with a 500 at `/request`. The unit test also failed, at its own assertion.
- After restoring: `test_model_store.py` gives 54 passed and 1 xfailed.
- black, ruff and isort, plus pre-commit on the commit, are clean.

</details>
