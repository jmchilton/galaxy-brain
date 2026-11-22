Run via claude-opus-5-5 at low effort.

# Test challenges: issue_25004_mapped_job_outputs_26_1

**Outcome: no changes.** The branch has only API tests and no unit tests, so none of the unit-test challenges apply. All four tests passed the challenge as written.

## Tests

| Test | Commit | Verdict |
|---|---|---|
| `test_parameters_display` (extended to assert the output values) | baseline | Keep. Pins the `hda` output shape for a single-dataset job. |
| `test_parameters_display_collection_output` | baseline | Keep. Pins that a non-mapped job's own HDCA output is still listed, which guards against the fix filtering out too much. |
| `test_parameters_display_map_over` | fix | Keep. Regression test for #25004. |
| `test_parameters_display_map_over_collection_output` | fix | Keep. Covers the nested case, where a collection-producing tool is mapped into a `list:paired`. |

## Verification

- At HEAD: 4 passed (`-k parameters_display`).
- With `lib/galaxy/managers/jobs.py` reverted to `origin/release_26.1` and the tests kept: the 2 baseline tests passed. The 2 map-over tests failed at their own assertions, so the test API and fixtures already existed on base and were not the cause.

## Helpers

- The tests use existing populators: `create_list_in_history`, `wait_for_fetched_collection`, `get_history_collection_details`, `run_tool` and `wait_for_history_jobs`.
- `GET /api/jobs/{id}/parameters_display` is wrapped in `_displayed_output_values`. One older inline call remains in `test_parameters_display`. It passes `hda_ldda` and checks only the status, so I left it unchanged.
- `_list_in_history` is a thin wrapper. `create_list_in_history(wait=True)` returns a Response rather than the HDCA dict, so the wrapper adds value.

## E2E

No E2E test was added. The fix is entirely in the backend summary served by `/api/jobs/{id}/parameters_display`. The client's Job Outputs component renders whatever that endpoint returns, and the API tests assert that payload directly.
