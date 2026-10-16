# Implementation debrief

**STATUS: READY.** The branch fixes #24178 and includes the approved re-scope (A/B/C). The second [scope evaluation](scope_evaluation.md) recommended a docs-only expansion (D). The branch was parked for that decision, and **John approved D**. It is now implemented.

- **Branch:** `jmchilton/issue_24178_subworkflow_step_params_export`, based on `dev` (`5bf7abf5e32`).
- **Head:** `57bf3eebd77`, pushed.
- **Original scope:** kept as `jmchilton/issue_24178_subworkflow_step_params_export_alt_original_scope` at `a171dbed419`.

## Implementation

- **Original fix.** The export re-keys subworkflow step params as `"<inner index>|name"` with `WorkflowStep.step_parameters_by_index`. Invoke maps them back with `step_parameters_by_id`. A malformed or unknown inner key returns a 400.
- **A.** `workflow_run_config_to_request` now looks up `param_map` with `.get(step.id)`, so subworkflow invocations record their own step params. This also removes an id/`order_index` collision on small DBs.
- **B.** On a `parameters_normalized` invoke, an unknown outer step index returns a 400.
- **C.** `WorkflowRequestInputParameter.resolve_step_parameters() -> tuple[WorkflowStep, dict[str, Any]] | None` is the shared resolver, and the export uses it.
  - It returns `None` for an unknown outer or inner step id, and raises `ValueError` for a malformed row.
  - A malformed row now includes stored JSON that isn't a dict (Codex fix `b53a5d9fe8b`, which honours the documented contract).
  - The export turns both outcomes into an `InconsistentDatabase` 500 with `log.error`.

- **D (docs, approved by John after the second scope evaluation)** is in `00f05a6de6b` and `57bf3eebd77`:
  - `STEP_PARAMETERS_DESCRIPTION` now documents the subworkflow key form: the subworkflow step's dict is keyed `'<inner step_index>|<name>'` (nested: `'<i>|<j>|<name>'`). It also says these keys require `parameters_normalized`, and that a malformed key or unknown inner index returns a 400.
  - `STEP_PARAMETERS_NORMALIZED_DESCRIPTION` now says that, when true, a key matching no step index returns a 400.
  - The "we the resulting" typo in `schema/invocation.py` is fixed.
  - `schema.ts` is regenerated with `make update-client-api-schema` under node 22.20.0, and `make lint-api-schema` passes.
  - D doesn't touch the resolver or the `run_request.py`/model code.
  - [Review](subagents/normal_review_expansion_d.md): one should-fix, a wording clarification, acted on.

## Prior reviews and tests that still apply

The code reviews below remain valid, because D changed only description text and the generated schema.

- **Reviews:**
  - [Normal review](subagents/normal_review.md): all four items fixed.
  - [Test challenges](test_challenges_debrief.md): `b9b5d16b1d9`, which pins the full resolver contract and reuses the invoke helpers.
  - [Codex](codex_review.md): its single finding, non-dict rows, is fixed in `b53a5d9fe8b`.
  - [Thermo-nuclear](thermo_nuclear_review.md): no structural changes. Its follow-ups are recorded for after merge.
- **Tests:**
  - API, under the lock: 35 related `test_workflows.py` cases pass, covering request, subworkflow, replace-params, batch, deleted-dataset and legacy parameter-input tests. After the last code change, `b53a5d9fe8b`, the 9 request and subworkflow-runtime-parameter cases were re-run and pass.
  - Unit: `test/unit/workflows` gives 198 passed, 1 skipped.
  - Static checks: mypy, run from `lib/`, is clean on the touched files and on `test/unit/workflows`. isort, black, ruff and pre-commit are clean.

## Remaining validation

- **Fresh fork CI:** pending for `57bf3eebd77`.
- **No screenshots:** the change is server-only.

## Behaviour changes for the PR description

- **Subworkflow param keys:** an unknown or non-numeric inner index, or a key without `|`, now returns a 400. Before, these were silently ignored or caused a 500.
- **Unknown outer index:** with `parameters_normalized`, an unknown outer index now returns a 400. This is a public API tightening.
- **Subworkflow invocations:** they now record their own step params, and the scheduler re-applies those to inner steps, the same way it already does for top-level steps.
- **Export errors:** a stored row that is malformed or names an unknown step now gives a typed `InconsistentDatabase` 500 with a log line.

## Follow-ups (not this branch)

- **Thermo-nuclear follow-ups:** a single "unusable row" signal, and having the export delegate to #24176's `recover_step_parameters` with a strict mode.
- **Unfiled, pre-existing:**
  - Batch values nested in subworkflow step params are not expanded (`meta.py:114`).
  - Legacy `parameter_input` "input" values inside subworkflows are not converted.
- **For #24175:** add a nested-invocation import case, since subworkflow invocations now carry rows.

## History

- [Re-scope debrief](implementation_rescope_debrief.md)
- [Initial debrief](initial_implementation_debrief.md)
- Pre-re-scope documents are in [earlier_drafts/1/](earlier_drafts/1/).
