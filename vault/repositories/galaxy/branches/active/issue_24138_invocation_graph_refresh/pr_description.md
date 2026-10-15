Fix 🎯 #24138 - a running invocation's Steps tab headers stay frozen at the state they had when the tab loaded.

Open a running invocation, switch to **Steps** and expand a step. Since 25.1 its header stays at "queued" or "running" for the life of the tab, even after the job underneath has finished. You only see the real state if you leave the tab and come back, or reload the page. With this branch the header follows the page's 3 s poll, and the expanded step stays expanded:

| Job running | Same page after the job finishes, no reload |
| --- | --- |
| ![Steps tab, slow_cat expanded, header reads running](screenshots/invocation_steps_running_step_expanded.png) | ![Same step, header now reads successful, still expanded](screenshots/invocation_steps_completed_step_expanded.png) |

The new browser test (`test_steps_follow_running_invocation`) passes on Playwright and Selenium. Run against the base composable, it times out waiting for that green header.

***No new requests: each tab re-derives its step states from the invocation and jobs summary the page already polls.***

***The fix lives in the shared `useInvocationGraph` composable, so the Overview graph follows the same poll. It used to update through a 3 s reload loop of its own; that loop is gone, and the graph still updates as the jobs do:***

| Overview while the job runs | Overview after it finishes |
| --- | --- |
| ![Overview graph, slow_cat node orange, 1 job running](screenshots/invocation_overview_graph_running.png) | ![Overview graph, slow_cat node green, 1 job successful](screenshots/invocation_overview_graph_completed.png) |

Following every poll had to be cheap, so this also takes the refresh-cost part of #22745 (a 171-step invocation freezing on usegalaxy.eu). Before this branch, a refresh serialized the whole jobs summary once per step, which is O(n²). Each refresh is now O(n), and a poll where nothing changed writes nothing to the graph:

| Steps | Per refresh, before | After |
| --- | --- | --- |
| 50 | 11 ms | 0.35 ms |
| 171 | 128 ms | 0.90 ms |
| 400 | 708 ms | 1.89 ms |

Timed in vitest on node 22, not profiled in a browser. ***This doesn't claim to fix #22745's zoom/pan freeze. That's canvas rendering cost, which hasn't been profiled, so #22745 stays open.***

***Input steps fetch their dataset, so a refresh is async and a poll can land in the middle of one. A small new helper beside `dedupeInFlight`, `rerunWhileBusy`, runs refreshes one at a time and makes sure the last poll is applied, even when an input's dataset can't be fetched.***

<details><summary>Implementation</summary>

- `useInvocationGraph.ts`
  - Watches the `invocation` and `stepsJobsSummary` refs the parent polls, and re-derives step states without toggling `loading`. Toggling `loading` would unmount the step list and collapse expanded steps every 3 s.
  - It watches `invocation` as well as the jobs summary, so steps whose state doesn't come from a job (subworkflows, newly scheduled steps) update too. That replaces the whole-summary comparison and its subworkflow TODO.
  - `stepJobSummaryLookup` indexes the summaries once per refresh, replacing a `find` per step. The loop bound is hoisted, and only input steps take the input branch. `updateStep` already only writes what changed, and an input's header class is now only set when its state changes.
  - A failed input dataset fetch no longer stops the later steps from updating. That input is retried on the next poll, and a failure on first load still shows the error.
- `utils/sharedPromise.ts`: new `rerunWhileBusy`, next to `dedupeInFlight` and `memoizeUntilRejected`. It runs refreshes one at a time; calls made while one runs share a single rerun with the latest data. A failed run doesn't cancel that rerun, and callers get the last run's result.
- `InvocationGraph.vue`: deletes its own 3 s `pollInvocationGraph` loop, its timer and the `isTerminal` prop. A failed load is retried when the parent polls new data.
- `WorkflowInvocationOverview.vue`: drops its `invocationAndJobTerminal` prop, which only fed `isTerminal`. `WorkflowInvocationState.test.ts` probed that prop to detect terminal states; it now checks that the cancel button is gone.
- `WorkflowInvocationFeedback.vue` (the Debug tab, shown once the invocation is terminal): uses `stepJobSummaryLookup` instead of its own copy of the lookup.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It changes no API, and only drops two internal component props (`InvocationGraph`'s `isTerminal` and the Overview's `invocationAndJobTerminal`).

<details><summary>Risk Review Advice</summary>

Check `rerunWhileBusy`'s contract in `sharedPromise.ts` (one run at a time, calls made while busy share one rerun, a failed run doesn't cancel that rerun, callers get the last run's result, and the next call runs again). Also note that the Overview now updates only when the parent replaces the `invocation` or `stepsJobsSummary` objects. The watch is shallow, and the parent's poll stores a new object on each fetch, as before.

</details>

## Context

Fixes #24138, a regression from 🔀 #20719 (25.1), which gave the Steps tab its own `useInvocationGraph` that loaded once and never followed the poll. Part of 🎯 #22745 (the refresh cost only). Targets `release_26.2` as a regression fix; it merges cleanly into `dev`.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep #24138 and the #22745 refresh cost together.</summary>

Following the poll makes each refresh run every 3 s on the Steps tab, which never ran it before. Without the O(n) rewrite that would make big invocations slower than they are today, and the old whole-summary comparison would still skip subworkflow-only changes. Splitting into the minimal hoist posted on #22745 plus this fix, a #24138-only change, and a synchronous `updateSteps` without the helper were all considered. The zoom/pan freeze, retrying in the composable, the `stepsJobsSummary` type and the Steps tab's per-step polling are separate follow-ups.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural issues; the diff deletes more concepts than it adds.</summary>

It removes the Overview's poll loop and both terminal props, `lastStepsJobsSummary`, the whole-summary comparison and its TODO, and Feedback's copy of the lookup. It adds one watcher, one retry watcher and one tested helper beside its siblings. One fix was applied: an input's header class guard moved to its only caller. A synchronous `updateSteps` that would drop `rerunWhileBusy` came out about the same size and relies on unwritten ordering rules, so it wasn't taken.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Added the browser test, moved dataset fetches to MSW, and dropped a redundant unit case.</summary>

- Added `test_steps_follow_running_invocation`: green on Playwright and Selenium, times out on the base composable.
- Composable tests mock the dataset API with MSW; the input-failure case gets a real 403.
- The retry test covers both polled props, and the `rerunWhileBusy` tests check its documented guarantees.
- Dropped "does not toggle loading": the Steps component test already goes red when the watcher toggles it.
- 11 of the 14 composable "following polled data" cases fail against the base composable. The other 3 check that nothing is written, which base also does by never refreshing.
- Each guard was mutation-checked: dropping the rerun loop, the per-input catch or the retry watcher's invocation source turns its test red.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed finding in `rerunWhileBusy`, fixed with tests.</summary>

A synchronous throw from the wrapped function left its rejection cached, so later calls never ran it again. The invocation graph's caller is async, so it was never hit in practice. The fix uses `callAsync`. A follow-up keeps the cleanup in the same microtask as the last rerun check, so a call made as a run finishes isn't dropped. Both have red-to-green tests.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A failed first load shows the existing error alert; the Overview now retries it on the next poll. A failed poll leaves the last good states in place, as before. An input dataset that can't be fetched after the first load shows no label, is retried on every poll, and doesn't stop the other steps from following the polls.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They mount the real composable and step components and check rendered headers, step states and job counts after the props change. The "writes nothing" cases count reactive writes, which is the #22745 contract, since the minimap deep-watches the steps.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Only the invocation view changes; scheduling and running are untouched.
- [x] Who hits this in practice and what is the evidence? Anyone who watches a running invocation's Steps tab on 25.1 or later. #24138 came from reading the code, not a user report, and is reproduced by a component test and a browser test. The refresh cost has user reports in #22745 (a 171-step workflow on usegalaxy.eu).
- [x] Were simpler or existing approaches considered? Yes. The minimal hoist posted on #22745 only compares the jobs summary, so subworkflow and newly scheduled steps would still freeze. A watcher alone would run the O(n²) refresh every 3 s on every tab. A synchronous `updateSteps` without `rerunWhileBusy` is about the same size and relies on unwritten ordering rules. The new helper sits beside `dedupeInFlight` and reuses `callAsync`, and Feedback's copy of the lookup is gone.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual steps</summary>

- vitest:
  - `WorkflowInvocationSteps.test.ts`: mounts the Steps tab, changes the jobs summary the way the parent's poll does, and checks that the header goes to `header-ok` while the step stays expanded. It fails on the base composable.
  - `useInvocationGraph.test.ts`: in both load modes (Overview and Steps), a new summary, an invocation-only change, a newly scheduled step, a poll landing during an input fetch, a failed input fetch, a poll landing during a failing input fetch, an unchanged poll and an input without a value. Also `stepJobSummaryLookup`.
  - `InvocationGraph.test.ts`: a failed load is retried on a new jobs summary or a new invocation, and the graph replaces the error.
  - `WorkflowInvocationState.test.ts`: the terminal-state cases now detect terminal by the cancel button being gone; hiding or always showing that button turns them red.
  - `sharedPromise.test.ts`: `rerunWhileBusy`, including a call made during a failing run.
- `test_workflow_invocation_details.py::test_steps_follow_running_invocation` runs an input → 20 s `cat_data_and_sleep` workflow, opens the Steps tab, expands the step, checks it isn't `ok` yet, then waits for its header to turn `ok` with the job details still shown.
- Manually: run a workflow with a slow step, open the invocation's Steps tab and expand that step. The header should go from queued to running to successful without leaving the tab.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
