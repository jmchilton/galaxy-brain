# Test challenges debrief: galaxyproject/galaxy#24262

- Profile: gx_test_challenger
- Model: Opus 5.5 (claude-opus-5-5), medium effort
- Reviewed commit: `cece83167b7409730e13573ed41c98c7e14da774` (merge-base `7c86d742327b`)
- Process: `GX_PROCESS_CHALLENGE_TESTS.md`, run in review mode (recommendations only, PR untouched)

## What the PR tests

| File | New tests | Covers |
|---|---|---|
| `client/src/components/History/HistoryCard.test.ts` | 4 | tag-save queue: serialization, failure leads to reload + toast, failure followed by success means no reload, reapplying saved tags after a list reload |
| `client/src/components/Workflow/List/WorkflowCard.test.ts` (new) | 4 | the same four scenarios for the workflow card |
| `client/src/components/Workflow/List/WorkflowList.test.ts` | 2 | `loadGeneration` guard: stale success ignored; stale failure ignored and still loading |

## Verification run

- Ran all 3 files under node 22.20.0 (`npm_config_use_node_version=22.20.0 pnpm exec vitest run ...`): 15/15 pass.
- Red check: restored the three `.vue` files from the merge-base and kept the new tests. All 10 new tests fail, and each fails at its own assertion (e.g. `expected [] to deeply equal ['first','second']`, `updateWorkflow called 2 times, expected 1`, `findAll('.workflow-card') length 2, expected 3`, `Toast.error not called`). None fails because of a missing fixture or API. Worktree restored with `git checkout -- client/src`, and status is clean.

## Challenges per test

### Tag-save queue tests (HistoryCard x4, WorkflowCard x4)

- **Implementation-only?** Partly. Each test drives the real `StatelessTags` `input` event and asserts observable outputs: the prop object's tags, the service call payload, the `refreshList` emission and the toast. That is behavior, not internals. But the behavior is a generic "serialize saves, remember the last good result, reconcile at the end" algorithm, and the component mount is incidental to it.
- **Silly?** No. Each test pins a real race from #24011.
- **Covered elsewhere / move to E2E?** The interleavings (a second save queued behind the first, a failure followed by a success, a reload landing mid-save) need controlled promise timing. Selenium can't reproduce that reliably, so the race checks belong at the unit layer. Keep them as unit tests.
- **Duplication.** About 35 lines of queue state (`tagsSaved`, `pendingTagSaves`, `lastSavedTags`, `lastTagSaveFailed`, `onTagSavesDone`, `sameTags`) are copied verbatim into `HistoryCard.vue` and `WorkflowCard.vue`. The two test files are near-identical as well, including copied `deferred()` and `addTag()` helpers. This is the main design lever. Extract the queue into a reusable unit, test the algorithm once without mounting anything, and give each card one thin wiring test.
  - A natural home is `client/src/utils/sharedPromise.ts`, which already holds sibling promise primitives (`memoizeUntilRejected`, `dedupeInFlight`). It has no serialize-and-keep-last-result primitive yet. `sharedPromise.test.ts` already defines a `deferred<T>()` helper.
  - Possible shape: `useSerialTagSaves({ save: (tags) => Promise<unknown>, getTags, setTags, onFailed })`, or a generic `serializeLatest(fn)` in `sharedPromise.ts` with the tag-specific reconcile done in a small composable.
  - After the extraction, the four scenarios run once against plain async functions, with no `vi.mock` of `history.services` / `workflows.services`, no Pinia, router or StatelessTags wiring, and no `as never` casts.
- **Mocks.** `HistoryCard.test` mocks `@/stores/services/history.services` (`updateHistoryFields`) with `vi.mock`. `WorkflowCard.test` mocks `@/components/Workflow/workflows.services` with `vi.mock` but uses MSW (`useServerMock`) for the `/counts` call. `client/README.md` prefers MSW. An MSW handler can `await` a deferred before responding (`http.put("/api/histories/{history_id}", async ({response}) => { await gate.promise; return response(200).json(...) })`). This would also exercise the real `historyStore.updateHistory` → `setHistory` path. Once the queue is extracted, only the thin wiring tests need mocking, and they should use MSW.
- **Helpers.** `deferred()` now exists 3 times (`sharedPromise.test.ts` and both new files). If no extraction happens, move it into `client/tests/vitest/helpers`.

### WorkflowList `loadGeneration` tests (x2)

- Good component-level tests. They drive `#show-deleted` and assert rendered card count, `LoadingSpan` visibility and the absence of a toast. They are not redundant with any E2E test, and Selenium can't time them. Keep them.
- Reuse note: the guard is now hand-rolled in `HistoryList.vue`, `WorkflowList.vue` and `genericTaskMonitor.ts` (`pollGeneration`), and in a similar form in `resourceWatcher.ts` (`currentRequestId`). A tiny "latest call wins" helper (e.g. in `sharedPromise.ts`) would let this be tested once. This is pre-existing duplication that the PR extends rather than introduces, so it is a minor note.

## Missing E2E coverage

The issue lists two symptoms. The "editor closes after the first Enter on a non-first card" symptom is deterministic, not a race: the card is re-sorted to the top, the focused input is moved in the DOM and blurs, and `HeadlessMultiselect` closes. No unit test can see it. The unit tests only assert the proxy "no `refreshList` emitted", and happy-dom doesn't move focused nodes the way a browser does.

Existing coverage:
- `lib/galaxy_test/selenium/test_histories_list.py::test_tags` adds one tag via a file-local `add_tag()` that presses Enter and then Escape, so it passes on `dev`.
- `test_workflow_management.py::test_tagging` adds one tag.

Recommended test: extend `test_histories_list.py` (it is a `SharedStateSeleniumTestCase` with three histories already set up).
1. Open the histories list (default sort: last updated first) and pick a card that is not first.
2. Click that card's `.stateless-tags .toggle-button`.
3. Call the shared `tagging_add([tag_a, tag_b], auto_closes=False, parent_selector=f"#g-card-history-{history_id} ")` (in `navigates_galaxy.py`). It reuses the open input for the second tag, so it fails on `dev` when the editor closes.
4. Assert that the card is still in the same position, then reload the page and assert both tags on that card.

The file-local `add_tag` could then be replaced by the shared helper. The workflow list doesn't re-sort on tag change (per the PR description), so an E2E test there adds little beyond the unit tests.

## Recommendations (test plan)

1. Extract the duplicated tag-save queue from `HistoryCard.vue` / `WorkflowCard.vue` into one composable or `sharedPromise.ts` primitive. Move the 4 race scenarios to a single unit test of that unit (reusing `deferred<T>()`). Reduce each card's tests to one or two MSW-backed wiring tests: a tag edit saves with the new tags and doesn't emit `refreshList`, and a failed save emits `refreshList` and shows a toast.
2. Add the E2E test above to `test_histories_list.py`, using `tagging_add(..., auto_closes=False, parent_selector=...)`.
3. If (1) isn't adopted, at least move `deferred()` to `client/tests/vitest/helpers` and switch the update-call mocks to MSW.
4. Optional: a shared "latest load wins" helper for the `loadGeneration` pattern.
