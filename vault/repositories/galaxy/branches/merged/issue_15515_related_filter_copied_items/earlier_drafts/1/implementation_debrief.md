# issue_15515_related_filter_copied_items — implementation debrief

Fixes galaxyproject/galaxy#15515: the history `related:<hid>` filter ("Show inputs for this item") showed only the clicked item in imported histories. Off `dev` at `4fe00d9e7ab`. Commits: fix `9d67c0c06cb`, test tightening `dc22f76dfab`, E2E test `de497533043`. Pushed to the `jmchilton/galaxy` fork. No PR opened.

Background: John was assigned 2025-11-18, and Ahmed unassigned himself the same day. Ahmed's WIP #15573 (open since 2023) only hid the highlight button for copied datasets. His comment on the issue asked for the query itself to work. This branch supersedes #15573, which can be closed when the PR opens.

## Cause

`History.copy()` (shared history import) copies HDAs and HDCAs. Jobs keep referencing the originals, so `JobConnectionsManager.get_related_hids` found no job connections for the copies.

## Fix (`lib/galaxy/managers/job_connections.py`)

- **Finding jobs:** `_copied_from_chain`, a recursive CTE, walks `copied_from_*` upward from the clicked item. Job connections are collected for every ancestor.
- **Mapping into the history:** related HDAs are matched by shared `dataset_id`, one indexed query. Related HDCAs are matched by the same upward CTE over the history's HDCAs, because `HDCA.copy()` copies the underlying collection and the copies share no key.
- **Upward only:** walking upward uses primary-key joins. `copied_from_*` columns have no index, so descending lookups were avoided.
- **Fewer queries:** the per-item hid lookups (N+1) became one batched query, now scoped to the history. Dev mapped ids to hids without a history filter.
- **Behavior change:** copies of the same dataset within one history now count as related to each other.
- **Client:** no change. Highlighting is hid-based.

## Validation

- Unit, `test/unit/app/managers/test_JobConnectionsManager.py`: 9 pass. Red on dev for the copied-history cases.
- Subagent mutation pass: 10 implementation mutations, 4 of which survived the original tests. All 10 fail under the rewritten tests. The main blind spot was that `History.copy()` keeps hids, which `test_related_hids_copied_items_new_hids` now covers. The double-copy test is the only depth>1 guard.
- API `test_index_filter_by_related_items_copied_history`: red on dev (`[1] == [1, 3]`), green on the branch. The existing related test still passes.
- E2E `test_history_related_filter_copied_history` (Selenium/Playwright): written, **not run locally** at John's request.
- ruff, black, isort and pre-commit are clean. mypy on `job_connections.py` matches the dev baseline (9 existing errors).
- Local runs used a symlinked `.venv` from `extract_next_followups` with SQLite only. The recursive CTEs were compiled for the Postgres dialect but never executed on Postgres.

## Known limits (not fixed)

- The chain stops at a library dataset hop (`copied_from_ldda`).
- Implicit/mapped-over job outputs are not handled. That gap is in `get_connections_graph` and predates this branch.
- Collection-element HDAs should map through the shared `dataset_id`, but that is reasoned only: the unit tests use empty collections.
- Possible follow-up: move `_copied_from_chain` onto the model so that `source_dataset_chain` (a Python walk with lazy loads) could reuse it.

## Blockers

- Fork CI, including the E2E test.
- Postgres coverage comes from CI.
