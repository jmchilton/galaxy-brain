Fix 🎯 #15515 - "Show inputs for this item" highlights only the clicked item in an imported history.

What the `related:<hid>` filter highlights after you click "Show inputs for this item":

| Where the item lives | `dev` | This PR |
| --- | --- | --- |
| The history the job ran in | inputs and outputs ✅ | inputs and outputs ✅ |
| An imported or copied history | the clicked item only ❌ | inputs and outputs ✅ |
| Another history it was copied into, with new hids | the clicked item only ❌ | the copies of its inputs and outputs in that history ✅ |
| An imported history where a new job ran on an imported dataset | the new job's items only ❌ | the original job's items and the new job's ✅ |

Each of the last three rows is an API test that fails on `dev` at the bug's assertion. Row 2 has two, one for datasets and one for collections.

Importing a shared or published history is how people study someone else's analysis, and that's exactly where "what produced this?" matters. Today the button is there but does nothing useful. Importing copies each dataset and collection, but jobs keep pointing at the originals, so the copies have no job connections at all. This PR follows each item's existing `copied_from_*` link back to the item a job actually used, collects that item's connections, and maps them back onto the copies in the current history. ***Nothing changes about importing or copying: no jobs are copied, no new columns, no migration, no client change. The filter reads the links that copies already record.*** ***It only ever returns hids from the history being viewed, even when the chain runs through another user's history.***

***This is an alternative to 🔀 #15573, which hides the button for copied items.*** The issue's last comment asked for the query to work on imported histories, so that's what this does.

<details><summary>How the copies are found</summary>

- **Finding jobs:** a recursive CTE walks `copied_from_*` upward from the clicked item. Each step is a primary-key join. Job connections are collected for every item in that chain.
- **Mapping datasets back:** related HDAs are matched to the history's HDAs by shared `dataset_id`, in one query.
- **Mapping collections back:** `HDCA.copy()` copies the underlying collection, so copies share no key. The same upward CTE runs over the history's HDCAs and keeps those whose chain reaches a related HDCA.
- **Why only upward:** the `copied_from_*` columns have no index, so walking down from the originals would scan the tables.
- **hid lookup:** the per-item hid lookups (N+1 queries) are now one query, scoped to the history. On `dev`, ids were mapped to hids with no history filter.
- **Recursive CTEs** are already used in `galaxy.model` (`hdca_leaf_hda_descendants`, `collection_hierarchy`), so this adds no new SQL feature.

</details>

***Cost per click: datasets map back in one indexed query; collections walk the copy chain of every collection in the history, one primary-key join per step.***

***Two changes are visible beyond the fix. Copies of a related dataset in the same history now highlight too, since they share the dataset. The input/output arrows are still drawn by hid order in `HistoryPanel.vue`, so after a copy with new hids an arrow can point the wrong way.*** Importing a whole history keeps hids, so the arrows there are right. With hidden items shown, the hidden element datasets of a related collection highlight as well.

<details><summary>Not handled</summary>

- A chain that passes through a library dataset (`copied_from_ldda`) stops there. The filter then shows only the clicked item, as it does on `dev`.
- The implicit output collection of a mapped-over job isn't connected to its input collection. That gap is in `get_connections_graph` and predates this PR.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- The API shape is unchanged: `related:<hid>` still returns a list of hids.
- The recursive CTEs ran only on SQLite locally. The API tests exercise both of them, and CI runs them on Postgres.
- Each click runs the collection CTE over every HDCA in the history. Each step is a primary-key join, but a history with thousands of collections pays for all of them.

</details>

## Context

Builds on 🔀 #15210, which added the `related` filter. Alternative to #15573.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? If the copy chain breaks (e.g. a library-dataset hop), only the clicked item is highlighted, as on `dev`. A query error shows as the usual filter error in the history panel.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. There are no unit tests. The API tests run real tools, copy histories and items through the API, and check the hids the filter returns.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/api/test_history_contents.py` (all four fail on `dev`):
  - `test_index_filter_by_related_items_copied_history`: a tool run on a dataset, then the history copied (`[1] == [1, 3]`)
  - `test_index_filter_by_related_collections_copied_history`: `__FILTER_FAILED_DATASETS__` run on a list, plus an unrelated list (`[1] == [1, 12]`)
  - `test_index_filter_by_related_items_copied_with_new_hids`: datasets and collections copied into a new history, outputs before inputs, so the copies get new hids (`[3] == [2, 3]`)
  - `test_index_filter_by_related_items_jobs_on_copies`: a tool run on a dataset in the copied history, then that history copied again (two copy levels), and the original history left unchanged (`[1, 3] == [1, 2, 3]`)
- `lib/galaxy_test/selenium/test_history_related_filter.py::test_history_related_filter_copied_history`: copies the history, switches to the copy, clicks the highlight button, and checks that the related item shows and the unrelated one doesn't

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
