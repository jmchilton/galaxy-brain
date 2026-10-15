# Debrief: workflow_rerun_simple_form_drops_step_params

Source: `to_file/workflow_rerun_simple_form_drops_step_params.md` (split from `internally_managed/workflow_rerun_drops_step_parameters.md`) → `to_file/proposed_workflow_rerun_simple_form_drops_step_params.md`. Verified against read-only `dev` `c63ffc2ccae` (2026-10-14) scratch clone. Spike `workflow_rerun_step_parameters` (`1ad053b1fb3`) read only. Nothing posted.

## Verdict

Proposed, not rejected. Premise holds for tool step params + object stores. **Draft premise wrong on workflow (replacement) params**: simple form does *not* effectively submit them (see below). No duplicate.

## Verified

- `WorkflowRerun.vue` mounts `WorkflowRun` with hard-coded `prefer-simple-form`, `request-state=inputs`, `simple-form-use-job-cache`; rest of export unused. Hard-coded → applies even when `simplified_workflow_run_ui: off` (router/Home.vue honor the config; rerun doesn't).
- Simple form forced off only by `hasReplacementParametersInToolForm` / `hasOpenToolSteps` / `hasWorkflowResourceParameters` (`WorkflowRun.vue` L125-153). Nothing inspects export.
- `WorkflowRunFormSimple.onExecute`: `replacement_dict`, `inputs`, `inputs_by`, `batch`, `use_cached_job`, object store ids (init `null`, never seeded from export). No `parameters`.
- Full form `onExecute` sends `parameters` for every tool + subworkflow step (connected inputs filtered); `FormDisplay` emits full state during setup (L151-155) → every full-form run records step params → UX-shift claim true.
- Export `serialize_workflow_invocation_to_request` emits `parameters` keyed by order index, `parameters_normalized=True`.
- **New: `replacement_dict` is ignored by the API.** `InvokeWorkflowPayload` has `replacement_params` only; `model_dump(exclude_unset=True)` drops `replacement_dict` (checked in Python against dev `lib/`, spike `.venv` interpreter, no bytecode writes). `build_workflow_run_configs` reads `payload.get("replacement_params")`; `git log -G` shows server never read a `replacement_dict` payload key. Key dates to simple form's introduction (`4626f714bb2`, 🔀 #9151, 2020). Selenium `test_replacement_parameters` / `_on_subworkflows` call `workflow_run_ensure_expanded()` → simple-form path untested. Object store keys and `parameters` survive `model_dump` fine.
- Component demo: temp vitest (`WorkflowRunFormSimple.rerundropzq.test.ts`, hand-built model, shallowMount, mocked `invokeWorkflow`) — payload captured in proposal. Passed; `invokeWorkflow` (`services.js`) POSTs the object unchanged, so mocked arg = wire payload. File deleted from scratch clone afterward (copy at scratchpad root). Caveat: scratch `client/node_modules` symlinks to spike worktree, so `@galaxyproject/ui` package came from spike; irrelevant to this component.
- Spike branch pushed: `git ls-remote https://github.com/jmchilton/galaxy.git` → `1ad053b1fb3` = spike HEAD. Link used.
- Spike's simple-form workflow-param prefill reads `replacement_params` but submit key still `replacement_dict` → prefill has no effect at submit. Spike debrief claim "simple form does submit replacement params" is wrong.

## Related (none duplicates)

#20032 (rerun option, fixes #11340), #18985/#18981 (request export), #22601 (falsy param values lost on rerun — same page, same class), #18696 (rerun w/ cached jobs UX), #9151 (simple form origin of `replacement_dict`), #20376 (imported histories' tool rerun forms lose collection input — different form), #21971 (tool state round-trip). Open PR titles (271) grepped for rerun/simple/replacement/run form: none. First search batch was invalid (zsh didn't word-split → exact-phrase queries); re-run word-split, issues + PRs.

## Changes from draft

- Loss table first (inputs/cache/step params/object stores/workflow params × exported/prefilled/submitted); concrete `random_lines1 num_lines` example; who-hits-it list (expanded-form runs, API `parameters` callers, `off` servers).
- Code walk + payload demo in details, permalinks at `c63ffc2ccae`.
- Workflow-params row marked as separate bug (`replacement_dict`), not folded in.
- Proposed Approach now states dependency: forcing full form on dev gives an *empty* form (no request state to `WorkflowRunForm`) → must land with/after full-form prefill. Draft called this "standalone, small" — not true alone.
- Added Alternatives: forward `parameters` verbatim from simple form (no UX shift; hidden overrides; subworkflow 500 until server fix), force only on diff, warn only.
- Sibling drafts cited by topic, no numbers.

## Left over

- **Decide: file `replacement_dict` bug separately?** Simple form's workflow-parameter field is dropped on every simple-form run of a workflow with PJA `${…}` params (since 2020). Not drafted (scoped to one draft). Not run end-to-end (no API/Selenium run); evidence is code + pydantic dump. Fix ≈ rename key in `WorkflowRunFormSimple.onExecute` + a simple-form Selenium/API test.
- **Decide: forced full form (spike) vs forward-verbatim** in simple form. Proposal prefers spike shape but forward-verbatim is cheaper and has no dependency on full-form prefill.
- Spike gaps unchanged: no component tests for forced-full path / simple-form prefill; no browser check.
- Example's exported `parameters` shape for `random_lines1` inferred from code, not captured from a live run.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. **`replacement_dict` bug independently confirmed** on dev `c63ffc2ccae`: `WorkflowRunFormSimple.onExecute` (L474) sends `replacement_dict`, full form sends `replacement_params` (WorkflowRunForm.vue L312); `InvokeWorkflowPayload` has only `replacement_params`, base `Model` config has no `extra=forbid`/alias → unknown keys dropped; `services/workflows.py` L330 `model_dump(exclude_unset=True)` → `run_request.py` L533 `payload.get("replacement_params")`; pydantic check against dev `lib/` shows `replacement_dict` gone after dump; no mapping anywhere in `lib/galaxy`. Introduced client-side in `4626f714bb2` (#9151, 2020-08-14), server never read it → simplified-form `${name}` values never applied. Selenium replacement-param tests call `workflow_run_ensure_expanded()` → path untested. Belongs in its own issue (not drafted).

Also confirmed: rerun hard-codes `prefer-simple-form` ignoring `simplified_workflow_run_ui` (router/Home.vue honor it); expanded form records every unconnected param (FormDisplay L155 emits on setup); must land with/after full-form prefill (`WorkflowRunForm` gets nothing from export). Cites/permalinks checked.

Edits in place:
- Workflow-params note → footnote ¹ under table, labelled separate bug.
- Code walk: "no field or alias, ignores unknown keys" + `model_dump` link.
- Context: #22601 wording fixed (falsy *parameter input* values, not `${}` params); `replacement_dict` bug listed as tracked separately.
- Proposed Approach: dependency next to forced expanded form; "hidden loss → empty form" corrected to "saved tool values, no inputs selected, loses existing input prefill".
- Object stores: now out of scope (sibling excludes them), not "tracked with full-form prefill".
- "Warn only" alternative: "expanded form that starts from saved values".
- Simple-form prefill detail points to footnote ¹.

Left over: file the `replacement_dict` bug separately (fix = key rename + simplified-form test) — John; example `parameters` shape inferred from code, not captured live.
