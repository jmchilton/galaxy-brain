# Normal review debrief

Reviewed `fa466393aea` against the parent tip `d14f5eaa60b`. Nothing was must-fix and there were no security concerns. I added two clarifying comments: on the guard's precedence in `WorkflowRun.vue`, and in the Selenium test on why the rerun shows `rerunHasStepParameters`, because #24176 seeding clears the runtime input. The parent-code refactors and the larger cleanups were deferred to follow-ups, since the coordinator asked us not to edit #24176 code while it is in review.

## Not acted on

- **Move `withRerunValues` to `model.js` and share it with the simple form** (should-fix). The helper lives in #24176's `WorkflowRunForm.vue`, and moving it edits parent code that is under review. The simple form keeps an inline 3-line copy. Follow-up after the stack lands.
- **Merge the two `mountRerun` helpers in `WorkflowRun.test.js`** (should-fix). The parent's test was rewritten again in `bab10d268ef`. Merging would edit it. Follow-up.
- **Selenium on the issue's exact scenario** (saved `num_lines`, edited through "Expanded workflow form"). Editing a collapsed saved parameter in the expanded form is fiddly. The runtime-input fixture drives the same guard: after seeding, the workflow can use the simple form. A comment now says so.
- **Drop the `props.isRerun &&` check** (nit). It is #24176's code and harmless.
- **Shared `DisableSimpleFormReason` type** (nit). `WorkflowRunForm`'s prop is typed `string`, which predates this branch. Follow-up.
- **Seeded object stores while `object_store_allows_id_selection` is off** (nit). This is only reachable if the config changed after the original run. In that case the server decides. Accepted and noted.
- **Truthiness vs `is not None`** (nit). Equivalent for real ids.
- **Fold `requestState`/`useJobCache` into `rerunRequest` inside the simple form** (nit). The reviewer agreed that `WorkflowRun`'s props must stay. The internal fold is a follow-up.

<details><summary>Full review</summary>

Should-fix
1. `WorkflowRunFormSimple.vue:168-171` duplicates `withRerunValues` (`WorkflowRunForm.vue:403-408`). Move it to `model.js` and use it in both forms.
2. `WorkflowRun.test.js` has two near-identical `mountRerun` helpers. Hoist one and fold the parent's guard test into the describe.
3. The Selenium test (`test_workflow_rerun.py:184-227`) uses `WORKFLOW_RUNTIME_PARAMETER_SIMPLE`. The original run is expanded because of `hasDisconnectedInputs`. On rerun, the new reason appears only because #24176's seeding clears the `RuntimeValue`. Either switch to a saved-value fixture with `workflow_run_ensure_expanded()` (A), or comment the coupling (B). Invocation lookup, export assert, content check and waits look fine.

Nits
4. `props.isRerun &&` in `WorkflowRun.vue:169` is redundant. The new check is effectively first-wins while the checks above are last-wins. Comment it, or use `!disableSimpleForm.value`.
5. The reason is a 4-way union in `WorkflowRun.vue` but a `string` prop in `WorkflowRunForm.vue`. Export a shared type; the `as object` cast in the test may then go.
6. Seeded object store ids are submitted even when the storage controls are hidden (`object_store_allows_id_selection` false).
7. `rerunSplitObjectStore` uses truthiness, while `run_request.py:529` uses `is not None`. Fine.
8. Not folding `:request-state`/`:simple-form-use-job-cache` is defensible for `WorkflowRun`. Inside `WorkflowRunFormSimple`, both could be read from `rerunRequest` first. Follow-up.

Checked and fine: no stale state across `loadRun` reloads; object store seeding respects the invoke API's mutual exclusion; `WorkflowStorageConfiguration` copies its initial props at setup, so seeded ids display; workflow-parameter prefill is display-only until footnote ¹; selectors follow the neighbouring style; unit tests are non-trivial and exercise the real `onExecute` payload; no Python import issues. Vitest 25/25 on the three touched test files.

</details>
