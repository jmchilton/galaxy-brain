# Normal review debrief (re-scope)

Reviewed `a171dbed419..2a3beca7211`, the A/B/C expansion. The review found one must-fix, one should-fix and two nits. I acted on all four in `8f358dbb341`:

- **Must-fix:** the new unit test passed `MockTrans` where `ProvidesHistoryContext` is expected, which fails mypy in CI (`check_untyped_defs`). It now uses `cast(ProvidesHistoryContext, MockTrans())`, following the `test_extract_report.py` pattern. It also reuses `populate_module_and_state` in place of a hand-rolled module/state loop. I re-checked it red against the old `.get(order_index)` lookup.
- **Should-fix:** in the export, only the unknown-step 500 was logged. The malformed-row `InconsistentDatabase` now has a `log.error` too, and uses `raise ... from e`.
- **Nit:** the resolver docstring said params come back "keyed by order index". In fact only subworkflow params are re-keyed to `"<inner index>|name"`.
- **Nit:** the unknown-outer-index check used `str(key)`, which let int keys through. It now compares keys as sent.

## Not acted on

- **Nothing was declined.**
- **Flag for #24175 (for its restack, not for this branch).** With A in place, subworkflow invocations carry their own STEP_PARAMETERS rows. #24175's import re-keying should get a nested-invocation case.
- **Flag for the PR description.** B tightens the public API: junk or tool-id keys sent with `parameters_normalized=true` used to be silently dropped and now return a 400.

## Confirmed by the reviewer

- **A, scheduling.** Inner steps now get the same `step_args`/`step_updates` treatment as top-level steps, and nested string keys are converted by `inject`.
- **B, producers.** The run form, the export, the populators and batch mode all send only valid top-level indices.
- **C, the resolver contract.** It fits both siblings: `None` means an unknown outer or inner step, and `ValueError` means a malformed row.

<details><summary>Full review</summary>

**Must-fix**
1. `test/unit/workflows/test_run_parameters.py:143,152`. Two mypy `arg-type` errors: `MockTrans` is passed as `ProvidesHistoryContext` to `module_factory.from_workflow_step` and to `workflow_run_config_to_request`. Fix: `cast(ProvidesHistoryContext, MockTrans())`. Optionally, use `populate_module_and_state(trans, workflow, param_map={})`.

**Should-fix**
2. `services/invocations.py:369-372`. The `except ValueError` branch raises a typed 500 without `log.error`, while the `None` branch logs. Add a log line and `from e`.

**Nits**
3. `model/__init__.py:11075`. The docstring says "keyed by order index", which is accurate only for subworkflow steps.
4. `run_request.py:176-178`. `str(key)` lets int keys pass the check, and the loop then drops them. Compare `key` directly.

**Checked and holding up**
- **A, scheduler.** `ToolModule.execute` re-applies the values that were already baked into the encoded step state, the same as for top-level steps. In `remaining_steps`, `decode_runtime_state` overrides the computed state.
- **A, keys.** Nested keys are ints at request time. At schedule time they are JSON strings, and `inject` (`modules.py:3612`) converts them with `int(key)`.
- **A, storage.** The outer row still holds the nested dict, and the subworkflow invocation gets its own rows. That duplication is consistent.
- **B.** `WorkflowRunForm.vue` keys by position in the top-level `runData.steps`, which are in `order_index` order. The export, the populators and batch mode, which normalizes before expanding, all send valid indices. The legacy path is untouched.
- **C.** `None` covers an unknown outer or inner id. `ValueError` covers a missing name or value, a non-numeric id, or bad JSON. #24176's `except (TypeError, ValueError, KeyError)` collapses onto this contract. The name and placement are fine.
- **Tests.** The resolver unit test is worthwhile, because its contract isn't reachable through the API in this branch alone. The collision unit test is a real red-to-green, and that collision isn't deterministically reproducible in an API test. No assertions were weakened.
- **Imports.** All at module top.

</details>
