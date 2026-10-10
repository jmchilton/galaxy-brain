# Batch 27 review

Range `3621eb6896d..vitest_readability` (5 commits). Every file was read with `git show`. All commits pass the shape checks: each originator commit touches one test file, the `pages.ts` helper commit (e36e367c9a5) lands before its originator (b60a3fce923), no production code changes, and no comments mention the process.

## bc8dfc35982 Improve readability of parseInvocation tests

Approved.

The 12 original assertions, in order:

1. `history_link` → `history_id` = `history_id_1`: "links history_link…"
2–4. `workflow_display`/`workflow_image`/`workflow_license` → `workflow_id`: the `it.each` case, same three names.
5. `history_dataset_display` + `input_3` → `input_id_3`: "resolves a labeled dataset input…"
6. `history_dataset_display` + `unavailable_output` → `history_dataset_id` undefined: "leaves the history dataset unset…"
7. `history_dataset_collection_display` + `output_2` → `output_id_2`: "resolves a labeled output collection…"
8. step `workflow_step_1` → `job_id_1`: "resolves a labeled step…"
9. step `workflow_step_2` → `implicit_id_2`: "mapped-over step" (also adds `job_id_2`)
10. `invocation.id` = `invocation_id_1` → `invocation` `toBe(INVOCATION)`. Stronger.
11–12. collection input under `history_dataset_as_image` → collection ID set and dataset ID undefined: kept as a pair in one case.

Findings: none. The name "even where a dataset is required" is accurate: `requirements.yml` lists `history_dataset_as_image` under `history_dataset_id`, which takes the first `inputCollectionId` branch. Each call keeps its original inputs, and the `parse` default `{}` matches the original `{}` arguments.

## dac5a513896 Improve readability of MyToolsLanding tests

Approved.

The single case is kept. Its tools, favorites, order, user and `reorderFavorites` spy are unchanged. The initial `["cat1","cat2"]` check, the start/update/end callback sequence with `item`/`from`/`to`/`oldIndex`/`newIndex` (1 → 0), and the exact `[cat2, cat1]` persisted order all remain.

Findings:
- `as never` and `as object` are gone because `FavoriteOrderEntry` is a real exported type. The mount moves to `props`/`withPlugins`, and `enableAutoUnmount` replaces the manual unmount. All good.
- The list is now found through `wrapper.find(...).element` rather than `document.querySelector`. It's the same element, since the component is attached.
- Nit, non-blocking: `dragFavorite` handles both directions (`newIndex < oldIndex ? target : target.nextSibling`), but its only caller drags upward. The author red-checked the downward branch, so it works, but nothing in the suite exercises it. Acceptable.

## e36e367c9a5 Extend tests/test-data/pages.ts for client unit tests

Approved.

PageEditorView (33 → 33): three `as PageRevisionDetails` literals become `getFakePageRevisionDetails({ id: "rev-1", page_id: PAGE_ID, content })`. Two `as PageRevisionSummary[]` lists become `getFakePageRevisionSummary({ id: "rev-1", page_id: PAGE_ID })`, and `[] as …` becomes `[]`.

Fixture defaults vs assertions:
- These tests use `shallowMount`, so `PageRevisionView` and `PageRevisionList` are stubs. Their assertions read only `exists()`, the GModal `show` prop, and store spies called with IDs the test emits. Nothing reads timestamps, `content`, or `content_editor`. The getters that do read store revision state (`isNewestRevision`/`isOldestRevision`) compare IDs only, and their results go only into stub props.
- Store actions are stubbed in testing pinia, so `loadRevision`'s `content_editor ?? content` never runs against these fixtures.
- Observation, not a blocker: overriding `content` ("# Old") leaves `content_editor` at the analysis default, so the two disagree. `getFakePageDetails` behaves the same way, and nothing here reads `content_editor`. A future consumer that does should override both.

Choices not to adopt:
- `pageEditorStore.test.ts`: agree. About 22 calls rely on the local `rev-1`/`TEST_PAGE_ID`/`2025-01-0N`/empty-content conventions. A delegating wrapper would save nothing.
- `PageRevisionView.test.ts`: agree. Every field of `REVISION` is scenario data (title, content, diff lines).
- `PageRevisionList.test.ts`: the weakest call. `makeRevision` matches the new summary factory field for field, timestamps included; only `id`/`page_id` differ, and the tests always set or ignore those. The Prettier cost is real, though: seven two-revision arrays would grow to four lines each. Leaving it is defensible.
- `getFakePageRevisionDetails` has only one consumer file. I accept it anyway. It pairs with the summary factory, which has two consumers. It mirrors the `getFakePageSummary`/`getFakePageDetails` pair, and it has three call sites.

## b60a3fce923 Improve readability of PageDisplayToolbar tests

Approved.

All 18 cases are kept one to one: pressed states in editor and display mode, rename button and title, the Untitled fallback, Unsaved with its `isDirty` precondition, `canSave`-false disabled, the back label and emit, Preview text and emit, rename modal prefill plus `updateTitle("Renamed Page")`, `savePage`, flash on success and none on failure, Revisions text, `toggleRevisions`, badge "2", and the edit emit. Every expected value is unchanged.

Findings:
- `ChangesIndicator.name` mutation removed: correct. `ChangesIndicator.vue` is `<script setup>`, so VTU2 matches the stub by its file-derived `__name`. The "flashes the saved indicator" case asserts `toHaveBeenCalledOnce()` on the stub's method, which fails if the stub doesn't replace the real child. The author's key-rename red check confirms it. The failure case shares the same helper, so its `not.toHaveBeenCalled()` isn't vacuous. The mutation also wrote to the production module object, so removing it is an improvement.
- Stub merging: the default `localVue.stubs` are only `Portal`/`PortalTarget`. The new `{ ...localVue.stubs, ...stubs }` gives the same set the adapter built. The adapter path actually assigned `normalized.global.stubs` onto the shared `localVue` object, so the original leaked the ChangesIndicator spy stub into later mounts. That leak is now gone.
- Rename-button repeat check: losing it costs nothing. The rename-button/title case asserts it on identical setup, and in VTU2 `trigger` on an empty `find()` throws, so the rename case still fails loudly.
- Fixture defaults: `isDirty`/`canSave` compare `currentContent`/`currentTitle` against the store's own `original*` refs, not `currentPage`, so the factory's `content_editor` default plays no part. `revisionCount` is `revisions.length` (two entries), and the factory's `revision_ids` isn't read. The Edit button's `:disabled="currentPage?.deleted"` sees `false` instead of `undefined`, which is the same enabled state. The edit-emit case would catch any difference.
- Dropped waits: the mount-time `flushPromises` and the post-click `$nextTick`s covered nothing async. The toolbar has no mount-time work, `trigger`/`setValue` already await a tick, and the driver's runs confirm it.

## 7abeb84114c Improve readability of layout tests

Approved.

All 4 cases are kept: the boolean-param `when` case (with the 180×80 conditional step, via `{ 1: 80 }`), the two conditional steps from one source, the orphan connection with its warning prefix, and the valid edge with no warning. Every `result` defined, length 2/3/2 and to-the-right-of assertion is preserved. The step IDs used in the assertions are literals that `addStep` keeps (`newStep.id ?? …`).

Findings:
- The warn spies now start before `addStep`. That makes the no-warning case stricter, and it doesn't loosen the orphan case, whose matcher requires the layout-specific prefix.
- `WORKFLOW_ID` collapsed: safe, because `beforeEach` creates a fresh Pinia.
- The two kept comments are accurate: `toElkStep` builds ports from `getCombinedStepInputs`, which includes the `when` extra inputs. `datasetInput` and `layOutSteps` stay local, which is right. No existing `InputTerminalSource` factory exists, and the other `createMockStepPosition` users have different shapes.
