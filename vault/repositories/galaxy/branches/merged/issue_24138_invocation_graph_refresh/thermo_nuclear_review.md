# Thermo-nuclear review debrief

I acted on one finding. `setHeaderClass` had a `JSON.stringify` guard that only one caller needed, so I moved the check to that caller. I didn't restructure the rest. The candidate "code judo" move, a synchronous tool-step pass, would delete `rerunWhileBusy`. But it ends up about the same size, deletes that helper's tests, and swaps the helper's explicit guarantee for an unwritten rule that no `await` comes before the tool-step writes. I wrote it up for the coordinator to decide. There are no structural regressions, no file-size problems, and no spaghetti growth.

The change is uncommitted in the worktree and touches only `client/src/composables/useInvocationGraph.ts` (+3/−6). It returns `setHeaderClass` exactly to its base form. The Selenium test and its selectors are unchanged.

Not acted on:
- **A synchronous `updateSteps` that deletes `rerunWhileBusy`** (finding 1).
  - The smallest form, a synchronous loop and then the input awaits, deletes the helper and the `refreshSteps` wrapper. It adds nothing, but depends on two unwritten rules: no `await` before the tool-step writes, and mutating inputs through the reactive proxy.
  - It deletes `rerunWhileBusy`'s 4 unit tests, which is the coordinator's call.
  - The race mutation evidence, the Codex fix and the E2E runs were gathered on the current design.
  - It's sketched below if wanted.
- **`updateSteps(stepsJobsSummary)` shadows the ref, and `refreshSteps` guards a non-optional ref** (finding 3). Both come from base. The guard is needed: the Overview passes `stepsJobsSummary || undefined` (`WorkflowInvocationState.vue:471`), so the declared type is wrong. Fixing that type is a follow-up.
- **`inputError ??= e as Error` cast.** I tried `unknown`, but eslint `only-throw-error` rejects throwing it, so the cast stays.
- **`stepJobSummaryLookup` lives in the composable module**, not `WorkflowInvocationState/util.ts` (`errorCount`, `isTerminal`). Both places are defensible, and the composable is the main consumer.
- **The dead `invocationAndJobTerminal` Overview prop, and moving the retry into the composable.** These were already declined with reasons in `subagents/normal_review.md`, so I didn't reopen them.

Checks, on node 22.20.0:
- vitest: 46 files, 415 tests green (`sharedPromise`, `useInvocationGraph`, `Graph/`, `WorkflowInvocationState/`, `Workflow/Editor/`).
- eslint: 0 errors. The 2 warnings are the base `any`s.
- prettier: clean.
- `vue-tsc --noEmit`: 0 errors.
- Mutation check: putting back the unconditional `setHeaderClass` call in `initializeGraphInput`, without the old guard, turns "writes nothing to an input step without a value" red in both modes.

<details><summary>Full review</summary>

# Thermo-nuclear review: issue_24138_invocation_graph_refresh

Scope: `origin/release_26.2...3498376357c` (11 files, +546/−102).
- Implementation: `useInvocationGraph.ts` (+62/−29), `sharedPromise.ts` (+25), `InvocationGraph.vue` (+14/−20), `WorkflowInvocationFeedback.vue` (+3/−11), `WorkflowInvocationOverview.vue` (−1), and one `navigation.yml` selector.
- The rest is tests.

## Verdict

The structure is sound. The diff deletes more concepts than it adds:
- the graph's own poll loop and `isTerminal` prop
- `lastStepsJobsSummary`
- the whole-summary comparison and its subworkflow TODO
- the duplicated `find` in Feedback

In their place it adds two watchers (the composable's own, and the retry in `InvocationGraph.vue`) and one generic helper. The helper sits next to its siblings (`memoizeUntilRejected`, `dedupeInFlight`) and is tested there. No file gets close to 1k lines: `useInvocationGraph.ts` is 432 and its test is 362. No feature checks leak into shared paths.

## 1. Code judo candidate: `updateSteps` is async only because of input steps (not acted on)

Tool, subworkflow and pause steps all update synchronously. The only `await` in the pass is `initializeGraphInput`, which fetches a dataset or collection once per input. That one await causes everything else:
- **The race:** a pass suspended on an input fetch resumes with a stale `findStepJobSummary` and overwrites newer states.
- **`rerunWhileBusy`,** which serializes passes and reruns them to fix that race.

The smallest restructure is two loops in `updateSteps`. The first, synchronous loop creates and assigns every step and calls `updateStep` on every non-input step. The second awaits each pending input one at a time, through the `steps.value[i]` proxy, keeping today's `inputError ??=` and the rethrow.

```ts
async function updateSteps() {
    for (...) { /* create/assign step i; if not an input, updateStep(...) */ }
    let inputError: Error | undefined;
    for (const i of pendingInputs) {
        try { await initializeGraphInput(steps.value[i]!, invocation.value.steps[i]!); }
        catch (e) { inputError ??= e as Error; }
    }
    if (inputError !== undefined) throw inputError;
}
// watcher: updateSteps().catch(log); loadInvocationGraph: await updateSteps()
```

What it deletes:
- `rerunWhileBusy` and its 4 unit tests.
- The `refreshSteps` wrapper.

Overlapping passes become harmless:
- All tool-step writes happen before the first `await`, so a suspended pass has nothing stale left to write.
- Inputs only ever write their own fixed data.
- A duplicate in-flight input fetch writes the same values twice.
- The first-load error alert works as it does today.

It adds no new concept, and the request pattern stays the same as base: inputs are fetched one at a time.

Optional extras, neither needed for correctness:
- **`dedupeInFlight` keyed by step index,** to avoid the duplicate fetch.
- **`Promise.allSettled`,** for parallel input loads. That means N parallel dataset requests where base made them one at a time, which is a behavior change near the 429 handling.

Judgement: the variant is about the same size, and it trades an explicit guarantee for an implicit one.
- **Today:** `rerunWhileBusy` states its guarantee ("the last call sees the latest state") in a tested, generic helper that survives edits to `updateSteps`.
- **The variant relies on two unwritten rules:**
  - No `await` may come before every tool step is written. Adding one breaks the race fix silently.
  - Inputs must initialize through the reactive proxy after the step is assigned. Today the first pass mutates the raw object before assigning it, and mutating the raw object after assignment wouldn't re-render.
- **The evidence was gathered on the current design:** the race mutation checks, the Codex finding and the E2E red/green runs.

Deleting the helper's tests is the coordinator's call, and the variant adds no robustness, so I didn't make the change. It isn't a presumptive blocker. If someone wants parallel input loading later, this is the shape to start from.

## 2. `setHeaderClass` JSON.stringify guard: a guard for one caller placed in a shared helper (acted on)

`setHeaderClass` was changed to compare `JSON.stringify` of the old and new class objects before writing. Its callers:
- **New-step creation:** a fresh object; the guard is moot.
- **`updateStep`:** only called after `graphStep.state !== resolvedState`, so the class always changes; the guard is moot.
- **`initializeGraphInput`:** called unconditionally at the end. That covers:
  - the parameter branch, which sets only `nodeText`, never `state`
  - the no-value branch, which sets nothing

  This is the only caller that needed the guard.

So the guard was a serialize-and-compare on every header write, to cover one call site that shouldn't have been writing at all.

Fix: `initializeGraphInput` calls `setHeaderClass` only in the dataset/collection branch, where `state` changes. `setHeaderClass` is back to the base version, a plain assignment. Behavior is unchanged:
- New input steps already get their `uninitialized` header class when they're created.
- Parameter inputs never change state.

The "writes nothing to an input step without a value" test is red when the unconditional call is put back without the guard, and green with the fix, in both modes.

## 3. Type boundary: `stepsJobsSummary` is typed non-optional but is `undefined` at runtime (not acted on, pre-existing)

- `useInvocationGraph(…, stepsJobsSummary: Ref<StepJobSummary[]>, …)` declares the ref non-optional.
- `refreshSteps` still guards `if (stepsJobsSummary.value)`. That guard was carried over from base `loadInvocationGraph`.
- The guard is load-bearing: `WorkflowInvocationState.vue:471` passes `stepsJobsSummary || undefined` to the Overview.
- `updateSteps(stepsJobsSummary)` also shadows the ref with a parameter of the same name. That is base code too.

The clean fix is to make the parent contract explicit:
- Either the Overview renders only once a summary exists, as the Steps tab (`WorkflowInvocationState.vue:482`) and Feedback (`:525`) already do, so the guard and the parameter can go.
- Or the ref is typed `Ref<StepJobSummary[] | undefined>`.

Either one changes the parent's render conditions, which is outside this branch's scope. Follow-up.

## 4. Smaller points

- **`inputError ??= e as Error`.** The cast is forced by eslint `@typescript-eslint/only-throw-error`, which rejects throwing an `unknown`. I tried `unknown` and it failed lint. Keep the cast.
- **`stepJobSummaryLookup` placement.**
  - The case for moving it: `WorkflowInvocationState/util.ts` already holds `StepJobSummary` helpers (`errorCount`, `isTerminal`), and Feedback imports from both modules.
  - The case for leaving it: the composable is the main consumer, and Feedback already imports `useInvocationGraph` from there.
  - Moving it would be churn without simplifying anything. Leave it.
- **The `rerunWhileBusy` name.** It describes the mechanism, not the guarantee ("latest wins"). Its docstring states the guarantee. Fine.
- **`updateStep`'s `JSON.stringify(graphStep.jobs)` comparison.** Base code. It runs only on steps that have a summary, and that's cheap after the lookup fix. Not this branch's problem.
- **Two `JSON.stringify` comparisons in one composable** would have suggested a missing `writeIfChanged` helper. Finding 2 removes one of them, so that's moot.

## 5. Settled earlier, not reopened

See `subagents/normal_review.md`:
- **The dead `invocationAndJobTerminal` Overview prop.** `WorkflowInvocationState.test.ts` probes it, and rewriting that probe is John's call.
- **The component-level retry watcher in `InvocationGraph.vue` vs a retry in the composable.** Moving it changes behavior for Steps and Feedback, which is out of scope.

  From a structural view the component watcher is the one remaining one-off, but it's 8 lines with a test for each polled prop.

## Looked at and fine

- **No double `fromSimple`.**
  - `loadGraph` clears `errored` on entry, so the retry watcher can't start a second `loadInvocationGraph` while one is in flight.
  - The composable's own watcher calls only `refreshSteps`, never `loadInvocationGraph`.
- **Orchestration is atomic enough.**
  - Tool-step writes in a pass are synchronous.
  - Input writes are per step and happen once.
  - A failed pass leaves the earlier state in place and retries on the next poll.
- **`WorkflowInvocationFeedback.vue`** now reuses `stepJobSummaryLookup`. It builds the lookup once per computed evaluation, not once per step.
- **`InvocationGraph.vue`** loses the poll loop, the timeout ref, `onUnmounted` and the `isTerminal` prop. That's a straight deletion.
- **Tests.**
  - The test additions are proportionate to the race and error paths they guard.
  - `describe.each` over the two load modes is justified: `stepsPopulated` sends them down different paths.
- **Selenium.**
  - The file-local `invocation_expand_step` helper removes three copies of the same click-and-wait pair.
  - The new selector follows the existing `step_*` naming.

</details>
