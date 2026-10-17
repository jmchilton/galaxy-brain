# Normal review 1

Acted on all three findings in `f29e17b810e`: listing visibility is now a `_hdca_listing_visible_only` class attribute read by both `_page_hdca_matches` and `_pin_selected_hdcas` (now a `BaseDataToolParameter` method); the mypy `page_filter` local has a one-line reason; forward-merge notes added to `index.md`.

Not acted on:
- No client vitest — existing `FormData.test.ts` "renders pinned entries alongside paged options" covers non-keep pinned merge.
- No `DataOptionsBuilder.paginate` typing change — out of proportion for a 26.1 fix.

<details><summary>Full review</summary>

Overall: correct and well-factored; shared `_hdca_entries` classifier is a good reusable abstraction. No correctness bugs, no security concerns.

1. MEDIUM – forward merge to 26.2/dev conflicts in `basic.py` and `test_tools.py`. 26.2 `_paginated_dataset_collections` has no `visible_only`; 26.2 collection to_dict should pin (visible only) then `_carry_selected_hdca` the rest. `test_build_collection_options_pinned_matches_page_entry` hidden case won't pin on 26.2 (carried as `(hidden) …`, `keep=True`) — adjust on merge.
2. LOW – `visible_only` passed as duplicate literals per class; suggested class attribute + pin as method.
3. LOW/nit – `page_filter` typed local is justified (mypy infers `T = Never` otherwise); add a short reason comment.

Checked fine: `to_dict` reorder (carry of hidden/deleted/foreign HDCA, DCE, LDDA unchanged; only pre-sort tie order of a foreign HDCA vs same-hid page HDCA may differ); pin eligibility mirrors `paginated_active_dataset_collections` (history, not deleted, optional visible); search/tag intentionally not rechecked (same as HDA pin; client tag-filters non-keep options); `multiple` data inputs; tests strong and at the right level; imports top-level.

</details>
