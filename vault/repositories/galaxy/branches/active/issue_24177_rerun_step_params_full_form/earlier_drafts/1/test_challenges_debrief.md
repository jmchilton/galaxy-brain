# Test challenges debrief

Scope: the tests this branch adds (`git diff d14f5eaa60b..HEAD`). #24176's tests were not touched.

**Summary:**
- Dropped 1 unit test, which duplicated the Selenium test.
- Kept the `WorkflowRun` pair. A mutation check shows the precedence test guards real logic.
- Converted `WorkflowRunFormSimple.test.ts` to `shallowMount`, which removed its 3 hand-written component stubs, and tidied its helpers.
- Added 1 test for the intermediate-only split object store branch, which had no coverage. A mutation check shows it catches the regression.
- **The Selenium test is unchanged.** It needs no E2E re-run for this pass.
- Results: Run/ vitest 81 pass (−1, +1); `vue-tsc` clean; prettier and eslint clean on the touched files.
- Changes are left uncommitted in the worktree. The touched files are `client/src/components/Workflow/Run/WorkflowRunForm.test.ts` and `client/src/components/Workflow/Run/WorkflowRunFormSimple.test.ts`.

## Per-test decisions

### `WorkflowRunForm.test.ts`: "explains a rerun that must keep the original tool step parameters, without a simple form toggle" (dropped)
- The Selenium test asserts the same two things in the real UI: the reason text, and `simple_form_link.assert_absent()`.
- The Selenium test is red on the parent for exactly those checks, so this unit test was not the only red-to-green proof.
- The "no toggle" half set `disableSimpleForm: true` directly. It therefore exercised the pre-existing `v-if="!disableSimpleForm"`, not this branch's code. What was left was a template-text check.

### `WorkflowRun.test.js` › "rerun with tool step parameters" (both kept, unchanged)
- **"explains the expanded form and offers no way back"**
  - Overlaps with the Selenium test.
  - Kept as the positive half of the precedence pair: same fixture, reason flips. It also fails fast if the guard is unwired, without waiting on an E2E run.
- **"keeps the workflow's own reason when it cannot use the simple form anyway"**
  - Mutation check: I removed `simpleForm.value &&` from the guard in `WorkflowRun.vue`. The test went red (`expected 'rerunHasStepParameters' to be 'hasDisconnectedInputs'`). I then reverted the change.
  - So it guards the precedence logic. Selenium cannot cheaply cover this case, because it would need a second fixture.
- The review's "merge the two `mountRerun` helpers" is still deferred, because it would edit #24176's test.

### `WorkflowRunFormSimple.test.ts` (kept and reworked)
This file is the only coverage of the simple-form object store and workflow-parameter prefill. Selenium covers neither.

**Changes:**
- **`mount` → `shallowMount`**, as the README recommends. The `vi.mock` component stubs for FormDisplay, WorkflowNavigationTitle and WorkflowAnnotation are gone. The tests now find the real components with `findComponent(FormDisplay)` and `findComponent(WorkflowNavigationTitle)` on the auto-stubs. Typed `props("inputs")` also removed a `Record<string, unknown>[]` cast.
- **Helpers:** `submittedRequest(rerunRequest)` mounted its own wrapper. It is now `submit(wrapper)`, plus a `formInputValue(wrapper, name)` helper. The "leaves unset" test now uses one mount instead of two, and the shared `INPUTS` constant removes the repetition.
- **New test, "resubmits a split run that only set an intermediate object store":**
  - It covers the `||` arm of `rerunSplitObjectStore`.
  - Mutation check: I narrowed the predicate to outputs only. The test went red (`expected undefined to be 'scratch'`). I then reverted the change.

**Kept as they were:**
- The `vi.mock` calls for the `useWorkflowInstance` and `fileSources` composables. Removing them caused 5 unhandled rejections from real loads.
- `vi.mock("./services")` instead of MSW. The sibling `WorkflowRunForm.test.ts` (#24176) mocks `./services` the same way, and `invokeWorkflow` is axios-based. Consistency within the directory won.
- The hand-built model. It is small and its comment explains its shape. Building it from `run1.json` with filtered steps would couple these tests to a large fixture for no gain.

### `test_workflow_rerun.py::test_workflow_rerun_keeps_tool_step_parameters` (unchanged)
- The test is sound:
  - It distinguishes 3 lines from the default `num_lines`, and the 10-line `1.txt` has enough lines for that.
  - It checks both the export and the output content.
  - The reason alert and `simple_form_link` come from the same component render, so `assert_absent` right after the alert is visible is meaningful.
- Its selectors follow neighbouring `navigation.yml` style.

## E2E gap (accepted)
- The simple-form object store prefill on rerun has no E2E coverage. Covering it needs a multi-object-store config.
- The natural home would be `test/integration_selenium/test_objectstore_selection.py` (`TestObjectStoreSelectionSeleniumIntegration`). It has no workflow-run cases today.
- Adding one is out of proportion for this branch. The unit tests carry this behavior.
