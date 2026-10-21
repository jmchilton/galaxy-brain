# Scope evaluation

**Recommendation: keep the scope as implemented. No scope change.** The branch fixes #24138 and the measured refresh-cost part of #22745 in one composable change. The two can't be pulled apart cleanly: a #24138-only watcher would run base's O(n²) `updateSteps` every 3 s on the Steps tab and Feedback too, and the old whole-summary comparison would still skip invocation-only changes. Every alternative the reviews raised is either a design variant of the same scope (synchronous `updateSteps`), a small tidy John can decide at PR time (the dead `invocationAndJobTerminal` prop), or a separate follow-up (retry in the composable, the `stepsJobsSummary` type contract, the zoom/pan profile, per-step polling fan-out). The PR should say `Fixes #24138` and only reference #22745 ("part of"), so it doesn't auto-close it.

Reviewed at HEAD `ca1e78f57cf` on `release_26.2` (clean worktree). Implementation is about +150/−60 across `useInvocationGraph.ts`, `sharedPromise.ts`, `InvocationGraph.vue`, `WorkflowInvocationFeedback.vue` and `WorkflowInvocationOverview.vue`. The rest of the +542/−101 is tests and one selector.

## Scopes

### 1. As implemented (recommended)

A composable watcher on `invocation` and `stepsJobsSummary` re-derives step states without toggling `loading`. `updateSteps` becomes O(n) per step, with `stepJobSummaryLookup` replacing the whole-summary `JSON.stringify` comparison. `InvocationGraph`'s own poll loop is deleted (with a retry on the next parent poll). Overlapping passes run through a new generic `rerunWhileBusy` in `sharedPromise.ts`. Tests: vitest at composable and component level, plus one Selenium/Playwright E2E.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the reproduced regression on Steps, Overview and Feedback at once</li><li>Measured 128 ms → 0.75 ms per refresh at 171 steps; an idle poll writes nothing</li><li>Deletes more concepts than it adds: the poll loop, `isTerminal`, `lastStepsJobsSummary`, the subworkflow TODO, Feedback's copy of the `find`</li><li>The new helper sits with its siblings (`dedupeInFlight`, `memoizeUntilRejected`) and is tested there</li><li>Red-on-base evidence at unit, component and E2E level</li></ul> | <ul><li>Leaves the Overview's `invocationAndJobTerminal` prop dead (see scope 6)</li><li>Took the comment's per-step alternative, not its minimal hoist, so the diff is less like what was posted on #22745</li><li>The E2E adds about 20 s of tool sleep to the Selenium suite</li><li>Merge-forward will touch the same files as `invocation_graph_e2e` (`navigation.yml`, `test_workflow_invocation_details.py`, `InvocationGraph.vue`) and `invocation_graph_color_swatch` (`initializeGraphInput`). The conflicts should be trivial.</li></ul> |

### 2. Contract: #24138 only (watcher plus loop deletion, no perf work)

Add the watcher and delete `pollInvocationGraph`, but keep base `updateSteps`: the in-loop stringify, the `Object.keys` bound and the input-branch churn.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller diff with a single concern</li><li>Leaves #22745's perf work to its assignee</li></ul> | <ul><li>Moves the O(n²) refresh onto the Steps tab and Feedback, which never ran it before: a perf regression for big workflows</li><li>Base's summary comparison skips invocation-only changes, so subworkflow and newly scheduled steps would still freeze unless that check is reworked, which is most of the per-step change anyway</li><li>The idle `headerClass` churn now hits every consumer</li></ul> |

### 3. Contract: split into two PRs (the #22745 minimal hoist first, then #24138)

PR A is the diff posted on #22745 (hoisted comparison, `stepCount`, input-only branch). PR B adds the watcher, the loop deletion and the race handling on top of it.

| Pros | Cons |
| --- | --- |
| <ul><li>PR A is tiny and matches the posted comment, so it's easy to backport</li><li>Each PR reviews alone</li></ul> | <ul><li>PR B would then rip out PR A's comparison to handle invocation-only changes: churn across two PRs</li><li>B depends on A (or regresses perf, as in scope 2), so they have to land in order</li><li>Overlaps #22745's assignee (ahmedhamidawan); coordinating is John's call either way</li></ul> |

### 4. Design variant: synchronous tool-step pass, drop `rerunWhileBusy` (thermo-nuclear finding 1)

Same scope. `updateSteps` writes every non-input step synchronously, then awaits the input fetches, so overlapping passes are harmless and the helper isn't needed.

| Pros | Cons |
| --- | --- |
| <ul><li>Deletes `rerunWhileBusy`, its 4 tests and the `refreshSteps` wrapper</li><li>No new shared utility</li></ul> | <ul><li>About the same size</li><li>Replaces a tested, explicit guarantee with two unwritten rules: no `await` before the tool-step writes, and input mutation through the proxy</li><li>Invalidates the race mutation evidence, the Codex fix and the E2E runs</li></ul> |

### 5. Contract: drop the E2E (vitest only)

Keep only the component and composable tests.

| Pros | Cons |
| --- | --- |
| <ul><li>Saves about 20 s of CI sleep</li><li>Avoids a merge-forward overlap with `invocation_graph_e2e`</li></ul> | <ul><li>Nothing in a browser covered this regression. The E2E is the only red-on-base check against a real Galaxy and the only source of before/after screenshots.</li><li>The test-challenge agent already weighed this and kept it</li></ul> |

### 6. Expand slightly: remove the dead `invocationAndJobTerminal` Overview prop (normal review #3)

Drop the prop and its binding. Rewrite `WorkflowInvocationState.test.ts`'s terminal probe to check something the parent renders, such as the Cancel button's `v-if="!invocationAndJobTerminal"`.

| Pros | Cons |
| --- | --- |
| <ul><li>This branch made the prop dead, so cleaning it up belongs to the branch, not to a follow-up</li><li>A few lines; matches John's dislike of leftover code</li></ul> | <ul><li>Changes an existing test's probe, which reviewers deferred to John</li><li>Unrelated to the bug as filed</li></ul> |

### 7. Expand: retry in the composable plus an explicit `stepsJobsSummary` contract (normal review #5, thermo #3)

Move the failed-first-load retry into `useInvocationGraph`, so the Steps tab and Feedback recover too and `InvocationGraph`'s retry watcher goes away. Either type the ref `Ref<StepJobSummary[] | undefined>`, or gate the Overview on the summary existing, as Steps and Feedback already are.

| Pros | Cons |
| --- | --- |
| <ul><li>One retry path for all three consumers, deleting the component-level watcher</li><li>Fixes a type that's wrong today (`stepsJobsSummary || undefined` at `WorkflowInvocationState.vue:471`)</li></ul> | <ul><li>Changes pre-existing behavior on Steps and Feedback (behavior that isn't a regression)</li><li>Touches the parent's render conditions, so it needs fresh tests and review</li><li>Better as a small follow-up PR</li></ul> |

### 8. Expand: #22745 zoom/pan canvas cost

Browser-profile the reporter's 171-step invocation and fix `WorkflowGraph`/`Node.vue` render cost in read-only invocation mode (e.g. `v-memo`).

| Pros | Cons |
| --- | --- |
| <ul><li>Would address the rest of the user-reported freeze</li></ul> | <ul><li>Unprofiled, so there's no known fix yet</li><li>Different code (canvas, not polling)</li><li>#22745 has another assignee</li><li>Would block a reproduced regression fix on open-ended perf work</li></ul> |

### 9. Expand: per-step polling fan-out on the Steps tab

Each mounted `WorkflowInvocationStep` polls `GET /api/invocations/steps/{id}` every 3 s (about 57 req/s at 171 steps). See the TODO at `WorkflowInvocationSteps.vue:147-152`.

| Pros | Cons |
| --- | --- |
| <ul><li>Same scaling class on the same tab</li></ul> | <ul><li>A server-request problem, not the graph refresh</li><li>Adjacent to #23977 / #24141 (`issue_23977_client_api_fanout_26.1`), not to these issues</li><li>Its own issue/PR</li></ul> |

### 10. Retarget: same change on `release_26.1`

Same diff, based on the oldest released branch, which usegalaxy.eu (the #22745 reporter) runs.

| Pros | Cons |
| --- | --- |
| <ul><li>The fix ships in a 26.1 point release instead of waiting for 26.2.0</li><li>The touched files differ from 26.2 by only about 25 lines</li></ul> | <ul><li>26.1 is Vue 2.7, so reactivity assumptions need re-checking (normal review relied on Vue 3 key-add reactivity, though base already depends on the same)</li><li>All test, E2E and screenshot evidence would need redoing</li><li>A bigger change than a typical point-release fix</li></ul> |

<details><summary>Details</summary>

**Why scopes 1 and 2/3 aren't really separable.** The #22745 research debrief said the fixes are "complementary, can land in one PR or two". The #24138 proposal also said the summary-changed check at base L206-208 "has to count invocation changes too". Once the watcher exists, every consumer runs `updateSteps` on every poll, because `useKeyedCache` stores a new array per fetch. So the O(n²) loop has to go in the same change, or the Steps tab gets slower than it is today. The per-step approach handles both the cost and the invocation-only changes. A minimal hoist would need its comparison extended to track `invocation` as well, which ends up as the same rewrite.

**Review mentions of scope, all covered above:**
- normal review #3 (dead prop) → scope 6
- normal review #5 (retry in composable) → scope 7
- design point A / thermo #1 (synchronous pass) → scope 4
- design point B (test volume) → already trimmed by test challenges
- thermo #3 (type contract) → scope 7
- test challenges (E2E vs component overlap; John's decision whether to keep the component test) → scope 5 and the open questions below
- the index's "don't claim to fix the zoom/pan freeze" → scope 8

Codex raised nothing about scope.

**Coordination.** #22745 is assigned to ahmedhamidawan and jmchilton. ahmedhamidawan wrote #20719, which caused the regression, and #18663, which introduced the stringify. No competing open PR was found. Whether to ping them is John's call; no @-mention has been written anywhere.

**Merge-forward to dev.** `invocation_graph_e2e` (dev) waits on `graph_node_state(..., "ok")` in the Overview, so after merge-forward it will also exercise this branch's watcher path in place of the deleted poll loop. That's a good cross-check, not a conflict risk. `invocation_graph_color_swatch` edits `initializeGraphInput`'s parameter branch, the same function where this branch moved `setHeaderClass`. The conflict should be small.

</details>

## Open questions

- Remove the dead `invocationAndJobTerminal` prop in this PR (scope 6), or leave it as a follow-up?
- Keep both the component test and the E2E (the test challenges kept both)?
- Is `release_26.2` the right base, or should it go to `release_26.1` for usegalaxy.eu (scope 10)?
- Ping or coordinate with ahmedhamidawan (the #22745 assignee) before opening the PR?
