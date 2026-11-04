Run via claude-opus-5-5 at high effort.

# Performance challenges debrief: invocation_graph_embedded_outputs (stage 3)

The process is [GX_PROCESS_CHALLENGE_PERFORMANCE.md](../../../../../agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md). The base was `24d04827bc0`. One fix was folded into the invocation graph commit; there are no new commits.

| Commit | Was | What changed |
|---|---|---|
| `83d9c442144` | same | unchanged (backend) |
| `e98e41cf423` | same | unchanged (editor star) |
| `27129c65e6d` | `c040c68ab9a` | `usePreferredOutputItems` returns the stored step-details object rather than a copy; new vitest |
| `32997564286` | `24d04827bc0` | rebased only |

The base is still stage 2 (`3b546b24e6f`). The tree is clean and nothing is pushed. The servers were not restarted, because no backend code changed.

## Method

- **Server:** the worktree's running Galaxy (8091) and Vite (5181), user demo@example.org, headless Chromium at 1280×1000.
- **Measurements:** Playwright counted requests and response bytes. Temporary counters (`window.__p3`, never committed) counted:
  - layout runs, the frames they ran in, and position writes;
  - evaluations of the composable's computeds, and step-details fetches;
  - evaluations of `Node.preferredItem`, and how often `InvocationOutputPreview`'s watch fired.
- **Long tasks:** a `PerformanceObserver` recorded them.
- **Scripts:** all in `SCRATCH/perf3/` (`instrument.py`, `probe.py`, `editor.py`, `running.gxwf.yml`).

New invocations:

| Scenario | Invocation | What |
|---|---|---|
| ATAC max | `ba03619785539f8c` | ATAC-seq replica, RESULTS.md's 10 "max" steps. All are listed workflow outputs, so all are deduped. |
| ATAC unlisted | `cbbbf59e8f08c98c` | Same replica with 10 other steps starred. None is a workflow output, so each needs a step-details fetch. Measured while running and after it finished. |
| Running | `1fad1eaf5f4f1766` | The test workflow with cat_table sleeping 45 s and final sleeping 100 s. Three steps are starred: head_table (listed), cat_table (unlisted) and final (listed). |

Stage 2 baselines are the existing `2d9035b3fc152403` (ATAC) and `c9468fdb6dc5c5f1` (test workflow). `2a56795cad3c7db3` ("preferred a") is the matching stage 3 invocation for the test workflow.

## Fix: grown steps re-rendered on every step-details arrival (measured, fixed)

**The problem.**
- For an output the invocation doesn't list, `itemFor` built a new `{ src, id }` object on every evaluation of `items`.
- `items` reevaluates whenever any step's details arrive.
- So each arrival gave every unlisted grown step a new item. Each such step's `Node` re-rendered, and its `InvocationOutputPreview` watch fired again.
- With N unlisted steps, that is O(N²) re-renders on toggle. The preview's stale check meant no extra requests, though.

**The fix.** Return the stored step-details output object itself. Its type (`InvocationStepOutput`/`InvocationStepCollectionOutput`) already has the literal `src`.

| ATAC unlisted, toggle on (3 runs each) | Before | After |
|---|---|---|
| Preview watch fires (24 items: 14 cards + 10 previews) | 69, 69, 69 | 24, 24, 24 |
| Step-details requests | 10 (7.8 KB) | 10 (7.8 KB) |
| Layout runs | 3, 3, 3 | 3, 3, 4 |
| Long tasks, sum | 439, 431, 521 ms | 441, 396, 493 ms |

**Honest read.** The fix removes 45 redundant re-renders on a 10-step stress case, but makes no measurable difference to main-thread time: the re-renders were cheap. I kept it because it is a three-line change and the redundant work grows quadratically.

**Test.** The new vitest "keeps a step's item while it names the same output, so the step doesn't re-render" fails (`toBe`) with the old copy.

## Measured and fine

### Backend: no extra queries (measured)

- **Reads issue no SQL.** `WorkflowStep.config` is an ordinary, non-deferred column, loaded with the row. A throwaway unit test (sqlite, 40 tool steps, not committed) found that reading `preferred_output` on 40 loaded steps issued **0 statements**, with or without the field set.
- **Writes issue no extra SQL.** Inserting those 40 steps took 41 statements either way. The setter only changes a value in the step's existing INSERT.
- **JSON decoding isn't new.** `JSONType` already decoded `config` (almost always NULL) on every load before this branch.
- **Export and import:** the editor dict, `.ga` export and `.ga` import each add a dict lookup per step.
- **Response size.** On ATAC max:
  - the editor dict is 1.52 MB, and the new key appears 42 times, about 1 KB or 0.07%;
  - the `.ga` export (54 KB) carries the key only for the 10 steps that set it.

### Requests on toggle (measured)

- **Listed (deduped) preferred outputs cost what the card they replace cost.** ATAC max versus stage 2 ATAC:
  - **Requests:** 14 dataset details and 14 dataset content requests (27.2 KB) in both, with no step-details fetches.
  - **Re-toggling:** no requests in either.
- **Unlisted preferred outputs add one step-details request per step, once per page.**
  - **Fetch rate:** the test workflow made 1 request (757 B), ATAC unlisted 10 (7.8 KB). Each step also makes 2 dataset requests, as a card would.
  - **Caching:** a re-toggle on the same page made 0 step-details requests, because the store caches them.
  - **Burst:** at most 30 dataset and step-details requests, well under the client limiter's 100 per 3 s.

### Layout runs (measured): still at most once per frame

| Scenario | Layouts on first toggle | Frames with a layout | Most layouts in one frame | Position writes |
|---|---|---|---|---|
| Test workflow, stage 2 | 2 | 2 | 1 | 6 |
| Test workflow, preferred a (1 unlisted) | 3 | 3 | 1 | 9 |
| ATAC, stage 2 | 2 | 2 | 1 | 41 |
| ATAC max (10 listed) | 2 | 2 | 1 | 27 |
| ATAC unlisted (10 unlisted) | 3-4 | 3-4 | 1 | 50 |

**Listed preferred outputs.** These add no layouts. The step grows in the same render as the embed toggle, because the preview's height is fixed by CSS (8.5rem, or 5.25rem for collections), not by its content. It also grows while the output isn't ready yet, so the step doesn't grow again when the job finishes.

**Unlisted preferred outputs.** These add one layout for each frame in which step details arrive. That bound comes from stage 2's per-frame queue. The `shownAsPreferredKeys` watch source changes in the same flush as `requestKeys` and the sizes, so it never adds a layout of its own.

**Re-toggles** gave 2 layouts in every scenario.

### Polling (measured)

- **Running test workflow (`1fad1eaf5f4f1766`).** Embedded on from the start, watched for 160 s while cat_table and final went from running to ok:
  - **Polls:** 46 `step_jobs_summary` and 46 `jobs_summary`.
  - **Layout work:** 0 layouts, 0 position writes, 0 step-details refetches.
  - **Composable work:** 0 evaluations of `candidates` or `items`.
  - **Reloads:** each preview and card reloaded once, when its step finished (3 datasets, 2 requests each, under stage 1's not-ready rule).
- **ATAC unlisted.** Toggled while 21 jobs were still new, and watched for 60 s:
  - **Fetches:** all 10 grown steps resolved from the first step-details fetch, because outputs exist once a step is scheduled, and no step was refetched.
  - **Layout work:** 0 layouts during polling.
  - **Reloads:** 9 dataset reloads, as steps finished.
- **Why polling is cheap.** `updateSteps` writes only what changed. `candidates` doesn't read `state`. The refetch-while-missing watch only acts on a state change of a step whose output is still missing.

### Render cost of a preview compared with a card (measured)

- **Same component.** A preview is the same `InvocationOutputPreview` as a stage 2 card, without the card's header.
- **DOM size.** For the same dataset, a preview has 5 fewer DOM nodes than its card (for example 117 against 122, and 404 against 409). A not-ready preview is 2 nodes.
- **ATAC toggle long tasks** were the same as stage 2, within noise:
  - stage 2: 345 and 351 ms in total;
  - max: 373 and 331 ms.

### Editor nodes (measured)

On the ATAC max workflow in the editor (42 nodes):

- no `.node-preferred-output`, no host class, and no invocation, dataset or collection API requests;
- `Node.preferredItem` evaluated 42 times, once per node at mount, and returned `undefined` without reading the injected map;
- the star rendered 42 buttons, 10 of them pressed.

The only editor cost is one more `v-g-tooltip` button per tool output, beside the 4-5 such buttons each output already has.

## Follow-ups (not fixed)

### A. Step details are O(jobs) for a mapped-over step (extrapolated)

- **The cost.** `GET /api/invocations/steps/{id}` returns every job, about 248 bytes each (measured on a real job dict). An unlisted preferred output on a step mapped over 10,000 elements would fetch about 2.5 MB once on toggle. This is extrapolated from the per-job size; I didn't run a large map.
- **Existing cost.** Stage 1's hover popover and the step details panel already pay the same cost, through the same cached store entry.
- **When it's paid.**
  - It's paid only for starred steps whose output isn't a workflow output.
  - Mapped-over steps create their implicit collection when they are scheduled, so the first fetch finds the output, and there is no refetch.
- **Possible fix.** A cheaper source would be a `jobs=false`-style option on the step endpoint, or listing preferred outputs in the invocation response. Both are backend API changes, outside this branch's scope.

### B. Every node reevaluates `preferredItem` when the map changes (measured, left)

- **Count.** ATAC unlisted: 42 nodes × 11 map changes = 462 evaluations of a one-line computed on toggle.
- **Why it's left.** Vue 3.5 doesn't re-render a node whose computed value is unchanged, so only grown nodes whose item changed re-render, which is none after the fix. Per-step injection would remove the evaluations, but isn't worth the extra code.

## Stage 2 decisions

None reversed. Nudge-only layout, push-right, inert previews, constant card sizes and the once-per-frame layout queue all hold, and the measurements above confirm the last.

## Verification

- **Vitest** (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 58 files, 543 tests pass. That is one more than before, the new test.
- **Mutation check:** the new test fails with the old object copy.
- **Static checks:** `vue-tsc --noEmit` is clean. eslint and prettier are clean on the changed files.
- **E2E (Playwright):** `test_embed_shows_steps_as_their_preferred_output` passes on the final head (83 s).
- **Backend:** the throwaway sqlite statement-count test (above) passed and was removed.
- **Instrumentation:** removed with `git checkout`. `git status` is clean.
