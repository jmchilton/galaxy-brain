Run via Claude Opus at high effort.

# Test challenges debrief — staging_workflow_parameter_lists

Status: DONE. Head `1d9fe514` ("Trim parameter_input_keys tests"), pushed to `jmchilton`. No source changes; tests only.

## Verdicts

| Test | Verdict |
|---|---|
| `test_cwl_util.py::test_galactic_job_json_leaves_parameter_inputs_unstaged[tool\|workflow]` | Kept, simplified |
| `test_cwl_util.py::test_galactic_job_json_stages_scalar_list_as_collection_by_default` | Dropped |
| `test_staging.py::test_stage_leaves_parameter_inputs_unstaged` (+ `_post` `dataset_collections` branch) | Dropped |

### Kept: `..._leaves_parameter_inputs_unstaged`

This is the only coverage of tool mode, which is planemo's path because it passes `"tool"` for Galaxy workflows. It is also the only coverage of the empty list, and of a parameter key mixed with a staged `File` list. Framework tests only stage through `stage_inputs` in `"workflow"` mode. Keep the parametrize: in workflow mode a bare scalar (`text: "c"`) would otherwise be uploaded as an object dataset, so the two modes exercise different branches.

Rewrite:
- Dropped the `_stage_parameter_job` wrapper and its recording closures. The test now passes the existing noop `_mock_upload_func` / `_mock_collection_create_func` straight in.
- Replaced the per-key asserts with one whole-dict `result_job == {...}` (strengthened: extra or mutated keys now fail).
- Upload counting uses the `datasets` return value (`len(datasets) == 1`; one entry per upload).

Red check: kept the keyword and removed only the `continue` guard in `galactic_job_json`. Both cases fail at the dict assertion (`{'texts': {'src': 'hdca', ...}, ...} == {'texts': ['a', 'b'], ...}`), not with a TypeError.

### Dropped: `..._stages_scalar_list_as_collection_by_default`

It passes on `origin/dev` and isn't in a "Baseline tests" commit. It also pins the scalar-list-to-HDCA quirk that planemo#1744 works around, so it would get in the way of a future fix rather than guard the feature. In the kept test, the `files` key still covers default staging for keys that aren't in the set. This overrides review 1's "fine to keep".

### Dropped: `test_stage_leaves_parameter_inputs_unstaged`

This test only checks that `StagingInterface.stage` forwards the keyword, and the `multiple_text` framework workflow test already covers that. `InteractorStaging` uses the same `stage()`.

Repro: delete `parameter_input_keys=parameter_input_keys,` from the `galactic_job_json(...)` call in `lib/galaxy/tool_util/client/staging.py`, then run:

```
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
pytest lib/galaxy_test/workflow/test_framework_workflows.py -k multiple_text -m workflow
```

It fails with `400 ... input: workflow parameter inputs cannot be dictionaries`, because the list was staged as an HDCA. The `_post` `dataset_collections` branch existed only for this test, so it was reverted as well. `test_staging.py` is now identical to `origin/dev`.

## Other layers

- E2E/Selenium: none. The change has no UI.
- API/integration: no new tests. This is client-side staging. Framework workflow tests `multiple_text` and `multiple_integer_into_data_column` exercise the `populators.py` adoption end to end. The `type: raw` unwrap path is covered by the existing `test_workflows.py::test_run_subworkflow_with_boolean_parameter_in_when_condition`.
- No refactor needed: `galactic_job_json` is already a pure function that takes callbacks.

## Runs

- Unit: `test_cwl_util.py` + `test_staging.py`, 25 passed.
- ruff, black, isort and pre-commit hooks are clean.
- Framework `multiple_text` was run only for the red repro above. No source changed, so no green re-run.

## Possible follow-up (not done)

Existing `test_cwl_util.py` tests repeat a `captured_targets` closure around `_mock_upload_func`. A small recording helper could replace those closures. That's out of scope for this branch.
