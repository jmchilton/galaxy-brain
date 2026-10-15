# Implementation debrief

**STATUS: READY.** Branch `jmchilton/issue_24138_invocation_graph_refresh`, head `ca1e78f57cf`, 6 commits on `release_26.2`. No CI yet, no PR opened.

## What it does

- **#24138 (fixed).** `useInvocationGraph` watches the polled `invocation` and `stepsJobsSummary` and re-derives step states, without toggling `loading`. Steps tab headers now follow the jobs, and expanded steps stay expanded. The same change covers the Overview and Feedback.
- **#22745 (refresh-cost part only).**
  - Each refresh is O(n): summaries are indexed once by `stepJobSummaryLookup`, the loop bound is hoisted, and only input steps take the input branch.
  - An unchanged poll writes nothing to the graph steps.
  - Bench (not committed): 171 steps went from 128 ms to 0.75 ms per refresh.
  - The zoom/pan freeze is still unprofiled, so the PR should only say "part of #22745".
- **Overview graph.** Its own 3 s reload loop and the `isTerminal` prop are gone. A failed load is retried on the next parent poll, either invocation or summary.
- **Overlapping polls.** A new `utils/sharedPromise.rerunWhileBusy` runs the refresh one at a time and reruns it with the latest data, so the last poll is never dropped.
- **Input-step fetches.** A failed fetch no longer stalls the later steps. The input is retried, and a first-load failure still shows the error.
- **Feedback.** It reuses `stepJobSummaryLookup` instead of its own copy.

## Key choices

- **Per-step updates instead of the whole-summary comparison** posted in the #22745 comment. They also cover invocation-only changes (subworkflow states), and removed the subworkflow TODO.
- **Base is `release_26.2`.** It's a regression from 25.1, and the touched files are identical on `dev`.
- **Kept the now-unused Overview `invocationAndJobTerminal` prop.** `WorkflowInvocationState.test.ts` reads it as a probe.

## Tests

- Vitest:
  - `useInvocationGraph.test.ts`: refresh cases run in both load modes; lookup tests.
  - `WorkflowInvocationSteps.test.ts`: the issue's component test.
  - `InvocationGraph.test.ts`: retry.
  - `sharedPromise.test.ts`: `rerunWhileBusy`.
  
  All red on base for the right reason. The related suites, 46 files / 415 tests, are green. vue-tsc, eslint and prettier are clean.
- E2E `test_steps_follow_running_invocation`: Playwright and Selenium green. It timed out on the base composable.

## Process

- [Normal review](subagents/normal_review.md): one medium finding (input fetch failure stalled later steps), fixed, along with 2 lows and the reusable-helper design point.
- [Test challenges](test_challenges_debrief.md): added the E2E and switched to MSW for dataset fetches. Dropped the redundant "does not toggle loading" unit case; the component test covers it, and mutation-checked.
- [E2E polish](polish_e2e_tests_debrief.md): running→ok assertions, an expand helper, screenshots.
- [Codex](codex_review.md): one confirmed finding (`rerunWhileBusy` sync throw cached forever), fixed.
- [Thermo-nuclear](thermo_nuclear_review.md): no structural issues; the header-class guard moved to its only caller. A synchronous `updateSteps` redesign is written up, not done.
- [Scope evaluation](scope_evaluation.md): keep the scope.
- [Screenshots](screenshot_debrief.md): Steps tab running → successful while expanded, and the Overview node going from running to ok, with local images in `screenshots/`.

## Open questions for John

- Remove the dead Overview prop in this PR? It means a probe change in `WorkflowInvocationState.test.ts`.
- Keep both the Steps component test and the E2E?
- Keep `release_26.2` as the base, or retarget to `release_26.1` (Vue 2.7) for usegalaxy.eu?
- Ping ahmedhamidawan (#22745 assignee) before the PR?
- Add the Overview graph capture to the E2E (needs a node-state selector)?

## Follow-ups (not in scope)

- Retry in the composable for the Steps tab and Feedback.
- `stepsJobsSummary` can be `undefined` but is typed as non-optional.
- Browser profile of the #22745 zoom/pan freeze.
- Per-step polling fan-out on the Steps tab.
- Merging forward may conflict with `invocation_graph_e2e` (`navigation.yml`, invocation helpers).
