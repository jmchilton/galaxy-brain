# Test challenges review: PR #24509

Profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md), run as Opus 5.5 (claude-opus-5-5) at medium effort. Reviewed commit `7aa5ec64156429e19c6160f1a37645554106e23c`. The detailed test plan is in [test_challenges_debrief.md](test_challenges_debrief.md).

**Verdict:** the tests are solid. They are at the right layer (integration, PostgreSQL), assert full flag dictionaries, and include negatives for retention age and never-deleted entries. There are no unit tests to challenge, and an E2E test isn't applicable. Two gaps leave the PR's own safety and design claims unguarded.

## P2 1: Tests can't detect a regression in the deliberate "don't stamp `ldda.update_time`" choice

The PR and its in-code comment say that leaving `ldda.update_time` unstamped is what lets `delete_library_datasets delete_datasets` chain in one run. Both tests only use `--older-than 0`. `Cleanup.run()` commits each action separately, so the next action's `NOW()` is always later than a fresh stamp, and the `DeleteDatasets` veto (`ldda.update_time >= NOW() - 0 days`) never fires. Adding `{update_time_sql}` to the LDDA `UPDATE` would therefore leave both tests green.

The veto only matters at `-o N > 0`, which is how deployments actually run the script. Also, the chained run in `test_delete_library_datasets` happens only after the action has already run alone.

**Suggested fix:** add a test that:
1. deletes a library dataset;
2. backdates `library_dataset.update_time` and `ldda.update_time` by about two days through the session, as the force-retry test already does;
3. runs `--older-than 1 delete_library_datasets delete_datasets` in one invocation;
4. asserts `version_deleted` and `dataset_deleted`.

Don't assert `dataset_purged` there: `PurgeDatasets` filters on the `dataset.update_time` that `DeleteDatasets` just stamped.

## P2 2: No negative test for a dataset that a live HDA still references

This action is the first path that clears the LDDA half of `DeleteDatasets`' veto, so a library dataset that was also imported into a history, then deleted from the library, now reaches the HDA half of the veto. That is the realistic data-loss case, and nothing asserts it holds.

**Suggested fix:**
1. Import the library dataset into a history (`POST histories/{id}/contents` with `{"source": "library", "content": ld_id, "type": "dataset"}`, as in `lib/galaxy_test/api/test_histories.py:926`).
2. Delete it from the library.
3. Run `-o 0 delete_library_datasets delete_datasets purge_datasets`.
4. Assert the library dataset is purged and its version deleted, but `dataset_deleted` and `dataset_purged` are False and the HDA is not purged.

## P3 1: Add a `LibraryPopulator` helper for deleting a library dataset

`self._delete(f"libraries/datasets/{id}")` followed by a status assertion now appears twice in this PR and once in `lib/galaxy_test/api/test_folder_contents.py:506`.

**Suggested fix:** add `LibraryPopulator.delete_library_dataset(library_dataset_id)` and use it at all three call sites.

## P3 2: Build the force-retry fixture from the real producer, not a DB mutation

`test_delete_library_datasets_force_retry` creates the "LD purged, dataset purged, LDDA live" shape by first running the new action chain and then setting `ldda.deleted = False` in the session. The PR description says the deprecated `DELETE /api/libraries/{library_id}/contents/{id}` with `{"purge": true}` produces exactly this shape: it sets `ld.purged`, calls `full_delete()` on a lone dataset, and never marks the LDDA.

**Suggested fix:** build the fixture through that endpoint. This removes the session write, documents where the shape comes from, and stops the setup depending on the action under test.
