Run via Claude Opus at high effort.

# Phase C: merged picker (tree default, pop-out workflow view)

The run form's step parameter picker now has two views of one picked set. The tree list is the default. "Open workflow view" pops the picker out to full screen with a read-only graph of the workflow. The work is one new client commit right after the picker commit, plus additions to the E2E commit. The API series is untouched, so no server change and no re-sync of `workflow_step_parameter_overrides_api` was needed. Nothing pushed. No security-sensitive findings.

## UX

- **Entry points.**
  - The "Step parameters" section has two buttons: "Choose step parameters" opens the list, and "Open workflow view" opens the same picker already in the graph view.
  - Inside the picker, a header button switches between "Open workflow view" and "Back to list".
- **One picker, two views.** The views are two bodies of the same `GModal`, not two modals, so they share the draft set that the modal resets from the form's cards each time it opens.
  - Picking in either view shows in the other, since both read and write the same `Set`.
  - Apply still sets the whole set, so unchecking in either view removes a card. Cancel discards changes made in both views.
  - The modal is `size="medium"` in the list view and `fullscreen` in the workflow view.
- **Workflow view.** On the left is the read-only `WorkflowGraph`. On the right is a panel for the clicked step.
  - Each tool or subworkflow node shows "N parameters to choose from", or "**k** of N parameters chosen" with a green header and a check icon. Steps with nothing to pick say "No parameters to choose", and input nodes keep "This is an input".
  - Clicking a tool node lists its parameters with the tree's own rows (`StepParameterTreeNode`): help popovers, "workflow sets to …", and the locked conditional and data-dependent rows.
  - Before any node is clicked, the panel explains what to do. A clicked input step says that inputs are set in the run form.
- **Step numbers match.** Node headers already show `order_index + 1` ("3: echo"), and the tree labels use `step_index + 1` ("Step 3: echo"). The panel is titled with the tree node's label, so the node, the panel and the list all show the same number. The E2E tests assert "Step 3: echo" (top level) and "Step 2: echo" (inside the subworkflow).

Screenshots, from the E2E run:

![workflow view](../screenshots/step_parameter_overrides_workflow_view.png)

![workflow view, subworkflow node](../screenshots/step_parameter_overrides_workflow_view_subworkflow.png)

## Subworkflow choice: a grouped listing, not a drill-down

Clicking a subworkflow node lists the parameters of every tool step inside it, grouped under each inner step's label. Nested subworkflows appear as further groups. The node's count covers all of them.

- **The run data already has this tree.** `subworkflow_steps` makes the subworkflow's tree node hold its inner steps, so the panel just renders that subtree with the same row component. It works at any depth with no extra fetches, and keys and payload are unchanged.
- **A drill-down would cost much more.** It needs the inner workflow's editor JSON: the subworkflow step's `content_id` is a `Workflow` (instance) id, while `getWorkflowFull` takes stored workflow ids. It also needs a store scope per level and breadcrumb navigation. All that buys is the inner layout, which is mainly useful for large subworkflows.
- **The alt's lock is gone.** Subworkflow parameters can be picked in both views. Link and rerun keys inside subworkflows become cards as before, and the graph counts them.

A drill-down could be added later as a "show inner graph" action on top of the grouped panel.

## Graph integration (kept small)

- **No `annotated` prop.** `WorkflowGraph` renders in its existing `is-invocation` mode, which shows compact nodes with blank terminals, `headerClass`/`headerIcon` and `NodeInvocationText`. `Node.vue` and `WorkflowGraph.vue` are unchanged.
- **One shared change: `NodeInvocationText.vue` (+3 lines).** A non-input step that supplies a string `nodeText` now shows it, instead of "This is a subworkflow." or "This step has no jobs as of yet.". The branch sits after the job-states and input branches. `useInvocationGraph` only ever sets `nodeText` on input steps, so invocation graphs are unchanged. The existing `useInvocationGraph`, `WorkflowInvocationSteps`, `canvasDraw` and `Node*` suites pass.
- **Its own store scope:** `provideScopedWorkflowStores("<workflowId>-<version>-step-parameters")`. Clicking a node doesn't move the run form's `activeNodeId`.
  - The view unmounts when you switch back to the list, but the scope survives about 1 s (`useTimeoutStoreDispose`) and Pinia keeps setup-store state. So the view skips `fromSimple` if the scoped step store already has steps; otherwise every reopen would add duplicate connections.
- **The workflow comes from `useWorkflowStore().getFullWorkflowCached`,** the cached store `useInvocationGraph` uses. Reopening the view makes no new request.
- **No datatypes-mapper hang:** it uses `storeToRefs(useDatatypesMapperStore()).datatypesMapper`, as `WorkflowRunGraph` does, not the non-reactive `useDatatypesMapper()` copy.
- `fitWorkflow(0.25, 1.0, 20)` runs once the graph mounts, as in `InvocationGraph`.
- **Not reused:** `WorkflowRunGraph` / `useWorkflowRunGraph`. They load into the run form's own scope (`workflowId`), and their step annotation is about input population. The picker annotation is a separate pure function.

## Files

New commit `d2d2c15ada8`, "Choose step parameters from a pop-out workflow view in the run form" (11 files, +443/-20):

- `client/src/components/Workflow/Run/StepParameterWorkflowView.vue` (new): the graph and the step panel.
- `client/src/components/Workflow/Run/stepParameterGraph.ts` (new):
  - `pickedParameterCounts(node, picked)`;
  - `stepParameterGraphSteps(steps, tree, picked)`, which annotates editor steps with node text, header class and icon.
- `client/src/components/Workflow/Run/StepParameterPicker.vue`: a `view` prop with `update:view`, the header toggle, `fullscreen` in the workflow view, and the list wrapped in `data-description="step parameter list"`.
- `client/src/components/Workflow/Run/WorkflowRunStepParameters.vue`: `workflowId` and `version` props, `openPicker(view)`, and the "Open workflow view" button.
- `client/src/components/Workflow/Run/WorkflowRunFormSimple.vue`: passes `model.workflowId` and `model.runData.version`.
- `client/src/components/Workflow/Run/stepParameterTree.ts`: the `StepParameterPickerView` type.
- `client/src/components/Workflow/Editor/NodeInvocationText.vue`: the `nodeText` branch (above).
- Tests:
  - `stepParameterGraph.test.ts` (new);
  - `StepParameterPicker.test.ts` (new);
  - one new case in `NodeInvocationText.test.ts`;
  - `WorkflowRunStepParameters.test.ts`, which mounts with the new props.

E2E commit `788f2c8e826` (the old `51551ae6eef` plus):

- `lib/galaxy_test/selenium/test_workflow_run_step_parameter_overrides.py`: 2 new tests and helpers.
- `client/src/utils/navigation/navigation.yml`: `open_workflow_view`, `picker_workflow_view`, `picker_list_view`, `workflow_node`, `workflow_node_title`, `workflow_panel` and `workflow_panel_parameter`.
  - The existing `picker_parameter`, `picker_row`, `picker_help`, `picker_locked_conditional` and `picker_lock` are now scoped to the list container, because the panel renders the same `label[data-parameter-key]` rows.
- `lib/galaxy_test/base/workflow_fixtures.py`: `position:` on the inputs and steps of `WORKFLOW_STEP_PARAMETER_OVERRIDES` and `WORKFLOW_STEP_PARAMETER_OVERRIDES_NESTED`.
  - Without positions, every node sits at the origin. Playwright couldn't click `echo` under `echo_connected`.
  - The fixtures were added in API commit 1, but this edit lives in the E2E commit, so the API series stays as it was. API tests ignore positions; all 12 still pass.

## Commits

`workflow_step_parameter_overrides`, over `46db8f9d5b6`:

| SHA | Commit | Series |
|---|---|---|
| `7ecb000ea36` | Add step_parameter_overrides to workflow invocation requests | API (unchanged) |
| `6ad285f7797` | Give overridable job parameter display rows their nested tool state path | API (unchanged) |
| `4f70c613dc3` | List subworkflows' tool steps and their inputs in the workflow run form data | API (unchanged) |
| `5bfccb3e62f` | Choose tool step parameters to override in the simple workflow run form | client (unchanged) |
| `d2d2c15ada8` | Choose step parameters from a pop-out workflow view in the run form | client (**new**) |
| `7b0fb025045` | Rerun a workflow with one of a step's job parameters changed | client (re-picked, was `800068383c9`) |
| `788f2c8e826` | E2E: choose, rerun and link step parameter overrides in the simple run form | E2E (amended, was `51551ae6eef`) |

I kept the workflow view as its own commit, not folded into the picker commit, because it is the only client commit that touches an editor component. It reads well on its own. The extraction branch `workflow_step_parameter_overrides_api` was not touched.

## Tests

- **Vitest** (node 22.20.0), on `Workflow/Run/`, `Workflow/Editor/Node*`, `Workflow/Editor/Index.test.ts`, `JobParameters`, `WorkflowInvocationState`, `JobInformation`, `Workflow/Invocation`, `composables/useInvocationGraph.test.ts` and `Workflow/Editor/modules/canvasDraw.test.ts`: **41 files, 251 tests pass**.
  - `Index.test.ts`, `Invocation/*`, `useInvocationGraph` and `canvasDraw` are the other suites that use the graph components.
  - There are no `Workflow/WorkflowGraph*` test files.
  - New tests: `stepParameterGraph.test.ts` (2), `StepParameterPicker.test.ts` (2) and `NodeInvocationText.test.ts` (+1).
    - The picker tests cover tree and graph toggles landing in one set, Apply with removals, and a reopen without Apply resetting to the form's set.
    - The graph tests cover per-step counts, a subworkflow aggregating nested inner steps, and header class and icon only when something is picked.
- **E2E** (Playwright, headless, against Galaxy on :8091 with the built client in `static/dist`): **8/8 pass** for the whole `test_workflow_run_step_parameter_overrides.py`, which is the 6 existing tests plus 2 new ones.
  - `test_choose_in_workflow_view_and_run` (ported from the alt to the new API): open the workflow view from the section and check node text. Click `echo` and check two parameters; the node shows "2 of". Apply, then reopen and uncheck one; its card goes away. Run, and assert the echo output and `/request` `step_parameter_overrides == {"2": {"cond": {"min": 5}}}`.
  - `test_list_and_workflow_view_share_picked_parameters` (tree↔graph sync, nested fixture): check `1/1/threshold` in the list, then open the workflow view. The subworkflow node shows "1 of" and its panel has threshold checked. Check `1/1/cond/min` there; the node shows "2 of". Back in the list, `cond/min` is checked; uncheck threshold and apply. Run, and `/request` is `{"1": {"1": {"cond": {"min": 3}}}}`.
- **API** (`test_workflow_step_parameter_overrides.py`, rerun because the fixtures changed): **12/12 pass**.
  - 11 ran against the E2E Galaxy.
  - The export/import test needs Celery, so it ran separately under the self-starting test driver.
- **vue-tsc `--noEmit`: clean.** It needs `NODE_OPTIONS=--max-old-space-size=8192`; the default heap OOMs.
- **eslint:** 0 errors on the changed files. The only warnings are the existing `any` warnings in `stepParameterTree.ts` and one in `WorkflowRunFormSimple.vue`.
- **prettier:** clean on the changed client files and `navigation.yml`.
- **black and ruff:** clean on the selenium test.

## Environment

- **Skill script:** `galaxy_e2e.sh` from the galaxy-playwright skill is zsh, and the box has no zsh. As Phase A did, I built the client (`pnpm run build`, staged into `static/dist`), started one gunicorn Galaxy on 127.0.0.1:8091 with the skill's config overrides, and ran Playwright against it with `run_e2e_built.sh`. No Vite was started.
- **Servers:** that Galaxy is stopped. The other session's :8090 Galaxy and :5180 Vite were not touched.
- **Scratchpad:** `galaxy_up_c.sh`, the E2E logs `e2e_c*.log` and the screenshots in `shots_c/`.

## Known gaps

- **Workflows with no saved positions overlap in the graph.** Examples are API-uploaded gxformat2 without `position:`. Every read-only `WorkflowGraph` view (the run graph, the invocation graph) has this problem. Applying the editor's `autoLayout` needs rendered node sizes and writes into the step store, so it doesn't fit a read-only view cheaply. Follow-up.
- **No parameter filter in the workflow view.** The tree's filter stays in the list view. A follow-up could highlight the nodes that match the filter.
- **No drill-down into a subworkflow's inner graph** (see the subworkflow choice above).
- **Raw keys in the dropped-parameters alert.** It still shows keys like `2/cond/pattern`, whose step segments are 0-based, next to 1-based step labels elsewhere. A key alone doesn't say which segments are steps, so mapping it needs the tree. This predates Phase C and is not in the graph view.
- **Lineage dimming on click.** As in every read-only `WorkflowGraph`, clicking a node dims the steps outside its lineage, which is existing `useFocusedNodes` behavior. It reads as "related steps" and wasn't changed.
- **Large workflows:** `fitWorkflow` caps zoom at 1.0, so a small workflow sits at the top-left at 100%. A large one fits down to 0.25 zoom, which I didn't test on a real large workflow.
