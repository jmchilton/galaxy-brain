# Spike debrief: workflow_rerun_step_parameters

Spike for `workflow_rerun_drops_step_parameters` (since split and filed as galaxy#24175–#24178). Branch `jmchilton/workflow_rerun_step_parameters` off `dev` @ `b62d06dcdce`, 3 commits: server, client, then review fixes.

## Q1: break it into more issues?

Yes. Split by root cause, not by row in the issue's table. The replacement, resource, object-store and cache rows are a single client change.

1. **Bug (server): request export of subworkflow step params can't be resubmitted.**
   - Today the export emits `{"1": {"<inner step db id>": {"num_lines": 2}}}`. Resubmitting it hits `key.split("|")` and returns a 500.
   - The fix re-keys the params as `"<inner order_index>|name"`. `WorkflowStep.step_parameters_by_index`/`_by_id` now live on the model, and `_normalize_step_parameters` reuses the inverse.
   - Also folded in: the `except TypeError` that should be `ValueError`.
   - Red→green: `test_workflow_request_subworkflow_step_parameters_rerun`.
2. **Bug (server): `/request` on an imported invocation returns 500 (new, not in the issue).**
   - Store import copies `STEP_PARAMETERS` rows verbatim. Their `name` is a raw DB step id, so after import the id points at a step that doesn't exist (`KeyError: 6`).
   - The fix: serialization adds `order_index` plus the index-keyed params, and import re-keys them.
   - Stores exported before this have no old→new id map, so the export now skips those rows with a warning instead of returning a 500.
   - Red→green: `test_workflow_request_step_parameters_after_invocation_import`.
3. **Bug (client), small: rerun prefers the simple form, which never submits `parameters`.**
   - The overrides are dropped silently. This is the issue's "nothing tells them" complaint.
   - The fix forces the full form, with an explanation and the simple toggle hidden, when the export carries tool step params.
   - The simple form *does* submit replacement params and object stores, so the fix prefills those in the simple form rather than forcing the full form. Resource params already force the full form.
   - UX shift: the full form submits every unconnected param of every tool step, so *every* run that started in the full form will rerun in the full form.
4. **Feature: prefill the full run form from the invocation.**
   - Server: `GET /api/workflows/{id}/download?style=run&invocation_id=…` seeds tool step state through the same `compute_runtime_state(step_args)` path the scheduler uses, and seeds subworkflow runtime inputs.
   - Client: prefills input steps, workflow parameters, resource parameters and job re-use from the export.
   - It could ship as 4a (server seeding) and 4b (client), but they're small enough to go together.

Issues 1 and 2 could ship as one server PR. It's a reasonable single "step params aren't portable" PR, though 2 is the one reviewers will debate.

The branch currently has the whole lot in two commits. It is a spike, not a PR stack.

## Q2: database migration?

No, and one wouldn't help much.

- Everything lives in existing tables. `workflow_request_input_parameters` is a generic `name`/`TEXT value`/`type` row. The fixes are read-time re-keying plus a store-format addition, which is not a schema change.
- The tempting migration would be an FK `workflow_step_id` column on step-param rows, so that import can remap them the way it remaps `step_states`. But `WorkflowRequestStepState` already is that FK-backed, import-remapped per-step record, and it holds the full runtime state.
- Backfilling old rows would mean rewriting nested DB ids inside JSON for terminal invocations. That's a lot of risk for no user-visible gain.
- The lineage RFC (`invocation_rerun_lineage.md`) also chose meta parameters and no migration.

## Decision for John

**Source of the client prefill.** The issue says the request export is the right source for the client half. The spike seeds tool steps on the server instead, using `style=run` + `invocation_id`.

- Why: a flat `a|b` map can't add repeat instances or switch conditional cases in the client's `FormDisplay`. The server already builds the form from `step.state`.
- Catch: the full form substitutes `${name}` client-side, so step params store the substituted literal. Seeding has to skip inputs whose saved value is a `${…}` template, otherwise the workflow-parameter card disappears. `_untemplated_step_args` does this, and the test fails without it.

## Evidence

- API: 18 related `test_workflows.py` tests pass, and none fail. The new ones:
  - 2 were reds that are now green: subworkflow rerun, and import → export.
  - The import test also runs with a nested subworkflow.
  - 1 baseline was already green. It reruns a top-level tool step, so the top-level export works.
  - 3 seeding tests: a tool step, a subworkflow step, and a recorded dataset that was deleted and purged. The page still loads in that last case.
  - The `${}` guard is load-bearing: with it removed, the test fails with `'moo' != '${seedme}'`.
- Unit: `test/unit/data/model/test_model_store.py` and `test/unit/workflows` pass.
- Client: vitest for `Workflow/Run/` passes (71 tests), and `vue-tsc` is clean. eslint has warnings only, none of them new.
- Not done: no browser check of the rerun page.

## Gaps / follow-ups

- **Preferred object stores in the full form:** the full form has no UI for them and never submits them, so a full-form rerun still drops them. The simple form now prefills them. This is not new, but it is one of the issue's rows.
- **No component tests for the new rerun paths:** neither the forced-full-form path in `WorkflowRun` nor the simple form's replacement and object-store prefill has one. run1's fixture already forces the full form. Only the `rerunHasStepParameters` predicate is unit-tested.
- **`_normalize_step_parameters` is now stricter:** an unknown or non-numeric inner subworkflow index used to be silently ignored. It now returns a 400 `RequestParameterInvalidException`.
- **Latent bug:** `workflow_run_config_to_request` looks up `run_config.param_map.get(step.order_index)` for subworkflows, but `param_map` is keyed by `step.id`.
  - It's harmless today, because subworkflow values reach scheduling via `step_states`.
  - It could collide in small-id test DBs. One-line fix, but it changes what gets persisted on the sub-invocation.
- **Possible alternative source for the export:** `WorkflowRequestStepState` (full state, FK, remapped on import). It's more robust but bigger. Not pursued.

## Unresolved questions

- Server-seeded run form (spike) or client merge of the export (issue text)?
- Ship 1+2 as one PR or two?
- Object stores in the full form: in scope for this work, or a separate issue?
- Queue the split via `GX_QUEUING_ISSUE_CREATION.md`?
