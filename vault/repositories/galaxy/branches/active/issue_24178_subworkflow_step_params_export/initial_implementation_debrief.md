# Initial implementation debrief

The branch is `issue_24178_subworkflow_step_params_export`, based on `dev` @ 88127f42979. Head is `05af01c917f`, pushed to `jmchilton`. It ports spike item 1 only, not the import, seeding or client parts.

## Change

- **Model helpers.** `lib/galaxy/model/__init__.py` adds an inverse pair on `WorkflowStep`. Both recurse into nested subworkflows and are a no-op for other step types.
  - `step_parameters_by_index(param_dict: dict[str, Any]) -> dict[str, Any]` turns `{inner_step_id: {name: v}}` into `{"<inner order_index>|name": v}`.
    - It accepts the str-keyed ids from stored JSON.
    - It raises `ValueError` for a non-numeric id and `KeyError` for an unknown one.
  - `step_parameters_by_id(param_dict: dict[str, Any]) -> dict[Any, Any]` is the inverse.
    - It raises `ValueError` for a key without a numeric `<index>|` prefix and `KeyError` for an unknown inner index.
- **Export.** `services/invocations.py` `serialize_workflow_invocation_to_request` now emits `step.step_parameters_by_index(...)`. The TODO is gone, and `except TypeError` became `except (TypeError, ValueError)`.
- **Normalization.** `run_request.py` `_normalize_step_parameters` now calls `step.step_parameters_by_id` instead of its inline split-and-recurse loop. `ValueError` and `KeyError` become a 400 `RequestParameterInvalidException` that includes the detail.

## Why `WorkflowStep`

The #24175 import fix runs in `galaxy.model.store`. A helper under `galaxy.workflow` would make the model store depend on the workflow package. The helpers need only `self.subworkflow`, `steps_by_id` and `step_by_index`, which already exist. I found no existing `"<index>|name"` parser or formatter to reuse. `SubWorkflowModule.get_runtime_inputs` builds the same `f"{order_index}|{name}"` names inline, for direct tool children only.

## Behaviour changes

| Subworkflow step parameter key | Before | Now |
| --- | --- | --- |
| Unknown inner index (`9\|x`) | silently ignored | 400 |
| Non-numeric inner index (`x\|y`) | silently ignored | 400 |
| Key without `\|` | 500 | 400 |

- The old recursion also ran the `parameter_input` "must specify 'input'" check on inner steps. That check no longer runs there.
  - The run form never produces such keys, because `get_runtime_inputs` covers tool steps only.
  - The reviewer judged this immaterial.

## Tests (red then green)

- **API tests** (`lib/galaxy_test/api/test_workflows.py`):
  - `test_workflow_request_subworkflow_step_parameters_rerun` failed on dev with `{'1': {'3': {'num_lines': 2}}} != {'1': {'1|num_lines': 2}}`. It now passes, and it checks the rerun's own output has 2 lines.
  - `test_run_subworkflow_runtime_parameters_invalid_key` got a 200 on dev for the original `9|num_lines` variant. Its current form, a key without `|`, was a 500 on dev per the issue. It now gets a 400.
  - `test_workflow_request_step_parameters_rerun` is the top-level baseline, with a conditional `seed_source|seed` key. I couldn't confirm it on dev because the upload timed out (see the environment note), and the issue says it passes there. It now passes.
- **Unit tests** (`test/unit/workflows/test_run_parameters.py`):
  - Nested round trip through JSON, using `yaml_to_model` with ids offset from indices.
  - Invalid keys `9|`, `x|`, and no `|`.
  - All 4 failed on dev.
- **Green runs:** 8 related API tests, including `test_run_subworkflow_runtime_parameters`, `_replacement_parameters`, `test_run_replace_params_over_default(_delayed)` and `test_workflow_request_recover`. Also `test/unit/workflows` (198 passed, 1 skipped), mypy on the changed modules (no new errors), and black, isort and ruff.

## Notes

- **Latent bug, not fixed (per coordinator).** `workflow_run_config_to_request` reads `run_config.param_map.get(step.order_index)` for subworkflow steps, but `param_map` is keyed by step id.
- **For #24175.** An unknown inner step id in the export still raises `KeyError` and returns a 500, the same as the outer `steps_by_id[step_id]`. The import re-keying branch should handle both.
- **Environment.**
  - Python 3.14 venv was swapped for 3.13, to match the branches that pass API tests.
  - API tests have to run outside the Bash sandbox, because the celery forkserver pool fails inside it ("The Pool is not active").
  - Under heavy machine load (load average 50 to 90), some `__DATA_FETCH__` uploads took about 64s and hit the 60s populator timeout. This is environmental, and runs passed once load dropped.
- **Backport.** A candidate for `release_26.2`; not acted on.
