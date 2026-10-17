# Re-scope normal review debrief

No high or medium findings. Acted on L1, L2 and N1 (folded into the baseline and `replacement_params` commits), and N3 (the debriefs for this round). The `replacement_params` key change was confirmed safe: the server reads only that key, and the simple form now sends the same shape as the expanded form. Landing runs only gain applied renames.

Not acted on:
- **L3** (workflow parameters now count in the rerun "matches original" check): an improvement, not a bug. No test added; it goes in the PR text.
- **N2** (object-store and workflow-parameter prefill don't check `isRerun`): harmless, because only `WorkflowRerun.vue` sets `rerunRequest`.

What changed:
- **L1:** the resubmit test now emits the values `FormDisplay` was given, through `emitDisplayedValues`, so the submitted value comes from the prefill. Mutation check: dropping the prefill makes it fail.
- **L2:** the baseline now pins `history_id`, `inputs_by` and `batch`. Commit 3 adds `replacement_params` `{}` for a run with none.
- **N1:** the Selenium test uses the existing `assert_item_name` mixin, and the local `_assert_dataset_name` helper is gone.

<details><summary>Full review</summary>


Scope: `88d38744136..7150241b7f5`, 3 commits (baseline tests, expanded-form gating + simple-form prefill, `replacement_params` key fix).

Checks run (no lock needed):
- vitest `src/components/Workflow/Run/`: 12 files, 83 tests pass.
- eslint on the 5 changed client files: 0 errors (16 existing `v-on-event-hyphenation` warnings).
- vue-tsc: 11 errors, all the known file-source `recursive` baseline.
- Baseline commit `c8f98a5e468` on the parent code: I ran `git archive c8f98a5e468` into the scratchpad with the worktree's node_modules symlinked in. `WorkflowRunFormSimple.test.ts` plus `WorkflowRun.test.js` gave 9/9 passing. So the baseline is green before commits 2/3.

Overall: no high findings. The key change is safe and the shared helpers are used correctly. What remains is test-quality polish.

## Questions asked

**`replacement_params` key safe?** Yes.
- Nothing server-side reads `replacement_dict` from an invoke payload. The only reader is `lib/galaxy/workflow/run_request.py:546` `payload.get("replacement_params", {})`. `InvokeWorkflowPayload` (`lib/galaxy/schema/workflows.py:210`) declares only `replacement_params`, so the old key was dropped silently. No client code outside the test references `replacement_dict`.
- Values: the simple form builds `replacementParams` from FormDisplay `formData` (`useFormState.buildFormData` → `input.value`). An untouched optional text param is `undefined`, which JSON drops, so `{}` is sent. A typed or cleared field is a string. That is the same shape the expanded form sends raw (`WorkflowRunForm.vue:346 replacement_params: wpData.value`, also FormDisplay data). So the server's non-string guard (`run_request.py:634-639`, `RequestParameterInvalidException`) is not tripped. Neither is `post.py:277` `new_name.replace(..., v)`, which would crash on `None`.
- Landing (`WorkflowLanding.vue` → `WorkflowRun` → simple form): the only change is that `${...}` values now apply and get persisted as `REPLACEMENT_PARAMETERS`. The string guard now covers them, but the form only produces strings. Landings don't pass `rerunRequest`, so there is no prefill change. The parameters also now appear in the invocation's request export, so a later rerun of a simple-form or landing run prefills them. That is the intended end-to-end.

**Does `withRerunValues` mutate `props.model.wpInputs`?** No. `WorkflowRunFormSimple.vue:164` spreads each input (`{ ...input, color: undefined }`). `withRerunValues` (`model.js:291`) returns new objects for matched names and passes the copies through otherwise. This matches the old `Object.assign({}, input)`.

**Selenium test necessary, non-duplicative, red without commit 3?**
- Necessary: the only replacement-param E2E (`test_workflow_run.py:608 test_replacement_parameters`) calls `workflow_run_ensure_expanded()`, so the simple form path had no coverage. That is how the bug survived. An API test can't catch a client key typo.
- Red without commit 3: yes. The first run's `_assert_dataset_name(hid=2, "moocow suffix")` fails because the server ignores `replacement_dict` and `_gen_new_name` leaves `${replaceme} suffix` literal.
- Really the simple form: yes. `WORKFLOW_RENAME_ON_REPLACEMENT_PARAM` only references the param in a PJA rename, so `hasReplacementParametersInToolForm` stays false. `expanded_form.assert_absent()` is checked on both the first run and the rerun. The rerun resubmits without touching the field. It therefore covers the real prefill → FormDisplay initial `onChange` → `replacement_params` round trip that the unit test fakes (see L1).

**Does the baseline pin something meaningful, and pass on the parent?** It passes on the parent (verified above). What it pins is thin: no object-store keys, and wp input value `undefined`. Its title says "workflow parameters unset" but it never checks the payload's workflow parameters (L2).

## Findings

### Medium

None.

### Low

**L1. The unit "resubmits" test injects the value it then asserts.** `client/src/components/Workflow/Run/WorkflowRunFormSimple.test.ts:126-133`
- `shallowMount` stubs FormDisplay, so the test hand-emits `onChange` with `{ sample: "s1", 0: INPUTS.input1 }`. The `replacement_params` assertion would pass even if prefill were broken.
- The `0: {src,id}` shape also isn't what FormData emits (`{values:[...]}`).
- The Selenium test covers the real path, so this is test quality only.
- Fix: emit what FormDisplay itself emits on mount, derived from the prefilled inputs, so the submitted value comes from the prefill:
  ```ts
  const inputs = wrapper.findComponent(FormDisplay).props("inputs");
  wrapper.findComponent(FormDisplay).vm.$emit("onChange", Object.fromEntries(inputs.map((i) => [i.name, i.value])));
  ```
  Then keep `expect(request.replacement_params).toEqual({ sample: "s1" })`.

**L2. The baseline commit pins little and its title over-claims.** `WorkflowRunFormSimple.test.ts:135-142` (as added in `c8f98a5e468`)
- The "…and workflow parameters unset" case only checks the form input value, not the payload.
- Fix: add assertions on the payload shape, which is stable across all 3 commits. For example, `expect(request).toMatchObject({ history_id: HISTORY_ID, inputs_by: "step_index", batch: true })`.
- In the final version (after commit 3), also add `expect(request.replacement_params).toEqual({})`. Alternatively, drop "workflow parameters" from the title.

**L3. Workflow parameters now take part in the rerun "matches original" check, but no test covers it.** `WorkflowRunFormSimple.vue:216-271` (`stepsNotMatchingRequest`) iterates all `formInputs`, wp inputs included.
- Before this branch, a wp input's expected `value` was always `undefined`. On a simple-form rerun, typing the original value flagged a mismatch and flipped the title to "Run Workflow" (`WorkflowNavigationTitle.vue:101,208`).
- With prefill the comparison is now correct: the field is flagged only when the user changes it. This is a behaviour improvement and worth a line in the PR description.
- Optional fix: one vitest case. Prefill `sample`, emit a changed value, then assert `FormDisplay.props("stepsNotMatchingRequest")` contains `"sample"`.

### Nit

**N1. New `_assert_dataset_name` helper.** `lib/galaxy_test/selenium/test_workflow_rerun.py:261-263`
- The class already mixes in `UsesHistoryItemAssertions.assert_item_name(hid, expected)` (UI-based), and the sibling `test_replacement_parameters` inlines the API check.
- Either use `self.assert_item_name(2, "moocow suffix")` or keep the API helper (more robust right after `wait_for_ok`). If you keep it, it could live on a shared mixin rather than in one test class. This is a preference, not required.

**N2. Rerun gating is inconsistent within the simple form.** `WorkflowRunFormSimple.vue:96-107,165`
- Object-store and wp prefill read `props.rerunRequest` unconditionally, while data-input prefill is gated on `props.isRerun`.
- Today only `WorkflowRerun.vue` sets either prop, and it sets both, so this is harmless. Fix: leave as is, or gate on `props.isRerun` for symmetry.

**N3. The vault branch docs are stale.** This is not code.
- `BRANCH_DIRECTORY/index.md:17` and `implementation_debrief.md:29` still say the `replacement_dict` bug is out of scope and the wp prefill "has no effect yet".
- Fix: update them when writing the round's debrief.

## Verified OK (no action)

- `simpleFormDisabledReason` first-wins order (resource → open → replacement → rerun) matches dev's last-wins assignment order. The new `WorkflowRun.test.js` "keeps the workflow's own reason" case pins that `rerunHasStepParameters` has the lowest priority. Its assertions are folded into the parent's test on the parent's shared `mountRerun`, and the parent surface is unchanged.
- `disableSimpleForm` is now computed from the reason, so the toggle link is hidden exactly when an explanation is shown.
- The rerun route always passes `prefer-simple-form` (`WorkflowRerun.vue:53`), so gating always runs for reruns. A user can't get back to the simple form via the toggle and lose the step params.
- Python imports are at the top. No obvious comments. The navigation.yml selectors are used.

</details>
