# Thermo-nuclear review debrief

I reviewed `21bc27af25d..HEAD` (`18bc9a95136`) and acted on one finding, the main restructuring one. In `WorkflowRun.vue`, the four "can't use the simple form" checks in `loadRun()` are now a single function, `simpleFormDisabledReason(model, rerunRequest)`. It returns the first reason it finds, and `disableSimpleForm` is now a computed derived from the reason. The change is uncommitted, in `client/src/components/Workflow/Run/WorkflowRun.vue` only. Behavior is unchanged. There were no security findings.

**The E2E test needs a re-run.** No template, selector or `navigation.yml` entry changed. But `loadRun()` decides which form and which alert the Selenium test sees, so re-run `test_workflow_rerun.py::test_workflow_rerun_keeps_tool_step_parameters`.

Checks:
- Run/ vitest: 81 passed.
- `vue-tsc --noEmit`: exit 0.
- prettier: clean.
- eslint: no errors; only the 6 pre-existing `v-on-event-hyphenation` warnings.
- Mutation check: I put the rerun check first. `keeps the workflow's own reason when it cannot use the simple form anyway` went red (`expected 'rerunHasStepParameters' to be 'hasDisconnectedInputs'`). I then restored the code, so the precedence test still discriminates.
- #24176's `opens the expanded form for a rerun whose request has tool step parameters` passes unchanged.

## What changed

- **Before.** There were three last-wins `if` blocks from dev, each with the same three assignments. After them came this branch's block, which used the `simpleForm.value &&` trick to make itself lowest priority. That trick made it first-wins, and it needed a comment to explain the mixed precedence (normal review nit 4).
- **After.** One pure function lists the reasons in the order they are shown:
  1. resource parameters
  2. disconnected inputs
  3. replacement parameters in a tool form
  4. rerun tool step parameters

  This list is the old last-wins order reversed, so the shown reason does not change. Each check keeps its original comment.
- **In `loadRun()`.** It sets `simpleForm` to false and stores the reason when there is one. It still runs only when `preferSimpleForm` is set, and `isRerun` still gates the rerun request.
- **`disableSimpleForm`** is now `computed(() => reason !== undefined)`. It was only ever written together with the reason. It stays set across `loadRun()` reloads, just as before.
- **Type.** The reason union is now a named local alias, `SimpleFormDisabledReason`.
- **#24176's guard line.** It was already part of this branch's diff, and it is now folded into the function. No other #24176 code was touched.

## Not acted on

- **Move `withRerunValues` to `model.js` and use it in both forms** (pending coordinator decision).
  - The duplication is real. `WorkflowRunFormSimple.vue` `buildFormInputs` repeats the `name in values` overlay for `replacement_params`.
  - My view: do the move, next to `rerunInputValue`. It is small and mechanical. The simple form would then call `withRerunValues(Object.values(props.model.wpInputs), props.rerunRequest?.replacement_params)` and keep its local `color = undefined` copy.
  - Not done here, because the helper is #24176 code that is in review.
- **Overlap of `requestState`, `useJobCache` and `rerunRequest` on `WorkflowRunFormSimple`.**
  - In the rerun case, `requestState` equals `rerunRequest.inputs`.
  - Folding them inside the simple form is possible. `WorkflowRun`'s props must stay, because landing, home and router use them.
  - Already deferred by the normal review with sound reasoning. Follow-up.
- **Tighten `WorkflowRunForm`'s `disableSimpleFormReason: string` to the union.**
  - This would type-check the `v-else-if` text chain.
  - It needs the type exported from a `.ts` module, and the prop predates this branch.
  - The gain is small, so the alias stays local. Follow-up together with the shared type.
- **Object-store seeding in `WorkflowRunFormSimple.vue`.** It uses three refs and a ternary on `rerunSplitObjectStore`.
  - A pure helper, `rerunObjectStoreState(request) -> {split, preferred, intermediate}`, would mirror the `onExecute` serialization and read a little better.
  - It is marginal, 13 lines in an 811-line file, and the mount-level tests already exercise the real payload. Low priority.
- **Two `mountRerun` helpers in `WorkflowRun.test.js`.** Merging them edits #24176's test. Deferred, as before.
- **`replacement_params` prefill in the simple form.** It is reachable only for API-origin runs until the `replacement_dict` bug (issue footnote ¹) is fixed. It is cheap and correct, not debt. Kept.
- **File sizes.** All are under 1k lines (`WorkflowRunFormSimple.vue` 811, `WorkflowRunForm.vue` 409, `WorkflowRun.vue` about 340), so there is no decomposition concern.

<details><summary>Full review</summary>

### 1. Structural: mixed-precedence reason checks in `loadRun()` (acted on)

The branch added a fourth "disable simple form" block. The three existing blocks were last-wins: each overwrote `simpleForm`, `disableSimpleForm` and `disableSimpleFormReason`. The new block needed the opposite rule, because the workflow's own reason must win. The branch got it with `simpleForm.value && ...` plus a precedence comment. So one sequence of `if`s held two precedence rules and four copies of the same three-line assignment.

The fix is to state the rule once. A pure function returns the first reason in display order, and the caller applies it. The duplicated assignments, the `simpleForm.value &&` trick and its comment all go. `disableSimpleForm` is redundant state, true exactly when a reason is set, so it becomes a computed.

### 2. Reuse: `replacement_params` overlay duplicated (not acted on, parent code)

`WorkflowRunFormSimple.vue` `buildFormInputs` (3 lines) repeats `WorkflowRunForm.vue` `withRerunValues`. The canonical home is `model.js`, next to `rerunInputValue` and `rerunHasStepParameters`. Both Codex and the normal review flagged it. It is gated on the coordinator, because the helper is #24176 code.

### 3. Boundary: two props carry the same rerun inputs into the simple form (not acted on)

`WorkflowRunFormSimple` now takes both `requestState` and `rerunRequest`. On a rerun, the first is a slice of the second. It is defensible while the landing and home flows pass `requestState` alone. A later cleanup could read `rerunRequest?.inputs ?? requestState` inside the simple form. Follow-up.

### 4. Type contract: reason is a union in the parent, a `string` in the child (not acted on)

`WorkflowRunForm.disableSimpleFormReason` is typed `string`, which predates this branch. The template's `v-else-if` chain compares against literals that nothing type-checks. Exporting the union from a `.ts` module and typing the prop would close that gap. The gain is small for a pre-existing prop, so it is a follow-up.

### 5. Legibility: object-store seeding (not acted on, low priority)

`rerunSplitObjectStore` plus the ternary initializers are correct, and they respect the invoke API's mutual exclusion. A `{split, preferred, intermediate}` pure helper would read better and pair with the `onExecute` serialization, but the gain is marginal.

### 6. Tests (no action)

- `WorkflowRunFormSimple.test.ts` uses `shallowMount` and asserts the real `invokeWorkflow` payload, which is good. The `as object` cast on the component is a known vue-test-utils typing workaround.
- `WorkflowRun.test.js` precedence pair: mutation-checked again after the refactor.
- The Selenium test waits on page state, with no sleeps.

### 7. File size

No file crosses 1k lines.

</details>
