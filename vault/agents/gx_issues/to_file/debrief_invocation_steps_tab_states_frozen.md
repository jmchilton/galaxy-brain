# Debrief: invocation_steps_tab_states_frozen

Source: `to_file/invocation_steps_tab_states_frozen.md` → `to_file/proposed_invocation_steps_tab_states_frozen.md`. Verified against dev `c63ffc2ccae` (2026-10-14) in the scratch dev worktree. Nothing posted.

## Verdict

Proposed, not rejected. Reproduced red with a component-level vitest. Regression from #20719 (in v25.1.0+). No duplicate found.

## Reproduction

- Temp test `WorkflowInvocationSteps.stfrozen.test.ts`. It mounts `WorkflowInvocationSteps` with the real `useInvocationGraph`, `WorkflowInvocationStep` and `WorkflowInvocationStepHeader`, and mocks only the workflow/invocation stores, `fromSimple` and `provideScopedWorkflowStores`. It does `setProps` on the summary: queued → running → ok.
  - Red on dev: header stays `header-queued` / "queued" at all three points. Assertion `header-ok` fails.
- Control (`...stfrozenctl.test.ts`): `vi.mock` wraps the real composable with `watch(summaryRef, () => loadInvocationGraph(false))`, with no source edits.
  - Green: queued → running → ok, text "successful". So the test measures the right thing.
  - Side finding: an expanded step was **collapsed** after the update (`expanded before: true`, `after: false`). `loadInvocationGraph` flips `loading`, and `WorkflowInvocationSteps` L117 hides the whole list while loading, so steps unmount. This went into the Proposed Approach: the watcher must call `updateSteps` without toggling `loading`.
- Re-ran the exact test code from the issue body (taken out of the md) in a third temp file. Same `header-ok` AssertionError.
- Pre-#20719 Overview (`59695bfca^1`): `InvocationGraph` was gated only on loading, the summary being present, the workflow, and `!isSubworkflow`. All of those hold while the Steps tab is shown for a top-level invocation, so the regression claim holds.
- Overview column in the table: `Node.vue` uses `headerClass` for the node header and `NodeInvocationText` shows per-state job counts, so the column says "color", not label text.
- Ran under node 22.20.0 via pnpm. Both temp files removed afterwards; copies are in the scratchpad. I edited no tracked files. Other agents' untracked files in the worktree (`useInvocationGraph.igpq*`, `WorkflowRunFormSimple.rerundropzq.test.ts`) were left alone.

## Verified "nothing else refreshes it"

- `WorkflowInvocationState` mounts `WorkflowInvocationSteps` under `v-else-if="invocation && stepsJobsSummary"` with no `:key`. `invocation` stays non-null (`invocationLoaded` stays true). `useKeyedCache` keeps the old summary while a refetch runs and then replaces it with a new array, so the prop changes but nothing remounts.
- The `workflowId` watch in `WorkflowInvocationSteps`: `useWorkflowInstance` returns a store computed whose id never changes, so the watch fires once.
- `WorkflowInvocationStep`'s per-step poll (L122-137) updates `stepDetails` (job list) only, never `graphStep`.
- `useInvocationGraph` imports no `watch` at all (L14), so it has no internal watcher.
- The route is `workflows/invocations/:invocationId/:tab?`. Staying on a tab doesn't change the route.

## Changes from the draft

- **Debug tab claim dropped.** The Debug nav item and content are gated on `canSubmitFeedback`, which requires `invocationAndJobTerminal` (`WorkflowInvocationState.vue` L158-162, L432-439, L524-533). By the time Debug can render, the summary is final and the parent's poll has stopped. Load-once is harmless there.
- **Regression framing added.** Before #20719 the Overview `BTab` was non-lazy (always mounted), and its poll loop wrote `graphStepsByStoreId` in the invocation store, which the Steps tab read. #20719 commit `9be0408071a` ("use invocation graph composable in steps view, no need for store ref") removed the store entry. The draft said the Steps tab "never got one", which is only true for the post-#20719 code.
- **The fix must not re-run `loadInvocationGraph`**, because of the collapse found above. The draft suggested `updateSteps()`, which is right; the issue now explains why.
- Also watch `invocation` (subworkflow states and steps not yet scheduled don't show up in the summary). Note the overlapping async `updateSteps` calls.
- Draft line numbers held: `WorkflowInvocationState` 285-294, `InvocationGraph` 155-163, `WorkflowInvocationSteps` 100-113, `WorkflowInvocationStep` 208 and 112-137. `WorkflowInvocationStepHeader` state rendering is at 61-67 (the draft said 52-67, which includes the wrapper).
- The symptom table is from the test. The Overview column is from the code (InvocationGraph loop), not run in a browser. No live Galaxy was used.

## Duplicate and related search

About 20 phrasings via `gh search issues` and `gh issue/pr list --search "invocation in:title"` (open and closed). No duplicate.
- #22745 (open, graph freezes on a 171-step workflow): perf, not staleness. Cross-referenced only through the fix.
- #20719 (merged 2025-08-12, ahmedhamidawan): introduced the regression.
- #17413: the original graph view and poll loop.
- #23920 (merged, ahmedhamidawan): same class of bug (stale runtimes in `JobStepJobs` on a running invocation, reactive-store fix). Not a duplicate; not cited in the issue.
- #21086 (closed): step display improvements, unrelated.
- #18663: older `useInvocationGraph` optimization.

## Standalone vs. with the polling perf issue

File this one **standalone**. It is a reproduced, user-visible regression with a red test. The sibling `invocation_graph_polling_quadratic` is unprofiled perf speculation, and its own draft suggests it should be a comment on #22745 rather than a new issue. Bundling them would tie a clear bug fix to a perf claim nobody has measured. The issue already says the fix removes one Overview loop and points to #22745 without claiming it fixes the freeze. If the perf comment is posted on #22745, it can link back to this issue for the "delete `pollInvocationGraph`" part.

## Left over

- The issue doesn't @-mention anyone. ahmedhamidawan wrote #20719 and owns this area; John may want to ping or assign.
- Not checked in a browser. The test is component-level with mocked stores. A manual check (slow tool, stay on the Steps tab) would add confidence, but isn't needed to file.
- Whether John wants to be assigned. The issue came out of vault component re-verification, not his own branch, so probably not.

## Reviewer

One fresh subagent, one round. Verdict: polished, no pushback. Reran the issue's vitest on dev `c63ffc2ccae`: red as described (`expected [...] to include 'header-ok'`). Line refs correct; regression via #20719 / `9be0408071a` confirmed (pre-#20719 Overview non-lazy, kept `graphStepsByStoreId` fresh); no duplicate.

Edits in place:
- `useInvocationGraph.ts` link widened to L137-314 so it covers `updateStep()` (where state/headerClass/icon are set); noted composable doesn't import `watch`.
- `InvocationGraph.vue` bullet: poll loop calls `loadGraph()` → `loadInvocationGraph()`.
- Context: "one of the Overview's two 3 s loops" → "the graph's own 3 s loop on top of the page's poll".
- Proposed Approach: watching `invocation` too has a gap — `updateSteps()` skips non-input steps unless summary changed (L206-208), so invocation-only changes (subworkflow state) still skipped unless that check counts them.

Left over: no live-browser check (issue says so); ping/assign ahmedhamidawan is John's call (no mention in body).
