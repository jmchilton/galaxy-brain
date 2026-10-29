# galaxy#24601 — Preserve history selection when leaving the Auto/Advanced Build List wizard without creating

[Issue](https://github.com/galaxyproject/galaxy/issues/24601)

Follow-up to #24487: wizard open clears history selection, leaving loses it; propose clearing on create instead. Recommend: file after #24487 merges and lands on dev.

Fixed on #24487 branch `issue_24469_collection_build_reset_selection_25.1` (f5b8dd09912): store counter `collectionsCreated` bumped by ListWizard on create; SelectionOperations exits selection mode on it. Jest + Selenium (`test_build_list_open_keeps_selection`) green locally.
