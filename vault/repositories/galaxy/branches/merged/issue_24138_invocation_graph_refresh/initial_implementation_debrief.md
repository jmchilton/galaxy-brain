# Initial implementation debrief

Commit `13b53a04576` on `release_26.2` (`f9cf361962e`).

## What changed

- `useInvocationGraph` watches `invocation` and `stepsJobsSummary` and re-derives step states once the workflow has loaded. It doesn't toggle `loading`, so the Steps tab's expanded steps no longer collapse. This fixes #24138 for the Steps tab, the Overview and Feedback at once.
- Overlapping updates go through one in-flight pass plus a "stale, run again" flag (`refreshSteps`). A poll that lands during the first load or during an input-dataset fetch is re-applied, never dropped. The first `loadInvocationGraph` uses the same path. A watcher-path error is logged and the previous state is kept.
- `updateSteps` is O(n):
  - Summaries are indexed once (`stepJobSummaryLookup`) instead of `JSON.stringify` of the whole summary per step.
  - The loop bound is hoisted.
  - Only input steps take the input branch.
- **Chose the per-step alternative over the comment's minimal hoist.** I dropped `lastStepsJobsSummary` and the whole-summary comparison. `updateStep` already writes only what changed. That also handles invocation-only changes (subworkflow states, steps that just got scheduled), and removes the subworkflow TODO. A minimal hoist would have needed the comparison to also track invocation changes.
- `InvocationGraph.vue`: deleted `pollInvocationGraph` and the `isTerminal` prop. The graph now loads once and follows props. A failed load is retried on the next parent poll, which keeps the old loop's recovery from transient errors such as 429s.
- `WorkflowInvocationFeedback.vue` reuses `stepJobSummaryLookup` instead of its own copy of the `find`.
- Kept the Overview's `invocationAndJobTerminal` prop, even though it's now unused inside the component. `WorkflowInvocationState.test.ts` reads it as a probe of the parent's terminal state; removing it means rewriting that test, which is out of scope.

## Tests (red → green)

- `WorkflowInvocationSteps.test.ts`: the issue's component test, extended so an expanded step stays expanded. It was red on base (`header-queued`). The existing error test now runs against the real composable, with the workflow fetch rejecting, instead of a mocked composable.
- `useInvocationGraph.test.ts`: in both load modes (Steps tab / Overview), the composable should:
  - follow a new summary
  - follow an invocation-only change
  - update a step once it gets scheduled
  - not toggle `loading`
  - write nothing on an unchanged poll
  - apply the latest summary that arrives mid-update
  
  9 were red on base; the `loading` and Steps-tab idle cases pass on base by construction. Also added `stepJobSummaryLookup` unit tests.
- `InvocationGraph.test.ts`: retry after a failed load. Red before the retry watcher was added.
- Related suites: 45 files / 399 tests green (composable, Graph/, WorkflowInvocationState/, Workflow/Editor/). vue-tsc 0 errors; eslint 0 errors (3 pre-existing warnings); prettier clean. Node 22.20.0.

## Benchmark (not committed; the #22745 bench adapted to a poll-driven refresh)

| Steps | before (from #22745 comment) | after |
| --- | --- | --- |
| 50 | 11 ms | 0.31 ms |
| 171 | 128 ms | 0.75 ms |
| 400 | 708 ms | 1.76 ms |

Unchanged poll at 171 steps: `{}` writes (was `headerClass` × 171). 5 steps changed: 25 writes, all on those 5. Script: session scratchpad `bench/useInvocationGraph.igbench.test.ts`.

## Not done

- No browser check yet; the screenshots step is pending.
- The zoom/pan freeze in #22745 is still unprofiled.
