# Test challenges debrief

Kept both existing tests unchanged and added one API test, the issue's own repro. No unit or E2E tests. Every new test fails on base with the exact `<galaxy.model.HistoryDatasetAssociation(...)>` repr from the issue.

## Changes

- Added API `test_run_subworkflow_expression_replacement_parameter_collection_rename` (`lib/galaxy_test/api/test_workflows.py`). It is the reporter's workflow: text → `pick_value` tool → subworkflow text input → zero-input `__BUILD_LIST__` with output renamed `${inner_text} renamed`. It asserts the HDCA name. Before this, no test renamed a real collection output from a DatabaseOperationTool job, the exact case reported. It shares `_handle_post_job_actions` with the other tests, so it mostly confirms them, but it is cheap. It is not mapped, because a zero-input step inside a mapped-over subworkflow is a different shape.

## Challenges

- **Layer.** writing_tests.md prefers workflow framework tests for workflow-only behavior. The dataset renames (tool and native `pick_value`) are framework tests. Collection names can't be: `verify_collection` never checks the collection `name`. So the implicit-collection name (`_handle_mapped_over_post_job_actions`) and the `__BUILD_LIST__` HDCA name are API tests.
- **Helpers.** The new tests use populator calls only (`_run_workflow`, `get_invocation`, `get_history_collection_details`), with no raw HTTP. `invocation["output_collections"][...]` → `get_history_collection_details` repeats about 25 times in `test_workflows.py` with no helper. Left alone, since refactoring those sites is out of scope.
- **Unit tests.** None. `post_job_action_replacement_parameters` is a pure extraction of the existing `get_informal_replacement_parameters` logic. The integration tests cover it, as does the workflow API's `replacement_parameters` step field. `effective_replacement_dict` would need HDA and model mocks, and the framework and API tests cover it with real objects.
- **Failure path.** Still dropped. It passes on base, because `SubWorkflowModule` fails the step first. See `subagents/normal_review.md`.
- **E2E.** Not needed. This is a backend scheduling fix with no UI change.
- **Baseline tests.** None apply. This is a bug fix and every test is meant to be red on base.

## Red/green

Red check: I restored `lib/galaxy/workflow/{modules,run}.py` from `origin/release_26.1`, with the test files untouched, ran each test separately, then restored both files. `git diff origin/release_26.1 --stat` confirms the fix is intact.

| Test | Base | Branch |
|---|---|---|
| framework `replacement_parameters_nested_expression` | fail: `<galaxy.model.HistoryDatasetAssociation(1) ...> name` | pass |
| same, `out3` only (native `pick_value`; on the full test, `out1` fails first and hides it) | fail: `<...HistoryDatasetAssociation(1)...> picked` | pass |
| API `test_run_mapped_subworkflow_expression_replacement_parameter` | fail: HDCA `<...HistoryDatasetAssociation(2)...> suffix` | pass |
| API `test_run_subworkflow_expression_replacement_parameter_collection_rename` (new) | fail: HDCA `<...HistoryDatasetAssociation(1)...> renamed` | pass |

Also green: `test_run_subworkflow_replacement_parameters`, `test_run_rename_collection_output`, and `test/unit/workflows` (121 passed, 1 skipped). `black` and `isort` are clean on `test_workflows.py`.
