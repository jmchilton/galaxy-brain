# Add browser tests for the workflow invocation graph

No Selenium or Playwright test clicks a node in the workflow invocation graph (the Overview tab) or checks what a node shows, even though the graph gained several interactive features in 2026.

| Invocation graph feature | Added in | Client unit tests | Browser test |
| --- | --- | --- | --- |
| Node state colors (`header-ok`, `header-error`, …) | before 2026 | `useInvocationGraph.test.ts` | ✗ |
| Isolate mode: nodes outside the selected step's lineage are dimmed | 🔀 #22142 | `useFocusedNodes.test.ts` | ✗ |
| **Show Connections** toggle | 🔀 #22159 | none | ✗ |
| Read-only **Step Config** tab in the step card | 🔀 #22144 | none | ✗ |
| Search on Overview and Steps | 🔀 #22476 | `AreaHighlight.test.ts`, `util.test.ts`, `workflowSearchStore.test.ts` | ✗ |
| Step card **Previous / Next / Hide** | before 2026 | none | ✗ |
| Minimap state colors | 🔀 #22335 | `canvasDraw.test.ts`, `useInvocationGraph.test.ts` | ➖ |
| Zoom-to-fit capped at 100% | 🔀 #22105 | none | ➖ |
| No vertical scroll in the graph | 🔀 #22769 | none | ➖ |

✗ = no browser test touches it. ➖ = also untested in a browser, but a canvas or layout detail that unit tests or manual checks suit better; the tests proposed below don't target these.

Several browser tests already open an invocation and land on Overview, so the graph mounts, but none of them assert anything about it. They go straight to another tab:

| Test | What it checks on the invocation page |
| --- | --- |
| `test_workflow_invocation_details.py` `test_job_details` | progress notes, then the Inputs tab, the Steps tab and one step's outputs |
| `test_workflow_invocation_details.py` `test_invocation_step_jobs_with_failed_jobs` | Steps tab job counters, then the Debug tab |
| `test_workflow_rerun.py` | the Rerun button and the Inputs tab |
| `test_workflow_run.py` export tests | the Export tab |

The `invocations` section of [`navigation.yml`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/utils/navigation/navigation.yml#L1269-L1314) has no selectors for the graph, the step card or the search. The Playwright CI job ([`playwright.yaml`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/.github/workflows/playwright.yaml)) runs this same `lib/galaxy_test/selenium` suite, so there is no Playwright-only coverage either.

Shallow checks let regressions here go unnoticed. 🔀 #20334 (merged November 2025) stopped step icons from rendering in the invocation step headers, both in the graph's step card and in the Steps tab, and logged a console error per step. `test_job_details` opens those Steps tab headers but checks only the title text next to the missing icon. 🔀 #23778 fixed it eleven months later, with a unit test for the icon component. The step card test proposed below checks for the icon. The graph is also drawn by the workflow editor's components (`WorkflowGraph.vue`, `Node.vue`) in a read-only mode, so editor work changes it too. For example, 🔀 #23861 changed `Node.vue` to draw terminals for steps with errors and added an editor browser test, but nothing would notice if such a change broke the invocation view. Open requests such as 🎯 #21989 (subworkflow information in the parent graph), 🎯 #22075 (collection cardinality on edges) and 🎯 #22745 (graph freezes mid run) will change this view again.

<details><summary>How the absence was checked (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

- Searched `lib/galaxy_test/selenium/`, `lib/galaxy/selenium/` and `navigation.yml` for graph-related selectors and helpers. Only the editor tests use `workflow_editor.node`. On the Overview tab, tests read only the progress notes. No selector reaches into the graph canvas, the step card or the search.
- There are no separate Playwright specs. `lib/galaxy/selenium/playwright_element.py` adapts the same tests to the Playwright backend.
- None of the PRs in the table changed `lib/galaxy_test/selenium/` or `navigation.yml`. 🔀 #23861 changed `test_workflow_editor.py` only.

</details>

## Context

A follow-up to the 2026 invocation graph work (🔀 #22142, #22159, #22144, #22476), none of which added browser tests. Related to 🎯 #3241, the long-open umbrella issue for expanding Selenium coverage.

## Proposed Approach

Add a new `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` with a handful of focused tests that pass under both the Selenium and Playwright backends. Where possible they should reuse the editor's existing `workflow_editor.node` selectors, which match the same `Node.vue` markup. Add new `invocations` selectors only for parts that exist only in the invocation view, and move the `invocation_open_latest` helper into `navigates_galaxy.py` as its TODO already asks (`test_workflow_rerun.py` has a copy, `_invocations_panel_open_latest_invocation`).

<details><summary>Selectors</summary>

Reuse what already matches invocation nodes:

- `workflow_editor.node._` (`[node-label='${label}']`), `by_id`, `input_terminal` and `output_terminal`.

Add under `invocations` (names illustrative):

- `graph_node_state`: `[node-label='${label}'] .card-header.header-${state}`. The class comes from `getHeaderClass` in [`useInvocationGraph.ts`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts).
- `graph_node_out_of_focus`: `[node-label='${label}'].node-not-in-focus`, set in [`Node.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Editor/Node.vue#L287).
- The step card (`.invocation-step-card`), its header and step icon (`.invocation-step-header .portlet-title-icon`, from `WorkflowInvocationStepHeader.vue`), and its Previous Step, Next Step and Hide Step buttons. The buttons currently have only `title` attributes, so give them `data-description` attributes.
- The Show Connections button, which already has `data-description="toggle step connections button"` ([`InvocationGraph.vue`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue#L232)).
- The Step Config tab (`.invocation-view-step-config` in `WorkflowInvocationStep.vue`) and its read-only form.
- The search toggle, the search input and a result (`.result-button`, from `GraphSearch.vue`).

</details>

<details><summary>Tests</summary>

Each test should fail if the feature it covers stops working.

- **Graph reaches terminal state.** Run a small multi-step workflow, open the invocation, and wait until every node has `header-ok`.
- **Failed step is marked.** Reuse `WORKFLOW_KEEP_SUCCESSFUL_DATASETS` from `test_invocation_step_jobs_with_failed_jobs`. Its `mixed_collection` step has one failed job, and a step with any failed job is drawn as `header-error`.
- **Step card navigation.** Click a node and check that the card shows that step, with its title and step icon. Next and Previous move to the neighbouring steps, and Hide closes the card.
- **Isolate mode.** In a workflow with two independent branches, click a node on one branch and check that the other branch's nodes get `node-not-in-focus`.
- **Show Connections.** With a node active, the toggle draws that node like the editor does: its `output_terminal`s lose the `blank-output` class and its input and output names appear. Toggling it off blanks them again.
- **Step Config.** For a tool step, the tab shows the tool form with its inputs disabled.
- **Search.** Type a step label and click the result, then check that the card shows that step.

A variant that opens the view while jobs are still running would also cover node states and the Steps tab updating live.

</details>

## Alternative Approaches

Vitest component tests that mount `InvocationGraph.vue` with mocked stores are cheaper and faster. Most of the features above already have unit tests at that level, though, and the gap is how they work together: the real workflow store, polling, and the editor's `WorkflowGraph`/`Node` drawn read-only with live job states. Only a browser test against a real invocation exercises all of that. Adding graph assertions to the existing invocation tests would save a few workflow runs, but those tests are about the tab views, and a separate file keeps the graph tests easy to find and run.

<details><summary>Alternatives in detail</summary>

### Alternative: Vitest component tests only

<details><summary>Description</summary>

Mount `InvocationGraph.vue` or `WorkflowInvocationOverview.vue` with mocked invocation, job and workflow stores, and assert node classes, step card behaviour and search results in happy-dom.

#### Why the proposed approach is preferred

The pieces already have unit tests. What's untested is the assembled view against a real server, including the shared editor components in read-only mode. Mocked stores would have to replicate exactly the state the browser tests would check.

</details>

### Alternative: Extend the existing invocation browser tests

<details><summary>Description</summary>

Add graph assertions to `test_job_details` and `test_invocation_step_jobs_with_failed_jobs`, which already run suitable workflows and land on Overview.

#### Why the proposed approach is preferred

It saves a couple of workflow runs, but it mixes graph checks into tests about the Steps, Inputs and Debug tabs, so a graph failure is reported under the wrong test. The two failure-state checks could go either way. Those are the best candidates to fold in if run time matters.

</details>

### Alternative: Rely on screenshots

<details><summary>Description</summary>

The tests already call `self.screenshot(...)` on invocation pages. Add more screenshots of the graph.

#### Why the proposed approach is preferred

Screenshots in this suite are not compared against anything, so they document the view but can't fail a test.

</details>

</details>
