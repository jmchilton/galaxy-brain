# Re-scope debrief

Scope evaluation recommended a modest expansion: backport 26.2's selected-collection carry (#23865 `_carry_selected_hdca`) to the 26.1 `data_collection` param so deleted / other-history selections aren't dropped.

- Implemented as one commit on top of the fix; now alt `_alt_foreign_carry` (see `alts/foreign_carry.md`).
- Deleted case is unreachable: `from_json` raises for a deleted HDCA, `check_param` stores the raw dict, so `to_dict` never sees a deleted HDCA (same on 26.2). Planned rerun test for it dropped; only the other-history case is real.
- Other-history case: red on the fix head, green with the carry (`test_tools -k build_` 21 passed, `test_jobs -k rerun` 6 passed).
- Normal review after the re-scope raised a concern that needs John's call before this can land; the expansion is held back from the main branch. Main branch returned to the original scope.
- Kept from that review on the main branch: `test_build_collection_options_pinned_matches_page_entry` now also asserts an on-page selection (incl. hidden) is listed once, unprefixed, and not pinned. Folded into the fix commit (`00cf6f95004`).
- Not re-hardened: main branch code equals the hardened original scope plus that test assertion; the expansion is parked.
