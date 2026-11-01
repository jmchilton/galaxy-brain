`pr_24540_review_0` builds on the PR head `613265a0d2f`. It consolidates the two collection-summary row loops into one helper, so new counters like `purged` only need to be added once. It adds an API test for a partially purged nested collection and a Selenium test for the Purged badge, the badge counts and option visibility. It also tightens the PR's vitest assertions and test inputs and types the new `elements_purged` property. All added or edited tests were run and pass.

- `2b57b6b6ea0` Annotate DatasetCollection.elements_purged as int — adds `-> int` to the new property (P3 4).
- `9942db173b4` Share collection summary row aggregation — `_summarize_collection_rows` replaces the duplicated loops in `DatasetCollection.dataset_states_and_extensions_summary` and `HDCA.dataset_dbkeys_and_extensions_summary` (P3 1).
- `e4808cf5414` Assert full purged/deleted badge text in CollectionDescription tests — swaps `toContain(digit)` for exact badge text (P3 2).
- `8a320577679` Use a realistic empty collection in ContentItem purged test — exercises the `datasetCount > 0` guard with an empty collection instead of an impossible stateless one (P3 3).
- `47f5125c5f6` Test purged counts on a partially purged nested collection — new `test_partially_purged_nested_collection_counts` API test covering HDCA, subcollection and listing counts (P2 1).
- `cca2005e846` Selenium test for purged collection badges — new `test_purged_collection_badges` plus three `content_item` selectors in `navigation.yml` (P2 2).
