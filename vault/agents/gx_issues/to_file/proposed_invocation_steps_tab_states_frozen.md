# Invocation Steps tab: step state headers stop updating while the invocation runs

If you open a running invocation's **Steps** tab and stay there, each step's state label, color and icon keep showing whatever they were when the tab loaded.

What a step header shows while the page's 3 s poll brings in new job states (component test against dev, test below):

| Poll | Jobs for the step | Steps tab header | Overview graph node |
| --- | --- | --- | --- |
| tab opened | `queued: 1` | 🕒 queued | queued color |
| +3 s | `running: 1` | 🕒 queued ❌ | running color ✅ |
| +6 s | `ok: 1` | 🕒 queued ❌ | ok color ✅ |

❌ = the header no longer matches the step's jobs; ✅ = it follows them.

The "Overview graph node" column is from reading the code, not the test: the node's header color and job counts come from the same graph step. The Overview runs its own 3 s loop that re-derives the states. The headers only catch up when you leave the Steps tab and come back, or reload the page. Meanwhile an expanded step's job list keeps updating, because each step polls its own details, so a header can say "queued" above a job that has already finished.

<details><summary>Why (dev <a href="https://github.com/galaxyproject/galaxy/commit/c63ffc2ccae4875976677b468dce3ac3e1ba74d8"><code>c63ffc2ccae</code></a>)</summary>

```text
WorkflowInvocationState                     polls step_jobs_summary every 3 s  ✅
├── Overview → InvocationGraph
│     useInvocationGraph(…, stepsJobsSummary)
│     pollInvocationGraph(): loadInvocationGraph() every 3 s       → states re-derived ✅
└── Steps → WorkflowInvocationSteps
      useInvocationGraph(…, stepsJobsSummary)
      watch(workflowId): loadInvocationGraph(false)  (runs once)  → states frozen ❌
      └── WorkflowInvocationStep  :class="graphStep.headerClass"
          └── WorkflowInvocationStepHeader  graphStep.state / headerIcon
```

- [`WorkflowInvocationState.vue` L285-294](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue#L285-L294) fetches the step jobs summary every 3 s and passes it to the Steps tab as a prop ([L481-485](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/WorkflowInvocationState/WorkflowInvocationState.vue#L481-L485)).
- [`useInvocationGraph.ts`](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L137-L314) sets `state`, `headerClass` and `headerIcon` only inside `loadInvocationGraph()` → `updateSteps()` → `updateStep()`. The composable doesn't import `watch`, so nothing reacts to the `stepsJobsSummary` or `invocation` refs it is given.
- The Overview's [`InvocationGraph.vue` L155-163](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Invocation/Graph/InvocationGraph.vue#L155-L163) calls `loadInvocationGraph()` (through `loadGraph()`) in its own 3 s loop until the invocation is terminal.
- [`WorkflowInvocationSteps.vue` L100-113](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue#L100-L113) calls `loadInvocationGraph(false)` from a watcher on the workflow id, so it runs once. Nothing remounts the tab while the invocation runs.
- The header reads those frozen fields: [`WorkflowInvocationStep.vue` L208](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue#L208) and [`WorkflowInvocationStepHeader.vue` L61-67](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/WorkflowInvocationState/WorkflowInvocationStepHeader.vue#L61-L67). The job list under an expanded step comes from a separate per-step poll ([L132-137](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/WorkflowInvocationState/WorkflowInvocationStep.vue#L132-L137)), so it keeps updating.

</details>

<details><summary>Failing test (vitest, red on dev)</summary>

The test mounts `WorkflowInvocationSteps` with the real `useInvocationGraph`, `WorkflowInvocationStep` and `WorkflowInvocationStepHeader`. It changes the `stepsJobsSummary` prop the way the parent's poll does and checks the step header. It fails with:

```text
AssertionError: expected [ 'portlet-header', …(4) ] to include 'header-ok'
```

When the class and text are logged at each step, the header stays `header-queued` / "queued" through the `running` and `ok` updates.

```ts
import { createTestingPinia } from "@pinia/testing";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { expect, it, vi } from "vitest";
import { ref } from "vue";

import WorkflowInvocationSteps from "./WorkflowInvocationSteps.vue";

const toolStep = { id: 0, type: "tool", tool_id: "cat1", annotation: "", input_steps: {}, inputs: [], outputs: [] };

vi.mock("@/composables/useWorkflowInstance", () => ({
    useWorkflowInstance: () => ({
        workflow: ref({ id: "wf1", version: 0, steps: { 0: toolStep } }),
        loading: ref(false),
        error: ref(null),
    }),
}));
vi.mock("@/stores/workflowStore", () => ({
    useWorkflowStore: () => ({
        getFullWorkflowCached: vi.fn().mockResolvedValue({ steps: { 0: toolStep } }),
        getStoredWorkflowByInstanceId: vi.fn(),
    }),
}));
// Per-step polling is not under test: report no step details so nothing polls.
vi.mock("@/stores/invocationStore", () => ({
    useInvocationStore: () => ({
        getInvocationStepById: () => null,
        isLoadingInvocationStep: () => false,
        fetchInvocationStepById: vi.fn(),
    }),
}));
vi.mock("@/composables/datatypesMapper", () => ({ useDatatypesMapper: () => ({ datatypes: ref([]) }) }));
vi.mock("@/components/Workflow/Editor/modules/model", () => ({ fromSimple: vi.fn() }));
vi.mock("@/composables/workflowStores", () => ({ provideScopedWorkflowStores: vi.fn() }));

const invocation = {
    id: "inv1",
    workflow_id: "wf1",
    steps: [{ id: "is0", job_id: "j1", workflow_step_label: null, state: "scheduled" }],
    inputs: {},
    input_step_parameters: {},
};

function summary(states: Record<string, number>, populated_state: string) {
    return [{ id: "j1", model: "Job", states, populated_state }];
}

it("step header follows the polled stepsJobsSummary prop", async () => {
    const wrapper = mount(WorkflowInvocationSteps as object, {
        propsData: { invocation, stepsJobsSummary: summary({ queued: 1 }, "scheduled") },
        localVue: getLocalVue(),
        pinia: createTestingPinia({ createSpy: vi.fn }),
        stubs: { DelayedInput: true, ToolLinkPopover: true, WorkflowStepIcon: true, WorkflowStepTitle: true },
    });
    await flushPromises();
    const header = () => wrapper.find("[data-step='0'] .portlet-header");
    expect(header().classes()).toContain("header-queued");

    // what WorkflowInvocationState's 3 s poll does: a new summary arrives as a new prop value
    await wrapper.setProps({ stepsJobsSummary: summary({ running: 1 }, "scheduled") });
    await flushPromises();
    await wrapper.setProps({ stepsJobsSummary: summary({ ok: 1 }, "ok") });
    await flushPromises();

    expect(header().classes()).toContain("header-ok"); // fails: still header-queued
    expect(header().text()).toContain("successful");
});
```

As a control, the same test passes when the composable is wrapped so that it re-runs `loadInvocationGraph(false)` whenever the summary ref changes.

</details>

## Context

A regression from 🔀 #20719 (routable invocation tabs, 25.1). Before it, the Steps tab read graph steps from a shared store entry. The Overview tab was a non-lazy tab that stayed mounted next to the Steps tab, and its graph's poll loop kept that entry up to date. #20719 gave the Steps tab its own `useInvocationGraph` instance but no way to refresh it. The Overview's poll loop dates from 🔀 #17413. Related to 🎯 #22745 (invocation graph freezes on large workflows) only through the proposed fix, which also removes the graph's own 3 s loop on top of the page's poll. It is not claimed to fix that freeze.

## Proposed Approach

Make `useInvocationGraph` follow its inputs. Add a watcher on the `invocation` and `stepsJobsSummary` refs that calls `updateSteps()` once the workflow has loaded, then delete the Overview's own `pollInvocationGraph` loop, since it only re-processes data the parent already polls. The Steps tab and the Overview graph then both update from the parent's single poll.

<details><summary>Approach details</summary>

- **Don't re-run `loadInvocationGraph()` from the watcher.** It sets `loading` to `true`. The Steps tab hides its whole step list while `loading` is `true` ([`WorkflowInvocationSteps.vue` L117](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/components/Workflow/Invocation/Graph/WorkflowInvocationSteps.vue#L117)), so every step would unmount every 3 s. In the control test above, a step the user had expanded was collapsed after the updates. The watcher should call `updateSteps()` directly without changing `loading`, or `loadInvocationGraph()` should set `loading` only on the first load.
- **Watch `invocation` as well as the summary.** Subworkflow steps take their state from `invocation.steps[i].state`, and a step with no invocation step yet is shown as `queued`. Neither shows up in the job summary. Once the graph is on the canvas, `updateSteps()` skips non-input steps unless the summary changed ([L206-208](https://github.com/galaxyproject/galaxy/blob/c63ffc2ccae4875976677b468dce3ac3e1ba74d8/client/src/composables/useInvocationGraph.ts#L206-L208)), so that check has to count invocation changes too.
- **Overlapping updates.** `updateSteps()` awaits dataset fetches for input steps, so a new poll can arrive before the previous update finishes. Either let only the latest update run, or skip an update while one is in progress.
- **Overview.** `InvocationGraph.vue` keeps a single `loadInvocationGraph()` call when the workflow id is set and drops `pollTimeout` and `pollInvocationGraph`.
- **Tests.** The component test above (red → green). A `useInvocationGraph.test.ts` case that loads once, replaces the summary ref value (`queued` → `ok`) and asserts `steps[0].state === "ok"` without calling `loadInvocationGraph` again. A case asserting that `loading` stays `false` after the first load.

</details>

## Alternative Approaches

The smallest change is to copy the Overview's 3 s loop into `WorkflowInvocationSteps`. That adds a third timer on data the parent already fetches. As written it would also collapse expanded steps every 3 s, because `loadInvocationGraph()` toggles `loading`. Putting the reaction in the composable fixes every consumer at once and removes a loop instead of adding one.

<details><summary>Alternatives In Detail</summary>

### Alternative: Poll loop in the Steps tab

<details><summary>Description</summary>

Mirror `InvocationGraph.pollInvocationGraph` in `WorkflowInvocationSteps.vue`: call `loadInvocationGraph(false)` every 3 s until the invocation is terminal.

#### Why the proposed approach is preferred

Each consumer would keep its own timer, out of step with the parent's fetch, re-deriving states from a summary that may not have changed. `loadInvocationGraph()` would also need to stop toggling `loading`, so most of the composable change is needed anyway.

</details>

### Alternative: Restore the shared graph-steps store

<details><summary>Description</summary>

Bring back the per-invocation `graphStepsByStoreId` entry that #20719 removed, and have the Steps tab read from it.

#### Why the proposed approach is preferred

That store was only refreshed by the Overview's poll loop. With routed tabs the Overview is not mounted while the Steps tab is shown, so nothing would write to the store.

</details>

### Alternative: Derive step states with `computed`

<details><summary>Description</summary>

Turn `steps` into a `computed` built from `invocation` and `stepsJobsSummary` instead of a `ref` that is mutated.

#### Why the proposed approach is preferred

It is cleaner in principle, but input steps take their state and label from async dataset and collection fetches, and the editor canvas is loaded once from the same step objects. A watcher fixes the bug without changing how the canvas is loaded.

</details>

</details>
