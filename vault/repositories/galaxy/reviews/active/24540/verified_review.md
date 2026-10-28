### P2 1: No API test for a partially purged or nested collection (implementation verified)

Both API assertions are degenerate. Either every element is purged (`purged == deleted == count`) or none is (`purged == 0`). Neither checks that a purged element is counted in both `elements_deleted` and `elements_purged`, and the client's `deletedNotPurgedCount` relies on exactly that. The nested path has no test at all: `dictify_element_reference` now emits `elements_purged` on subcollection elements, and the required `DCObject.elements_purged` is fed by the new `DatasetCollection.elements_purged`. The model unit test `test_dataset_dbkeys_and_extensions_summary` was touched but doesn't assert the new count either.

<details><summary>Evidence</summary>

The new test is red on the PR's base by construction, since there is no `elements_purged` key. On the review branch it passes (`run_tests.sh -api`).

</details>

Add an API test that builds a two-pair `list:paired`, purges a leaf of the first pair and deletes a leaf of the second. Then assert:

- on the HDCA, `elements_deleted == 2` and `elements_purged == 1`;
- on the subcollections, `(1, 1)` and `(1, 0)`;
- on the history-contents listing, the same counts as the HDCA.

<details><summary>Details</summary>

`TestHistoryContentsApiBulkOperation::test_partially_purged_nested_collection_counts` in `lib/galaxy_test/api/test_history_contents.py`. It uses the existing `upload_collection`, `wait_for_fetched_collection`, `delete_dataset(..., purge=True, wait_for_purge=True)` and `get_history_collection_details` helpers. An API test pins the purged-in-deleted contract across both summary paths, which is better than repeating it in the model unit test.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No Selenium test for the purged collection badge (implementation verified)

This is a user-visible fix (#24293). The PR's new `.content-purged`, `.deleted-elements` and `.purged-elements` classes make the result easy to assert end to end, but nothing does.

<details><summary>Evidence</summary>

The new test passes headless under both the Playwright and Selenium (Chrome) backends against a client built from the review branch. It is red on the base by construction, since those classes are new.

</details>

Add a sibling of the collection panel tests. It should check that:

- An all-purged list shows the Purged badge and no "N purged" count.
- A mixed list shows "1 deleted" and "1 purged" and no Purged badge.
- A non-deleted all-purged list keeps its delete button.
- Once deleted, the all-purged list keeps the Purged badge and has no Undelete.

<details><summary>Details</summary>

`TestHistoryPanelCollections::test_purged_collection_badges` in `lib/galaxy_test/selenium/test_history_panel_collections.py`, plus `purged_badge`, `deleted_elements_badge` and `purged_elements_badge` selectors under `history_panel.content_item` in `navigation.yml`. The collection is deleted through the API because the collection trash button opens a dropdown with no Selenium helper yet.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Collection state summaries keep two copies of the row loop (implementation verified)

`DatasetCollection.dataset_states_and_extensions_summary` and `HistoryDatasetCollectionAssociation.dataset_dbkeys_and_extensions_summary` run the same row loop over dbkeys, extensions, deleted, purged and states. The PR adds the `purged` counter to both loops and a second summary tuple (`HDCAStateSummary`) next to `CollectionStateSummary`. The next counter will need the same change in both places again. The duplication predates the PR, but the PR extends it.

<details><summary>Evidence</summary>

After the refactor, `test/unit/data/model/db/test_misc.py` (24 tests) and the P2 1 API test pass, and mypy reports no errors in `lib/galaxy/model/__init__.py`.

</details>

Aggregate the rows once in a module-level `_summarize_collection_rows(rows, with_store_times=False) -> HDCAStateSummary`. The HDCA property returns its result directly, and the `DatasetCollection` property derives its sorted, `None`-filtered `CollectionStateSummary` from it. The net change is -19 lines.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: Loose badge assertions in CollectionDescription.test.ts (implementation verified)

`expect(...text()).toContain("2")` and `toContain("1")` pass on any badge text that contains the digit, so they don't pin which count lands in which badge.

<details><summary>Evidence</summary>

The tightened tests pass.

</details>

Assert the full badge text instead: `"2 deleted"`, `"1 purged"` and `"2 purged"`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Unrealistic input in ContentItem.test.js (implementation verified)

The `elements_states: {}` step, with `elements_purged: 2` and `element_count: 2`, is a shape the server can't produce. The PR's own API test asserts that purged datasets keep their state.

<details><summary>Evidence</summary>

With a real empty collection the test passes. It fails when the `datasetCount > 0` guard in `allElementsPurged` is removed, so it still pins that guard.

</details>

Use a real empty collection (`element_count: 0`, all counts 0). That is the case the guard protects, since `0 >= 0` would otherwise mark it purged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: New `elements_purged` property is untyped (implementation verified)

`DatasetCollection.elements_purged` has no return annotation. Its sibling `elements_deleted` returns a bool on the session-less path and an int with a session.

Annotate the new property `-> int` so it doesn't copy that ambiguity.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
