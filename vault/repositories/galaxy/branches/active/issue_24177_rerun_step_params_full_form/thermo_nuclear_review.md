# Thermo-nuclear review debrief (round 2, after re-scope)

I reviewed `ced412c6248..HEAD`, the 3 commits on #24176's tip, and acted on 4 findings (two structural, two small). All 4 are folded into commit 2 ("Keep rerun in the expanded form …") with fixup + autosquash. Its message is reworded to match. The Baseline commit `708a26767b1` is untouched, so it still passes on the parent's code. Commit 3 changed only by rebase. I did not act on four smaller ideas: dropping the redundant `disableSimpleForm` prop, an exhaustive message map, an object-store seeding helper, and a test-assert helper. The reasons are below. There were no security findings.

Acted on:
1. **Simple-form gating is now derived state.** In `WorkflowRun.vue`, `simpleForm`, `disableSimpleForm` and `disableSimpleFormReason` are all `computed` from `preferSimpleForm`, the loaded `workflowModel` and `rerunRequest`. `loadRun()` no longer has a gating block at all. Round 1 had already made `disableSimpleForm` a computed. This finishes that move.
   - **One difference in timing.** Gating now recomputes as soon as `preferSimpleForm` or `rerunRequest` changes. Before, it ran once per `loadRun()`. `WorkflowRerun` and `WorkflowLanding` pass these props once and never change them. The router passes `Galaxy.config`, and `Home` builds them from config plus the `simplified_workflow_run_ui` query value. So a query change now takes effect right away instead of at the next history-triggered reload, which is arguably a fix.
   - The exposed `simpleForm` is now `preferSimpleForm` before the model loads, where it used to be `false`. Its only external reader is `WorkflowRun.test.js`, which reads it after loading. Nothing renders a form before loading.
2. **The reason is typed across the boundary.** `simpleFormDisabledReason()` and its `SimpleFormDisabledReason` union moved to a new `Run/simpleFormDisabledReason.ts`. `WorkflowRunForm`'s `disableSimpleFormReason` prop is now typed with the union instead of `string`. I checked that this earns its keep: a typo'd literal in the template's `v-else-if` chain makes vue-tsc fail with TS2367 (an unintentional comparison).
3. **Smaller fixes:**
   - The redundant `props.isRerun ? props.rerunRequest : undefined` gate is dropped. Only `WorkflowRerun` passes `rerunRequest`, and it always passes `is-rerun` with it. Both forms already read `rerunRequest` without a gate.
   - The simple form's `buildFormInputs` watch now includes `props.rerunRequest`, which the function reads since commit 2.

Checks:
- Run/ vitest: 82 passed.
- vue-tsc: the 11 baseline `recursive` errors only.
- prettier: clean on the touched client files.
- eslint: 0 errors; only pre-existing `v-on-event-hyphenation` template warnings.
- ruff and black: clean on `test_workflow_rerun.py`.
- Mutation check: hoisting the rerun check to the top of `simpleFormDisabledReason()` turns "keeps the workflow's own reason …" red (`expected 'rerunHasStepParameters' to be 'hasDisconnectedInputs'`). I restored it afterwards.
- E2E, under the lock on 8095/5185 with the Playwright backend: `test_workflow_rerun_simple_form_keeps_workflow_parameters` and `test_workflow_rerun_prefills_expanded_form` both passed. I re-ran them because `loadRun()` gating changed.

## Not acted on

- **Drop `WorkflowRunForm`'s `disableSimpleForm` boolean prop.** With a typed reason, `!disableSimpleForm` is the same as `!disableSimpleFormReason`. Dropping it would delete one concept, but it changes the props of a pre-existing component and removes `disableSimpleForm` assertions that the test challenge settled. Follow-up.
- **Replace the alert's `v-else-if` chain with an exhaustive `Record<SimpleFormDisabledReason, string>` message map.** That would also catch a reason with no message. It rewrites dev's alert markup, which the Selenium test asserts on. Not proportionate for this branch, since the typed prop already catches typos.
- **Object-store seeding helper in `WorkflowRunFormSimple.vue`.** Round 1's "marginal" call stands. I checked that the seeded ids are passed down to `WorkflowStorageConfiguration` as props, so the user sees what a rerun will submit. One edge: if `object_store_allows_id_selection` is now off, a rerun still resubmits the original stores without showing them. That needs a config change between runs. Noted only.
- **A test helper (`pick` + `toStrictEqual`) for the repeated `not.toHaveProperty` object-store asserts.** It would read better, but it forces edits into the Baseline commit for a test-legibility gain. Skipped.
- **Settled items, not reopened:**
  - folding `requestState`/`useJobCache` into `rerunRequest`
  - full-form object stores
  - the "step params lost" notice
  - first-wins precedence
  - the dropped wp-prefill unit test
- **`(input: any)` in `buildFormInputs`.** It matches the file's existing untyped model handling. Noted only.

<details><summary>Full review</summary>

### 1. Derived state written imperatively in an async loader (acted on)

After round 1, `loadRun()` still did `simpleForm.value = props.preferSimpleForm`, then called the pure reason function and wrote two refs from its result. Those three values are pure functions of `(preferSimpleForm, model, rerunRequest)`, so storing them as mutable refs set inside `loadRun()` is derived-state-as-state.

The fix makes all three `computed`, placed next to `workflowModel`. `loadRun()` now only loads. Two reasons the behaviour is unchanged:
- Nothing else writes `simpleForm`, since the `showAdvanced` toggle uses `advancedForm`.
- The forms render only after a successful load, behind the `loading`, `workflowError` and upgrade-warning branches.

On a reload after a history change, the computed recomputes from the same model and props. Before, the stale refs gave the same visible result.

### 2. A stringly-typed reason across the parent/child boundary (acted on)

This branch grows the reason chain from 3 literals to 4. Before this fix, the union lived in `WorkflowRun.vue`, the prop in `WorkflowRunForm.vue` was typed `string`, and nothing linked the template's literals to either. Now the union lives in a `.ts` module next to its only producer, and the consumer's prop uses it. I verified empirically that vue-tsc type-checks the template comparisons, so this is a real guard.

### 3. Redundant `isRerun` gate (acted on)

`isRerun ? rerunRequest : undefined` guarded a case no caller produces. It was also the only place that gated `rerunRequest` on `isRerun`. `WorkflowRunForm` and `WorkflowRunFormSimple` (object stores and wp prefill) use it directly. Removing the gate makes `rerunRequest` mean "this is a rerun" everywhere.

### 4. Incomplete watch dependency (acted on)

Since commit 2, `buildFormInputs` reads `props.rerunRequest` for the wp prefill, but the watch only listed `model` and `requestState`. In practice `requestState` is `rerunRequest.inputs`, so they change together. Listing it makes the dependency explicit. The object-store refs stay seeded once, on purpose, because re-seeding them would overwrite the user's edits.

### 5. Redundant `disableSimpleForm` prop (not acted on, follow-up)

See "Not acted on" above.

### 6. Message chain versus an exhaustive map (not acted on)

See "Not acted on" above.

### 7. Tests (no action beyond the mutation check)

- `WorkflowRunFormSimple.test.ts` asserts the real `invokeWorkflow` payload. The repeated `not.toHaveProperty` triples could collapse into one exact-shape assertion, but that would mean churn in the Baseline commit.
- The `WorkflowRun.test.js` precedence pair still discriminates after the move into the module.
- The Selenium tests wait on page state, with no sleeps.

### 8. File size

No file crosses 1k lines. `WorkflowRunFormSimple.vue` is 805 lines, `WorkflowRunForm.vue` 403, and `WorkflowRun.vue` 297 (down from 340). The new module is 41 lines.

</details>
