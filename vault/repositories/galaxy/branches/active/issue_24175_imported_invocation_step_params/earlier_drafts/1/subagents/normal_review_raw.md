# Normal review (raw): issue_24175_imported_invocation_step_params @ 4e8d55e874f

Scope: top commit only (`git show HEAD`). Parent helpers `WorkflowStep.step_parameters_by_index` / `step_parameters_by_id` treated as context.

**Verdict: correct, matches the issue's Proposed Approach, no blockers.** Findings below are low severity; mostly test hygiene and a couple of notes for the PR description.

Unit suite run: `test/unit/data/model/test_model_store.py` -> 56 passed, 1 xfailed. No API tests run (per instructions).

## Correctness walk (verified, no finding)

- **Serialize -> import re-keying.** `_serialize` adds `order_index` + order-index-keyed `step_parameters` only when the row resolves; import re-keys with `workflow.step_by_index(order_index)` + `step.step_parameters_by_id(...)`. `dumps` turns the int inner-id keys back into strings, matching the original `json.dumps(param_dict)` storage shape. Step ids exist at import time (`read_workflow_from_path` builds and commits the workflow; mock does `add_and_commit`).
- **Subworkflow invocations.** `export_workflow_invocation` recurses into subworkflow invocations, each exported with its own workflow key, and `_import_workflow_invocations` rebuilds one workflow per key. `resolve_step_parameters` resolves against `self.workflow_invocation.workflow`, so a subworkflow invocation's own rows (only present via the latent `param_map.get(step.order_index)` collision in `workflow_run_config_to_request`) resolve against the subworkflow and re-key against that invocation's imported copy. Same per-invocation rule as `attach_workflow_step`. Correct.
- **Re-export of an imported legacy invocation.** Stale `name` -> `steps_by_id.get` miss -> `None` -> no `order_index` -> re-import copies verbatim -> request export skips. Export never fails (TypeError/ValueError also swallowed in `_serialize`). Correct.
- **Re-export of an imported new-style invocation.** `name` was re-keyed to a valid id, so it resolves exactly like the original. Correct.
- **Cross-server collisions.** Fixed for new archives (import never keeps the old id). Legacy archives: residual, see finding 5.
- **Malformed rows.** `int(None)`/`json.loads(None)` -> TypeError; non-numeric name or bad JSON -> ValueError (JSONDecodeError subclasses ValueError); both -> `InconsistentDatabase` in the request export, swallowed in `_serialize`. Only the `steps_by_id[int(...)]` lookup in the parent helper raises KeyError, so the `except KeyError` is not over-broad.
- **Import strictness.** A new-style archive whose `order_index` doesn't exist in the rebuilt workflow raises KeyError and aborts the import. Same as `attach_workflow_step` for step states / inputs / outputs, so consistent. Order-index stability across the format2 roundtrip is a pre-existing assumption shared by all those records.
- **Other consumers.** Only `workflow_request_to_run_config` (`run_request.py:707`) still reads `int(parameter.name)`; it's only used for scheduling and imported invocations are terminal/cancelled, so not affected. No store-format schema or client consumer of `input_parameters` keys (client `zipExplorer.ts` only lists the filename).
- **Imports.** `json`, `cast` (model), `dumps` (store), `tarfile` (API test) all module-top. Removed `import json` in `services/invocations.py` is unused after the change.

## Findings

1. **Low - test value: `test_import_invocation_step_parameters_from_archive_without_order_index`** (`test/unit/data/model/test_model_store.py:504`).
   Its red was `KeyError: 'order_index'` from the test's own `del` in `strip_portable_step_parameters`, not a behavioural failure. What it pins (name copied verbatim, `resolve_step_parameters() is None`) is the pre-existing import behaviour plus the `None` branch, and the API test `test_workflow_request_after_import_of_archive_without_step_parameter_order_index` covers the same path end to end (and was mutation-checked). Suggest dropping it and the `rewrite_invocations_attrs` hook in `_export_import_invocation`; if kept, at least note it's a pin, not a red-to-green test.

2. **Low - reuse in test helpers** (`test_model_store.py:534` `_export_import_invocation`).
   It duplicates the body of `test_import_export_invocation` (line 471) and most of `_perform_import_from_directory` (line 1785). Suggest having `_perform_import_from_directory` return the `ObjectImportTracker` and using it from the new helper, and/or rewriting `test_import_export_invocation` on top of `_export_import_invocation`. Small, optional.

3. **Low - `MockWorkflowContentsManager` change** (`test_model_store.py:1815-1836`). Reasonable.
   It's strictly more faithful: the old mock always rebuilt a lone `data_input` at index 0, so no invocation with a tool step could be imported. JSON is valid YAML, so the `.gxwf.yml` name is still honest. The only other reader of that file is the RO-crate test asserting the id suffix (line 671), which is unaffected. Full file passes. No change needed.

4. **Low - skip scope slightly wider than the issue** (`services/invocations.py:369-380`, `model/__init__.py:11086-11089`).
   The issue proposes skipping an outer step id the workflow doesn't contain. `resolve_step_parameters` also returns `None` (so the row is skipped) when the outer step resolves but an inner subworkflow step id doesn't. On the parent tip that was an uncaught KeyError 500. That's a sensible extension, since it's the same stale-id situation one level down, but mention it in the PR description. The skip stays invisible to the user (the request model has no warnings channel); that's already in the branch Decisions as the 4xx alternative.

5. **Low / question - legacy cross-server residual can be "laundered"** (`model/__init__.py:11096-11104`).
   For a legacy archive imported on another server where the stale id happens to match a step of the rebuilt workflow, `resolve_step_parameters` succeeds against the wrong step. The request export then misassigns, as documented. A re-export now also stamps that wrong step's `order_index` into a new-style archive, so the misassignment survives every later import. The rows are known stale at import time (no `order_index` = ids from the source server). Dropping or neutralising them at import, with a warning, would close the collision for future legacy imports. The request-time skip would still be needed for invocations imported before the fix. The issue rejected drop-on-import as the *primary* fix, but for unmappable legacy rows the /request outcome is the same. John's call; fine to leave as is and document.

6. **Nit - comment wording** (`model/__init__.py:11097`).
   `# ``name`` and nested subworkflow keys are step ids, add a form import can re-key.` reads garbled. Suggest `# name and nested subworkflow keys are step ids - also export an order-index form import can re-key.`

7. **Nit - optional typing/guard** (`model/__init__.py:11074`).
   `resolve_step_parameters` lives on a class that also holds replacement/meta/resource rows and has no type guard. `assert self.type == self.types.STEP_PARAMETERS` would make misuse loud. A `NamedTuple` return (`step`, `parameters`) would read better than a bare tuple at both call sites. Neither is required. The docstring could also lose a line (concise docstrings).

8. **Info (pre-existing, not this commit)** (`services/invocations.py:371`).
   `raise InconsistentDatabase(...)` inside `except` has no `from` and no `log.error`. A typed 500 is handled, so it doesn't reach Sentry. Leave it unless touching it anyway.

## Placement of `resolve_step_parameters`

Good. It's the single "stored step-id row -> (step, portable params)" conversion that both the serializer (model layer) and the request export (service) need, and it sits next to `_serialize`, which consumes it. It reuses the parent's `step_parameters_by_index` rather than re-implementing the subworkflow recursion. The alternative, an invocation-level `step_parameters_by_order_index()` map, would fit the service but not the per-row `_serialize`, so the per-row method is the right granularity.

## Tests

- API parametrized test (`tool_step` / `subworkflow_tool_step`). Strong: it asserts the exact `parameters` dict after export -> import -> /request, and was red on the parent with KeyError 500s. It covers the nested `"1|num_lines"` re-key that unit tests can't (the mock has no subworkflows).
- API legacy-archive test. Strong. `_without_step_parameter_order_index` asserts it stripped something, the mutation check was red, and it checks `inputs` still round-trip. The tar rewrite correctly resets `member.size`.
- Unit `test_import_export_invocation_rekeys_step_parameters`. Meaningful red (`'2' == '4'`) and it asserts `imported_tool_step.id != tool_step.id`, so it can't pass vacuously. It gives fast feedback for the serialize/import pair. Keep.
- Unit legacy test: see finding 1.
- No tests weakened or removed.
