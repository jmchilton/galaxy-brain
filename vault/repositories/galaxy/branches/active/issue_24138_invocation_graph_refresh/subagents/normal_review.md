# Normal review debrief

Fixed in `360febc0e41`:
- **#1 (medium).** A failed input fetch is now caught per input. Later steps still update, the input is retried on the next poll, and the error is still thrown at the end of the pass, so a first-load failure still shows the error alert.
- **#2.** `headerClass` is only written when it changes.
- **#4.** The Overview retry also watches `invocation`.
- **Design point.** The rerun runner moved to `utils/sharedPromise.ts` as `rerunWhileBusy`, with unit tests.
- **Stale comment** in the "writes nothing" test, fixed.

Each fix is covered by a new red→green test.

Not acted on:
- **#3, dead `invocationAndJobTerminal` Overview prop.** Removing it means rewriting how `WorkflowInvocationState.test.ts` checks for terminal state. That's out of scope, and changing a test's probe is John's call.
- **#5, moving the retry into the composable.** The Steps tab and Feedback not retrying is pre-existing behavior, so it's out of scope. Left as a possible follow-up.
- **Test volume.** I kept "does not toggle loading". It guards the expanded-step collapse at composable level in both modes, and the component test only covers the Steps tab. I kept "updates a step once it is scheduled" because it covers a different path: invocation and summary arriving together for a step with no invocation step yet.
- **Lookup prefers `implicit_collection_jobs_id` when a step has both ids.** Galaxy doesn't produce such steps.

<details><summary>Full review</summary>

# Normal review: issue_24138_invocation_graph_refresh

Commit reviewed: `13b53a04576` on `release_26.2` (`f9cf361962e`). Read-only review. No security findings.

The branch is sound. I found no blocking defects. One medium finding: a failed input fetch on the new watcher path stops every later step from updating, and nothing tells the user. The rest are low-severity or design points.

How I checked:
- Ran the 13 related test files: 82 tests green.
- Ran the new composable tests against the base composable (copied to a temp file, since deleted): 9 red, matching the debrief.
- Removed the stale-flag rerun as a mutation: the "latest summary mid-update" test goes red in both modes, so it tests the race.
- Confirmed findings 1 and 2 with throwaway probe tests, since deleted. The worktree is clean.

## Findings (by severity)

### 1. Medium: a failed input fetch on the watcher path stops all later steps from updating, with no error shown

- **Where:** `client/src/composables/useInvocationGraph.ts:243-244` (`await initializeGraphInput(...)` inline in the `updateSteps` loop) and `:138-146` (the watcher swallows the error and logs it).
- **Scenario:**
  1. A freshly launched invocation has no `invocation.steps` yet when the graph first loads. Input steps skip initialization and keep `nodeText === undefined`.
  2. A later scheduling poll adds the invocation steps. The watcher pass now reaches the input and calls `fetchDatasetDetails` / `fetchCollectionSummary`.
  3. That call rejects, for example with a 429 (the reason the retry exists) or a 403 on an input the viewer can't read. The pass throws at the input's index.
  4. Every step with a higher index keeps its previous state. Inputs are usually the low indices, so in practice that means most tool steps.
- **Effect:** the headers stay "queued" in the Steps tab, the Overview graph and Feedback. A transient error clears on a later poll; a persistent one never clears.
- **Before this branch:** the Overview's loop sent the same failure to the error alert, where the user could see it. Now it only reaches `console.error`.
- **Probe result:** data_input at step 0, tool at step 1, first load with empty `steps`, then a poll adding both steps plus a `running` summary while `fetchDatasetDetails` rejects. Step 1 stays `queued`.
- **Fix:** isolate input initialization so one input can't block the loop.
  - Catch inside `initializeGraphInput`, or around the call. Leave `nodeText` undefined so a later poll retries.
  - Optionally, start the input fetches without awaiting them in the loop and await them together (`Promise.allSettled`) only on the first load, before `fromSimple`. That also removes the reason passes need to be serialized (see design point A).
  - Add a test like the probe above.

### 2. Low: an input with no value still writes `headerClass` on every poll (the "writes nothing" claim has an exception)

- **Where:** `useInvocationGraph.ts:243` → `initializeGraphInput` → `:391` `setHeaderClass(graphStep)`.
- **Scenario:** some input steps never get `nodeText`, such as an optional data input with no `invocation.inputs` entry and no matching `input_step_parameters`. They re-enter the input branch on every pass. Each pass assigns a new `headerClass` object, which re-renders the node and makes the minimap's deep watch redraw.
- **Probe result:** one poll with nothing changed gave `onTrigger` keys `["headerClass"]`.
- **Not a regression:** base did the same for every step on an idle tick.
- **Why it matters:** the debrief and commit message say "an unchanged poll writes nothing to the graph steps", and the test only covers a tool step.
- **Fix:** in `initializeGraphInput`, call `setHeaderClass` only when `nodeText`/`state` was actually set, or have `setHeaderClass` skip the write when the classes are unchanged. Optionally extend the "writes nothing" test with an unprovided input step.

### 3. Low: the `invocationAndJobTerminal` prop on the Overview is now dead, kept only for a test probe

- **Where:** `client/src/components/WorkflowInvocationState/WorkflowInvocationOverview.vue:19` and `WorkflowInvocationState.vue:473`. The only reader is `WorkflowInvocationState.test.ts:292`, which looks for `invocationandjobterminal="true"` in the stub's HTML.
- **Problem:** the debrief accepts this as out of scope. Given the owner's concern about accreting code, a declared prop that does nothing is the kind of leftover that confuses the next reader.
- **Fix:** remove the prop and the binding. Rewrite `isInvocationAndJobTerminal` to probe something the parent renders itself. The Cancel buttons are `v-if="!invocationAndJobTerminal"` (`WorkflowInvocationState.vue:326`, `:453`, `data-description="cancel invocation button"`). The test already has a `renderNavigation` mode that unstubs `BNav`, so the in-nav button can be found. If kept, at least mark the prop as unused.

### 4. Low: the retry watcher in `InvocationGraph.vue` watches only `stepsJobsSummary`

- **Where:** `client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue:97-104`.
- **Scenario:** the first load fails while the parent's job-summary poll has stopped but its scheduling poll (`pollStepStatesUntilTerminal`) is still running. The failed load then never retries, although new invocation objects keep arriving.
- **Why it's rare:** with the current terminal logic, `jobStatesTerminal` usually implies scheduling is done, so the window is narrow.
- **Fix:** watch `[() => props.invocation, () => props.stepsJobsSummary]`, the same sources as the composable's watcher. That also makes this retry match the old loop's condition.

### 5. Low: failed first loads still differ between consumers

- The Overview now retries a failed first load on the next poll.
- The Steps tab (`WorkflowInvocationSteps.vue:100-113`) and Feedback (`WorkflowInvocationFeedback.vue:37-50`) still show `graphError` / `stepsError` until remount. Their graph steps may keep updating behind the error in the meantime, because the composable's watcher runs once `loadedWorkflow` is set.
- This is pre-existing, not a regression. Fixing it is optional.
- If wanted, move the retry into the composable: in the watcher, call `loadInvocationGraph(loadOntoEditor)` when the last load failed. Each consumer then only renders the error. That would delete the component-level watcher from point 4.

## Design points (non-blocking)

**A. `refreshSteps` is a new hand-rolled single-flight with a trailing rerun** (`useInvocationGraph.ts:132-135`, `:192-212`).
- It's correct and tested.
- `client/src/utils/sharedPromise.ts` already holds the sibling helpers `dedupeInFlight` and `memoizeUntilRejected`, with their own tests. `quotaUsageStore.ts:71-97` hand-rolls another in-flight pattern.
- Option 1: a small generic `coalesceLatest(fn)` / `runLatest(fn)` in `sharedPromise.ts`, with a unit test, would leave a reusable piece and shrink the composable to `const refreshSteps = coalesceLatest(() => updateSteps(...))`.
- Option 2: per finding 1, make `updateSteps` synchronous for non-input steps and handle input initialization separately. Most of the race then goes away, and so does the need for the machinery.
- Either option is better than leaving a one-off pattern in a composable.

**B. Test volume.**
- The composable tests run 6 cases × 2 load modes.
- "does not toggle loading" passes on base by construction. It duplicates what the Steps component test proves from the user's side (the expanded step stays expanded).
- "updates a step once it is scheduled" overlaps "updates step states when only the invocation changes".
- Consider dropping "does not toggle loading" and keeping the component test as the regression guard. This is minor.
- Stale comment in `useInvocationGraph.test.ts`: in the "writes nothing" test, the line `// as the Overview graph's own poll loop used to do` refers to deleted code. "as a retried load does" matches the new retry path.

**C.** `updateSteps` in the Steps/Feedback mode never sets `stepsPopulated`, so every pass shallow-copies `loadedWorkflow.steps` just to count them (`useInvocationGraph.ts:220-223`). It's O(n) and harmless; mentioning it only because the loop bound was the point of the #22745 fix. Not worth changing on its own.

## Looked at and fine

- **Mount sites:** `InvocationGraph` is mounted only by `WorkflowInvocationOverview`. `WorkflowInvocationOverview`, `WorkflowInvocationSteps` and `WorkflowInvocationFeedback` are mounted only by `WorkflowInvocationState`, which is mounted from `router.js`, `WorkflowRunSuccess.vue` and `GridInvocation.vue`. All three keep `WorkflowInvocationState`'s own 3 s poll. Removing the graph's self-loop leaves no consumer without a poll.
- **Watch sources:** the store replaces the stored objects on every fetch (`keyedCache` `storedItems.value[id] = item`; `updateInvocation` spreads into a new object), so a shallow watch on `[invocation, stepsJobsSummary]` fires on every poll and on nothing else. Default `pre` flush runs the tool-step pass synchronously before render. The watcher is created in component setup, so it stops on unmount.
- **Race handling:** `refreshSteps` reads `stepsJobsSummary.value` fresh on each iteration and `invocation.value` per step. Polls that land during the first load or during an input fetch set the stale flag and are re-applied, which the mutation check confirmed.
  - If a pass throws, a pending rerun is dropped and the rejection goes to every waiter. The next poll retries. Acceptable.
  - The retry watcher and the composable's watcher can both fire on one poll; the second only sets the stale flag. Harmless.
- **Parity with the deleted `pollInvocationGraph`:**
  - The old loop stopped on `invocationAndJobTerminal`; the parent's polls stop on the same conditions.
  - Invocation-only changes (subworkflow state, newly scheduled steps) are now followed, where the old summary comparison skipped them, so the subworkflow TODO is gone.
  - Removing the loop also fixes a base race: the old loop checked `isTerminal` after `loadGraph`, which could drop the final poll.
  - The transient error-alert flashes during polling are gone.
  - Input steps still initialize once (same `nodeText === undefined` rule as base). In the Steps tab they now initialize once the invocation steps arrive, where on base they never did.
  - After a failed load or retry, `fitWorkflow` is still not re-run. Same as base.
- **`stepJobSummaryLookup` vs the old `find`:**
  - Separate maps per model keep encoded `Job` and `ImplicitCollectionJobs` ids that happen to be equal from colliding, as the old code did.
  - `WorkflowInvocationStep` / other non-ICJ models go in the job map, as before.
  - Null ids return `undefined`.
  - First-wins is moot: `fetch_job_states` dedupes ids via sets.
  - One unflagged divergence: when an invocation step has both `job_id` and `implicit_collection_jobs_id`, the old code took whichever came first in the array (the `Job` row, from `invocation_job_source_iter`'s order); the new code prefers ICJ. Steps with both ids aren't produced in practice, and ICJ-first is arguably more correct.
  - The Feedback tab's duplicate copy of the `find` was removed and now reuses the helper. No other copies exist in `client/src`.
- **Editor canvas:** `WorkflowGraph` gets `:steps="steps"` straight from the composable, so `Node.vue` (`headerClass` / `headerIcon`) and `WorkflowMinimap` (deep watch → `canvasDraw` reading `headerClass`) see the in-place mutations, as on base. `fromSimple` gets a shallow copy once, as before. Vue 3 compat, so adding keys to `steps.value` is reactive.
- **Tests:**
  - The Steps component test runs the real composable and real step components, is red on base, and asserts that the expanded step stays expanded through polls.
  - The error test now exercises the real error path rather than a mocked composable.
  - The `InvocationGraph` retry test is reasonable.
  - The `stepJobSummaryLookup` tests use the same id under both models, so they cover model separation and aren't trivial.
- **Imports:** all at module top; no buried imports. Lint on the changed files: 0 errors, 3 warnings, all on lines this commit didn't change.

</details>
