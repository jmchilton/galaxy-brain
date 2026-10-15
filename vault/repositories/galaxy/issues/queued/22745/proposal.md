<!-- COMMENT on #22745 -->
While an invocation runs, each 3 s refresh of the invocation graph does work that grows with the square of the step count. At 171 steps that is about 130 ms of blocked main thread per refresh.

I timed one refresh tick of `useInvocationGraph` on dev ([`c63ffc2ccae`](https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8)). The workflow was synthetic, all tool steps, with a ~15 kB jobs summary at 171 steps that was re-fetched but unchanged. The timings are from vitest on node 22 (V8, Apple M4 Pro), not from a browser. Dev is on Vue 3 and 26.0/26.1 are on Vue 2.7, so absolute numbers on the reporter's server will differ, but the shape won't.

| Steps | ms per refresh, dev | with the diff below |
| --- | --- | --- |
| 50 | 11 | 0.3 |
| 171 | 128 | 1.0 |
| 400 | 708 | 2.4 |

At 3.4× the steps the time is 11.6× (50 → 171), and at 2.3× it is 5.5× (171 → 400). Almost all of the time goes to `JSON.stringify` on the whole jobs summary, twice for every step: the loop recomputes a comparison that only needs doing once. The loop bound, `Object.keys()` on the reactive steps, is also recomputed every iteration. That is smaller (about 4 ms at 171 steps) but quadratic too.

On the same tick, nothing changed, yet every step's header gets rewritten:

| Refresh at 171 steps | Writes to the graph steps |
| --- | --- |
| Nothing changed | `headerClass` replaced on all 171 steps |
| 5 steps changed | 25 writes, all on those 5 steps |

Every node's header class reads `headerClass`, and the minimap deep-watches the steps and redraws when they change. So an idle refresh redraws all 171 node headers and the minimap. I haven't measured what that costs in a browser.

Neither cost explains the whole report. 130 ms every 3 s is a stutter, not a hang. It only happens while the invocation is running, because the refresh stops once the invocation is terminal, which matches "freezes mid run". It doesn't explain a page that needs a reload, or the freeze on zoom and pan by itself. The canvas's own cost for 171 nodes during zoom and pan still needs a browser profile on the invocation above. Both hot spots are present on `release_26.0`, `release_26.1` and `release_26.2`.

<details><summary>Where (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

```text
InvocationGraph.vue  pollInvocationGraph(): every 3 s until terminal
└── useInvocationGraph.loadInvocationGraph()
    └── updateSteps(stepsJobsSummary)
        for (i < Object.keys(steps).length)                     ← n, and O(n) per bound check
            JSON.stringify(summary) !== JSON.stringify(last)    ← 2 × O(n), same answer every step
            if changed and not an input:  summary.find(...)     ← O(n)
            else if nodeText === undefined:                     ← true for every tool step
                initializeGraphInput() → setHeaderClass()       ← new headerClass object
```

- [`InvocationGraph.vue` L155-163](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue#L155-L163) calls `loadInvocationGraph()` every 3 s until the invocation is terminal. That runs whether or not the parent's own 3 s poll has fetched a new summary.
- [`useInvocationGraph.ts` L191](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L191) loops over the steps, re-reading `Object.keys(fullSteps).length` on every iteration. Inside the loop, [L206-208](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L206-L208) compares the whole summary with the previous one by serializing both. The summary lives in a reactive store, so serializing it also goes through Vue's proxies.
- [L222-223](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L222-L223): when the summary hasn't changed, any step without `nodeText` takes the input branch. Only input steps ever get `nodeText`, so every tool step goes there on every unchanged refresh. `initializeGraphInput` finds no input for it and calls `setHeaderClass`, which assigns a new `headerClass` object ([L339-341](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L339-L341)).
- Consumers of `headerClass`: [`Node.vue` L297-302](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Editor/Node.vue#L297-L302) for the node header, and [`WorkflowMinimap.vue` L68-78](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Editor/WorkflowMinimap.vue#L68-L78) for the minimap. The minimap deep-watches the steps, then recomputes its bounds and redraws ([`canvasDraw.ts` L34-36](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Editor/modules/canvasDraw.ts#L34-L36) colors each step from `headerClass`).
- The in-loop comparison dates from 🔀 #18663 (24.1). The input branch dates from 🔀 #18615.

</details>

<details><summary>Benchmark (vitest, against stock dev)</summary>

Save as `client/src/composables/useInvocationGraph.bench.test.ts`, then run:

```sh
cd client && pnpm exec vitest run src/composables/useInvocationGraph.bench.test.ts
```

```ts
import { createTestingPinia } from "@pinia/testing";
import { setActivePinia } from "pinia";
import { it, vi } from "vitest";
import { computed, ref, watch } from "vue";

import type { StepJobSummary } from "@/api/invocations";

import { useInvocationGraph } from "./useInvocationGraph";

const wf = { n: 0 };
vi.mock("@/stores/workflowStore", () => ({
    useWorkflowStore: () => ({
        getFullWorkflowCached: async () => ({
            steps: Object.fromEntries([...Array(wf.n).keys()].map((i) => [i, { id: i, type: "tool", position: {} }])),
        }),
    }),
}));
vi.mock("@/components/Workflow/Editor/modules/model", () => ({ fromSimple: vi.fn() }));
vi.mock("./workflowStores", () => ({ provideScopedWorkflowStores: vi.fn() }));

const id = (i: number) => `f2db41e1${i.toString(16).padStart(8, "0")}`; // 16 hex chars, like an encoded id
// one summary per step, ~15 kB of JSON at 171 steps; `running` steps get a different `states`
const summary = (n: number, running: number[] = []) =>
    [...Array(n).keys()].map((i) => ({
        id: id(i),
        model: "Job",
        populated_state: "ok",
        states: running.includes(i) ? { ok: 7, running: 3, queued: 2 } : { ok: 12 },
    })) as StepJobSummary[];

async function setup(n: number) {
    wf.n = n;
    // like invocationStore: a deep ref read through a computed
    const store = ref({ inv: summary(n) });
    const steps = Object.fromEntries([...Array(n).keys()].map((i) => [i, { job_id: id(i), state: "scheduled" }]));
    const invocation = ref({ id: "inv", steps, inputs: {}, input_step_parameters: {} } as any);
    const g = useInvocationGraph(invocation as any, computed(() => store.value.inv), ref("wf"), ref(0));
    await g.loadInvocationGraph(); // first load
    return { g, store };
}

it("cost of one InvocationGraph poll tick", async () => {
    setActivePinia(createTestingPinia({ createSpy: vi.fn }));
    const out = ["", "| steps | ms per tick (median of 25) |", "| --- | --- |"];
    for (const n of [50, 171, 400]) {
        const { g, store } = await setup(n);
        const times = [];
        for (let r = 0; r < 28; r++) {
            store.value.inv = summary(n); // re-fetched, nothing changed
            const t0 = performance.now();
            await g.loadInvocationGraph();
            if (r >= 3) {
                times.push(performance.now() - t0);
            }
        }
        out.push(`| ${n} | ${times.sort((a, b) => a - b)[12]!.toFixed(1)} |`);
    }
    const { g, store } = await setup(171);
    const writes: Record<string, number> = {};
    watch(g.steps, () => {}, {
        deep: true,
        flush: "sync",
        onTrigger: (e) => (writes[String(e.key)] = (writes[String(e.key)] ?? 0) + 1),
    });
    store.value.inv = summary(171);
    await g.loadInvocationGraph();
    out.push(`171 steps, nothing changed: ${JSON.stringify(writes)}`);
    for (const k of Object.keys(writes)) {
        delete writes[k];
    }
    store.value.inv = summary(171, [1, 2, 3, 4, 5]);
    await g.loadInvocationGraph();
    out.push(`171 steps, 5 steps changed: ${JSON.stringify(writes)}`);
    process.stdout.write(out.join("\n") + "\n");
}, 120000);
```

Output on dev:

```text
| steps | ms per tick (median of 25) |
| --- | --- |
| 50 | 11.0 |
| 171 | 127.5 |
| 400 | 707.6 |
171 steps, nothing changed: {"headerClass":171}
171 steps, 5 steps changed: {"jobs":5,"state":5,"headerClass":5,"headerIcon":5,"headerIconSpin":5}
```

With the diff below applied: `0.3 / 1.0 / 2.4` ms, and `nothing changed: {}`.

</details>

## Context

Related to 🎯 #XXXXX (Steps tab), where step headers stop updating while the invocation runs. The fix proposed there makes `useInvocationGraph` watch the jobs summary and deletes `InvocationGraph`'s own 3 s loop. It doesn't remove the cost measured here. The parent stores every fetch as a new array, so a watcher would still fire every 3 s and run the same loop. The two fixes are complementary.

## Proposed Approach

Compare the summary and count the steps once per refresh instead of once per step, and send only input steps down the input branch. Together these take the 171-step refresh from 128 ms to 1 ms, and an idle refresh then writes nothing. The existing `useInvocationGraph.test.ts` (17 tests) passes with the change. After that, profile zoom and pan on the 171-step invocation in a browser, to see how much of the freeze is left.

<details><summary>Diff</summary>

```diff
     async function updateSteps(stepsJobsSummary: StepJobSummary[]) {
         ...
+        const summaryChanged =
+            !stepsPopulated.value || JSON.stringify(stepsJobsSummary) !== JSON.stringify(lastStepsJobsSummary.value);
+        const stepCount = Object.keys(fullSteps).length;
-        for (let i = 0; i < Object.keys(fullSteps).length; i++) {
+        for (let i = 0; i < stepCount; i++) {
             ...
-            const updateNonInputStep =
-                !stepsPopulated.value ||
-                JSON.stringify(stepsJobsSummary) !== JSON.stringify(lastStepsJobsSummary.value);
+            const updateNonInputStep = summaryChanged;

             if (updateNonInputStep && !isWorkflowInput(graphStepFromWfStep.type)) {
                 ...
-            } else if (invocationStep && graphStepFromWfStep.nodeText === undefined) {
+            } else if (isWorkflowInput(graphStepFromWfStep.type) && invocationStep && graphStepFromWfStep.nodeText === undefined) {
                 await initializeGraphInput(graphStepFromWfStep, invocationStep);
```

The timed refreshes all had an unchanged summary, so the `find` never ran and the numbers come from exactly this diff. Without the `stepCount` line the 171-step refresh is about 5 ms and still quadratic. Replacing the per-step `find` with a lookup map built once only matters on refreshes where the summary changed. I didn't time that on its own.

A unit test could load once, replace the summary with an equal copy, refresh, and assert that a `deep` + `flush: "sync"` watcher on `steps` never fired. On dev that watcher fires for all 171 steps, as the benchmark output above shows.

</details>

## Alternative Approaches

Drop the whole-summary comparison and let each step decide for itself. `updateStep` already skips writes when a step's `state` or `jobs` are unchanged, so that would only need a lookup map in place of the per-step `find`. It is a slightly larger change for about the same speed. Deleting `InvocationGraph`'s poll loop, on its own, would not change the cost of a refresh.

<details><summary>Alternatives in detail</summary>

### Alternative: Per-step comparison only

<details><summary>Description</summary>

Remove `lastStepsJobsSummary` and the whole-summary comparison. Index the summary by id once per refresh and call `updateStep` for every non-input step. Its existing guards ([L278](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L278), [L310](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L310)) keep unchanged steps from being written.

#### Why the proposed approach is preferred

It is the smallest diff to review and backport to 26.x, and it keeps today's behaviour exactly. The per-step version is a reasonable follow-up.

</details>

### Alternative: Only remove the duplicate loop

<details><summary>Description</summary>

Drive the graph from the parent's poll with a watcher, as the Steps tab fix does, and delete `pollInvocationGraph`.

#### Why the proposed approach is preferred

Every fetch produces a new summary array, so the watcher fires every 3 s and runs the same O(n²) loop. It fixes stale states, not cost.

</details>

</details>
