# Test challenges debrief

I re-ran this fresh against head `248ffbab979`. There was one small helper cleanup in the API tests and no tests were dropped. One unit test meets the process's drop criterion, but I kept it because of the no-removal rule. It is listed under unresolved below. Every new test fails on base at its own assertion, and each unit test pins its own `run.py` hunk.

## Changes (uncommitted)

- `lib/galaxy_test/api/test_workflows.py`: added `BaseWorkflowsApiTestCase._invocation_output_collection(summary, output_label)`. It fetches the invocation and then the HDCA for the named output. Both new API tests repeated that chain (`get_invocation` → `["output_collections"][label]["id"]` → `get_history_collection_details`), and they now use the helper. The same chain appears about 26 times elsewhere in the file, mostly with `step_details=True` or a different shape. I left those sites alone to keep the diff small on a release branch.

## Challenges

- **Layer.** Per writing_tests.md, workflow-only behavior belongs in workflow framework tests. The dataset renames (tool `create_2` and native `pick_value`) are in `replacement_parameters_nested_expression`. Collection names can't be checked there, because `verify_collection` (`tool_util/verify/interactor.py`) never checks `name`. So the mapped implicit-collection name and the `__BUILD_LIST__` HDCA name stay as API tests. Each covers a different post-job-action path (mapped-over vs DatabaseOperationTool).
- **API helpers.** The tests use only populator calls, with no raw HTTP against a URL. The only repetition was the chain above, which is now a helper.
- **Unit `test_subworkflow_unreadable_expression_json_parameter_delays_subworkflow`: kept.**
  - It is the only test of the `subworkflow_progress` pre-read.
  - Shared-filesystem lag (dataset `ok`, file missing or empty) can't be reproduced at the API or framework layer.
  - It adds no new mocks. It reuses the file's `MockModuleInjector`/`MockModule` and real model objects, with a real file under `tmp_path` via the shared `expression_json_hda`. No dataclass or noop rewrite applies.
- **Unit `test_subworkflow_expression_json_parameter_replacement`: drop recommended, kept.** It pins only the `set_outputs_for_input` line. The framework test and both API tests cover that line with real objects, and all three go red on base. That meets the process's "also tested by API/Integration" drop rule. I kept it because the task rules forbid removing tests. It is cheap and is the only fast check of that line.
- **Refactor for testability: declined.** The fix is two small `run.py` hunks, and keeping `modules.py` untouched is a recorded decision for the forward merge. Extracting a helper would grow the diff without removing any test setup.
- **Minor, not done:** `_setup_subworkflow_parameter` repeats the session add/commit setup from the existing `test_subworkflow_progress`. Reusing it there would mean editing a pre-existing test for little gain.
- **E2E.** Not needed. This is a backend scheduling fix with no UI change.
- **Baseline tests.** None apply. It is a bug fix, so every new test is meant to be red on base. Moving `expression_json_hda` into `workflow_support.py` is a refactor of an existing helper, not a new pinning test.

## Red/green

Red checks: I backed up `run.py` to the scratchpad and replaced it with the version from the merge base `b2b1e1deeee` (= `origin/release_26.1`). Then I replaced it with the alt branch version `87867681d6e` (the `set_outputs_for_input` fix only, with no pre-read). Tests ran one at a time. Afterwards I restored the file, and `git status` shows only `test_workflows.py` modified.

| Test | Base `run.py` | Alt `run.py` | Head |
|---|---|---|---|
| framework `replacement_parameters_nested_expression` | fail: `expected [moocow name] but found [<galaxy.model.HistoryDatasetAssociation(1) ...> name]` | not run (alt carries this fix) | pass |
| API `test_run_mapped_subworkflow_expression_replacement_parameter` | fail: `<...HistoryDatasetAssociation(2)...> suffix` | not run | pass |
| API `test_run_subworkflow_expression_replacement_parameter_collection_rename` | fail: `<...HistoryDatasetAssociation(1)...> renamed` | not run | pass |
| unit `test_subworkflow_expression_json_parameter_replacement` | fail: `{'inner_text': '<...HDA...>'} == {'inner_text': 'moocow'}` | pass | pass |
| unit `test_subworkflow_unreadable_expression_json_parameter_delays_subworkflow` | fail: `DID NOT RAISE DelayedWorkflowEvaluation` | fail: same | pass |

Also on head: `test/unit/workflows` 123 passed, 1 skipped. `black --check` and `isort --check-only` are clean on `test_workflows.py` and `test/unit/workflows/`.

## Unresolved

- Drop `test_subworkflow_expression_json_parameter_replacement` (redundant with framework/API) or keep it as a fast check? This needs John's call.
