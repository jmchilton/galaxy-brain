Run via claude-opus-5-5 at high effort.

# Performance challenges debrief: invocation_graph_output_previews

This branch changes only the client. It adds no SQL, ORM or API changes, so the review covered client polling and fetching: the per-poll work in `useInvocationGraph`, the step-detail fetches in `useStepOutputItems`, and the dataset and collection loads in `InvocationOutputPreview` and `InvocationStepOutputsPopover`. I measured against the running Galaxy (port 8092, through Vite on 5182) with a fresh user. Each finding below says whether it is measured or inferred from the code.

## Fixes (folded into the existing commits)

| Commit | Was | What changed |
|---|---|---|
| `bfebdc89f3d` | `94c3576a979` | `updateOutputItems` reads the raw invocation and step through `toRaw`, not through their reactive proxies. |
| `fed2fba09b6` | `a5abc580b62` | The popover keeps its previews mounted between hovers until the step's state changes while the popover is hidden. The dataset preview no longer reloads at each state a running step passes through. Two new Vitest tests cover this. |
| `ba71db68c7f` | `53652c7aa3a` | The `graph_step_outputs*` and `graph_step_output` selectors now match only the open popover (`[data-open="true"]`), because closed popovers keep their previews, hidden. |

### 1. Hovering again refetched the whole collection each time (measured, fixed)

`InvocationStepOutputsPopover` rendered its content with `v-if="show"`, so every hover remounted every preview. `CollectionDisplay`, the Markdown collection display, has no cache. On mount it calls `GET /api/dataset_collections/{id}`, which returns every element with its HDA summary and peek, and then renders a tree node for each element.

Server cost, measured with the API on this dev Galaxy (sqlite, median of 5):

| Collection | Response | Server time |
|---|---|---|
| list of 100 | 124 KB | 231 ms |
| list of 500 | 621 KB | 914 ms |

That's about 1.24 KB and 1.8 ms per element, and it grows linearly, so a 10,000-element list works out to about 12 MB and about 18 s per request (extrapolated, not measured).

In the browser (headless Chromium driven by Playwright), I hovered a workflow input that is a 500-element list three times:

| | Hover 1 | Hover 2 | Hover 3 |
|---|---|---|---|
| Before: requests | 1 × 621 KB | 1 × 621 KB | 1 × 621 KB |
| Before: until 500 elements shown | 2.6 s | 2.6 s | 2.4 s |
| After: requests | 1 × 621 KB | 0 | 0 |
| After: until 500 elements shown | 3.1 s | 0.50 s | 0.56 s |

All times include GPopover's 300 ms open delay.

The fix is a `previewsMounted` flag. The previews mount on the first hover, so nothing loads before it, which matters because GPopover renders its slot even while hidden. They stay mounted, hidden, between hovers. If the step's state changes while the popover is hidden, they unmount, so the next hover reloads them through the existing freshness logic. Because of that, a hidden popover makes no requests in the background. The new test "keeps its previews between hovers until the step's state changes" checks that a second hover makes no request, that a state change while hidden makes none, and that the next hover makes one. It fails if the content goes back to `v-if="show"`, and it also fails if a hidden popover keeps its previews after a state change.

The same fix also covers costs I didn't measure separately. For HTML outputs, each hover reloaded the `display?preview=True` iframe. For large tabular outputs, each hover re-parsed the up-to-1 MB text: `getItems` takes about 28 ms per call on 1 MB (about 22k rows, measured in Vitest), and `HistoryDatasetDisplay`'s template calls it twice per render.

Trade-off: a popover that has been hovered keeps its DOM while hidden, including the full collection tree. Someone who hovers hundreds of finished steps keeps hundreds of hidden previews in memory. I judged that better than a 600 KB-plus request on every hover. Bounding the tree is follow-up B.

### 2. Dataset previews reloaded at every non-terminal state (code-inferred, fixed)

While the popover was open on a running step, `InvocationOutputPreview`'s state watch called `fetchDataset` and `get_content_as_text` (up to 1 MB) on every state change. That included new → queued → running, when the preview shows only the "isn't ready" placeholder. It now records the state but reloads only once the step is ready. The new test "reloads a dataset once its step is ready, not at each state its jobs pass through" (new → queued → running → ok) expects one details request and one content request. Before the fix, it made three of each.

### 3. Per-poll cost of the output items (measured, fixed)

`updateOutputItems` runs for every step on every invocation or job-summary poll. I benchmarked it in a throwaway Vitest file, not committed: 2,000 tool steps, each with two workflow outputs, 60 polls of an unchanged invocation, three runs each.

| | Per poll (`updateSteps` plus building the fixture) |
|---|---|
| Without `updateOutputItems` | 57–67 ms |
| Branch as it was | 127–132 ms |
| With `toRaw` | 71–89 ms |

So the branch's added cost per poll fell from about 65 ms to about 10 ms at 2,000 steps (about 5 µs per step). At 500 steps it was already small (about 25 ms per poll in total). Most of the cost came from reading through the reactive proxies. Replacing the `JSON.stringify` comparison with a field-by-field check made no measurable difference, so I kept `JSON.stringify`, which matches the file's existing `jobs` comparison.

On a poll with nothing new, the step's `outputItems` object is not replaced. I first added a test for that, then dropped it: the existing "writes nothing to the steps when the polled data is unchanged" tests already fail if `outputItems` is reassigned on every poll (I checked this by mutation).

## Findings left for the coordinator (not fixed here)

### A. The graph shows a mapped-over step as `ok` while its jobs are only new or queued (measured; existing on dev)

`updateStep` derives the step's state from its job states. If no job is running, errored or paused, and the jobs are not all in one state, it falls back to `populated_state`. For implicit collection jobs, `populated_state` becomes `ok` as soon as all the jobs exist. Polling `step_jobs_summary` during a 500-element map-over gave:

- `{'new': 249, 'queued': 251}` → `ok`
- `{'new': 494, 'queued': 6}` → `ok`
- then `{'new': 178, 'queued': 321, 'running': 1}` → `running`

A screenshot of the graph shows `head` with a green check above "143 jobs new / 357 jobs queued". The bug predates this branch, which uses the state in two ways:

- `notReady` is false, so the preview loads a collection that is still filling.
- Each `running` ↔ `ok` flip counts as a state change, so the open popover remounts the collection display and refetches the whole collection. This happens only while the popover is open, and it's bounded by the poll rate, but for a large map-over each refetch is the large request from fix 1.

This should be fixed in the state derivation, not in the preview: for example, treat any non-terminal job as non-terminal for the step. That's a separate change with its own review.

### B. A large collection preview is unbounded on first load

Fix 1 removes the repeated fetch, but the first hover still downloads every element and renders all of them, with peeks, in a popover about 15rem tall. Stage 2 will embed workflow outputs in the graph through the same preview, so each collection workflow output would then pay this cost on every load of the graph page. Two possible fixes:

- Make `CollectionDisplay` page its elements through `GET /api/dataset_collections/{hdca_id}/contents/{parent_id}?limit=&offset=`, which `collectionElementsStore` already uses.
- Show a summary (`element_count`, which `view=collection` provides cheaply) above a threshold.

Either one changes the Markdown display that reports and Pages share, so I didn't do it on this branch.

I also considered switching `CollectionDisplay` to the existing `datasetCollectionStore` cache, as `HistoryDatasetDisplay` uses `datasetStore`. I rejected it for this branch. History polling replaces cached details with summaries (`saveCollections`), so a report showing a collection that is still filling would refetch the whole collection on every history poll that touches it.

### C. Step details carry every job (measured)

`GET /api/invocations/steps/{id}` returns `jobs`, one row of about 240 bytes per job (23.7 KB for a 100-job map-over). That extrapolates to about 2.4 MB at 10,000 jobs. The popover fetches it only to read output ids, only when some output isn't a workflow output, and at most once per state change while hovered. The step card shares the same cache. A server-side option to leave out `jobs` would make this cheap, but it's out of scope for a client-only branch.

### D. Request volume on first hover (code-inferred)

A first hover costs:

- one step-details request, only if some output isn't listed;
- two requests per dataset output (details and text content, up to 1 MB);
- one request per collection output;
- one datatypes-mapper load, once per page.

The client rate limiter allows 100 requests per 3 s across the whole app. A tool with 20 dataset outputs would use about 41 of them on its first hover, alongside the invocation view's own polling. That's within the limit, but it isn't negligible. The 300 ms open delay already keeps a quick pass across the graph from opening any popover. I didn't measure a many-output step.

## Not a problem

- `useStepOutputItems` does not double-fetch on the first hover. The `items` read and `load()` both call `fetchItemById`, and the keyed cache deduplicates the in-flight request. A popover whose outputs are all workflow outputs fetches nothing (covered by an existing test).
- The popover adds no polling of its own. Freshness comes from the parent's existing invocation and job-summary polls.
- `loadedUnderState` is a module-level map from dataset id to a state string. It grows by one small entry per dataset previewed in the session.

## Verification

- Vitest (node 22.20.0) on `useInvocationGraph.test.ts`, `components/Workflow/`, `components/Markdown` and `components/WorkflowInvocationState`: 102 files, 824 tests, all pass.
- Mutation checks: each fix, reverted on its own, fails its new test, and the `outputItems` reassignment mutation fails the existing unchanged-poll tests.
- eslint reports no errors (the two `any` warnings already exist on dev). prettier is clean. `vue-tsc --noEmit` is clean.
- Selenium `test_hover_previews_step_outputs` (Playwright backend) passes, in 110 s. It hovers `head_table` and then `cat_table`, which both have an `out_file1` output, so it relies on the new open-popover selector scoping.
- Measurement data: fresh user `perf…@example.org` on the 8092 Galaxy, with lists of 100, 500 and 2000 elements (the 2000-element list populated only 1000), a 5 MB tabular dataset, and map-over invocations. I cancelled the 500-element map-over and its jobs after they blocked the E2E job queue.
