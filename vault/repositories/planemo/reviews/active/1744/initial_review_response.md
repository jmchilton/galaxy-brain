(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [generic_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - planemo-only staging change with no persisted state, API or format commitments; reverting restores prior behavior (a two-way door).

<details><summary>Risk Details</summary>

- Profile `generic_risk_assessment`, Opus 5.5, low effort, reviewed `d3b58601`.
- Behavior change for every Galaxy workflow `stage_in` caller (`planemo run`/`test` and `upload_data`): values for parameter inputs now bypass staging entirely, so a job that relied on a parameter input receiving an uploaded dataset/collection would change. Galaxy already rejected that shape, so little could depend on it.
- Classification is a deny-list (`DATA_INPUT_TYPES`): any input type not in it, including future or unrecognized data aliases, is treated as a parameter and its value passed through raw instead of uploaded.
- Remote (`gxid://`, TRS) workflows now cost an extra Galaxy workflow download before staging; failure there fails the run earlier than before.
- Workaround in planemo rather than galaxy-tool-util; a later upstream fix should make this redundant, not conflict, but both paths would need reconciling.

</details>

<details><summary>Risk Review Advice</summary>

Check that `DATA_INPUT_TYPES` covers every data/collection type spelling Galaxy `.ga` and gxformat2 emit after `inputs_normalized`, since a miss silently skips uploads. Confirm `job_dir` derivation matches what `job_path` previously resolved relative paths against.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/planemo/tree/pr_1744_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Review branch [`pr_1744_review_0`](https://github.com/jmchilton/planemo/tree/pr_1744_review_0), cut from the reviewed commit `d3b58601`, stops `stage_in` from normalizing a workflow unless the job holds a list that could be a multiple-value parameter value. Before this, native workflows with `color` or `directory_uri` inputs crashed at staging. A native `color` fixture covers it, with a scalar job and with a list-of-Files collection job. The branch also rewrites the remote-workflow test to fake Galaxy's workflow download instead of patching an internal helper, so it is red on master for the real reason. It adds the `gxid://workflow-instance/` case, trims `DATA_INPUT_TYPES` to the types `inputs_normalized` emits, adds a native `.ga` `parameter_input_labels` test, and adds a Galaxy-backed `planemo run` test (written, not run locally) skipped on releases before 24.2.

- [`f93fe7dc`](https://github.com/jmchilton/planemo/commit/f93fe7dcd503ee99c52b54a92e688f6f601fcb99) Only read workflow parameter inputs when a job has parameter lists — gates the lookup behind `_has_parameter_list(job)`, with `tests/data/wf_color_param_input.ga` and a parametrized regression test that fails on the PR head and passes on master.
- [`aab5ec4b`](https://github.com/jmchilton/planemo/commit/aab5ec4b2944a16928fb7ed65aa4736b88556155) Fake Galaxy workflow download in remote stage_in test — sets `config.user_gi.workflows._get` instead of patching `get_dict_from_workflow`, and drops the call-argument assertion.
- [`e98ca8eb`](https://github.com/jmchilton/planemo/commit/e98ca8eb26f208fc423a32d3c2f6ada97fff10ed) Cover gxid://workflow-instance/ in remote stage_in test — parametrizes over URIs with a `side_effect` that asserts the download path and `instance` param.
- [`66818554`](https://github.com/jmchilton/planemo/commit/668185547f2f1b9c6c1b24c86e0441b1d33e2384) Drop DATA_INPUT_TYPES aliases inputs_normalized never emits — reduces the set to `{"data", "collection"}`.
- [`0afeb7a4`](https://github.com/jmchilton/planemo/commit/0afeb7a422bffb6914e10c14941c1a0051dde40c) Test parameter_input_labels on a native workflow — adds `tests/data/wf_native_param_inputs.ga` with text-multiple, integer, data and collection inputs.
- [`5a205ab3`](https://github.com/jmchilton/planemo/commit/5a205ab35c39dbb41544d7a83c0651477d1e85a9) Run multiple-value parameter input workflow against Galaxy — adds `test_run_multiple_value_parameter_inputs` and `tests/data/wf_multiple_param_inputs-job.yml`, skipped on Galaxy releases before 24.2.

</details>

</details>

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

Fixed in [`f93fe7dc`](https://github.com/jmchilton/planemo/commit/f93fe7dcd503ee99c52b54a92e688f6f601fcb99).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: both regression cases fail on the PR head with the `ValidationError` above, pass on master, and pass with the fix.

</details>

### P2 1: Remote-workflow test patches the internal `get_dict_from_workflow` and is red on master only through `AttributeError` (implementation verified)

`test_stage_in_passes_lists_to_multiple_value_parameter_inputs_of_remote_workflow` patches `planemo.galaxy.activity.get_dict_from_workflow` and asserts its exact call arguments, which restates the implementation. On master both cases fail with `AttributeError: ... does not have the attribute 'get_dict_from_workflow'`, not with the `hdca` mismatch the PR description says. That makes the Tests section of the description inaccurate for these cases.

Fake the Galaxy boundary instead, as `_staging_config` already does for uploads: set `config.user_gi.workflows._get`, and drop the patch and `assert_called_once_with`.

Fixed in [`aab5ec4b`](https://github.com/jmchilton/planemo/commit/aab5ec4b2944a16928fb7ed65aa4736b88556155).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the rewritten test passes on the PR head, and on master (`b1ac9ac5`) it fails with `text_list` and `int_list` staged as `{'src': 'hdca', ...}`.

</details>

### P2 2: No Galaxy-backed test for the reported 400

The fix targets a Galaxy invocation 400 that the PR reproduced by hand with `planemo run tests/data/wf_multiple_param_inputs.gxwf.yml`. The mocked `make_post_request` tests can't catch a change in how Galaxy accepts list values for parameter inputs.

Add a `planemo run` test in `tests/test_run.py` with a committed job file. Skip it on Galaxy releases before 24.2, which don't have multiple-value parameter inputs (Galaxy `eb7ce0d217a` first shipped in v24.2.0), since tox still has `release_23.1`.

<details><summary>Details</summary>

`test_run_multiple_value_parameter_inputs` runs the fixture with `tests/data/wf_multiple_param_inputs-job.yml` (`text_list`, `int_list`, a one-element `data_list` of `hello.txt`) and `_check_exit_code`, under `@skip_if_environ("PLANEMO_SKIP_GALAXY_TESTS")`, `@mark.tests_galaxy_branch`, and a small `_galaxy_release_before((24, 2))` skip.

</details>

Fixed in [`5a205ab3`](https://github.com/jmchilton/planemo/commit/5a205ab35c39dbb41544d7a83c0651477d1e85a9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. The test was written but not run, since it needs a Galaxy. Only its skip paths were checked (`release_23.1` and `PLANEMO_SKIP_GALAXY_TESTS`). Not confirmed:
- whether an inputs-only workflow (`steps: {}`, `outputs: {}`) invokes cleanly and `planemo run` exits 0;
- whether Galaxy releases before 26.2 accept a list for the fixture's `int_list` (`[int]`). Galaxy `eb7ce0d217a` (24.2) added the `multiple` editor option for text only. Integer got it in `8ab23c05c36` (`release_26.2`/`dev`, not yet on `master`, the default test branch). That commit's message says gxformat2 `[integer]` inputs were already allowed. If CI on `master` goes red here, drop `int_list` from the Galaxy run or raise the skip floor.

</details>

### P3 1: Most `DATA_INPUT_TYPES` aliases are unreachable (implementation verified)

`parameter_input_labels` only sees `inputs_normalized` output. That output emits only `data` or `collection` for data inputs (or no type for untyped gxformat2 inputs, which the code already treats as data). `File`, `data_input`, `data_collection` and `data_collection_input` never appear, and `job_template` / `_build_template_and_metadata_from_inputs` already branch only on `"data"` and `"collection"`.

Reduce the set to `{"data", "collection"}`.

Fixed in [`66818554`](https://github.com/jmchilton/planemo/commit/668185547f2f1b9c6c1b24c86e0441b1d33e2384).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: with gxformat2 0.28.0, `File`/`data_input` normalize to `data`, `data_collection`/`data_collection_input` normalize to `collection`, and an untyped input to `None`. The PR's tests and the new native test pass with the reduced set.

</details>

### P3 2: `parameter_input_labels` tests only cover gxformat2 fixtures (implementation verified)

The PR claims native `.ga` support, and remote workflows are always native, but every `parameter_input_labels` fixture is gxformat2. No existing `tests/data/*.ga` has a `parameter_input` step.

Add a small native fixture with a multiple-value text `parameter_input`, an integer `parameter_input`, a `data_input` and a `data_collection_input`, and assert that only the two parameter labels come back.

Fixed in [`0afeb7a4`](https://github.com/jmchilton/planemo/commit/0afeb7a422bffb6914e10c14941c1a0051dde40c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: `tests/data/wf_native_param_inputs.ga` normalizes to `['string']`, `int`, `data` and `collection`, and the test passes.

</details>

### P3 3: `gxid://workflow-instance/` (instance=True) path untested (implementation verified)

The remote test only covers `gxid://workflows/` URIs, so a flipped `instance` flag in `_workflow_parameter_input_labels` passes. It also loses the call-argument check that P2 1 drops.

Parametrize over `gxid://workflow-instance/workflow1` too, with a `side_effect` on `user_gi.workflows._get` that asserts `("workflow1/download", {"instance": instance})`.

Fixed in [`e98ca8eb`](https://github.com/jmchilton/planemo/commit/e98ca8eb26f208fc423a32d3c2f6ada97fff10ed).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: all three cases pass on the review branch, and all three fail when the `instance` computation is negated.

</details>
