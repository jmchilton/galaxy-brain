# Scope evaluation

**Recommendation: keep scope as implemented.** The branch implements the Proposed Approach in #24176 almost line for line: server seeding via `style=run&invocation_id=`, client prefill from the request export, and the shared `rerunInputValue` lookup. It also carries the minimal `rerunHasStepParameters` guard, so it doesn't regress before #24177 lands. Every reviewer-raised expansion is either pre-existing on dev, a separate feature, or better owned by a sibling branch. None justifies reopening this one. Three cross-branch handoffs should be written down so they don't get lost:
- (a) #24177's Selenium rerun test asserts that the expanded form shows the *original* tool value before editing it. That is this branch's only E2E coverage.
- (b) #24177 collapses the `WorkflowRerun` prop slices and the redundant `isRerun &&`.
- (c) Whichever of #24175/#24176 lands second makes `recover_step_parameters()` and `resolve_step_parameters()` share one per-row resolver.

One non-scope item needs the coordinator: post-review commit `1db646937bb` may let one malformed row fail the whole rerun run-form (see "As implemented" details).

Evaluated at `1db646937bb`, stacked on `issue_24178_subworkflow_step_params_export` @ `5cf81e75c12` (base `dev` @ `88127f42979`). 7 commits:
- Implementation: +214/−48 across 9 files (3 server, 6 client).
- Tests: +257/−3 across 5 files (7 API tests, 3 vitest files).

`1db646937bb` postdates the Codex (`..bab10d268ef`) and thermo-nuclear (`d2b8bfce0ab`) reviews, so neither of them saw it.

## As implemented

`GET /api/workflows/{id}/download?style=run&invocation_id=` recomputes tool step state from the invocation's `STEP_PARAMETERS` rows through `compute_runtime_state(step_args=)`. It skips `${}`-templated and connected inputs, falls back on validation errors, and sets subworkflow run-time inputs directly. `WorkflowRunForm` prefills input steps, workflow parameters, resource parameters and `use_cached_job` from the request export. `rerunHasStepParameters` forces the expanded form when the export carries step parameters.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the issue's Proposed Approach. No migration, and no new persisted state.</li><li>Tool state goes through the same `check_param` path the original request used, so conditionals, dependent selects and purged datasets are handled correctly.</li><li>Client/server split follows existing ownership (thermo review: no structural regression).</li><li>Stands alone without regressing (guard).</li><li>Factoring out `rerunInputValue` shrinks the simple form and gives #24177 one home for interpreting the export.</li></ul> | <ul><li>Fourth place that parses `STEP_PARAMETERS` rows. It now overlaps #24175's `resolve_step_parameters()` nearly 1:1.</li><li>Subworkflow seeding skips `check_param` (raw recorded JSON).</li><li>The guard is half of #24177's behaviour. It has no reason text and leaves the simple toggle visible, so reviewers may see an odd intermediate UX if it merges alone.</li><li>No E2E coverage on this branch.</li></ul> |

<details><summary>Post-review commit <code>1db646937bb</code> (correctness flag, not scope)</summary>

This commit moved inner-subworkflow re-keying into `WorkflowInvocation.recover_step_parameters()` so that it mirrors #24175's resolver. The old `_seed_subworkflow_run_inputs` caught `(KeyError, ValueError)` and skipped the row. Now `recover_step_parameters()` handles the two errors differently:
- `KeyError` (an unknown outer or inner step) is logged and skipped. The log text says "unknown step id" even when the outer step is known.
- `ValueError` becomes `InconsistentDatabase`. That covers a non-numeric inner id from `step_parameters_by_index` and invalid JSON.

The call runs at the top of `_workflow_to_dict_run`. So a single malformed row would fail the whole run-form download on the rerun page. Dev never calls this path, and #24175's `/request` export skips such rows. The rerun page loads `/request` first, so the user would get past that step and then fail at the run form.

This is plausibly unreachable for rows Galaxy itself wrote. But it contradicts "no branch regresses alone" in spirit, and no review has seen it. Worth a glance from the coordinator: catch `ValueError` from the inner re-key as a skip, or accept it as is. It does not change the scope recommendation.

</details>

## Fold #24177 in, or ship #24176 + #24177 as one PR

Merge the forced expanded form, its explanatory message, the hidden simple toggle and the simple-form prefill into this branch. This was the initial normal review's should-fix and the initial debrief's escalation. **Settled: the split is deliberate.**

| Pros | Cons |
| --- | --- |
| <ul><li>No intermediate UX: the guard and its explanation land together.</li><li>One Selenium test covers both.</li><li>Removes cross-branch handoffs (prop collapse, E2E assertion).</li></ul> | <ul><li>Mixes a server feature (seeding) with a client policy change (forcing the expanded form). Reviewers may accept one and not the other.</li><li>Contradicts the settled four-branch decision.</li><li>The guard already removes the regression that motivated folding.</li></ul> |

## Drop the guard, rely on #24177 landing with it

Remove `rerunHasStepParameters` from this branch and require #24176 and #24177 to merge together. **Rejected by the coordinator** ("no branch may regress alone").

| Pros | Cons |
| --- | --- |
| <ul><li>About 10 fewer lines here. All rerun-form policy lives in #24177.</li></ul> | <ul><li>On its own, seeding flips `hasOpenToolSteps` true → false, so such reruns could land in the simple form, which never submits `parameters`. That is a regression vs dev (initial debrief escalation, confirmed by a vitest probe).</li><li>Puts a merge-order constraint on reviewers.</li></ul> |

## Contract: server seeding only (spike 4a)

Ship only the `invocation_id` seeding on the download endpoint. Leave the client prefill (input steps, workflow parameters, resource parameters, job re-use) to a later PR.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller, server-only review.</li><li>The endpoint is independently useful (planned single-step rerun).</li></ul> | <ul><li>Does not fix the issue: nothing calls the endpoint, so reruns are unchanged.</li><li>The issue table's input-step and job re-use rows are the most user-visible losses (a silently selected first dataset, every step rerun).</li><li>Client half is small (+~100 lines). Splitting it adds review overhead for no isolation gain.</li></ul> |

## Alternative: client merge of the request export instead of server seeding

The issue's alternative approach. The client overlays `parameters` (`a|b` keys) onto the unseeded tool forms; no server change. **Kept as a reviewer question; not recommended.**

| Pros | Cons |
| --- | --- |
| <ul><li>No new API parameter, and no server code.</li><li>A single source (the export) for everything.</li></ul> | <ul><li>A flat key map can't switch conditional cases or rebuild dependent options in `FormDisplay`. The case-switch API test shows the server handles this.</li><li>Would duplicate `check_param` logic client-side, or skip validation (purged datasets).</li><li>Loses the seeded step model the planned single-step rerun wants.</li></ul> |

## Expand: legacy unlabeled input lookup (`effective_label`)

Make `rerunInputValue` find input steps keyed by `tool_inputs["name"]`, which `recover_inputs()` uses through `effective_label`. Either send `effective_label` or a separate rerun key in the run-style step model (Codex P2).

| Pros | Cons |
| --- | --- |
| <ul><li>Old workflows with unlabeled named inputs would prefill in both forms.</li><li>Small server and client change.</li></ul> | <ul><li>Pre-existing on dev for the simple form; this branch only shares the unchanged lookup.</li><li>Changing `step_label` affects simple-form display and landing-request keys, and a new field widens the API.</li><li>Fits its own small issue/PR, and benefits both forms independently of this stack.</li></ul> |

## Expand: consolidate `STEP_PARAMETERS` parsing

Make `serialize_workflow_invocation_to_request` and `run_request.py` call one model-level resolver. Reconcile `recover_step_parameters()` (this branch) with `resolve_step_parameters()` (#24175). **Deferred: reconcile after both land.**

| Pros | Cons |
| --- | --- |
| <ul><li>Four parsers become one. `1db646937bb` already aligned the semantics (index re-keying, skip unknown), so the delegation is mechanical.</li><li>One place for the skip-vs-raise policy (see the `ValueError` flag above).</li></ul> | <ul><li>#24175 is a sibling, not a parent. Doing it here would either duplicate its resolver or stack on it, coupling two independently reviewable fixes.</li><li>Touches parent-owned code (`services/invocations.py`) that #24175 also edits, which risks conflicts.</li></ul> |

<details><summary>Ownership</summary>

Recommend that whichever of #24175/#24176 merges second does the delegation as a small rebase commit: `recover_step_parameters()` becomes a loop over `resolve_step_parameters()`. Do the services/`run_request.py` switch in a separate follow-up PR. Record this in both branches' PR descriptions so reviewers see the duplication is known.

</details>

## Expand: subworkflow seeding through `check_param`

Thread a seeded value through `InputProxy.to_dict` (`other_values`) so subworkflow run-time inputs are validated and stringified like tool steps (thermo review).

| Pros | Cons |
| --- | --- |
| <ul><li>One seeded path for both step types, and consistent value types (`"2"` vs `2`).</li></ul> | <ul><li>Needs plumbing in `workflow/modules.py` that the issue doesn't ask for.</li><li>Low risk as is: subworkflow run-time inputs exclude data inputs, and recorded values already validated at run time.</li><li>Better as a follow-up, or alongside the planned single-step rerun.</li></ul> |

## Expand: collapse client prop sprawl

Replace `request-state`, `simple-form-use-job-cache` and `is-rerun` with `rerunRequest`, and drop the redundant `isRerun &&` from the guard.

| Pros | Cons |
| --- | --- |
| <ul><li>A cleaner `WorkflowRun` interface.</li></ul> | <ul><li>#24177 adds more `rerunRequest` reads to the same lines. Doing it here would mean churning them twice.</li><li>**Assign to #24177** (already the plan).</li></ul> |

## Expand: preferred object stores in the expanded form

Add object store controls to `WorkflowRunForm` and prefill them on rerun. **Out of scope by decision.**

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last row of the issue table.</li></ul> | <ul><li>A new full-form feature (UI plus submit), not a prefill. The form never sends them even on normal runs.</li><li>The issue explicitly excludes it.</li></ul> |

## Expand: latent `param_map` keyed-by-id bug

Fix `workflow_run_config_to_request` looking up subworkflow params by `order_index` in an id-keyed map. **Out by coordinator decision.**

| Pros | Cons |
| --- | --- |
| <ul><li>One-line fix in the same area.</li></ul> | <ul><li>Changes what is persisted on sub-invocations, which is unrelated to prefill.</li><li>Harmless today (values reach scheduling via `step_states`). Its own follow-up.</li></ul> |

## Expand: E2E test on this branch

Add a Selenium test for rerun → expanded form → original tool value shown.

| Pros | Cons |
| --- | --- |
| <ul><li>The only coverage for the two-line `WorkflowRerun.vue` pass-through, and for the user-visible fix end to end.</li></ul> | <ul><li>Duplicates #24177's planned Selenium rerun flow on a loaded machine.</li><li>**Handoff:** #24177's test must assert the original value *before* editing it (test challenges recommendation). Put this in #24177's PR checklist.</li></ul> |

## Small API/structure tidies

These are an options object for `getRunData`'s growing positional args, moving `stepModels` shaping into `model.js`, moving the seeding helpers out of `managers/workflows.py`, and sharing `_find_run_input` with `test_workflow_build_module.py`'s `_find_input`.

| Pros | Cons |
| --- | --- |
| <ul><li>Marginally tidier.</li></ul> | <ul><li>Each changes existing call sites or moves code without removing concepts (thermo review). Low value; skip.</li></ul> |
