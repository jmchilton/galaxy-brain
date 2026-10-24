# planemo#1744 initial review (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `d3b5860134d8099a34f844bbcdadf32dad5dff24` (merge-base `b1ac9ac5`)
- PR: [Pass list values to multiple-value workflow parameter inputs instead of uploading them as collections](https://github.com/galaxyproject/planemo/pull/1744) by mvdbeek

## Verdict

The approach is sound. Holding back parameter-input values before `galactic_job_json` and re-adding them afterwards is the least invasive planemo-only fix. It works for native `.ga` as well as gxformat2: probed with gxformat2 0.25.0 and 0.28.0, a native `parameter_input` with `multiple: true` normalizes to `type: ['string']` / `['int']`, and data/collection steps normalize to `data` / `collection`. The PR's 15 tests in `tests/test_galaxy_activity.py` and `tests/test_galaxy_workflow_utils.py` pass locally (galaxy-tool-util 26.1.1, gxformat2 0.28.0).

One real regression needs fixing before merge. Every Galaxy workflow run now goes through strict gxformat2 normalization, which fails on valid native parameter types (P1 1).

## Findings

### P1 1: `stage_in` now crashes for native workflows with `color` or `directory_uri` parameter inputs

`stage_in` now calls `parameter_input_labels()` → `inputs_normalized()` for every Galaxy workflow, unconditionally. Commit `9c009f00` removed the fallback, so any normalization error aborts staging. gxformat2 (0.25.0 through 0.28.0, and current `main`) cannot normalize native `parameter_input` steps with `parameter_type: color` or `directory_uri`. Galaxy offers both types (`lib/galaxy/workflow/modules.py` lists them in the parameter-type select), and gxformat2 tracks the gap as open issue galaxyproject/gxformat2#202.

On base, nothing on the `planemo run`/`planemo test` path normalizes the workflow:
- `install_workflows` imports the file through Galaxy.
- `find_tool_ids` uses `_raw_dict`.

A scalar value for such an input was passed through unchanged (`tool_or_workflow="tool"`). So these workflows worked on master, even ones with no list values at all. With this PR they fail at staging with a pydantic `ValidationError`. `planemo upload_data` hits the same failure, since it also calls `stage_in`.

Reproduced with a scratch test reusing the PR's `_staging_config` / `_stage_in` helpers. The workflow was a native `.ga` with one `color` (or `directory_uri`) parameter and one multiple text parameter:

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for WorkflowTextParameter
type_
  Input should be 'text' or 'string' [type=literal_error, input_value='color', input_type=str]
...
pydantic_core._pydantic_core.ValidationError: 1 validation error for WorkflowDataParameter
type_
  Input should be 'data' or 'File' [type=literal_error, input_value='directory_uri', input_type=str]
```

Suggested fix: skip the lookup entirely unless the job has a list value, e.g. `if runnable.type == RunnableType.galaxy_workflow and any(isinstance(v, list) for v in job.values()):`. Lists are the only values staging mangles in this way. This has three effects:
- It keeps the "don't swallow errors" intent of `9c009f00` for the case the PR targets.
- Workflows that worked before never touch gxformat2 normalization.
- It drops the extra `/download` round-trip for remote workflows whose jobs have no lists.

Add a regression test: a native `.ga` with a `color` parameter and a scalar job value should stage cleanly. Separately, fixing gxformat2#202 upstream would close the remaining case (a list job together with a color/directory_uri input).

### P3 1: Most `DATA_INPUT_TYPES` aliases are unreachable

`parameter_input_labels` only sees output from `inputs_normalized`. With gxformat2 0.25.0 and 0.28.0 that output emits only `data` or `collection` for data inputs:
- `File` normalizes to `data`.
- `data_collection` and `data_collection_input` normalize to `collection`.
- Native `data_input` and `data_collection_input` steps normalize to `data` and `collection`.

`job_template` / `_build_template` in the same module already rely on this, branching only on `"data"` and `"collection"`.

Suggested fix: reduce the set to `{"data", "collection"}`, or better, add one small helper (e.g. `is_data_input(step)`, treating a missing type as data). `parameter_input_labels` and the template builders would both use it, so the module has one data-versus-parameter classifier instead of a third ad hoc type list.

Note for John: gxformat2's typed `inputs()` API is not a safe replacement here. A `[string]` input becomes `WorkflowInputParameter`, which subclasses `BaseDataParameter`, so `isinstance(..., BaseDataParameter)` would misclassify list parameters as data.

### P3 2: `parameter_input_labels` tests only cover gxformat2 fixtures

The PR description and code both claim native `.ga` support, but every fixture in `test_parameter_input_labels` is gxformat2. Suggested fix: add a native `.ga` case covering a `parameter_input` with `multiple: true`, a `data_input` and a `data_collection_input`, either a new small fixture or an existing `tests/data/*.ga` that has parameter inputs. That pins the native normalization path the fix depends on.

## Notes (not findings)

- TRS ordering checked. `workflow_id_for_runnable` now runs before invocation, but `install_workflows` imports TRS workflows when `ensure_runnables_served` runs, before `stage_in`. That covers both `_execute` and `cmd_upload_data`.
- `stage_in` now loads the job with `yaml.safe_load` and passes `job` plus `job_dir`. This matches what galaxy-tool-util 25.1+ `StagingInterface.stage` does with `job_path`, so it is not a behavior change.
- The PR description explicitly defers a galaxy-tool-util change (letting `galactic_job_json` / `StagingInterface.stage` know which keys are parameters). That remains the more general fix, as a possible follow-up.
