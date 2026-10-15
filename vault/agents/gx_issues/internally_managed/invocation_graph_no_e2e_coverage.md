# No Selenium/Playwright coverage of the invocation graph (Overview) canvas

Filed from: galaxy-brain vault session 2026-10-14, while re-verifying `Component - Invocation Graph View` against dev `c63ffc2ccae`. Test-gap / task issue, not a bug.

## Current state

- The only E2E file for the invocation view is `lib/galaxy_test/selenium/test_workflow_invocation_details.py` (142 lines). It has two tests:
  - `test_job_details`
  - `test_invocation_step_jobs_with_failed_jobs`
- Both go through the **Steps** tab, Inputs/Outputs tabs and the Debug tab. Neither interacts with the Overview graph canvas.
- `client/src/utils/navigation/navigation.yml` has no invocation-graph selectors. The only reusable one is the generic `workflow_editor.node.by_id` (`:1060`). Nothing covers invocation node header state classes, the step card, Prev/Next, Show Connections, Step Config, or the search popover.
- Features merged in 2026 with unit tests at best and no browser coverage:
  - focus/isolate mode (#22142)
  - "Show Connections" (#22159)
  - Step Config tab (#22144)
  - minimap state colors (#22335)
  - graph + Steps search (#22476)
  - zoom-to-fit cap (#22105)
  - vertical scroll fix (#22769)
  - error-step terminals (#23861)
- Unit tests that do exist:
  - `useInvocationGraph.test.ts` (state derivation)
  - `canvasDraw.test.ts` (minimap color)
  - `NodeInvocationText.test.ts`
  - `Node.test.ts` (error terminals)
  - `useFocusedNodes.test.ts`
- Two code-read bugs found in the same pass would have been caught by E2E. Both are sibling drafts in `to_file/`:
  - `invocation_graph_color_param_swatch_dead`
  - `invocation_steps_tab_states_frozen`

## Suggested work

1. **Selectors.** Add an `invocations.graph` section to `navigation.yml`:
   - node by step index, plus its header with the `header-{state}` class;
   - the step card, its header and Prev/Next/Hide;
   - the Show Connections button (`data-description="toggle step connections button"` already exists, `InvocationGraph.vue:232`);
   - the Step Config tab;
   - the search input and results.
2. **Tests** in `test_workflow_invocation_details.py` (or a new `test_workflow_invocation_graph.py`), each one red/green-meaningful:
   - **Overview graph renders and reaches terminal state.** Run a 2–3 step workflow; wait for all node headers to have `header-ok`. Catches state-derivation and polling regressions.
   - **Mixed failure.** Reuse the failed-jobs fixture from `test_invocation_step_jobs_with_failed_jobs`; the failing step's node header gets `header-error`.
   - **Step card navigation.** Click a node, the card shows the step title; Next/Prev change it; Hide closes it.
   - **Step Config tab** shows the readonly form for a tool step.
   - **Show Connections** toggles editor terminals on the active node.
   - **Search.** Type a step label; the result click activates that node.
   - **Steps tab live update.** Open the Steps tab before jobs finish; the header reaches `ok` without a tab switch. Red on dev if the frozen-states issue is real.
   - **Color parameter swatch.** Red on dev if the swatch issue is real.
3. Use the `/galaxy-playwright` conventions: the test must pass under both Selenium and Playwright backends.

## Scope

Test-only. Medium size. It would make the next round of graph work (#21989 subworkflow info, #22075 edge cardinality, #22745 perf) safer to land.
