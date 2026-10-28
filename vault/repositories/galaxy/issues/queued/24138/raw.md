# Invocation Steps tab: step header state/color/icon stops updating while the invocation runs

Filed from: galaxy-brain vault session 2026-10-14, while re-verifying `Component - Invocation Graph View` against dev `c63ffc2ccae`. Found by reading code. **Not reproduced in a browser yet**; repro is the first job.

## Behaviour (expected from code)

Open a running invocation on the **Steps** tab (`/workflows/invocations/{id}/steps`) and leave it there. The state text, header color and state icon of each step should stay at the values from when the tab first loaded (e.g. "queued", clock icon) while the jobs move on to running/ok/error. The Overview graph, in contrast, updates every 3 s.

Repro: run a workflow with a slow step (e.g. a `sleep`-style test tool), go straight to the Steps tab, wait for jobs to finish without switching tabs. Expect the step headers not to change until you leave and re-enter the tab, or until the per-step job lists refresh while the header doesn't.

## Why

- `WorkflowInvocationState.vue` polls `stepsJobsSummary` every 3 s (`:285-294`) and passes it down as a prop.
- `client/src/composables/useInvocationGraph.ts` derives `GraphStep.state`/`headerClass`/`headerIcon`/`jobs` only inside `loadInvocationGraph()`. The composable has **no watcher** on its `stepsJobsSummary` ref.
- On the Overview, `InvocationGraph.vue:155-163` calls `loadInvocationGraph()` in its own 3 s `setTimeout` loop until `isTerminal`, so the states refresh there.
- On the Steps tab, `client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue:100-113` calls `loadInvocationGraph(false)` only from a `watch` on `workflowId`, i.e. once.
- What the Steps tab renders from that frozen `graphStep`:
  - `WorkflowInvocationStep.vue:208`: `:class="graphStep?.headerClass"`;
  - `WorkflowInvocationStepHeader.vue:52-67`: state text via `statePlaceholders[graphStep.state]` and `graphStep.headerIcon`.
- `WorkflowInvocationFeedback.vue` (Debug tab, `:28-49`) has the same load-once pattern. Its `stepsWithErrors` reads `props.stepsJobsSummary` directly, so the error list itself is live; only the per-step states are stale.
- Each `WorkflowInvocationStep` separately polls `fetchInvocationStepById` (`:112-137`), so job lists inside a step may update while the header next to them doesn't. That inconsistency is the visible symptom to look for.

## History

The Steps tab started using `useInvocationGraph` in #20719 (routable tabs, 2025-08). The Overview had its own poll loop from #17413. The Steps tab never got one.

## Suggested fix

Have `useInvocationGraph` react to its inputs instead of each consumer running a poll loop. A `watch(stepsJobsSummary, …)` inside the composable that calls `updateSteps()` once the workflow is loaded. Then:
- `InvocationGraph.vue`'s own 3 s loop (`pollInvocationGraph`) can be deleted; it only re-processes data the parent already polls. Overlaps with the perf issue `invocation_graph_polling_quadratic`. File them together, or have one reference the other.
- Steps and Debug get live states for free.

Tests:
- **Unit (red first):** in `client/src/composables/useInvocationGraph.test.ts`, call `loadInvocationGraph(false)`, then replace the `stepsJobsSummary` ref value with a new summary (`queued` → `ok`), `await flushPromises()`, and assert `steps[i].state === "ok"` without calling `loadInvocationGraph` again. Red on dev.
- Optionally a `WorkflowInvocationSteps.test.ts` case updating the prop and asserting the header class changes.

## Scope

UX correctness on Steps and Debug for running invocations. Doesn't affect terminal invocations.
