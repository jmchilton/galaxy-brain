# Debrief: workflow_invocation_import_step_params

Source: `to_file/workflow_invocation_import_step_params.md` → `to_file/proposed_workflow_invocation_import_step_params.md`. Verified by reading `dev` at `c63ffc2ccae` (fetched 2026-10-14). Fix shape and test taken from spike branch `workflow_rerun_step_parameters` @ `1ad053b1fb3`, which is pushed to `jmchilton/galaxy` with a matching ls-remote sha, so the issue links it. Nothing run, nothing posted.

## Verdict

Proposed, not rejected. The premise holds on dev, it is reachable from the UI, and I found no duplicate.

## Verified (code read on dev)

- **Persisted by raw step id.** `run_request.py` L635-640 stores `param_map` rows as `name=str(step_id)`. `_normalize_step_parameters` keys them by `step.id`, and subworkflow values are nested by inner `step.id`.
- **Serialized verbatim.** `WorkflowRequestInputParameter._serialize` (model L11034) emits name/value/type only. `WorkflowRequestStepState._serialize` (L11058) adds `order_index`.
- **Imported verbatim.** `model/store/__init__.py` L1213-1221. The workflow is rebuilt with `read_workflow_from_path` → `build_workflow_from_raw_description`, so the steps always get new ids. Every other per-step record goes through `attach_workflow_step(order_index)`.
- **Lookup.** `services/invocations.py` L377 does `steps_by_id[step_id]` on the imported workflow. The `KeyError` is uncaught, and the route is a FastAPI `GET /api/invocations/{id}/request`, so it returns a 500. The spike recorded the red test as `KeyError: 6`.
- **Spike base vs current dev.** No diff between the spike base `b62d06dcdce` and `c63ffc2ccae` in `run_request.py`, `services/invocations.py`, `model/__init__.py`, `model/store/__init__.py` or `client/.../Workflow/Run/`. The red result therefore still applies.
- **UI reachability:**
  - The invocations grid has **Import Invocation** → `/workflows/invocations/import` → `HistoryImport.vue` (`invocationImport`) → `POST /api/histories` → `__IMPORT_HISTORY__` → `imp_exp` `perform_import` → `_import_workflow_invocations`.
  - **Rerun** (the `WorkflowNavigationTitle` button and the grid column, shown unless the workflow is deleted) → `/workflows/rerun` → `WorkflowRerun.vue` loads `/request` → shows `GAlert` "Unable to load workflow rerun data: …".
  - History exports (`export_history`) include no invocations, so only invocation archives (download / RO-Crate / file source) are affected.
- **Who is affected (wider than the draft).** `WorkflowRunForm.onExecute` sends `parameters` for every tool step (its unconnected inputs, `parameters_normalized: true`). `WorkflowRunFormSimple` sends no `parameters`.
  - With the default `simplified_workflow_run_ui: prefer`, Galaxy forces the full form for replacement params in tool steps, disconnected runtime inputs and resource params.
  - Users can also switch to the full form, or a server can set the config to `off`.
  - API invocations that pass `parameters` are affected too.
- **Collision claim.** On the same server it can't happen: `steps_by_id` holds only the rebuilt workflow's new ids, so the result is always a `KeyError`. A silent wrong-step mapping needs a cross-server import where an old id happens to equal a new step id. It is plausible but rare, and the issue says "can".
- **Existing coverage.** `test_export_reimport_reexport_invocation_with_subworkflow` (`test_workflows.py` L5099) runs no step params. The integration test `test_export_import_invocation_with_step_parameter` covers `input_step_parameters` (parameter inputs) and reinvokes the imported workflow. It never calls `/request`.
- **Branch.** `git ls-remote https://github.com/jmchilton/galaxy.git refs/heads/workflow_rerun_step_parameters` returns `1ad053b1fb3…`.

## #20376 relation

Adjacent; not a duplicate and not the same root cause.

- #20376 is the tool/job rerun form losing collection selections in histories imported from published share links. Those imports are history copies, with no model store and no invocation request. I checked this: `CopyModal` → `historyStore.copyHistory` → `POST /api/histories` with `history_id`.
- This bug is the workflow invocation request export after a model store import of an invocation.
- I left it out of the issue's Context so readers don't link them. #11407 ("job re-run broken for some jobs in a imported history", open) belongs to the same adjacent family, and I also left it out.

## Related search

Searches run with `gh search issues/prs`. Several were rate-limited and retried. Queries: "imported invocation rerun", "invocation import step parameters", "invocation request KeyError", "rerun imported invocation", "model store step parameters", "imported invocation request", "invocation export import parameters", "step parameters subworkflow rerun", "workflow_request_input_parameters", "invocation import rerun 500".

- No duplicate.
- Nearby but unrelated: #18927 (closed; RO-Crate invocation import with collection input), #23560 (open PR; RO-Crate provenance), #22250 (replacement param validation), #18981 (closed PR; "Test and Recover Workflow Request State"), #11407 and #20376 (job rerun in imported histories).
- Cited in the issue: #20032 (merged 2025-05-09, "Add rerun option for workflows"). It made `/request` the backing call of the Rerun button.

## Changes from draft

- Reframed from an API symptom ("`/request` 500s") to the user path: export → Import Invocation → Rerun. The opener and title name **Rerun**.
- Added who is affected. Every full-form run is affected, because the full form sends params for every tool step; simple-form runs aren't. The draft implied only explicit step-param overrides.
- Collision downgraded to cross-server only, worded as "can".
- Added the per-record table (order_index vs raw id) and the id flow sketch. The code walk sits in details with permalinks at `c63ffc2ccae`.
- The reproduction is the spike's test, unparametrized to the top-level case and labelled as adapted, with a permalink to the branch test (L5703-5726 @ `1ad053b1fb3`). `KeyError: 6` is given only as the spike's observation, since the id depends on the database. It is not a traceback: I didn't run it, and I didn't invent a stack.
- The UI toggle to **Expanded workflow form** is confirmed in `WorkflowRunFormSimple.vue`. The opener says "almost every" full-form run, because steps with no unconnected params save no row.
- Dropped the `except TypeError` → `ValueError` aside, because it belongs to the subworkflow sibling.
- Sibling drafts are cross-referenced by topic only: "filed together with" the subworkflow request export bug, shared helpers, could be one PR. `workflow_rerun_simple_form_drops_step_params` and `workflow_rerun_prefill_full_form` are not mentioned.
- Alternatives:
  - The FK/migration alternative is expanded: it still leaves nested JSON ids, needs a backfill, and duplicates `WorkflowRequestStepState`.
  - Added exporting from `WorkflowRequestStepState`, dropping rows on import, and storing order index in `name`.
- Added the backward-compatibility point: older Galaxy releases ignore the new keys.

## Left over

- **Decide (John/reviewers):** for archives exported before the fix, should `/request` skip unknown step ids with a warning (spike: rerun opens with defaults, silently) or return a clear 4xx? The issue presents skip as the default and names the 4xx option.
- If the siblings are filed first, the Context sentence about "filed together with" should become "🎯 #N" for the subworkflow export bug. Should the fix land as one PR with it (the spike debrief suggests yes)?
- The UI path was not driven in a browser. The `GAlert` text after the colon is unknown, so the issue elides it.
- Side finding, not in the issue: the `effective_outputs` meta param also stores raw DB step ids and is copied verbatim on import. That is latent, because imported invocations are terminal (non-terminal ones become cancelled) and never schedule. The lineage debrief noted the same thing.
- Side finding from the spike, not in the issue: `workflow_run_config_to_request` reads `param_map.get(step.order_index)` for subworkflows while `param_map` is keyed by `step.id`.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. Confirmed on dev `c63ffc2ccae`: step params saved by raw step id (`run_request.py` L635-640, `_normalize_step_parameters`); `_serialize` (model L11034) writes only name/value/type, store import (L1213-1221) copies verbatim while workflow is rebuilt with new ids (`read_workflow_from_path` → `build_workflow_from_raw_description`), every other per-step record re-attached via `attach_workflow_step(order_index)`; `steps_by_id[step_id]` (`invocations.py` L377) uncaught `KeyError` → 500; same-server import always KeyErrors; Import Invocation grid button/route + Rerun → "Unable to load workflow rerun data" alert exist; repro test permalink at `1ad053b1fb3` L5703-5726 matches, helpers/fixture exist on dev. #20032 correct; 2 dup searches: none.

Edits in place:
- Repro step 1: "num_lines left open" → "num_lines set as a runtime input".
- Table: added "Invocation steps" to records re-attached by `order_index`.
- Backward-compat sentence disambiguated ("ignores the extra keys and behaves as it does today").

Left over: pre-fix archives — skip-with-warning vs 4xx (John); swap "filed together with…" for 🎯 #N once subworkflow sibling filed; UI path not driven in a browser.
