# Failed store loads show `Error: ` before the server message, and `catch` blocks waiting on them never run

When a cached store fetch fails, the invocation view and several Markdown elements show the stored `Error` object itself, so users read `Error: History is not accessible to the current user` instead of the server's message.

When a load fails on current `dev` (20f365a2654), for example opening a private invocation or dataset of another user:

| Where | Request fails with | Users see |
| --- | --- | --- |
| Invocation view (`WorkflowInvocationState.vue`) | 403 `History is not accessible to the current user` | `Error: History is not accessible to the current user` ❌ |
| Markdown dataset attribute (`HistoryDatasetDetails.vue`) | 403 `HistoryDatasetAssociation is not accessible by user` | `Error: HistoryDatasetAssociation is not accessible by user` ❌ |
| Markdown invocation directives (`MarkdownGalaxy.vue`, `MarkdownVisualization.vue`) | any | `Error: …` ❌ (code read) |
| Markdown dataset display (`HistoryDatasetDisplay.vue`, metadata and content errors) | any | `Error: …` ❌ (code read) |
| Rerun, collection editor, dataset view and popover, job-creating views | any | the message alone ✅ (code read) |

Rows without "(code read)" are reproduced in the vitests below. "(code read)" rows were checked in the template only: the ❌ ones bind the same raw error, the ✅ one converts it first.

The invocation view was supposed to show the message. Its own error handling never runs:

```ts
// WorkflowInvocationState.vue
try {
    await invocationStore.fetchInvocationById({ id }); // resolves undefined on failure
    ...
} catch (e) {
    errorMessage.value = errorMessageAsString(e); // never reached
}
```

| Caller waiting for a `fetchXById` to throw | What it means to do | On `dev` |
| --- | --- | --- |
| `WorkflowInvocationState.vue` (`watch` on `invocationId`) | show `errorMessageAsString(e)` | dead. The fallback alert below it shows the raw `Error` (first table row). |
| `composables/fetch.ts` `useJobWatcher` | set `jobRequestError` | dead since it was added in 🔀 #19305. `jobRequestError` stays `undefined` (third vitest), so `useFetchJobMonitor().fetchError` never includes a failed job request. From the code, `FetchLanding` would keep showing "Importing data" while the watcher re-polls. |

<details><summary>Why</summary>

`useKeyedCache.fetchItemById` (`client/src/composables/keyedCache.ts`) catches every fetch error, stores it in `loadingErrors`, and resolves `undefined`. Callers read the stored `Error` through `getItemLoadError`, which each store renames: `getInvocationLoadError`, `getDatasetError`, `getJobLoadError`, and so on.

The fetch handlers throw `ApiError` (`rethrowSimpleWithStatus`). Binding one in a template as `{{ error }}` goes through Vue's `toDisplayString`, which calls `String(error)`. `Error.prototype.toString` then puts `Error: ` in front of the message. Every consumer that converts the error first, with `errorMessageAsString(err)` or `err.message`, shows the message cleanly. The ❌ rows in the first table bind the error as is.

How the invocation view ended up like this:

- 🔀 #18726 added the `try`/`catch` and the `errorMessage` alert. At the time, `fetchItemById` re-threw. 🔀 #18730 moved them into the `watch` on `invocationId`.
- 🔀 #18756 made `useKeyedCache` catch errors and store them, which left that `catch` dead.
- 🔀 #22873 added a second alert, on `getInvocationLoadError`, to show the failure, and bound the stored `Error` directly.

The existing test, `WorkflowInvocationState.test.ts` ("errored invocation fetches are handled correctly"), mocks `fetchInvocationById` to throw. The real store never does that, so the test passes against a path production never takes.

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Run with `pnpm exec vitest run <file>` under the node version in `client/.node_version`. Each test uses the real store and a mocked API response.

`client/src/components/WorkflowInvocationState/WorkflowInvocationStateLoadError.test.ts`. The first test records current store behaviour and passes on dev. The second test fails.

```ts
import { getLocalVue, suppressDebugConsole } from "@tests/vitest/helpers";
import { shallowMount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, expect, it, vi } from "vitest";

import { useServerMock } from "@/api/client/__mocks__";
import { useInvocationStore } from "@/stores/invocationStore";

import WorkflowInvocationState from "./WorkflowInvocationState.vue";

vi.mock("vue-router", async (importOriginal) => ({
    ...((await importOriginal()) as object),
    useRoute: vi.fn(() => ({})),
}));

const { server, http } = useServerMock();

beforeEach(() => {
    suppressDebugConsole();
    setActivePinia(createPinia());
    server.use(
        http.get("/api/invocations/{invocation_id}", ({ response }) =>
            response("4XX").json({ err_msg: "History is not accessible to the current user", err_code: 403002 }, { status: 403 }),
        ),
    );
});

it("store fetch resolves on failure, so a caller's catch never runs", async () => {
    const store = useInvocationStore();
    await expect(store.fetchInvocationById({ id: "someone-elses" })).resolves.toBeUndefined();
    expect(store.getInvocationLoadError("someone-elses")?.message).toBe("History is not accessible to the current user");
});

it("shows a failed invocation load without the `Error: ` prefix", async () => {
    const wrapper = shallowMount(WorkflowInvocationState as object, {
        props: { invocationId: "someone-elses" },
        global: getLocalVue(),
    });
    await flushPromises();

    const alert = wrapper.find("g-alert-stub");
    expect(alert.attributes("variant")).toBe("danger");
    expect(alert.text()).toBe("History is not accessible to the current user"); // fails on dev: "Error: History is not accessible to the current user"
});
```

`client/src/components/Markdown/Sections/Elements/HistoryDatasetDetailsLoadError.test.ts`, which fails on dev:

```ts
import { getLocalVue, suppressDebugConsole } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { expect, it } from "vitest";

import { useServerMock } from "@/api/client/__mocks__";

import HistoryDatasetDetails from "./HistoryDatasetDetails.vue";

const { server, http } = useServerMock();

it("shows a failed dataset load without the `Error: ` prefix", async () => {
    suppressDebugConsole();
    setActivePinia(createPinia());
    server.use(
        http.get("/api/datasets/{dataset_id}", ({ response }) =>
            response("4XX").json({ err_msg: "HistoryDatasetAssociation is not accessible by user", err_code: 403002 }, { status: 403 }),
        ),
    );
    const wrapper = mount(HistoryDatasetDetails as object, {
        props: { datasetId: "someone-elses", name: "history_dataset_name" },
        global: getLocalVue(),
    });
    await flushPromises();
    expect(wrapper.text()).toBe("HistoryDatasetAssociation is not accessible by user"); // fails on dev: "Error: HistoryDatasetAssociation is not accessible by user"
});
```

`client/src/composables/fetchJobWatcherError.test.ts`, which fails on dev:

```ts
import { suppressDebugConsole } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { expect, it } from "vitest";
import { defineComponent, ref } from "vue";

import { useServerMock } from "@/api/client/__mocks__";
import { useJobWatcher } from "@/composables/fetch";
import { useJobStore } from "@/stores/jobStore";

const { server, http } = useServerMock();

it("surfaces a failed job request", async () => {
    suppressDebugConsole();
    setActivePinia(createPinia());
    server.use(
        http.get("/api/jobs/{job_id}", ({ response }) =>
            response("4XX").json({ err_msg: "Job not found.", err_code: 404001 }, { status: 404 }),
        ),
    );
    let watcher: ReturnType<typeof useJobWatcher> | undefined;
    const wrapper = mount(
        defineComponent({
            setup() {
                watcher = useJobWatcher(ref("missing-job"));
                return () => null;
            },
        }),
    );
    await flushPromises();
    expect(useJobStore().getJobLoadError("missing-job")?.message).toBe("Job not found."); // the store has it
    expect(watcher!.jobRequestError.value).toBe("Error requesting job: Job not found."); // fails on dev: undefined
    wrapper.unmount();
});
```

</details>

## Context

Bug found while converting the WorkflowInvocationState tests to Storybook stories on 🌿 [`vitest_stories`](https://github.com/jmchilton/galaxy/tree/vitest_stories). The dead `catch` dates from 🔀 #18756, which made `useKeyedCache` store fetch errors instead of re-throwing them. The `Error: ` text comes from 🔀 #22873, whose fallback alert binds the stored error. Related to 🎯 #21886, another consistency gap across `useKeyedCache` stores (retry handling).

## Proposed Approach

Add a `getItemLoadErrorMessage` getter to `useKeyedCache` that returns `errorMessageAsString` of the stored error, or `null`. Have the stores re-export it next to their existing error getters, and switch the raw-binding components to it. Keep the stored `Error` objects as they are, because retry gating needs `ApiError.status`. Document on `fetchItemById` that it resolves `undefined` on failure and never rejects. Then replace the two dead `catch` blocks with reads of the stored error.

<details><summary>Approach details</summary>

- `keyedCache.ts`: add `getItemLoadErrorMessage = computed(() => (id) => loadingErrors.value[id] ? errorMessageAsString(loadingErrors.value[id]) : null)`, and add JSDoc on `fetchItemById` about the resolve-on-failure contract.
- Stores: export `getInvocationLoadErrorMessage`, `getDatasetErrorMessage`, and the text-content store's `getItemLoadErrorMessage`. Switch `WorkflowInvocationState.vue`, `MarkdownGalaxy.vue`, `MarkdownVisualization.vue`, `HistoryDatasetDetails.vue` and `HistoryDatasetDisplay.vue` to them. The consumers that already call `errorMessageAsString` (`WorkflowRerun.vue`, `CollectionEditView.vue`, `datasetCollections.ts`, `useCreatingJob.ts`) can move over too, which is optional.
- `WorkflowInvocationState.vue`: drop the `errorMessage` ref, its `catch`, and its alert. The store-error alert, which now shows the message, covers the failure.
- `composables/fetch.ts` `useJobWatcher`: derive `jobRequestError` from `getJobLoadError(jobId)` instead of a `catch`. Open 🔀 #23463 edits `useJobWatcher` but keeps the `catch`, so whichever lands second should account for the other.
- Tests, red first: the three vitests above. Rewrite the existing "errored invocation fetches are handled correctly" case in `WorkflowInvocationState.test.ts` so the failure comes through the store's load error (or `useServerMock`) rather than a mocked `fetchInvocationById` that throws. Keep its assertions. Extend `keyedCache.test.ts` to check that a failed fetch resolves `undefined` and that `getItemLoadErrorMessage` returns the bare message.

</details>

## Alternative Approaches

Wrapping each template binding in `errorMessageAsString` fixes today's sites, but the raw getter stays the obvious thing to bind, and five components already made that mistake. Storing strings in the cache, or making `fetchItemById` reject, each breaks callers that work today.

<details><summary>Alternatives In Detail</summary>

### Alternative: Fix each call site

<details><summary>Description</summary>

#### Details

Change `{{ err }}` to `{{ errorMessageAsString(err) }}` in the five components, and leave `useKeyedCache` alone.

#### Why the proposed approach is preferred

It fixes the symptom but not its source. Every new consumer still gets an `Error` object from the getter it is most likely to reach for, and nothing in the cache steers it toward the message. A getter that returns the message makes the right choice the easy one.

</details>

### Alternative: Store error messages as strings in `loadingErrors`

<details><summary>Description</summary>

#### Details

In `fetchItemById`'s `catch`, store `errorMessageAsString(error)` instead of the `Error`, so every getter returns a string.

#### Why the proposed approach is preferred

`getItemById` decides whether to retry with `isRetryableApiError(existingError)`. That checks `instanceof ApiError` and reads `.status`, which is the gating added in 🔀 #21881. Strings would quietly turn retries off. `DatasetView.vue` and `DatasetPopoverLink.vue` also read `.message` off the stored error.

</details>

### Alternative: Make `fetchItemById` re-throw after storing the error

<details><summary>Description</summary>

#### Details

Keep storing the error, then re-throw it, so `try`/`catch` callers work as written.

#### Why the proposed approach is preferred

`getItemById` calls `fetchItemById` without awaiting it, so every failed lazy read would become an unhandled rejection. Several callers also await it with no `catch` (`MarkdownDefault.vue` and the `invocationStore` metrics wrapper). Behaviour across all nine `useKeyedCache` stores would change just to revive two `catch` blocks.

</details>

</details>
