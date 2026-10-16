# Implementation debrief

**STATUS: READY.** The branch fixes galaxyproject/galaxy#24178. The scope evaluation recommends keeping the scope as implemented.

- **Branch:** `jmchilton/issue_24178_subworkflow_step_params_export`, based on `dev` @ 88127f42979.
- **Head:** `5cf81e75c12`, pushed.
- **Size:** 5 files, +187/−19.
- **Backport:** a candidate for `release_26.2`; not acted on.

## Final implementation

- **`WorkflowStep.step_parameters_by_index(param_dict) -> dict[str, Any]`**
  - Re-keys stored subworkflow params from `{inner_step_id: {...}}` to `{"<inner order_index>|name": v}`.
  - Recursive, and a no-op for non-subworkflow steps.
  - Raises `ValueError` or `KeyError` for a bad or unknown id.
- **`WorkflowStep.step_parameters_by_id(param_dict) -> dict[Any, Any]`**
  - The inverse.
  - Raises `ValueError("invalid subworkflow step parameter key '<key>'")` for a malformed key, and `KeyError` for an unknown inner index.
  - #24175 and #24176 stack on these helpers.
- **Export** (`services/invocations.py`): uses `step_parameters_by_index`. The TODO is gone, and the `int(name)` guard now catches `(TypeError, ValueError)`.
- **Normalization** (`run_request.py`):
  - `_normalize_step_parameters` uses `step_parameters_by_id`. Malformed or unknown keys become a 400 that includes the detail.
  - The new `_validate_normalized_step_parameters` recurses into subworkflows, so the legacy `parameter_input` "must specify an 'input' value" check still runs for inner steps.
- **Tests:**
  - API:
    - `test_workflow_request_subworkflow_step_parameters_rerun` (the issue's red test).
    - `test_workflow_request_step_parameters_rerun` (top-level baseline).
    - `test_run_subworkflow_runtime_parameters_invalid_key`, with 3 cases: unknown index, non-numeric index, no `|`.
    - `test_run_with_invalid_legacy_parameter_input_in_subworkflow`.
  - Unit: `test_nested_subworkflow_step_parameters_round_trip`, using `yaml_to_model`.

## Process

- [Normal review](subagents/normal_review.md):
  - Leaner invalid-key test.
  - Error detail in the 400.
  - The test fixture reuses `yaml_to_model`.
- [Test challenges](test_challenges_debrief.md): the invalid-key unit test moved to the API layer.
- [Codex review](codex_review.md): found that the inner `parameter_input` check had been dropped. Fixed red to green.
- [Thermo-nuclear review](thermo_nuclear_review.md): the malformed-key `ValueError` now names the key instead of leaking unpack or `int()` text. No structural change.
- [Scope evaluation](scope_evaluation.md): keep the scope as implemented. Alternatives are follow-ups, sibling work, or a call to make at PR time.
- Screenshots were not needed because the change is server-only.

## Behaviour changes for the PR description

- **Unknown or non-numeric inner subworkflow index:** silently ignored before, now a 400.
- **Subworkflow param key without `|`:** a 500 before, now a 400.
- **Unknown outer step index:** still silently ignored, as on dev.

## Evidence at `5cf81e75c12`

- **API:** 13 related cases in `test_workflows.py` pass. Each run held the global lock with the sandbox disabled.
- **Unit:** `test/unit/workflows` gives 195 passed, 1 skipped.
- **Static checks:** mypy shows no errors in touched files; black, isort, ruff and pre-commit are clean.

## Left out (deliberate)

- **Latent `param_map.get(step.order_index)` keyed-by-id bug** in `workflow_run_config_to_request`. Better as its own follow-up PR, because the fix changes what gets persisted.
- **Export still returns a 500 for an unknown outer or inner step id** on imported invocations. That belongs to #24175.
- **Import re-keying, run-form seeding and client rerun** are in #24175, #24176 and #24177.

## Environment notes

- The venv uses Python 3.13; a 3.14 venv was replaced.
- API tests need the Bash sandbox disabled, because the celery forkserver pool fails inside it.
- Under heavy machine load, uploads occasionally exceed the 60s populator timeout. This is environmental.
