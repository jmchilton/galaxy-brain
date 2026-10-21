# Re-scope debrief

Round 1 [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended "expand modestly" with three items. Original scope kept as `issue_24328_data_table_mismatch_26.1_alt_original_scope` ([alts/original_scope.md](alts/original_scope.md)).

## Taken

- (2) `TabularToolDataTable.merge_tool_data_table`: bare `assert` → `DataTableColumnMismatch`, so every column-conflict path raises one type and the check survives `python -O`. New commit `929ae441c3d` + unit test `test_merge_tool_data_table_raises_column_mismatch` (red first: `AssertionError`; asserts no mutation before the raise).
- (3) Dead `existing.columns is not None` in `install_tool_data_tables` dropped; folded into the `columns` refactor commit `8fbd5381555`, since declaring `columns` is what makes it dead.

## Not taken

- (1) Moving `reset_tool_data_tables` off `BaseShedToolDataTableManager` into the Tool Shed. It's a public method on a 26.1 release branch, imported externally; the evaluation itself suggested keeping a shim, which leaves nothing gained. Galaxy no longer calls it; added a "Tool Shed only" comment instead. Dev follow-up.
- Optional D (atomic strict load), E (26.0 backport) and the rest: unchanged from the evaluation's own advice.

## Result

5 commits on `release_26.1`: `8fbd5381555` declare columns (refactor), `72611eb6e1d` integration helper (test refactor), `bb16bfeac15` startup skip, `8f07de3c584` don't wipe registry, `929ae441c3d` merge raises typed error. Unit 43 passed; `test_tool_data_delete.py` integration 2 passed (run before the last test-only/comment tweaks). [Re-scope review](subagents/rescope_review.md): no blockers, all findings addressed.
