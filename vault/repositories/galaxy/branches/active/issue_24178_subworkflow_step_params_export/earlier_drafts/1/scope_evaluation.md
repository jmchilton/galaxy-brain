# Scope evaluation

**Recommendation: a modest expansion, in three separable items, highest confidence first.** (A) Fix the latent `run_config.param_map.get(step.order_index)` lookup in `workflow_run_config_to_request` to `.get(step.id)`. Subworkflow invocations then record their own step parameters, and their `/request` export carries them through this branch's helpers. (B) For `parameters_normalized` requests, reject unknown outer step indices with a 400. That matches the 400 this branch adds for unknown inner indices. (C) Move #24175's `WorkflowRequestInputParameter.resolve_step_parameters()` down into this branch, as the export's row resolver, so #24175 and #24176 share it instead of each re-implementing it. Keep the base on `dev`; a `release_26.2` backport is John's call after merge. The other deferrals on the stack's follow-up list belong to a sibling branch or to their own issue.

Evaluated fresh at head `5cf81e75c12` against base `88127f42979`. The rebased fork head `a171dbed419` only resolves a fixture conflict, and none of this changes because of it.

## As implemented

The export re-keys stored subworkflow step params to `"<inner index>|name"` through `WorkflowStep.step_parameters_by_index`, and invoke reverses that with `step_parameters_by_id`. Malformed or unknown inner keys now return a 400, and the inner `parameter_input` check is kept.

| Pros | Cons |
| --- | --- |
| • Fixes the issue exactly as it proposes.<br>• Adds the reusable helper pair both children build on.<br>• Smallest diff, already reviewed four times. | • Leaves a bug in the same persistence path the issue's call path walks through (A).<br>• Inner unknown index gives a 400 while outer unknown is silently ignored. Reviewers will ask why (B).<br>• Two children each write their own row → `(step, params_by_index)` resolver on top of this branch (C). |

## A. Fix the `param_map` lookup for subworkflow invocations (recommended)

Change `param_map=run_config.param_map.get(step.order_index)` to `.get(step.id)` at `run_request.py:609`. Add an API assertion that the subworkflow invocation's own `GET /api/invocations/{id}/request` carries `{"1": {"num_lines": 2}}`. That assertion fails at head.

| Pros | Cons |
| --- | --- |
| • A one-line fix in the step-param persistence path the issue names ("store … under the outer step's id").<br>• Subworkflow invocations stop silently losing their recorded step params. Their export then works through this branch's helpers, so this completes the issue's "subworkflow export" story.<br>• Removes a wrong-step collision (inferred, see details).<br>• Inner steps get the same `step_args` treatment as top-level steps. | • Changes what is persisted going forward: new STEP_PARAMETERS rows on subworkflow invocations. This was the coordinator's reason to defer.<br>• The scheduler re-applies the recorded params to inner steps (`compute_runtime_state` with `replace_default_values=True`). That is a behaviour change, even though it matches what top-level steps already get.<br>• Children restack. |

<details><summary>Details</summary>

- **The bug.** `param_map` is keyed by step id. `_normalize_step_parameters` writes `normalized_param_map[step.id]` (`run_request.py:194`), and `workflow_request_to_run_config` reads back `int(parameter.name)` (`:708`). The subworkflow run config indexes it by `order_index`, so it almost always gets `None`, which becomes `{}`. The subworkflow invocation then records no STEP_PARAMETERS rows.
- **Why execution still works today.** The outer `populate_module_and_state` computes the inner runtime state, and `WorkflowRequestStepState` persists it for each inner step. `WorkflowProgress.remaining_steps` decodes that persisted state, so inner jobs get the right values, and the issue's red test passes. Only the subworkflow invocation's own request record is wrong.
- **Who sees it.**
  - `GET /api/invocations/{subworkflow_invocation_id}/request` has no `parameters`.
  - `WorkflowNavigationTitle`'s **Rerun** isn't gated on `isSubworkflow`. I didn't verify a UI path that reaches it for a subworkflow invocation.
- **Collision.** This is inferred from reading the code, not reproduced. It is realistic only on small or fresh databases.
  - When an outer step's db id equals the subworkflow's `order_index`, the subworkflow invocation inherits that outer step's params.
  - For a tool step those are keyed by param name. That gives a row named `"num_lines"`, and `int(parameter.name)` then raises when the subworkflow schedules or exports.
- **Behaviour after the fix.**
  - The subworkflow `WorkflowProgress.param_map` becomes `{inner_id: params}`.
  - `remaining_steps` passes those params as `step_args` (`run.py:467`), but the persisted step state still wins.
  - `ToolModule.execute` applies them as `step_updates` (`modules.py:3107`). The values are the same ones the persisted state was built from, the same as top-level steps today.
  - Nested subworkflows recurse through the same `.get(step.id)`, because the stored map is `{inner_id: {nested_id: {...}}}`.
- **Sibling impact (#24175).** New subworkflow-invocation rows go through #24175's store export and import generically.
  - Export: `_serialize` resolves each row against its own invocation's workflow.
  - Import: re-keying uses each imported invocation's own `workflow` (`model/store/__init__.py` ~1146 and 1216).
  - No #24175 code change is needed. Its archive test could add a subworkflow-invocation row case.
- **Test.** Extend `test_workflow_request_subworkflow_step_parameters_rerun`, or add a sibling test: find the subworkflow invocation id from the outer invocation's steps and assert its `/request` `parameters`. Re-run the existing `test_run_subworkflow_runtime_parameters*` and replacement-param tests for regressions.

</details>

## B. Reject unknown outer step indices on normalized invokes (recommended, separable)

When `parameters_normalized` is true, any `parameters` key that isn't the `order_index` of a step returns a 400 naming the key. Without this, the key is dropped. Add an `unknown_outer_index` case to the parametrized `test_run_subworkflow_runtime_parameters_invalid_key`, or to a top-level neighbour.

| Pros | Cons |
| --- | --- |
| • Removes the inner/outer asymmetry this branch creates in the same function.<br>• About 5 lines, plus one parametrized case.<br>• Every in-tree producer sends valid keys: the run form, the export and the populators.<br>• Follows the recent tightening of this same function by `d8c6b0c76fa`. | • The widest blast radius of the three: it affects every normalized invoke, not just subworkflows.<br>• External API clients (bioblend users) that send stale or extra keys go from a silent drop to a 400.<br>• A saved request replayed against an edited workflow fails instead of partly applying. The inner change already makes this trade.<br>• Drop this one first if reviewers push back. |

<details><summary>Details</summary>

- `_normalize_step_parameters` loops over the steps and reads `param_map.get(str(step.order_index))`, so it never inspects keys that match no step.
- The check should be `set(param_map) - {str(s.order_index) for s in steps}`, at the top level, only when `already_normalized` is true.
  - Inner levels are already covered by `step_parameters_by_id`.
  - The legacy path keys by tool id, step id or uuid, where unmatched keys are normal, so it should stay untouched.
- **Producers checked:**
  - `WorkflowRunForm.vue` `onExecute` keys by the model step index (`model.js` `index: i`).
  - `serialize_workflow_invocation_to_request` keys from stored rows.
  - `populators.run_workflow` passes test-defined keys.

</details>

## C. Move the step-parameter row resolver into this branch (recommended, boundary fix)

Land `WorkflowRequestInputParameter.resolve_step_parameters()` here, and have this branch's export loop use it. The resolver returns `(step, params keyed by index)`, or `None` for an unknown step, and raises `ValueError` for a malformed row.

The work then splits as follows:

- #24178's export keeps failing on an unresolved row, as it does today.
- #24175 keeps its skip-with-warning, `_serialize` and import changes.
- #24176's `recover_step_parameters()` becomes a loop over the resolver.

| Pros | Cons |
| --- | --- |
| • Removes the known duplicate between #24175 and #24176 at their common parent, instead of a "whoever lands second" reconcile.<br>• It sits next to the helpers it wraps, and its first call site is the export loop this branch already edits.<br>• About 15 lines move down. Net code across the stack shrinks. | • Both children restack again, though they were restacked 2026-10-16 and are at final review. If A lands, they restack anyway.<br>• At this branch alone the resolver has one caller.<br>• `None` semantics have to be specified here, while their policy (skip) lives in #24175. |

<details><summary>Details</summary>

- **#24175.** `resolve_step_parameters()` is at `model/__init__.py:11074` in its worktree.
- **#24176.** `recover_step_parameters()` is at `:10572`. It re-implements the same `int(name)`, `steps_by_id`, `step_parameters_by_index` sequence, skipping on `(TypeError, ValueError, KeyError)`.
- **Unresolved rows here.** Keep dev's 500 for an unknown id. If it becomes `InconsistentDatabase`, pair it with `log.error`: a typed `MessageException` 500 stops reporting to Sentry.

</details>

## D. Retarget or backport to `release_26.2` (John's call, not part of the recommendation)

The code applies cleanly. `run_request.py` and `services/invocations.py` are identical between `88127f42979` and `origin/release_26.2`, and the `model/__init__.py` drift is elsewhere. The tests need a small hand-port, because `test_workflows.py` and `workflow_fixtures.py` differ.

| Pros | Cons |
| --- | --- |
| • A real 500 in an API documented for re-posting.<br>• Small, with no migration, and A is equally small.<br>• Galaxy is liberal about release-branch fixes. | • 26.2's UI can't reach it, because the rerun page never forwards `parameters`. Only API users who re-post the export hit it.<br>• Retargeting splits the stack: #24176/#24177 are client features that stay on `dev`.<br>• Prefer a cherry-pick after merge to a retarget. |

## E. Contraction: fix only the 500, keep silent drops for bad inner keys (rejected)

Map only the old `ValueError` to a 400, and keep ignoring unknown or non-numeric inner indices as dev does.

| Pros | Cons |
| --- | --- |
| • Zero contract change for existing callers. | • The issue explicitly proposes the 400.<br>• Silent drops are the bug class this whole stack exists to remove.<br>• Saves no code, since the helper raises anyway. |

## Belongs elsewhere

| Candidate | Owner | Why not here |
| --- | --- | --- |
| `replacement_dict` key (#24177 footnote ¹) | its own issue (not filed) | It is the client simple form's payload key. Nothing in this branch's code path touches it. |
| Duplicate re-keying helpers (#24175 vs #24176) | C above | If C is declined, #24175/#24176 reconcile as planned. |
| `withRerunValues` duplication | #24176/#24177 | Client-only. |
| Legacy unlabeled input steps not prefilled | #24176 follow-up | This is input keying (`effective_label`), not step params. It is pre-existing in the simple form. |
| Full-form object stores have no UI | own feature | An expanded-form UI feature. |
| Import drops rows without `order_index`? | #24175 | Import policy for old archives. |
| "Step params lost" notice | #24175/#24177 | It surfaces #24175's skip in the client. |
