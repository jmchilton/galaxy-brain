Split the behavior-preserving `.ci/validate_test_tools.sh` rewrite (shellcheck-clean `set --` loop, guarded `cd`) into its own commit ahead of the fix.

## Commits (base `release_25.1` `2ae14b0eac3`)

1. `fe374b41698` Make validate_test_tools.sh shellcheck-clean — refactor only. Test tool list identical to the old `ls | grep` form (279 files, compared on 25.1); shellcheck clean.
2. `cead13cc9d8` Allow sample_sheet collection types in tool XSD — XSD patterns plus the core-tools loop in the CI script.
3. `7ccd03c658d` Document sample_sheet in param collection_type XSD docs — unchanged.

Final tree identical to the pre-refactor head `0b14b1e8c4b`. Pushed to `jmchilton` (force-with-lease); local `xsd_ss_backup_pre_refactor` keeps the old head.

## Not split

- `CollectionTypeList` restructure (`[:,]` tokens to `TYPE(,TYPE)*`): accepts the same set without sample_sheet, but it's one regex line that only exists to keep `list:sample_sheet` invalid. Splitting it adds churn, no review value.
- XSD trailing-space strip: a pre-commit side effect of touching the file, so it stays with the XSD commit.
