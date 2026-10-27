# Implementation debrief — staging_workflow_parameter_lists

Base: `origin/dev` @ `fd43a3c6`. Head: `ee5d92e9` (one commit). Target `dev`: new keyword on a public galaxy-tool-util API.

## What dev did before

`replacement_item` in `lib/galaxy/tool_util/cwl/util.py` checks `isinstance(value, list)` before the `tool_or_workflow == "workflow"` branch, so every top-level list goes through `replacement_list`: each element is forced to a file (`force_to_file=True`) and the result is a `list` HDCA. That happens in both modes, so planemo#1744's claim holds. The `"workflow"` branch is only reached for bare scalars, which it uploads as object datasets. Planemo passes `"tool"` for Galaxy workflows (`"workflow"` only for CWL), so on planemo's path scalars already pass through and lists are the only problem.

Galaxy has a second, type-blind copy of planemo's workaround: the `cwl_style` branch of `WorkflowPopulator.run_workflow` (`lib/galaxy_test/base/populators.py`) holds back bare scalars and lists of scalars as `raw_params` before `stage_inputs`. Framework workflow tests (`multiple_text.gxwf.yml`, `multiple_integer_into_data_column.gxwf.yml`) rely on it.

## Design

- `galactic_job_json(..., parameter_input_keys: Collection[str] | None = None)` and the same keyword on `StagingInterface.stage`, forwarded through (`InteractorStaging.stage` passes `**kwds`). Values for those top-level keys are left exactly as given, whatever their shape (scalar, list, empty list), in both modes. Not applied recursively.
- A set, not a key→type map: the only behavior is "leave untouched", so types add nothing.
- Caller-supplied, not derived by staging: staging never sees the workflow, and deriving types needs gxformat2 normalization, which fails on native `color` / `directory_uri` parameter inputs (gxformat2#202, planemo#1744 P1 1). That failure belongs in the caller, which can gate it.
- Default `None` keeps current behavior.

## Tests

`test/unit/tool_util/test_cwl_util.py`:
- `test_galactic_job_json_stages_scalar_list_as_collection_by_default` pins today's default (scalar list → `list` HDCA).
- `test_galactic_job_json_leaves_parameter_inputs_unstaged[tool|workflow]`: string list, int list, empty list and scalar under parameter keys are untouched; a `class: File` list under another key in the same job still becomes an HDCA with exactly one upload.

`test/unit/tool_util/test_staging.py`:
- `test_stage_leaves_parameter_inputs_unstaged`: through `StagingInterface.stage`, nothing is posted.

Red to green: plumbing applied first; the `galactic_job_json` cases failed with `{'src': 'hdca', ...} == ['a', 'b']`. The staging case failed with `KeyError: 'id'` because its capturing `_post` doesn't fake collection creation, so it red-fails by crashing while it tries to create the collection, not with an assertion mismatch. Green: both files, 27 passed.

Lint: ruff 0.17.1, black and isort clean on the 4 files; mypy output on the two source files identical to `origin/dev` (pre-existing errors only). Fork CI not checked yet.

## Planemo

Planemo pins `galaxy-tool-util<26.2`, so it keeps the planemo#1744 workaround (`stage_in` pops parameter-input values before `psi.stage` and `update`s them back). Adoption later, once planemo can require a galaxy-tool-util that has this:

```python
parameter_input_keys = None
if runnable.type == RunnableType.galaxy_workflow and _has_parameter_list(job):
    parameter_input_keys = set(_workflow_parameter_input_labels(runnable, config))
job_dict, datasets = psi.stage(..., parameter_input_keys=parameter_input_keys)
```

That drops the pop/update dance; the `_has_parameter_list` gate (P1 1) and `parameter_input_labels` stay. `release_26.2` is already branched, so this ships in the first release after 26.2: relaxing planemo's pin to allow 26.2 isn't enough, and older galaxy-tool-util needs a version check or the existing fallback. `PlanemoStagingInterface` doesn't override `stage()`, so the keyword passes straight through.

## Not done

- `populators.py` `cwl_style` heuristic not switched to the new API: that would need workflow input types in the test layer (gxformat2 normalization of the uploaded workflow), and the shape heuristic works for the framework fixtures. It's the obvious in-tree consumer if someone wants type-aware test staging.
- No API/integration tests: the change is pure client-side staging logic.

## Snapshot

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/staging_workflow_parameter_lists/differential-review/snapshots/20261027T012528Z-implementation-ee5d92e9744d.json
  implementation @ ee5d92e9744d vs origin/dev (merge-base fd43a3c6ce80)
  first snapshot: 1 commit, 4 files, 9 hunks
```

## Open questions

- Name `parameter_input_keys` OK? (Tool mode keys are tool input names, not labels; the name covers both.)
- ~~Also worth adopting in `populators.py` `cwl_style`?~~ Done, see below.

## Follow-up: in-tree caller (review 1 P3 3)

`05af7656`: `stage_inputs` (populators.py) takes `parameter_input_keys` and forwards it to `InteractorStaging.stage`. `WorkflowPopulator.run_workflow`'s `cwl_style` / class-syntax branch now unwraps `type: raw` in place and collects scalar / scalar-list keys into a set instead of popping them into `raw_params` and `update`ing after staging. Same shape heuristic, same behavior (only dict key order differs, irrelevant to the request).

Other `stage_inputs` callers not adopted: selenium `_stage_test_data` builds a data-only job; `run_cwl_job` / `stage_rules_example` / `test_tools_upload.py` stage data only. None hold back parameter values.

Tests (one at a time):
- Framework workflows: `multiple_text` passed, `multiple_integer_into_data_column` passed.
- API: `test_workflows.py::test_run_subworkflow_with_boolean_parameter_in_when_condition` passed (only test mixing class syntax with `type: raw`, covers the unwrap path).
- Unit: `test_cwl_util.py` + `test_staging.py`, 27 passed.
- ruff, black, isort clean; mypy errors on touched lines pre-existing only (`resolve_data` untyped, `Returning Any`). Pre-commit hooks passed.

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/staging_workflow_parameter_lists/differential-review/snapshots/20261027T014150Z-implementation-05af76568c3a.json
  implementation @ 05af76568c3a vs origin/dev (merge-base fd43a3c6ce80)
  since 20261027T012528Z-implementation-ee5d92e9744d:
    commits: 1 same, 0 rebased, 0 changed, 3 new, 0 dropped
    hunks:   4 carried, 5 changed, 6 new, 0 dropped
    new     d1592a31e101 Type parameter_input_keys as a Set so a bare str is rejected
    new     2d859bda6dd0 Make staging parameter-input test fail by assertion, not KeyError
    new     05af76568c3a Use parameter_input_keys in WorkflowPopulator cwl_style staging
```
