# Debrief: workflow_rerun_prefill_full_form

Source: `to_file/workflow_rerun_prefill_full_form.md` (split from `local/workflow_rerun_drops_step_parameters.md`) → `to_file/proposed_workflow_rerun_prefill_full_form.md`. Verified read-only against dev `c63ffc2ccae` (fetched 2026-10-14) plus spike branch `workflow_rerun_step_parameters` @ `1ad053b1fb3` (read only, diff vs `b62d06dcdce`). Nothing run, no server started, nothing posted. UI claims come from reading the code.

## Verdict

Proposed, not rejected. Premise holds on dev. No duplicate found (see searches). The outcome is the main body. Server seeding is the Proposed Approach and client merge is the main Alternative, ending in an explicit reviewer question.

## OPEN DECISION for John: server seeding vs client merge

**The spike's stated reason is wrong. Fix it before using it anywhere.** The spike debrief says a client merge of flat `a|b` keys "can't add repeat instances" and implies the server path can. On dev, neither can:

- `visit_input_values` (`tools/parameters/__init__.py` L244–256) iterates only the repeat entries already in `state.inputs`. `compute_runtime_state(step_args=…)` can't add instances.
- The scheduler applies step params through the same call (`populate_module_and_state` → `compute_runtime_state`). A recorded param for a missing instance was never applied to the original run, so there's nothing to restore.
- The full form renders tool steps with `sustain-repeats` and `sustain-conditionals` (`WorkflowRunDefaultStep.vue` L17–18), so UI runs never record extra instances or case switches.
- Client `replaceParams` (`useFormState.ts` L229–239) sets only keys already in `formIndex`. This part of the spike claim is true, but it's moot.

What actually separates the two:

| | Server seeding (spike) | Client merge (original idea) |
| --- | --- | --- |
| Conditional case switch in recorded params | ✅ `__current_case__` is recomputed before the children are visited | ❌ single pass misses the new case's children; needs rebuild index + second pass |
| Who can produce such params | Only API-submitted runs (the full form locks conditionals) | same |
| Values through `check_param` | ✅ same path as the scheduler | ❌ raw values as submitted |
| Sources for the rerun page | two: `/download?invocation_id` for tool steps, `/request` for everything else | one: `/request` |
| `${name}` guard | `_untemplated_step_args` (params_to_incoming + `"${"` scan) | trivial: skip `wp_linked` inputs |
| Subworkflow steps | needs `step_parameters_by_index` from the subworkflow export fix | needs the subworkflow export fix itself |
| Imported invocations | reads raw step-id rows, so it needs the import fix too (otherwise stale ids miss, or could collide) | export 500s until the import fix |
| Single-step rerun feature | can reuse the seeded step model | overlay one step client-side (what that plan already sketches) |
| New API surface | `invocation_id` on `/download?style=run` | none |

Also checked: `FormSelect` keeps a value that isn't in its options (it auto-selects only when the value is `null`), so a client merge won't silently reset recorded selects. Dependent-option refresh happens through `refresh_on_change` → `getTool`. I didn't verify end to end whether dependent options differ between the two paths, so I left that out of the issue.

**Recommendation: keep server seeding, but restate why.** It's marginal. The real advantages are conditional case switches from API runs plus "the form shows what `compute_runtime_state` computes", and those are thin because the full form can't produce case switches itself. Pick client merge if you'd rather not add a query param to `/download` and want one source for the rerun page. The cost is a two-pass conditional merge, or accepting that API-made case switches are lost. Either way, nothing in the issue's outcome changes. Only the Proposed Approach and Alternatives sections swap.

## Object store gap

The full form has no object-store UI and its `onExecute` never sends `preferred_*_object_store_id`, for any run, rerun or not. The simple form has `WorkflowStorageConfiguration`.

**Recommend a separate issue.** That's a missing feature of the legacy form rather than a prefill bug. Sending recorded preferences from the full form without any UI would be invisible state the user can't see or change. The issue marks the row ➖ and says it's left out.

## Verified on dev `c63ffc2ccae`

- `WorkflowRerun.vue` passes only `requestData.inputs`, `prefer-simple-form`, `is-rerun`, `use_cached_job`.
- `WorkflowRun.vue` L127–153 turns off the simple form for `hasReplacementParametersInToolForm` / `hasOpenToolSteps` / `hasWorkflowResourceParameters` (predicates in `model.js` L119–173). `requestState` etc. go to the simple form only. `WorkflowRunForm` (L299–307) gets nothing from the run.
- `WorkflowRunForm.vue` L165–175: `wpData`, `useCachedJobs=false`, `stepData`, `inputs`, `resourceData` all empty. Its `onExecute` submits every unconnected param of every tool step (filters only `isConnected`).
- The simple form's "Expanded workflow form" button (L693–705) emits `showAdvanced` and swaps to the empty full form, on a rerun too.
- `FormData.vue` L189–195: a required, single, non-optional data input with no value auto-selects `formattedOptions[0]`. Which dataset comes first isn't verified, so the issue says "listed first".
- `serialize_workflow_invocation_to_request` exports inputs, replacement, resource, cache, 3 object store ids, and `parameters` (order-index keyed). It doesn't export `on_complete` (not raised in the issue).
- #20032 added `WorkflowRerun.vue` (merge commit `a3bd5a0e71e`, "Merge pull request #20032 from ahmedhamidawan/rerun_workflows"). The PR body says it fixes #11340.
- Branch is pushed: `git ls-remote` on jmchilton/galaxy gives `workflow_rerun_step_parameters` = `1ad053b1fb3`, matching the worktree HEAD. Linked in Context.

## Related search

No duplicate. Search was rate-limited: GitHub's search API was exhausted by parallel agents, and some batches retried. The first batch was mistakenly run as exact-phrase queries; the later batches used plain keywords. About 30 queries ran in total (issues and PRs) over rerun/re-run/rerunning × form, full/legacy/advanced/expanded form, inputs, parameters, resource, object store, job cache, prefill, and invocation. GitHub search doesn't stem, so "rerun" doesn't match "rerunning".

- #20032 (merged, ahmedhamidawan): added Rerun. `gh pr view` confirms "Fixes #11340" (closed, "Rerun option for workflows"). Cited.
- #18696 (open): rerun UX with cached jobs. Cited as related, because the full form drops `use_cached_job`.
- #23776 (merged): full form converted to `<script setup>`. Cited as recent work on the form.
- #23292 (open): rerun shouldn't need a history switch. Different concern, not cited.
- #20223 (closed): rerun used the wrong version. Not cited.
- #18702 (open): disable map-over in the legacy form. #18506 (closed): legacy form collection-type validation. Same form, unrelated.
- #20376, #10409, #926, #20337: about the *tool* rerun form (jobs), not workflows. Not duplicates.
- #6825: rerun a job plus downstream steps. Loosely related to the single-step feature, not cited.

## Changes from draft

- **Spike rationale corrected:** "repeats" dropped as the reason for server seeding. Replaced by conditional case switches (API runs) + `check_param`/scheduler parity + reuse for single-step rerun, and the issue says outright that repeats favor neither path.
- Opener rewritten as an outcome, with a what's-lost table first. Added the "Expanded workflow form" population and the silent auto-selected dataset, both absent from the draft.
- Object stores are explicitly out of scope (➖ with a legend).
- Client merge is laid out as a real alternative with its advantages (single source, trivial `${}` guard, no new param). Added the `WorkflowRequestStepState` and `build_for_rerun` alternatives.
- Sibling drafts are referenced by topic only. The single-step rerun feature is described in words. No local paths.

## Left over

- Nothing run. The table's "today" column comes from reading the code, not from a browser.
- The API tests the issue proposes for a conditional case switch and a `${name}` param don't exist in the spike (spike has tool step, subworkflow, deleted/purged dataset, and a `${}` guard check inside the tool-step test).
- Spike gap: no component test of the forced-full-form path.
- Possible extra: `on_complete` isn't in the request export, so neither form can carry it over. Not raised.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. Cites confirmed (#20032 merged, fixes #11340; #18696 open; #23776 merged, `<script setup>` conversion). **Repeats question:** writer right — `visit_input_values` (`tools/parameters/__init__.py` L244-256) only visits existing repeat entries; original request computed state via the same `compute_runtime_state(step, step_args)` (`populate_module_and_state`, run.py L143); full form renders with `sustain-repeats`/`sustain-conditionals`. Neither path adds instances. Reviewer further found the draft overstated client-merge cost: a pre-render merge using the client's existing `visitInputs` (Form/utilities.js L27-67, already used by `WorkflowRunModel`) handles a conditional case switch in one pass (`populate_model` emits every case's inputs); the "second pass" only applies to a post-render `replaceParams` route. Real tradeoff: server = `check_param` fidelity + tool model (dependent options) built from recorded values; client = no new API param, one data source, simpler `${name}` guard (`wp_linked`).

Edits in place:
- Forced-full-form bullet matches `model.js`: unconnected tool-step input that is a required dataset or set "at run time".
- Subworkflow inputs overlaid directly on input models (not "seeded the same way").
- "Why seed on the server": `check_param` fidelity + recorded-value tool model first; case switch secondary, API-only.
- Alternatives: one-pass `visitInputs` merge described; "rebuilds conditional logic" dropped; fair tradeoff, reviewer question kept.
- Stored-runtime-state alternative: dropped "decoding is new code" (`decode_runtime_state` exists); now a real option that survives import, with actual downsides.

Other claims checked correct: loss table; `FormData` auto-selects first dataset for required single input (L189-195); "Expanded workflow form" button; export contents; `${name}` guard matches `_untemplated_step_args`.

Left over: "dependent options from recorded vs saved values" is code-read only (client refresh may recompute); `on_complete` not in export, not raised; spike lacks the proposed API tests for conditional case switch + standalone `${name}` param. Coordinator checked post-review file: reviewer edits present and coherent.
