# foreign_carry

Branch `issue_24219_pin_offpage_collections_26.1_alt_foreign_carry` (head `d9f6d8abf09`, jmchilton fork).

The scope evaluation's expansion: parent's refactor + pin (pre-amend `09a7f2012fe`) plus one commit backporting 26.2's `DataCollectionToolParameter._carry_selected_hdca` to 26.1, fed the values `_page_and_pin_hdcas` leaves unresolved. Adds `test_build_collection_options_carries_other_history_selection`.

Superseded by the standalone branch [issue_24219_foreign_collection_carry_26.1](../../issue_24219_foreign_collection_carry_26.1/index.md) (independent of the pin fix, adds `map_over_type`). Kept only for reference; lacks the parent's later test strengthening.
