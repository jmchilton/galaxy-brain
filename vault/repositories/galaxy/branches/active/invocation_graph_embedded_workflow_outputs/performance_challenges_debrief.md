Run via claude-opus-5-5 at high effort.

# Performance challenges debrief: invocation_graph_embedded_workflow_outputs

The branch changes only the client. It adds no SQL, ORM or API changes, so the review covered three things: the requests the embedded cards make, the layout runs `useEmbeddedOutputs` triggers, and how both behave during polling. I measured in headless Chromium against the running Galaxy (port 8092, through Vite on 5182) as demo@example.org. I counted requests and response bytes with Playwright, and counted layout runs and position writes with temporary instrumentation that wasn't committed. Each finding says whether it was measured or inferred from the code.

Head moves from `62299d13c17` to `d024e8c7438`. The three new commits are on top, and no existing commit was rewritten:

| Commit | What |
|---|---|
| `5583186fb86` | The layout runs at most once per animation frame, not once per resized step. |
| `443045ec04b` | Collection cards show a summary and the first two elements, rather than mounting `CollectionDisplay`, which loads every element. |
| `d024e8c7438` | The step-size summary that drives re-layouts is computed only while Embed Outputs is on. |

## Fixes

### 1. Collection cards downloaded every element (measured, fixed)

A collection card mounted stage 1's `InvocationOutputPreview`, so each card loaded `CollectionDisplay`. That component fetches `GET /api/dataset_collections/{id}` with every element and its peek, then renders a tree node for each element. The card is 260×120 and clipped, so it shows about one element.

I measured a new invocation, `ba751ee0539fff04`: a 500-element list run through four `__FILTER_FAILED_DATASETS__` steps, each with a labeled output, so there are four 500-element collection cards.

| Toggle on | Requests | Bytes | Until every card loaded | DOM nodes in the card layer |
|---|---|---|---|---|
| Before | 4 | 2.49 MB | 5.85 s | 38,093 |
| After | 8 | 7.4 KB | 0.41 s | 81 |

For one 500-element list, the endpoints compare like this:

| Request | Response | Time |
|---|---|---|
| `view=element` (what `CollectionDisplay` uses) | 622 KB | 744 ms |
| `view=collection` | 1.1 KB | 26 ms |
| `contents/{collection_id}?limit=5` | 1.8 KB | 75 ms |

The `view=element` cost grows linearly with the element count (stage 1 measured about 1.24 KB and 1.8 ms per element). The other two don't grow with it.

The fix is a new card-only component, `InvocationEmbeddedCollection.vue`. It calls the existing `fetchCollectionSummary` (`view=collection`), then `fetchCollectionElements` with `limit=2`. It shows:

- the collection's name;
- the history panel's `CollectionDescription` ("a list with 500 tabular datasets", plus a progress bar while jobs run);
- the first two element identifiers, and "and N more".

It follows the same not-ready rule as the dataset cards. While the step isn't terminal, the card shows "isn't ready yet" and makes no request. After that, the card reloads on each step state change, at two small requests per reload. The hover popover and the step details keep the full stage 1 preview. `CollectionDisplay`, which reports and Pages share, is unchanged.

Tests and checks:
- A new `InvocationEmbeddedCollection.test.ts` asserts the exact requests (`view=collection`, then `limit=2`) and that no element view is requested. It also checks the shown elements and the "more" count, and the not-ready-then-load sequence.
- A card test checks that a collection output renders the summary, not `InvocationOutputPreview`.
- The `graph_embedded_output.collection_element_name` selector now points at the summary's elements.
- The E2E test also asserts "a list with 2" on the `lines` card.

**For John:** collection cards now look like a history-panel collection item (name, description, first elements), not the Markdown collection tree with peeks. You can see this in the E2E screenshot `invocation_graph_embedded_outputs.png`.

### 2. The layout ran once per step on every toggle (measured, fixed)

`useNodePosition` reports each node's measured size from that node's own ResizeObserver callback. Vue flushes between those callbacks. So when the embedded view shrank every node, `stepSizes` changed once per step, and each change ran a full `layoutEmbeddedOutputs`.

| Replica, toggle on | Layout runs before → after | Position writes before → after | Final positions |
|---|---|---|---|
| IWC ATAC-seq (`df7a1f0c02a5b08e`; 42 steps, 14 cards) | 43 → 2 | 57 → 41 | identical (all 42 steps and every card compared) |
| IWC ChIP-seq PE (`a799d38679e985db`; 12 steps, 9 cards) | 13 → 2 | 12 → 10 | — |

At ATAC-seq's size, the runs cost little: 12 ms of layout in total before the fix. The problem is that the count grows with the step count, and every run is O(n²). I benchmarked one layout on synthetic grids in a throwaway Vitest file, not committed:

| Steps | One layout | × (steps + 1) |
|---|---|---|
| 42 | 0.55 ms | 24 ms |
| 100 | 1.0 ms | 101 ms |
| 200 | 2.0 ms | 405 ms |
| 400 | 4.6 ms | 1.8 s |

The resize callbacks all run in one rendering step, so before the fix a 200-step workflow would have spent about 0.4 s of one frame laying out. That figure is extrapolated, not measured in a browser.

The fix: the watcher records the author's positions straight away and queues the layout with `requestAnimationFrame`. Several changes within one frame give one layout. The frame callback re-checks `enabled`, and `onScopeDispose` cancels a pending frame.

The new test "lays out once when every step is measured again in the same frame" delivers five size changes, each in its own flush, as ResizeObserver does. It expects one layout. Without the fix it fails with 5. The composable tests' `settle()` now waits a frame.

### 3. Scrolling re-summarized step sizes even with embedding off (measured, fixed)

`stepPosition` holds each node's measured rect, position included. Page scrolling therefore rewrites every step's entry. The `stepSizes` computed is a watch source, so it rebuilt its string over all steps after each step's update, embedding on or not.

On ATAC-seq, with the center panel scrolled in a 1600×600 window, four effective scroll events caused 168 evaluations taking 9.4 ms in total. That's about 2.3 ms per scroll event, and the cost grows with the square of the step count. With the fix, the computed returns `""` while embedding is off: 0 evaluations.

The test "doesn't read the steps' measured sizes while disabled" uses a counting getter. It fails without the fix.

## Measured and fine

- **Polling.** I measured a running invocation (`63cd3858d057a6d1`: four `cat_data_and_sleep` steps, 25 s each), with outputs embedded, for 60 s. That covered 14 `step_jobs_summary` polls and 14 `jobs_summary` polls, plus steps going from running to ok. There were 0 re-layouts and 0 position writes. Each dataset card loaded once (details + content) when its step finished. `setPosition` already skips unchanged positions, and the watch sources are strings that only change with sizes or outputs.
- **Dataset card requests.** ATAC-seq's 14 dataset cards made 28 requests on toggle: 23 KB of details and 4 KB of content. At most 28 fell in any 3 s window, against the client limiter's 100.

## Follow-ups (not fixed)

### A. The request burst from many dataset cards (code-inferred)

Each dataset card costs two requests on toggle. The client rate limiter (`api/client/index.ts`) allows 100 per 3 s and queues the excess, so it delays requests rather than failing them. A workflow with about 50 labeled dataset outputs would hit it on toggle, together with the page's polls, and delay every request in the app by up to 3 s.

The largest IWC workflow in the scratch set has 14 labeled outputs, so this case is speculative. If it matters, there are two options: load the details and content of cards only once they are in view, or stagger the loads.

### B. Step-size tracking while embedding is on (measured at 42 steps)

With embedding on, scrolling still costs O(n²) per scroll event: 168 evaluations at 42 steps, as before. The root cause is editor-wide. `useNodePosition` stores position and size together and replaces both on every scroll. A size-only state-store field, or sizes taken only from ResizeObserver, would fix it for the editor as well. That belongs in a separate change.

### C. `CollectionDisplay` itself remains unbounded

This is stage 1's follow-up B. The cards no longer use it, but the hover popover and Markdown reports still download every element.

### D. A collection workflow input that is also a labeled output got no card (seen, not investigated)

In `ba751ee0539fff04`, the input collection is listed as the invocation output `big_in`, but no card appeared. The workflow's editor-format download shows the input step with no `workflow_outputs`, so this is probably how the gxformat2 upload represents input outputs, not this branch. It's not a performance issue.

## Verification

- **Vitest** (node 22.20.0) on `components/Workflow/`, `components/WorkflowInvocationState`, `components/History/Content/Collection` and `useInvocationGraph.test.ts`: 89 files and 734 tests pass on head.
- **Mutation checks:** each composable fix, reverted, fails its new test (5 layouts instead of 1, and 1 size read instead of 0).
- **Static checks:** eslint and prettier are clean on the changed files. `vue-tsc --noEmit` is clean on head. ruff is clean on the Selenium test.
- **Selenium** `test_embed_workflow_outputs` (Playwright backend) passes on head in 82 s.
- **Scratch tools** in `scratchpad/perf2/`:
  - `setup.py` creates the big-list and running-chain invocations.
  - `probe.py` measures the toggle (requests, bytes, layout runs, DOM size, positions).
  - `scroll.py` counts `stepSizes` evaluations while scrolling.
  - `instrument.py` adds and removes the temporary counters.
  - `bench_layout.test.ts` is the synthetic layout benchmark.
