# Scope evaluation

**Recommendation: modest expansion, kept inside this branch.** Keep server seeding and the coordinator's split of the four branches. Add two items. (1) Fix the legacy unlabeled input step lookup in the shared `rerunInputValue`: the run-style step model gets a separate field carrying the `/request` key derived from `effective_label`, and the helper prefers it. Leave `step_label` alone. This closes the gap in both forms, including the simple form's existing gap on dev. (2) Move `withRerunValues` from `WorkflowRunForm.vue` into `model.js` so #24177 imports it instead of inlining a copy. Don't hoist or restack for the duplicate STEP_PARAMETERS helper now. Do the five-line delegation when the second of #24175 and #24176 lands, and strengthen the imported-invocation test at the same time. Object stores, the client merge and the `param_map` bug stay out.

Evaluated: head `d10e8cfbf41`, own diff `a171dbed419..HEAD` (17 files, +528/−51). The branch was rebased onto the new #24178 tip `a171dbed419`. The `8141bfccf87`/`5cf81e75c12` pair I was given is stale: `5cf81e75c12` is no longer an ancestor.

## 1. As implemented

Server seeds the expanded run form from `style=run&invocation_id=`. Tool steps go through `compute_runtime_state(step_args=…)`, with the `${}` guard and the connected-input skip. Subworkflow run-time inputs are set directly. The client prefills input steps, workflow and resource params and job re-use, and `rerunHasStepParameters` forces the expanded form.

| Pros | Cons |
|---|---|
| Covers every row of the issue's table except object stores, which the issue excludes. Follows the issue's proposed approach. | Shared `rerunInputValue` still misses legacy unlabeled input steps (Codex P2, confirmed). The expanded form now inherits the simple form's gap. |
| Reviewed four ways, with red-first API and vitest tests and E2E on Playwright and Selenium. | `withRerunValues` is private to `WorkflowRunForm.vue`. #24177 inlines a copy, which its normal review, Codex and thermo all flagged. |
| No regression on its own, thanks to the guard. | A second STEP_PARAMETERS row resolver beside #24175's `resolve_step_parameters()`. |

## 2. Modest expansion, in this branch (recommended)

As implemented, plus: (a) a separate request-key field on the run-style step model, based on `effective_label` and set for input steps, which `rerunInputValue` prefers over `step_label`/`step_index`; (b) `withRerunValues` moved to `model.js` next to `rerunInputValue` and `rerunHasStepParameters`.

| Pros | Cons |
|---|---|
| Fixes a related bug in code this branch owns at both ends: it adds `_workflow_to_dict_run`'s step model fields and `rerunInputValue`. | Adds a field to the run-style download, which is a small API surface addition. The field name needs John's call. |
| Also fixes the simple form's rerun of legacy workflows on dev. Without it, a required single dataset input silently falls back to the first listed dataset. | One more API test, which needs a `.ga` fixture with an unlabeled input step that has `tool_inputs.name`, plus one more vitest case. |
| A new field instead of changing `step_label` keeps display (`model.js:29`), `parameterInputLabels` (`model.js:48`) and the simple form's `stepLabel` unchanged. That avoids the risk Codex cited for deferring. | #24177 has to rebase onto the moved helper. Its simple form keeps its local `color = undefined` copy. |
| `withRerunValues` gets one home. The only blocker #24177 cited was "it's parent code", and this branch is the parent. | |

<details><summary>Details</summary>

- Why a new field: `WorkflowInvocation.recover_inputs()` keys by `effective_label`, which falls back to `tool_inputs["name"]` for input steps without a label. `_normalize_inputs` resolves `inputs_by="name"` through `effective_label` too (`run_request.py:136`). The server is consistent, and only the client lookup is missing the key. The run step model carries `step_label = step.label`. Input modules' runtime input is named `"input"`, so nothing in the model holds the legacy name today.
- The fix would be about one line in `_workflow_to_dict_run` and one in `rerunInputValue`. Tests, red first: an API assertion that the run download carries the key for a legacy unlabeled input, and a `model.test.js` case where `rerunInputValue` finds a legacy-named request input. The existing E2E doesn't need to change.
- `withRerunValues(inputs, values)` is a pure function over `FormInputNode[]`, so the move is mechanical. #24177's three-line inline overlay in `buildFormInputs` becomes a call to it.

</details>

## 3. Consolidate STEP_PARAMETERS helpers now (hoist into #24178, or restack onto #24175)

Either move `resolve_step_parameters()` down into the #24178 parent so both siblings share it, or restack this branch linearly on #24175 and have `recover_step_parameters()` delegate today.

| Pros | Cons |
|---|---|
| Removes the duplicate before review instead of after. | Hoisting adds a design decision to a READY parent republished today. The parent would have to decide what an unknown step returns while keeping dev's 500, and then #24175 would reverse that decision. That isn't a modest change. |
| Restacking would let the imported-invocation test assert real seeding. | Restacking makes the user-facing fix wait on the import fix and forces another four-branch restack and CI cycle. The expansion bias covers use cases and related bugs, not stack refactors. |

<details><summary>Details</summary>

Verdict: **not now.** When the second of #24175 and #24176 lands, `recover_step_parameters()` should loop over `parameter.resolve_step_parameters()`, skip `None` and `ValueError`, and key by `step.id`. That's about five lines. In the same change, strengthen `test_run_form_seeded_from_imported_invocation`, which today asserts only that the form loads. No branch currently tests that the combined fix actually seeds an imported invocation.

</details>

## 4. Switch `serialize_workflow_invocation_to_request` to `recover_step_parameters()`

This was listed as a follow-up by the normal review and the thermo review.

| Pros | Cons |
|---|---|
| One parser for the export. | Superseded: #24175's diff already moves that loop onto `resolve_step_parameters()`. It's #24175's code. |
| | The other cited copy, `workflow_request_to_run_config` (`run_request.py:707`), keys by raw step id for the scheduler. Re-keying by index there would change its meaning, so it isn't a duplicate to fold in. |

Verdict: drop it as a follow-up for this branch.

## 5. Object stores in the expanded form

Add preferred object store controls to the full form and prefill them on rerun.

| Pros | Cons |
|---|---|
| With the guard, plus #24177 hiding the toggle, a rerun of an API-submitted run that set both step params and object stores has no way to set object stores. | The issue excludes it explicitly. It's new UI, and on normal runs too, so it's a feature of the full form in its own right. |
| | #24177 already prefills object stores in the simple form, which covers the common rerun path. |

Verdict: out. Track it as its own feature.

## 6. Client merge instead of server seeding

Overlay the export's `parameters` onto tool step models on the client, and drop the `invocation_id` query param.

| Pros | Cons |
|---|---|
| One data source, and no API change. | Recorded values skip `check_param`, and dependent options are built for the saved state. |
| | The issue proposes server seeding, and the thermo review agreed after weighing both. Switching now would discard reviewed work. |

Verdict: keep server seeding. Leave the choice as a reviewer question in the PR description.

## 7. Latent `param_map` keyed-by-id bug

`workflow_run_config_to_request` reads `run_config.param_map.get(step.order_index)` for subworkflow steps, but `param_map` is keyed by step id.

| Pros | Cons |
|---|---|
| A real bug next to the stack's theme. | It's in `run_request.py`, which this branch doesn't touch, and it only affects the subworkflow invocation's own rows. `recover_step_parameters()` reads the parent invocation's rows, so seeding is unaffected. |
| | The fix changes what gets persisted. #24178 already records it as its own PR. |

Verdict: out of this branch. It belongs with #24178 or a standalone PR.

## 8. Unify tool and subworkflow seeding through `check_param`

Seeded subworkflow values bypass `check_param`.

| Pros | Cons |
|---|---|
| One seeded path, and subworkflow values would be validated. | Needs `InputProxy.to_dict` to accept a value, which is `modules.py` plumbing. Subworkflow run inputs exclude data inputs, and recorded values were validated when they ran, so the risk is low. |

Verdict: out. Leave it as a follow-up.
