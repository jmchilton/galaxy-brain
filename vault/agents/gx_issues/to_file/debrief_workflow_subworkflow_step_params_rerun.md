# Debrief: workflow_subworkflow_step_params_rerun

Source: `to_file/workflow_subworkflow_step_params_rerun.md` → `to_file/proposed_workflow_subworkflow_step_params_rerun.md`. Verified read-only against dev `c63ffc2ccae` (fetched 2026-10-14). Fix shape and tests taken from spike branch `jmchilton/workflow_rerun_step_parameters` (`f4b95406098`, `1ad053b1fb3`; pushed to jmchilton fork at `1ad053b1fb3`, so 🌿 link is live). Nothing run against a Galaxy server, nothing posted.

## Verdict

Proposed, not rejected. Premise holds by code read; no duplicate found.

## Verified (code read on dev)

- **Export shape.** `_normalize_step_parameters` recurses into subworkflow → inner map keyed by inner `step.id` (L202). `workflow_run_config_to_request` stores it as JSON under outer `str(step.id)` (L635-640). `serialize_workflow_invocation_to_request` re-keys only the outer id → order index, copies JSON verbatim (L370-377, TODO present). So export = `{"<outer idx>": {"<inner db id>": {...}}}`.
- **Accepted shape.** `"<inner idx>|name"`: `SubWorkflowModule.get_runtime_inputs` (modules.py L1024) and dev test `test_run_subworkflow_runtime_parameters` (L4785).
- **Failure.** Post-back with `parameters_normalized: true` → `key.split("|", 1)` at run_request.py L188 → `ValueError: not enough values to unpack (expected 2, got 1)` (confirmed with a python one-liner). `invoke_workflow` → `build_workflow_run_configs` has no try/except; `ValueError` not a `MessageException` → 500.
- **Top-level steps round-trip** (outer key re-keyed to order index; normalize looks up `str(order_index)`). Spike baseline test was already green on dev.
- **Export contract.** Route summary "a description modeling an API request to invoke this workflow"; `parameters_normalized: Literal[True]`; `workflow_populator.rerun()` posts it back.
- **Existing coverage.** Top-level step params already round-trip in dev's `test_run_replace_params_over_default` (L10396: export asserts `num_lines`, then `rerun()`). Draft/spike's "nothing round-tripped before" is wrong for top-level; true for subworkflows. `test_workflow_request` (L5625) asserts `parameters is None`.
- **Helpers shared with UI siblings.** Spike's server-side run-form seeding (`managers/workflows.py` in `f4b95406098`) calls `step_parameters_by_index`, so the pitch says helpers serve both — without taking a side on server seed vs client merge.
- **`except TypeError`.** `int(str)` raises `ValueError`, so the guard misses it; `int(None)` is `TypeError`. Names always `str(step.id)` → unreachable today. Issue suggests catching both (spike switched to `ValueError` only).
- **Spike's 400 claim.** `Workflow.step_by_index` raises `KeyError` on dev; `1ad053b1fb3` catches `(ValueError, KeyError)` → `RequestParameterInvalidException`. Dev silently ignores unknown/non-numeric inner indexes (recursive lookup by `str(order_index)` just misses) → stated as behaviour change.
- **Alternatives' claims.** `workflow_request_to_run_config` reads `int(parameter.name)`; module injector `int(key)`s subworkflow inner keys; store import remaps `step_states` via `attach_workflow_step`, copies `input_parameters` verbatim (model/store L1213-1232).

## UI reachability (dev)

The UI rerun does **not** hit the 500. `WorkflowRerun.vue` passes `requestData.inputs` + `use_cached_job` only; simple form never sends `parameters`; full form (`WorkflowRunForm.vue`) takes no request state and builds its own `parameters` from form state (index-keyed, `parameters_normalized: true`). This fixture has `runtime_inputs`, so `hasOpenToolSteps` likely forces the full form → values silently reset (sibling issue), no 500. A UI-launched first run *does* persist the nested shape, so its export is non-resubmittable. Issue states the 500 is API-only today and pitches it as prerequisite for the UI sibling fixes.

## Not verified

- **500 never observed.** Spike's red test fails at the export-shape assertion, before `rerun()`; the post-back 500 is code-read only. Issue says so in the repro details and links the spike test by branch (file link, not line). Capturing a real traceback = one API test run on dev (e.g. spike test with the first assertion removed); John's call.
- No server, no browser.

## Related issues/PRs (none duplicates)

- #18985 (merged, jmchilton): added `/request` export + subworkflow TODO → cited as follow-up.
- #18981 (closed): asked to round-trip recovered request in workflow tests; never done for step params → cited.
- #20032 (merged): rerun page consumes export → cited.
- #22387 (closed Sentry): `TypeError` in `_step_parameters` on the non-normalized path — same function, different bug. Not cited.
- #22817 (open): `parameter_input` double-nesting via API — different. #22710, #21971: broader tool-state/request capture, not cited.
- Searches (issues+PRs, keyword and exact phrase): subworkflow parameters rerun, invocation request parameters subworkflow, rerun subworkflow, subworkflow runtime parameter, rerun step parameters, parameters_normalized, `_normalize_step_parameters`, "not enough values to unpack", rerun subworkflow 500. First batch hit search rate limit; all rerun successfully after backoff.

## Changes from draft

- Title renamed to name the route (export can't be posted back); draft's "Rerunning an invocation … 500s" read as the UI button, which can't reach it on dev.
- Exported shape shown with labelled `<inner step id>` placeholder, not draft's `{'1': {'1': {...}}}` (inner `1` would read as an order index).
- Side-by-side accepted/exported/post-back table up front; repro + call path + links in details; 500 explicitly marked as code-read.
- `except TypeError` demoted to one-line tidy-up; suggest `(TypeError, ValueError)`.
- Context: 🌿 branch link, follow-up to #18985 (added export + TODO), related #18981 (round-trip testing ask) and #20032 (rerun page); siblings by topic.
- Proposed Approach: spike helpers, 400 mapping, behaviour change, no migration, tests. Alternatives: accept nested-by-id on invoke, store index-keyed, export from `WorkflowRequestStepState`.
- Dropped from issue: latent `param_map.get(step.order_index)` (below); "could be one PR with import sibling" reduced to "can share the helpers".

## Left over

- **Latent `param_map.get(step.order_index)`** (run_request.py L603): `run_config.param_map` is keyed by `step.id` (normalize L202), so lookup by order index is a key mismatch — confirmed by code read. Sub-invocation STEP_PARAMETERS rows are therefore normally empty; sub-invoker builds its `param_map` from them (`workflow_request_to_run_config`, run.py ~L790) but tool state comes from `step_states`, so impact today looks nil. Collision effect (a step id equal to the subworkflow step's order index) unverified. Kept out of the issue; possible separate tidy-up or fold into the PR.
- Sentry nuance: turning the bare `ValueError` into a typed exception stops Sentry reporting; fine for the 400 path, but `InconsistentDatabase` (typed 500) on the export side should probably pair with `log.error`.
- Whether to ship with the import sibling as one PR (spike debrief open question).

## Reviewer

pending
