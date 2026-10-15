# Debrief: invocation_graph_polling_quadratic

Source: `to_file/invocation_graph_polling_quadratic.md` → `to_file/proposed_invocation_graph_polling_quadratic.md`. Verified against dev `c63ffc2ccae` (2026-10-14) in the scratch dev worktree. Nothing was posted.

## Verdict

Proposed as a **comment on #22745**, not a new issue. The core perf claim is now **measured**, not just read from the code. It is framed as a contributor, not the root cause: about 130 ms of main-thread time per 3 s refresh at 171 steps is a stutter, not a hang that needs a reload.

## Comment vs. new issue

#22745 is open and assigned to ahmedhamidawan, who wrote the code involved (#18663, #18615). It has no linked PR, and its 5 comments are repro links only: a workflow made importable, still broken on 26.1, and a slow 171-step report from bgruening. The symptom is the same, and a new issue would split the diagnosis away from the repro invocation. A comment adds measured evidence to the existing thread. There is no open PR addressing it, so it isn't rejected.

## Measured

A temp vitest drove the real `useInvocationGraph` on stock dev. The workflow and summary were synthetic and all tool steps, with the summary in a deep `ref` read through a `computed`, like `invocationStore`/`useKeyedCache`. It ran on node 22.20.0 / V8, Apple M4 Pro. Refresh = `loadInvocationGraph()` after the summary was re-fetched with identical content. Each figure is the median of 25.

| Steps | dev | hoisted (+ Map, never built on unchanged refreshes) | hoisted + input-branch guard |
| --- | --- | --- | --- |
| 50 | 11 ms | 0.36 ms | 0.3 ms |
| 171 | 128 ms | 1.3 ms | 1.0 ms |
| 400 | 708 ms | 3.1 ms | 2.4 ms |

- Clean O(n²): 50→171 is 3.4× the steps and 11.6× the time; 171→400 is 2.3× the steps and 5.6× the time.
- Three scenarios: the same summary object (the redundant loop running with no new fetch), a refetch with nothing changed, and a refetch with 5 steps changed. They are within about 5% of each other, so the cost is almost all the in-loop stringify, not the `find`.
- **New finding, not in the draft:** a deep, sync watcher with `onTrigger` on `steps` showed that an *unchanged* refresh replaces `headerClass` on all 171 steps, while a refresh with 5 steps changed writes 25 keys on just those 5. The cause is the `else if (invocationStep && nodeText === undefined)` branch at L222-223. Tool steps never get `nodeText`, so `initializeGraphInput` → `setHeaderClass` assigns a new object every idle refresh. Guarding the branch with `isWorkflowInput` brings the idle refresh to 0 writes.
- I checked the `headerClass` consumers by grep: `Node.vue` L297-302, the `WorkflowMinimap.vue` L68-78 deep watch → AABB recompute + redraw, and `canvasDraw.ts` L34-36. **The render cost was not measured.**
- The existing `useInvocationGraph.test.ts` passed (17 tests) when pointed at the patched variant. `useInvocationGraph.color.test.ts`, seen early in the session, was gone later. It was probably another agent's temp file.
- Two id-generation bugs in my own bench (a `slice` and float precision above 2^53) caused id collisions and misleading write counts. I caught and fixed both. The final numbers are from collision-free ids.
- The hot spots are present on `release_26.0`, `release_26.1` and `release_26.2`. 26.0/26.1 are on Vue 2.7, while dev is on Vue 3, so the comment says the absolute ms figures are from dev.
- Cleanup: temp files `useInvocationGraph.igpq{bench,pub,pubh,var}.test.ts`, `useInvocationGraph.color.igpqvar.test.ts` and `useInvocationGraph.igpqhoisted.ts` were removed from the worktree. Copies are kept in the session scratchpad `igpq/`. No tracked files were edited.

## Not measured / honest limits

- No browser profile was done. `usegalaxy.eu` API fetches were blocked in this environment, so the summary is synthetic, about 15 kB at 171 steps, modeled on the `InvocationStepJobsResponse*` schema.
- Firefox proxy and stringify performance may differ from V8. The reporter says Firefox is worse.
- Zoom/pan freeze: still unexplained. The comment says so and asks for a browser profile.

## Related search

About 20 phrasings via `gh search issues/prs` and `gh api search/issues` (issues and PRs). Search rate limits cut one batch short. No duplicate and no open PR.
- #20864: Input/Output tabs perf. Different tabs.
- #23977: client fan-out of /api/ requests trips rate limits. Related to the Steps-tab per-step polling point, which I dropped from the comment. Not cited.
- #19439 / #19470: invocation report freeze, closed. Different surface.
- #18663: introduced the in-loop stringify ("Optimize useInvocationGraph", 24.1).
- #18615: introduced the input branch.
- #17413: original graph and poll loop.
- #15728: closed, server-side scheduling slowness.

## Changes from the draft

- It is now a comment, opening with measured numbers. The draft's "not profiled" is replaced by a vitest measurement, labelled as non-browser.
- The speedup is credited to the hoist, not the `find`. The draft's "O(n²) find" matters only on changed refreshes and is under 1 ms.
- "Redundant poll loop": the draft implied two loops both re-running the graph. Only `InvocationGraph` calls `loadInvocationGraph`. The parent's loop only fetches. Reframed as "runs whether or not a new summary arrived", and the comment notes that removing it doesn't remove the cost.
- "Reactive churn": the draft said this was unverified. It is now measured and pinned to a specific branch. The draft's mechanism (mutations on every step) was right in effect, but for a different reason: idle refreshes, not changed ones.
- Dropped: the L278 per-step jobs stringify (tiny objects, negligible), and the Steps-tab per-step `GET /api/invocations/steps/{id}` polling. That one is code-read only and not the Overview freeze; the `WorkflowInvocationSteps.vue` L147-152 TODO is confirmed if anyone wants it later.
- Added: release branch presence, origin PRs, a reproducible bench in `<details>`, and Alternative Approaches.

## Relation to the sibling (`invocation_steps_tab_states_frozen`)

The sibling is a standalone issue: a reproduced regression with a red test. Its fix (a summary watcher plus deleting `pollInvocationGraph`) doesn't remove this cost, because `useKeyedCache` stores a new array per fetch, so the watcher still fires every 3 s. The two are complementary and can land in one PR or two. **File the sibling first**, then replace `#XXXXX` in this comment's Context with its number. If John doesn't file the sibling, delete that Context paragraph.

## Left over

- `#XXXXX` placeholder (above).
- Posting marker: John's rule requires a "posted by Claude on behalf of jmchilton" lead line when posting. It isn't included in the draft, so add it at posting time.
- No @-mention of ahmedhamidawan (the assignee). John may want to ping them.
- Minor, not in the comment: an input step with neither a dataset nor a parameter value (e.g. an optional input that wasn't provided) still has `nodeText === undefined`, so even with the guard it would be re-initialized every refresh. That is one step, not n.
- Whether John wants to open the PR (a small diff plus a unit test). It came from vault re-verification, not his branch, so probably not assigned.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback; no open PR touches this. Benchmark rerun on stock dev `c63ffc2ccae`: 11.6 / 120.7 / 667 ms at 50 / 171 / 400 steps (draft: 11 / 128 / 708) — quadratic confirmed; idle refresh `{"headerClass":171}`, 5-step change 25 writes, as claimed. **Wrong claim fixed:** the draft's shown diff alone gives 0.7 / 5.3 / 24.9 ms (still quadratic) — loop bound `Object.keys(fullSteps).length` on reactive steps recomputed each iteration; writer's 0.3 / 1.0 / 2.4 came from a copy that also hoisted that. Adding the hoist: 0.3 / 0.9 / 2.2 ms; `useInvocationGraph.test.ts` 17/17. Verified L222-223 headerClass churn (`getHeaderClass` returns new object), all line refs, `:steps` passed straight to `WorkflowGraph`, Vue 2.7.16 on release_26.0/26.1 vs 3.5.43 on dev/26.2, hot spots present on 26.0–26.2, #18663/#18615 history; stutter-not-freeze framing honest.

Edits in place:
- Main table → 2 columns (dev vs with diff); dropped unclear "comparison hoisted" variant column.
- Added `Object.keys()` loop bound as second smaller quadratic (~4 ms at 171), in code walk + L191 bullet.
- Diff hoists `const stepCount = Object.keys(fullSteps).length`; note that without it 171 steps still ~5 ms.
- Proposed Approach: "compare the summary and count the steps once per refresh".
- Context: `🎯 #XXXXX (Steps tab)`.

Left over: fill `#XXXXX` once Steps-tab issue filed; per-step alternative would also need `stepCount` hoist (unstated).
