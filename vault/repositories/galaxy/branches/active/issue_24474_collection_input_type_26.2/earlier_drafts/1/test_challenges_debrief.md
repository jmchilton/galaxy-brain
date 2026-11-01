Run via Opus 5.5 at low effort.

# Test challenges: issue_24474_collection_input_type_26.2

I rewrote the history with fixups and an in-rebase edit. The three commits are kept in the same order: `b50680eaf60` Baseline tests, `1a2179e3280` Reject..., `84161b730e9` Let workflow runtime... No production code changed. No E2E test was added: the fix is server-side validation, and the tool form already filters by collection type.

## Changes

**Unit tests (`test/unit/app/tools/test_data_collection_parameters.py`)**
- The `SimpleNamespace` trans is now a small `_Trans` dataclass that documents which attributes `from_json` reads.
- Dropped these tests because API tests already cover them:
  - `test_from_json_accepts_compatible_subcollection_dce` (baseline). Covered by `test_map_over_nested_collections` and `test_paired_input_map_over_nested_collections`.
  - `test_from_json_accepts_promoted_element_adapter` (baseline). Covered by `test_map_over_paired_or_unpaired_with_list` in `test_tool_execute.py`.
  - `test_from_json_rejects_incompatible_subcollection_dce`. Covered by the new `test_paired_input_rejects_list_element`.
  - `test_from_json_skips_unexpanded_batch_value` and `test_from_json_checks_non_batch_values_dict`, along with the `_trans_resolving` nest of `SimpleNamespace` mocks. Covered by `test_build_map_over_collection_input_has_no_error` (batch skip) and `test_run_step_parameter_dict_rejects_incompatible_collection`, which sends a non-batch `values` dict.
  - `test_from_json_allow_map_over_*`. Covered by the existing `test_run_map_over_with_step_parameter_dict` (accept) and the new workflow rejection test.
- Kept the accept matrix on HDCAs (baseline), the reject matrix, and `test_from_json_rejects_incompatible_adapter`. These cheaply cover type combinations and the adapter branch, which no API test reaches.

**API tests**
- Moved the tool-run rejection tests from `test_tools.py` into `test_tool_execute.py` and rewrote them with the `required_tool`/`tool_input_format` DSL. Each now runs in the legacy, 21.01 and request input formats:
  - `test_paired_input_rejects_list` replaces `test_run_rejects_incompatible_direct_collection` and `test_tool_request_rejects_incompatible_direct_collection`.
  - `test_paired_input_rejects_list_element` replaces `test_run_rejects_incompatible_collection_element`.
  - `test_paired_input_rejects_mapping_list_of_lists_over_lists` replaces `test_run_rejects_incompatible_map_over_type`.
- `test_build_map_over_collection_input_has_no_error` (baseline, fixup) now uses `dataset_populator.build_tool_state` instead of a raw `_post`.
- `test_run_step_parameter_dict_rejects_incompatible_collection` now uses `workflow_populator.invoke_workflow_raw`.
- I removed "unit test the batch boundary" from the commit 3 message, since those tests are gone.

## Not changed

- I did not extract a pure `collection_type_accepted(...)` helper. The unit tests already use real model objects, and the only mock was the trivial trans. The refactor would remove no mocks, and the baseline accept matrix would have to go through `from_json` anyway.
- I added no helper for `create_list_in_history(...).json()["outputs"][0]["id"]`. The pattern is used throughout `test_tools.py`; in the moved tests, `TargetHistory.with_list()` replaces it.

## Fail-without-fix reasoning

- Baseline: the unit tests passed (11) at the rebased baseline commit, on base code. The build test is unchanged in behavior, apart from the helper.
- The new reject tests (unit and `test_tool_execute`) assert on the new error message. On base, `from_json` returns the value, so they fail at `pytest.raises` or `with_error_containing`.

## Results

- Unit: 18 passed at final HEAD and at the rebased commit 2.
- API: 13 passed. That is the 3 `test_tool_execute` tests × 3 input formats, `test_build_map_over_collection_input_has_no_error`, and the 3 workflow tests (both new ones plus `test_run_map_over_with_step_parameter_dict`).
- ruff, black and isort are clean on the changed test files.
