# Test challenges debrief

All branch tests are API tests; no unit, Vitest or Selenium tests. All hold up. One cleanup commit: `13c7352f165`, a shared `_carried_hdca_option` helper in `test_tools.py`.

## Upstream (cherry-picked from #23865)

- `test_tools.py::test_build_collection_options_hidden_excluded` (replaces the two 26.1 hidden direct/multirun tests) and `test_jobs.py::test_job_build_for_rerun_hidden_hdca_carried_into_collection_options`.
- Test hunks are byte-identical to `ee476eb5a3b`. Left untouched to avoid forward-merge friction. The jobs test repeats the inline `matching`/`keep` asserts; left as-is for the same reason.

## Own tests

- `test_tools.py::test_build_collection_options_carries_other_history_selection`: base red at `len(matching) == 1` (0). Also checks the local entry has no `keep` and the carried one has no `map_over_type`.
- `test_tools.py::test_build_collection_options_carries_other_history_map_over_selection`: base red (0 matches). Red at `62058ed38ed` (cherry-picks only, before the `_classify_hdca` fix) on `map_over_type`. Sends the client's realistic `map_over_type`.
- `test_tools.py::test_build_collection_options_carries_hidden_map_over_selection`: same red pattern. Sends no `map_over_type`, so it proves the server derives it.
- `test_jobs.py::test_job_build_for_rerun_other_history_hdca_carried`: base red (0 matches). It is the user-facing rerun scenario from the issue.

## Changes

- `_carried_hdca_option(param, hdca_id, state)` replaces the same 4-line find/count/`keep`/label block in the three build tests. The other-history map-over test now also checks the `(not in current history)` label (stronger).
- `map_over_type` asserts use `.get(...)`, so the pre-fix red is an `AssertionError` showing the entry instead of a `KeyError`.

## Not changed

- `/tools/{id}/build` POST already goes through `_build_tool_param` (the branch added `inputs=`). Merging it with `DatasetPopulator.build_tool_state` predates the branch.
- Overlap between the build and rerun tests: they use different entry points into `_carry_selected_hdca`. Both are cheap, so both are kept.
- No rerun test for map-over carry. The build tests pin the contract, and a mapped rerun would add a lot of setup for little gain.
- E2E: none added. The fix is server side, and the client already handles `keep` entries. The API tests cover the contract.

## Runs (one file at a time)

- Head: `test_tools.py -k build_`: 20 passed, plus the known failure `test_build_does_not_leak_hda_from_user_bundle`. `test_jobs.py -k rerun`: 8 passed.
- Red, with source files swapped from a rev via `git show` and then restored (no stash):
  - Base `dbe4f2f7e41`: all 4 own tests fail at their own assertions.
  - `62058ed38ed`: both map-over tests fail on `map_over_type`. The other-history build and rerun tests pass there, as expected, because the cherry-pick provides the carry.
- black, ruff and pre-commit: clean.
