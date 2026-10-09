# issue_15515_related_filter_copied_items — polish debrief

Polished 2026-10-06. Started at `de497533043` and ended at `2cce6b3cfb5`, pushed to the `jmchilton` fork. No PR was opened.

## CI

Fork CI on `de497533043` and `dc22f76dfab` was all queued (backlog), with no reds when polishing started. Earlier runs had been cancelled by the newer pushes.

## Checklist (GENERAL)

Every agent-answerable item passed on the first pass, and the human-read item was left for John. The checklist pass also raised some concerns:

- The hid-order input/output arrows in `HistoryPanel.vue` can point the wrong way after a copy with new hids. This predates the branch and is now called out in the description.
- Matching by `dataset_id` is asymmetric: an input's copy highlights, but clicking that copy doesn't highlight the input itself. Minor and not fixed.
- The collection CTE runs per history, once per click. That cost is now called out in the description.

## Strengthening round (one round)

Tasks applied:

- **API test with a collection**, `test_index_filter_by_related_collections_copied_history`. It runs `__FILTER_FAILED_DATASETS__` on a list, adds an unrelated list, then copies the history. On the branch it passes locally on SQLite. With dev's `job_connections.py` swapped in, it fails at the bug's assertion (`[1] == [1, 12]`).
  - The first version failed on the branch because the API returned hidden element HDAs (input elements via shared `dataset_id`, output elements as job outputs). The test now sends `visible=true`, as the history panel does by default.
- **Unit test with a non-empty collection**, `test_related_hids_collection_elements`: a job on a collection element, before and after `History.copy()`. 10 unit tests pass. With dev's implementation swapped in, the new test fails only at the copied-history assertion. The description's "datasets inside collections are untested" limit was removed.
- **Description fixes:**
  - Corrected the "unit tests run on Postgres" claim. `unit-postgres.yaml` runs only migration and handler tests, so only the API tests hit Postgres in CI.
  - Fixed "other rows" to say rows 3–4.
  - The Selenium test is described as copying the history, not importing it.
  - Added bold lines on cost per click, history scoping (no hids from other users' histories) and "no client change".

Questions that widen the scope, left for John:

- Following chains through LDDA hops (`copied_from_ldda`).
- Connecting implicit, mapped-over output collections in `get_connections_graph`.
- Drawing the input/output arrows by relation instead of hid order in `HistoryPanel.vue`.
- An index on `copied_from_*`, which would allow walking down the chain.
- Moving `_copied_from_chain` onto the model so `source_dataset_chain` can reuse it.

## Still unproven

- E2E `test_history_related_filter_copied_history` has never been run. Fork CI will run it.
- The CTEs have never run on Postgres. The API tests in fork CI will cover them.

## Unit tests moved to the API layer (John's call, after hand-off)

John asked whether the API tests made `test_JobConnectionsManager.py` redundant. Two cases were covered only by unit tests:

- copies that get new hids (`History.copy()` keeps hids, so a bug mapping by the original's hid passes the copy-history tests)
- jobs run on copies, two copy levels deep (the only test that the CTE actually recurses)

Both became API tests at `2cce6b3cfb5`, and the unit-test changes were reverted to the base. Collections are covered too: outputs are copied before their inputs, so each related pair's hids come out reversed. All 5 `related` API tests pass on SQLite. With dev's `job_connections.py` swapped in, all four copied-history tests fail at their related-hids assertion. Every test now runs on Postgres in CI.
