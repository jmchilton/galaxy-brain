# Test challenges debrief: planemo#1744

- Profile: generic_test_challenger
- Model: Claude Opus 5.5, medium effort
- Reviewed commit: d3b5860134d8099a34f844bbcdadf32dad5dff24 (base master, merge-base b1ac9ac5)

## Tests in the PR

| Test | Verdict |
| --- | --- |
| `test_parameter_input_labels` (`tests/test_galaxy_workflow_utils.py`) | Keep. Behavior-level on real fixtures, covers multiple-value and scalar params, excludes File/collection. |
| `test_parameter_input_labels_untyped_input_is_data` | Keep. Pins the "untyped gxformat2 input is data" rule, which is the non-obvious part of the classifier. |
| `test_stage_in_passes_lists_to_multiple_value_workflow_parameter_inputs` | Keep. Runs real `galactic_job_json` staging; only the HTTP edge (`make_post_request`) is faked. Red on master for the right reason (lists become `hdca`). |
| `test_stage_in_passes_lists_to_multiple_value_parameter_inputs_of_remote_workflow` | Rewrite. Patches `planemo.galaxy.activity.get_dict_from_workflow` and asserts its exact call args. |

## Run results

- PR head: `tests/test_galaxy_activity.py` + `tests/test_galaxy_workflow_utils.py` — 15 passed.
- Red check (PR tests + fixture copied onto b1ac9ac5, scratch worktree):
  - local test fails with the expected `hdca` assertion;
  - both remote parametrizations fail with `AttributeError: ... does not have the attribute 'get_dict_from_workflow'` — red only because the patch target is new, not because of the bug. The PR body says these fail with lists becoming `hdca`; that isn't what happens.

## Challenges

### Remote test mocks an internal symbol

`mock.patch("planemo.galaxy.activity.get_dict_from_workflow")` plus `assert_called_once_with(config.user_gi, "workflow1", False)` restates the implementation (which helper, which positional args). The config is already a `MagicMock`, so the fake can sit at the same Galaxy boundary the staging fake uses:

```python
config.user_gi.workflows._get.return_value = workflow
job_dict, _ = _stage_in(runnable, config, job_path)
```

Verified in a scratch worktree: passes on head (9 passed), and on master the remote cases now fail with the real `hdca` mismatch rather than `AttributeError`. The `instance` flag check that this drops is better covered by parametrizing over URI prefixes (below) with a `side_effect` that returns the workflow only for the expected `params={"instance": ...}`.

### `instance=True` / TRS branches untested

The parametrize only covers `gxid://workflows/...` (instance False) with and without `runnable_path`. `gxid://workflow-instance/...` (instance True) and `trs://` (id via `_workflow_ids`) both route through `_workflow_parameter_input_labels` and aren't exercised. Adding `gxid://workflow-instance/workflow1` as a case is cheap and is the only thing that would catch a flipped `instance` flag.

### No Galaxy-backed regression test

The bug is a Galaxy 400 at invocation; the PR body says it was reproduced and fixed by hand with `planemo run tests/data/wf_multiple_param_inputs.gxwf.yml`. That manual run is exactly what `tests/test_run.py` already codifies for other workflows (`test_run_export_invocation` etc., `@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`). A `test_run_multiple_value_parameter_inputs` running the new fixture with a job file (`text_list`, `int_list`, a one-element `data_list`) and `_check_exit_code` would catch regressions on the real Galaxy contract (including Galaxy-side changes to how list values are accepted), which the mocked `make_post_request` can't. Needs a `skipif` for Galaxy branches older than 24.2 (tox still defines `release_23.1`), following the existing `target_galaxy_branch()` pattern. A job file next to the fixture (e.g. `tests/data/wf_multiple_param_inputs-job.yml`) would also make the fixture self-documenting.

With that in place the mocked local `stage_in` test is still worth keeping (fast, exercises the real staging code without Galaxy); the remote one is the only coverage of the remote branch and should stay too.

### Mocks/SimpleNamespace -> dataclass?

`_staging_config` is a `MagicMock` config, consistent with the two existing tests in the file. A dataclass config would be more readable, but `stage_in` touches `user_gi.make_post_request`, `user_gi.url`, `version_major`, `use_path_paste`, `workflow_id_for_runnable`, and `PlanemoStagingInterface` reads more off `user_gi`; a faithful fake would be larger than the mock. Not worth requesting.

### Design

No restructuring needed for testability: `parameter_input_labels` is already a pure function over a path/dict and tested directly; the Galaxy-dependent lookup is isolated in `_workflow_parameter_input_labels`. No unit tests to drop as silly or implementation-only besides the call-arg assertion above.

## Test plan

1. Rewrite remote test to fake `config.user_gi.workflows._get` instead of patching `get_dict_from_workflow`; drop the `assert_called_once_with`. (P2 1)
2. Parametrize remote test over `gxid://workflows/`, `gxid://workflow-instance/` with a `side_effect` asserting the `instance` param. (P3 1)
3. Add Galaxy-backed `planemo run` test for `wf_multiple_param_inputs.gxwf.yml` with a committed job file, skipped on Galaxy < 24.2. (P2 2)
4. Correct the PR body's claim that the remote tests fail on master with `hdca` (moot once 1 lands). (P3 2)
