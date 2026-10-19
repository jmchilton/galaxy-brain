# Test challenges debrief

Both new tests are API tests and hold up. No unit or Vitest tests were added. One small cleanup was committed: `1293d18a69f`, which makes the jobs test clean up the other history it creates.

## Tests challenged

- `test_tools.py::test_build_collection_options_carries_other_history_selection`
  - Exercises the `/build` path directly with `inputs`. It goes through `_build_tool_param` (gained `inputs=`), which is reused by about 10 other collection-option tests, and through the existing `_create_hdca` helper.
  - Red on base (`basic.py` from `origin/release_26.1`): fails at its own assertion `assert len(matching) == 1` (`0 == 1`). Green on head.
  - Kept. The local-entry `"keep" not in` assertion pins down that only the foreign HDCA is marked `keep`.
- `test_jobs.py::test_job_build_for_rerun_other_history_hdca_carried`
  - The user-facing scenario: rerun a job whose collection input came from another history. It uses `build_for_rerun` and `__history_with_ok_collection`, the same pattern as the neighbouring `test_job_build_for_rerun_hdca_value_in_options`.
  - Red on base at `assert len(matching) == 1` (`0 == 1`). Green on head, before and after the cleanup.
  - Change: the other history now comes from `dataset_populator.test_history()` instead of an uncleaned `new_history()`. The same file already does this in `test_index_history`. The run and `build_for_rerun` stay inside the context so the history is still live when the form is built.

## Overlap

Both tests reach `_carry_selected_hdca`, but through different entry points: tool form build with explicit inputs, and job rerun. The rerun test is the scenario from the issue. The build test pins the contract the form relies on. Both are cheap, so both are kept.

## Helpers

- `/tools/{id}/build` POST: the branch extends the existing `_build_tool_param` helper rather than adding another raw POST. `DatasetPopulator.build_tool_state` covers `inputs` but not `options_pagination`. Merging the two helpers predates this branch, so it was left alone.
- The `keep` / `(not in current history)` assertion trio is repeated across the two files. That is too small to justify a shared helper.

## E2E

None added. The fix is server side: the extra `options.hdca` entry with `keep: true` is the same shape the client already handles for carried `data` inputs, and both API tests cover the contract. A Selenium rerun test needing two histories would cost much more than it adds.

## Runs

- Each test run alone on head: passed.
- Base `basic.py` swapped in (file copied aside and restored, no stash): both failed at their own assertions.
- black and `uvx ruff check` clean on both test files. Pre-commit hooks passed.
