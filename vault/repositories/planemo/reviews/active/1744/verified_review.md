### P1 1: `stage_in` now crashes for native workflows with `color` or `directory_uri` parameter inputs (implementation verified)

`stage_in` now normalizes every Galaxy workflow with gxformat2 (`parameter_input_labels()` → `inputs_normalized()`), and since `9c009f00` any error from that aborts staging. gxformat2 can't normalize native `parameter_input` steps with `parameter_type: color` or `directory_uri` (galaxyproject/gxformat2#202), though Galaxy offers both. On master nothing in the `planemo run` / `planemo test` / `planemo upload_data` staging path normalizes the workflow, so these workflows worked, including ones with no list values at all. With this PR they fail with a pydantic `ValidationError` before anything is uploaded.

<details><summary>Evidence</summary>

Native `.ga` with a `color` (or `directory_uri`) parameter input, staged through the PR's `_stage_in` helper:

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for WorkflowTextParameter
type_
  Input should be 'text' or 'string' [type=literal_error, input_value='color', input_type=str]
```

</details>

Only look up parameter inputs when the job has a value that could be a multiple-value parameter: a list that isn't a list of Files. Gating on any list isn't enough, because a list of File dicts for a collection input (the pattern the PR's own `data_list` uses) would still trigger normalization. A list of scalars next to a `color` input still needs gxformat2#202.

<details><summary>Details</summary>

```python
if runnable.type == RunnableType.galaxy_workflow and _has_parameter_list(job):
    ...

def _has_parameter_list(job: Dict[str, Any]) -> bool:
    """Whether a job value may be a list for a multiple-value parameter, i.e. not a list of Files."""
    return any(
        isinstance(value, list) and (not value or not all(isinstance(e, dict) for e in value)) for value in job.values()
    )
```

An empty list counts as a possible parameter list. That keeps empty values for multiple-value parameters from being staged as collections. The cost is that a `color` workflow with an empty-list collection job still normalizes and fails.

Regression test: a native `tests/data/wf_color_param_input.ga` (a `color` parameter plus a list collection input), staged once with a scalar color value and once with a list of Files for the collection.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: both regression cases fail on the PR head with the `ValidationError` above, pass on master, and pass with the fix.

</details>

### P2 1: Remote-workflow test patches the internal `get_dict_from_workflow` and is red on master only through `AttributeError` (implementation verified)

`test_stage_in_passes_lists_to_multiple_value_parameter_inputs_of_remote_workflow` patches `planemo.galaxy.activity.get_dict_from_workflow` and asserts its exact call arguments, which restates the implementation. On master both cases fail with `AttributeError: ... does not have the attribute 'get_dict_from_workflow'`, not with the `hdca` mismatch the PR description says. That makes the Tests section of the description inaccurate for these cases.

Fake the Galaxy boundary instead, as `_staging_config` already does for uploads: set `config.user_gi.workflows._get`, and drop the patch and `assert_called_once_with`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the rewritten test passes on the PR head, and on master (`b1ac9ac5`) it fails with `text_list` and `int_list` staged as `{'src': 'hdca', ...}`.

</details>

### P2 2: No Galaxy-backed test for the reported 400

The fix targets a Galaxy invocation 400 that the PR reproduced by hand with `planemo run tests/data/wf_multiple_param_inputs.gxwf.yml`. The mocked `make_post_request` tests can't catch a change in how Galaxy accepts list values for parameter inputs.

Add a `planemo run` test in `tests/test_run.py` with a committed job file. Skip it on Galaxy releases before 24.2, which don't have multiple-value parameter inputs (Galaxy `eb7ce0d217a` first shipped in v24.2.0), since tox still has `release_23.1`.

<details><summary>Details</summary>

`test_run_multiple_value_parameter_inputs` runs the fixture with `tests/data/wf_multiple_param_inputs-job.yml` (`text_list`, `int_list`, a one-element `data_list` of `hello.txt`) and `_check_exit_code`, under `@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`, `@mark.tests_galaxy_branch`, and a small `_galaxy_release_before((24, 2))` skip.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. The test was written but not run, since it needs a Galaxy. Only its skip paths were checked (`release_23.1` and `PLANEMO_SKIP_GALAXY_TESTS`). Not confirmed:
- whether an inputs-only workflow (`steps: {}`, `outputs: {}`) invokes cleanly and `planemo run` exits 0;
- whether Galaxy releases before 26.2 accept a list for the fixture's `int_list` (`[int]`). Galaxy `eb7ce0d217a` (24.2) added the `multiple` editor option for text only. Integer got it in `8ab23c05c36` (`release_26.2`/`dev`, not yet on `master`, the default test branch). That commit's message says gxformat2 `[integer]` inputs were already allowed. If CI on `master` goes red here, drop `int_list` from the Galaxy run or raise the skip floor.

</details>

### P3 1: Most `DATA_INPUT_TYPES` aliases are unreachable (implementation verified)

`parameter_input_labels` only sees `inputs_normalized` output. That output emits only `data` or `collection` for data inputs (or no type for untyped gxformat2 inputs, which the code already treats as data). `File`, `data_input`, `data_collection` and `data_collection_input` never appear, and `job_template` / `_build_template_and_metadata_from_inputs` already branch only on `"data"` and `"collection"`.

Reduce the set to `{"data", "collection"}`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: with gxformat2 0.28.0, `File`/`data_input` normalize to `data`, `data_collection`/`data_collection_input` normalize to `collection`, and an untyped input to `None`. The PR's tests and the new native test pass with the reduced set.

</details>

### P3 2: `parameter_input_labels` tests only cover gxformat2 fixtures (implementation verified)

The PR claims native `.ga` support, and remote workflows are always native, but every `parameter_input_labels` fixture is gxformat2. No existing `tests/data/*.ga` has a `parameter_input` step.

Add a small native fixture with a multiple-value text `parameter_input`, an integer `parameter_input`, a `data_input` and a `data_collection_input`, and assert that only the two parameter labels come back.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `tests/data/wf_native_param_inputs.ga` normalizes to `['string']`, `int`, `data` and `collection`, and the test passes.

</details>

### P3 3: `gxid://workflow-instance/` (instance=True) path untested (implementation verified)

The remote test only covers `gxid://workflows/` URIs, so a flipped `instance` flag in `_workflow_parameter_input_labels` passes. It also loses the call-argument check that P2 1 drops.

Parametrize over `gxid://workflow-instance/workflow1` too, with a `side_effect` on `user_gi.workflows._get` that asserts `("workflow1/download", {"instance": instance})`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: all three cases pass on the review branch, and all three fail when the `instance` computation is negated.

</details>
