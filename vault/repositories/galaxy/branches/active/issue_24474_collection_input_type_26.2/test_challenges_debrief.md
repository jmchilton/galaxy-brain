Run via Opus 5.5 at low effort.

# Test challenges, round 2: issue_24474_collection_input_type_26.2

This round focused on the tests added since the first round (`git diff b6791d07a7c..HEAD`). I added two new commits on top, `2f2a381e7a7` and `46648602450` (which simplifies the subworkflow test so it asserts on the outer invocation), and rewrote no history. Challenging the tests turned up a production gap, which that commit also fixes.

## Production fix found while testing

The scheduling-time check in `MapOverPlanner` (`map_over.py`) was skipped for every step inside every subworkflow, not just conditional ones. The guard was `not progress.when_values`, but a subworkflow that is not mapped gets `when_values == [None]` even when it has no `when`. That is a non-empty list, so the guard was never true there. As a result, an untyped subworkflow input that fed a `list` to a `paired` tool input still created a job, and the job failed at preparation; the invocation itself did not fail. The guard is now `False not in (progress.when_values or [])`, so the check is skipped only when an outer condition is actually False.

## Changes

**API tests (`lib/galaxy_test/api/test_workflows.py`)**
- Added `test_subworkflow_step_incompatible_with_collection_fails_invocation`, which covers the fix above. It failed before the fix (invocation `completed`, not `failed`).
- Added `test_skipped_subworkflow_with_incompatible_collection_does_not_fail_invocation`. The re-scope commits exempt steps of skipped (conditional) subworkflows, but no test covered that exemption. This test fails if the exemption is removed (invocation `failed`).
- Added `test_run_step_parameter_dict_rejects_sample_sheet_with_other_columns`, which checks the sample sheet column rule (part D) through the API. It uses the legacy step-parameter path, the only invocation path that reaches `from_json` for a workflow input step, because the request-time check (part C) was dropped. It fails with the column check disabled (200 instead of 400).
- Dropped `test_typed_collection_input_maps_over_nested_collection`. It only guarded the request-time check, which was dropped. B never fires for mappable types, and existing tests already cover mapping deeper collections over typed inputs.
- `test_untyped_collection_input_incompatible_with_tool_fails_invocation` now uses `summary.invocation_id` instead of `history_invocations(...)[0]`. Its invocation-failure assertions moved into a `_assert_invocation_failed_on_list_collection` helper, which the subworkflow test reuses. The list test data, repeated across the four tests, is now a `LIST_COLLECTION_TEST_DATA` constant.

**Unit tests (`test/unit/app/tools/test_data_collection_parameters.py`)**
- Dropped `test_from_json_rejects_sample_sheet_with_other_columns`, since the new API test covers it.
- Kept the accept case and the no-columns case. Both are cheap matrix entries that no API test covers.
- Kept the `allow_map_over` and subcollection-element tests from `b6791d07a7c`. They are type-combination matrices over real model objects with no mocks, and the API tests only exercise one combination each.

## Not changed

- `test_skipped_step_with_incompatible_collection_does_not_fail_invocation` and the new skipped-subworkflow test pass on base code, because they guard exemptions the branch itself introduced. I kept both because each fails if its exemption is removed, which I checked by mutation for the subworkflow one.
- No workflow framework (`gxwf-tests.yml`) tests. `expect_failure` cannot tell an invocation failure from a job-preparation failure, and that distinction is exactly what these tests assert.
- No E2E test. The change is server-side scheduling and validation.
- No unit test for `MapOverPlanner` raising `IncompatibleCollectionInput`. The API tests cover it, and a unit test would need a mocked `WorkflowProgress`.

## Fail-without-fix verification

Each check was a temporary edit, reverted afterward:
- Restoring `not progress.when_values`: the subworkflow failure test fails (`'completed' == 'failed'`).
- Disabling the column check in `_check_collection_type`: the sample sheet API test fails (200, expected 400).
- Forcing the `when_values` exemption off: the skipped-subworkflow test fails (`'failed' in ('scheduled', 'completed')`).

## Results

- Unit: `test_data_collection_parameters.py` 27 passed.
- Workflow API, `test_workflows.py` filtered to `TestWorkflowsApi and (subworkflow or map or collection or sample_sheet or conditional or when or step_parameter)`: 127 passed. This covers all of the branch's workflow tests, plus the existing subworkflow, map-over and conditional tests that the broader check could affect.
- Workflow framework tests (`test_framework_workflows.py`): 88 passed.
- ruff, black and isort are clean on the changed files. mypy on `map_over.py` reports only its 4 existing untyped-function errors.
