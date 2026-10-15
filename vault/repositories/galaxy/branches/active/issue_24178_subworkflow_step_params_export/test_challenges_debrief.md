# Test challenges debrief

I moved the invalid-key cases from a unit test to the API layer in `b03ec938bc6`. That follow-up commit adds no amend and has not been pushed. I kept the nested round-trip unit test and both rerun API tests, made no implementation change, and added no E2E test.

## Changes

- **`test_run_subworkflow_runtime_parameters_invalid_key` (API).** It is now parametrized over `9|num_lines`, `x|num_lines` and `num_lines`, with the ids `unknown_index`, `non_numeric_index` and `no_pipe`.
  - It uses the `history_id` fixture, which follows the precedent of `skip_without_tool` with parametrize in `test_workflow_extraction.py`.
  - It still uploads no dataset.
- **`test_subworkflow_step_parameters_invalid_key` (unit) is dropped.**
  - Its `no_pipe` case duplicated the API test.
  - The other two cases test the same thing, so they are easy to cover at the API layer and now are.
  - The behaviour change for those two keys is user-visible over HTTP: they used to be silently ignored and now return a 400, so the API layer is the right place to cover them.
  - I also removed the unused `RequestParameterInvalidException` import.

## Verdicts

| Test | Layer | Verdict | Why |
| --- | --- | --- | --- |
| `test_nested_subworkflow_step_parameters_round_trip` | unit | keep | See the notes after this table. |
| `test_subworkflow_step_parameters_invalid_key[3 keys]` | unit | drop, moved to API | `no_pipe` duplicated the API test, and the other two could easily be tested at the API layer. |
| `test_run_subworkflow_runtime_parameters_invalid_key` | API | strengthen (3 cases) | It now covers every 400 path. The `err_msg` assertion stays on each case. |
| `test_workflow_request_subworkflow_step_parameters_rerun` | API | keep | It covers the issue end to end: export, then rerun, then the rerun output has 2 lines, then the export matches again. |
| `test_workflow_request_step_parameters_rerun` | API | keep | The reason was already recorded in the normal review. It is the only top-level check that the conditional `seed_source\|seed` key passes through `step_parameters_by_index` unchanged. |

Why the round-trip unit test stays:

- It is the only coverage of two levels of nesting. The API tests use one level.
- It covers a nested name that contains a `|` (`2|0|seed_source|seed`). That case relies on `split("|", 1)` plus recursion.
- It covers JSON string ids coming back on export.
- Its ids are offset from the indices.
- It has no mocks or SimpleNamespace, because it uses the existing `yaml_to_model` fixture.
- Building a doubly nested runtime-parameter workflow fixture for the API layer would cost far more than this test does.

## Red-to-green for the moved cases

I did not re-run the moved cases against `dev`.

- The `unknown_index` and `non_numeric_index` cases were silently ignored on dev. The initial debrief records a 200 for `9|num_lines`.
- The `no_pipe` case was a 500 on dev.
- The `<subworkflow step index>|<name>` `err_msg` assertion would fail on dev even if a 400 came back for some unrelated reason, such as the missing input.

## E2E

None. The fix is server-only (export and request normalization). The client rerun work belongs to #24176/#24177, and workflow framework tests don't exercise export or rerun.

## Runs

- `PYTHONPATH=lib pytest test/unit/workflows -q`: 195 passed, 1 skipped.
- API `-k test_run_subworkflow_runtime_parameters_invalid_key`, run under the lock: 3 passed (27.6s).
- black, isort and ruff are clean, and the pre-commit hooks passed.
