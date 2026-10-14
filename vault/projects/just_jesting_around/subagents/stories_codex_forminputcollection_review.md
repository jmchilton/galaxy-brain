# FormInputCollection stories review — 28e7b8f77a5

Reviewed 2026-10-14. Independent read-only review approved against 95ba7467fff without blocking or recommended findings.

## Assertion mapping

All three original cases and eight assertions remain unchanged. Initial FormCollectionType value exactly list (1). Deferred edit shows the column child, then emits exact sample_sheet:paired collection type and original CONDITION_COLUMN definitions (3). Older echo on the same mounted instance retains sample_sheet:paired, finds the optional field, adds exactly one emission and matches paired type plus optional true (4).

First two cases compose DatasetList and inspect the actual component's children/emissions. Older echo retains plain full mount and live setProps. Original encoded state, ID and type preserved in a complete typed Step; existing step and datatype fixtures reused. Both scenarios have readable visible states and signed-in setup.

Fake timers begin after mount and the exact 500 ms advance completes the deferred emission before cleanup. Original cleanup registration and owned story/plain mount handling retained. No production or shared helper changed.

## Validation

Reviewer inspected targeted unit 3/3, conditional Chromium probes 2/2 and clean types; no extra gates or edits. Probes verified list/no-column and paired/Condition field states, then were removed. Collection input with native datalist correctly uses combobox role. Full gates passed unit 735 tests in all 94 selected files and Chromium 352 tests in 93 files. Formatting, lint and normal hooks passed; fast-forward push completed.
