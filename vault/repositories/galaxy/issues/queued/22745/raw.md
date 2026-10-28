# Invocation graph does O(steps × summary) work every 3 s — likely contributor to #22745 freezes

Filed from: galaxy-brain vault session 2026-10-14, while re-verifying `Component - Invocation Graph View` against dev `c63ffc2ccae`. Found by reading code. **Not profiled.** The first job is to confirm with a browser performance profile on a big invocation.

Related open issue: **#22745** "Workflow invocation graph freezes mid run" (nilchia). A 171-step workflow on usegalaxy.eu freezes on 26.0 and 26.1, Firefox worse than Chrome, and freezes on zoom/pan. Repro invocation: https://usegalaxy.eu/workflows/invocations/ee571b2c1de38ad0; workflow: https://usegalaxy.eu/u/nilchia/w/original-galaxy-eista-spatialdata-tested. bgruening also flagged a slow 171-step report. This draft should probably be a **comment on #22745** with the analysis, not a new issue. Let the filing agent decide.

## Hot spots (code reading)

1. **`JSON.stringify` inside the per-step loop.**
   - `client/src/composables/useInvocationGraph.ts:191-230`: `updateSteps` loops over every workflow step.
   - Inside the loop (`:206-208`), the condition `updateNonInputStep = !stepsPopulated.value || JSON.stringify(stepsJobsSummary) !== JSON.stringify(lastStepsJobsSummary.value)` serializes the **whole** step-jobs summary twice **per step**.
   - The loop is loop-invariant, so it costs 171 steps × 2 × (summary size) on every 3 s tick.
   - When the summary changed, it also does a linear `stepsJobsSummary.find(...)` per step (`:213-219`), which is O(n²) in steps.
   - `:278` does another `JSON.stringify` pair per step for `graphStep.jobs`.
2. **Redundant poll loop.**
   - `WorkflowInvocationState.vue:285-294` already polls `stepsJobsSummary` every 3 s.
   - `InvocationGraph.vue:155-163` runs a second 3 s `setTimeout` loop calling `loadInvocationGraph()`, which re-runs (1) on data that may not have changed. The two loops aren't phase-aligned.
3. **Reactive churn.**
   - `steps` is a deep `ref`. Every `graphStep.state`/`headerClass`/`jobs` mutation triggers reactivity in `WorkflowGraph` → every `Node.vue` → `NodeInvocationText`.
   - The minimap redraws from `headerClass` (`canvasDraw.ts:26-48`).
   - Not verified whether unchanged steps re-render. Worth checking in the Vue devtools/profiler.
4. **Per-step polling on the Steps tab.** Every mounted `WorkflowInvocationStep` polls `GET /api/invocations/steps/{id}` every 3 s until terminal (`WorkflowInvocationStep.vue:112-137`). On the Steps tab that's every step, so for 171 steps about 57 req/s. The authors anticipated this cost in a TODO at `WorkflowInvocationSteps.vue:147-152`. It's not the Overview freeze, but it's the same scaling class.
5. Freezing **on zoom/pan** specifically suggests the canvas itself (171 `Node.vue` + edges via d3-zoom) is heavy independent of polling. The issue says it gets worse mid-run, so polling + re-render likely compounds it.

## Suggested fix (incremental)

- Hoist the `JSON.stringify` comparison out of the loop: compute `summaryChanged` once per `updateSteps` call. Index `stepsJobsSummary` by id in a `Map` before the loop. Trivial and safe.
- Replace `InvocationGraph`'s own poll loop with a `watch` on `stepsJobsSummary` inside the composable. This also fixes the Steps-tab freeze in `invocation_steps_tab_states_frozen`.
- Only assign `graphStep` fields when the value actually changed (already done for `state`; not for `jobs` beyond the stringify compare).
- Then profile again: if zoom/pan is still slow, look at `WorkflowGraph`/`Node.vue` render cost for readonly invocation mode (e.g. `v-memo`, skipping terminals when `blank`).

Tests:
- **Unit:** `useInvocationGraph.test.ts`, assert that `updateSteps` with an unchanged summary doesn't touch `steps` (spy, or a watcher on `steps` with `deep` counting triggers). And a "states update when the summary ref changes" test, shared with the frozen-tab issue.
- **Perf:** no harness exists in the client. Manual profile on a synthetic 150+ step workflow, before and after (a tool-step chain generated via gxformat2).

## Scope

Large workflows (100+ steps) on the invocation Overview. IWC-scale workflows hit this.
