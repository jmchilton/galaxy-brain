# Codex review debrief (re-scope)

I ran Codex (read-only, `codex exec` with a findings schema) over `5bf7abf5e32..HEAD` at `b9b5d16b1d9`, with emphasis on the re-scope `a171dbed419..HEAD`. It reported one P2 finding. I confirmed it and fixed it red to green in `b53a5d9fe8b`.

- **Finding.** `resolve_step_parameters()` did not check that stored JSON is a dict, so a malformed row fell outside the documented `ValueError` contract in two ways:
  - Subworkflow `null`, or `{"<inner id>": null}`, raised `AttributeError`.
  - A tool or input step with value `42` came back as `(step, 42)`.
- **Who it affects.** #24176's skip loop would let the `AttributeError` escape. The test-challenge pass flagged the same thing.
- **Fix.** `WorkflowStep.step_parameters_by_index` raises `ValueError` when `param_dict` isn't a dict. The check runs before the subworkflow branch and recurses, so nested entries are covered too. The docstring is updated.
- **Contract.** Unchanged. This makes the resolver honour its documented contract: `None` for an unknown step, `ValueError` for a malformed row. The signatures of `step_parameters_by_index` and `step_parameters_by_id` are also unchanged.
- **Tests.** `test_resolve_step_parameters_malformed_row` gains three cases: input step `42`, subworkflow `null`, and inner entry `null`. All three were red and are now green.
  - **API tests re-run under the lock:** the 9 request and subworkflow-runtime-parameter cases pass.
  - **Unit tests:** `test/unit/workflows` gives 198 passed, 1 skipped. mypy is clean on the touched files.

## Not acted on

- **The symmetric request-side guard (`step_parameters_by_id`).** I tried a red API case, `{"1": 2}`. The request schema already rejects it ("Input should be a valid dictionary"), so the guard would be dead code. I dropped the case.

<details><summary>Codex output</summary>

- **Coverage:** `model/__init__.py`, `services/invocations.py`, `run_request.py`, `test_workflows.py`, `test_run_parameters.py`, `workflow_support.py`, `modules.py`, `schema/workflows.py`, `tools/parameters/meta.py`. Codex could not run tests in its sandbox; it confirmed the finding with direct model probes.
- **P2 api-contract, `lib/galaxy/model/__init__.py:11087`: "Validate stored parameter shapes before returning a resolved row."**
  - `resolve_step_parameters()` decodes JSON without checking that the result, or each nested step's value, is a dict.
  - For subworkflows, `step_parameters_by_index()` then raises `AttributeError` on `.items()`. For other steps it returns the malformed value unchanged.
  - Scenario: value `'null'` on a subworkflow row, or `'{"11": null}'`, raises `AttributeError`. A tool step with value `'42'` returns `(step, 42)`.
  - Confidence: certain.

</details>
