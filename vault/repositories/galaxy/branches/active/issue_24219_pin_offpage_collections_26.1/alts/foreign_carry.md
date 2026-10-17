# foreign_carry

Branch `issue_24219_pin_offpage_collections_26.1_alt_foreign_carry` (head `d9f6d8abf09`, jmchilton fork).

The scope evaluation's expansion: parent's refactor + pin (pre-amend `09a7f2012fe`) plus one commit backporting 26.2's `DataCollectionToolParameter._carry_selected_hdca` to 26.1, fed the values `_page_and_pin_hdcas` leaves unresolved. A `data_collection` selection from another history (or a hidden unmatched one) comes back as a `keep` option instead of being dropped. Adds `test_build_collection_options_carries_other_history_selection`.

Held back from the parent pending John's review. Lacks the parent's later test strengthening in `test_build_collection_options_pinned_matches_page_entry`.
