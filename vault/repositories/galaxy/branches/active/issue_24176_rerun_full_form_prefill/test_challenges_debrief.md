# Test challenges debrief

I kept every test on the branch and dropped none. I rewrote two `WorkflowRun.test.js` cases so they check rendered components, following the client README. The guard test now asserts which form renders, simple or expanded, and no longer reads `wrapper.vm.simpleForm`. With the guard disabled it still fails, and it passes with the guard in place. The wiring test now stubs `WorkflowRunForm`, so it mounts only the component under test. I made no implementation changes and did not change any API tests. I added no E2E test. The case for one is real, but #24177's planned Selenium rerun test is the right home for it (see E2E below). The change is uncommitted in the worktree.

Not acted on:
- **E2E here.** #24177 stacks on this branch and the two are recommended to merge together. Its planned Selenium test already does the rerun round trip through the expanded form. Recommendation for #24177: before that test changes the tool value, assert that the expanded form shows the *original* value. That one extra assertion covers this branch's whole path end to end, including the untested two-line `WorkflowRerun.vue` pass-through. A second Selenium test here would duplicate that flow on a heavily loaded machine.
- **`rerunHasStepParameters` unit test kept**, even though the `WorkflowRun` component test covers the null and non-empty paths. It pins the `{}` and `undefined` edges, and #24177 builds on the predicate.
- **`rerunInputValue` null-drop case kept**, even though Selenium `test_workflow_rerun_with_unset_optional_data_input` covers it for the simple form. The helper is now shared with the expanded form, which no E2E test covers, and the label, index and `""` fallback keying is only tested here.
- **Order-based `FormDisplay` lookup in `WorkflowRunForm.test.ts` kept.** The file's existing tests use the same pattern (`nth(..., 0)`), and the earlier review accepted it.
- **API tests unchanged.** All six were seen red on the parent tip (except the purge half), and five include an unseeded baseline or a load-bearing proof. They exercise the server through the real endpoint and use the populators correctly. The shadowed builtin `input` in `_find_run_input` is a nit, left alone.

<details>
<summary>Full challenge notes</summary>

## Scope

`git diff 5cf81e75c12..HEAD`. Tests: six `test_run_form_seed*` API tests plus helpers `_find_run_input`, `_run_form_steps`, `_run_runtime_parameter_simple` (`lib/galaxy_test/api/test_workflows.py`); the `invocation_id` param on `download_workflow` (`populators.py`); vitest additions in `WorkflowRunForm.test.ts`, `WorkflowRun.test.js`, `model.test.js`.

## API tests (`lib/galaxy_test/api/test_workflows.py`)

The server-side seeding is the core of the fix, and per `writing_tests.md` the API is the right layer (needs a server, no browser, no custom config). Nothing here can move up or down a layer.

| Test | Verdict |
|---|---|
| `test_run_form_seeded_from_invocation` | Keep. Seeded vs unseeded baseline, with a value inside a conditional. |
| `..._conditional_case` | Keep. The recorded selector switches the conditional case, a distinct path in `compute_runtime_state`. |
| `..._keeps_workflow_parameters` | Keep. `${seedme}` preservation; the guard was proven load-bearing. |
| `..._subworkflow` | Keep. Covers the separate `_seed_subworkflow_run_inputs` path. |
| `..._dataset` | Keep. Seeded HDA, then a purged HDA falls back to unseeded. The two halves share expensive setup, which is why they're one test. |
| `test_run_form_seeding_requires_invocation_access` | Keep. Access check for the new query param on a public workflow. |

The helpers are small and reused across tests. `download_workflow(invocation_id=)` follows that function's existing optional-param pattern.

## Vitest

- `WorkflowRunForm.test.ts` "prefills inputs, workflow and resource parameters and job re-use from a rerun request": keep. It tests behavior through child props and the submitted payload, it is consistent with the file's stubbing approach, and it was red before the change.
- `WorkflowRun.test.js` "seeds run data from the rerun invocation and passes its request to the expanded form": keep, **rewritten** to stub `WorkflowRunForm` (`stubs: { WorkflowRunForm: true }`). The test only reads that component's props, so the real form tree was unnecessary.
- `WorkflowRun.test.js` "opens the expanded form for a rerun whose request has tool step parameters": keep, **rewritten** to assert `findComponent(WorkflowRunFormSimple)` / `findComponent(WorkflowRunForm)` existence instead of `vm.simpleForm` (README: avoid `wrapper.vm`, test through the template). The expanded case also asserts that `rerunRequest` is forwarded. Red check: with the guard condition forced to `false` in `WorkflowRun.vue` (temporary copy-based edit, restored afterwards), the test fails with `expected true to be false`.
- `model.test.js` `rerunInputValue` and `rerunHasStepParameters`: keep. These are pure-function contracts, not implementation details. See "Not acted on" above.
- Mocks: no SimpleNamespace or ad-hoc mock classes to replace. The only module mocks are `getRunData` and `invokeWorkflow`, which are the API boundary.

## E2E

The existing `lib/galaxy_test/selenium/test_workflow_rerun.py` covers only simple-form prefill (data input, boolean, optional data). No E2E test covers rerunning into the expanded form with seeded tool values. That is the user-visible fix for #24176, and it is the only coverage the `WorkflowRerun.vue` pass-through of `rerun-request` / `rerun-invocation-id` would get. The planned #24177 Selenium test drives exactly this flow (rerun → expanded form → change a tool value → submit → check the request export). Adding an assertion that the field shows the original value before the change covers #24176 without a second, slow browser test. Hand this to #24177.

## Commands run

- `cd client && npm_config_use_node_version=22.20.0 pnpm exec vitest run src/components/Workflow/Run/WorkflowRun.test.js`: 8 passed.
- The same file with the guard temporarily disabled: 1 failed (the guard test), as expected. Restored.
- `pnpm exec vitest run src/components/Workflow/Run/`: 10 files, 74 passed.
- `pnpm exec prettier --check` and `pnpm exec eslint` on `WorkflowRun.test.js`: clean.
- No API tests were run. None were changed, and the implementation debrief records them green after rebase.

</details>
