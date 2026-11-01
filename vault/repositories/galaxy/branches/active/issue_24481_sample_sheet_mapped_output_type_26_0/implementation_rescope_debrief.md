# Re-scope debrief

Trigger: [scope_evaluation.md](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion (Scope B). The original fix demoted only a *leading* `sample_sheet`. Unlinked (cross product) batch inputs could still compose `list:sample_sheet`, or `list:sample_sheet` from `sample_sheet × sample_sheet`, and keep the inner sample sheet columns.

The original scope is kept as `issue_24481_sample_sheet_mapped_output_type_26_0_alt_original_scope` at `381ea4573e1` ([alts/original_scope.md](alts/original_scope.md)).

## What changed

- `cc76cb4b921`:
  - `map_over_collection_type` now applies `demote_sample_sheet_ranks` to any composed type that fails `COLLECTION_TYPE_REGEX`; every `sample_sheet` rank becomes `list`.
  - `Tree.multiply` keeps columns only while the result is still a sample sheet. Otherwise it retypes nested sample sheet structures as lists and drops their columns (`_demote_sample_sheets`), for both `Tree` and `UninitializedTree` children.
  - The client `append` mirrors this with `demoteSampleSheetRanks`.
  - New tests: cross-product type rows, unlinked structure cases, a vitest case, and the API test `test_unlinked_map_over_list_and_sample_sheet` (`cat1`, list × sample sheet → `list:list`, with no columns).
- `25e8710ad19`: review-2 cleanups ([subagents/review_2.md](subagents/review_2.md)).

## Validation

- The new unit, vitest and API cases fail on the original-scope code. Each was checked by reverse-applying the patch; no stash was used.
- Passing locally: 106 dataset-collection unit tests, the `test_modules.py` cases, editor-module vitest, and the 4 sample sheet API tests in `test_tool_execute.py`.
- ruff, black, isort, mypy and prettier are clean.
- A 2000×500 list multiply has the same performance as before (measured by the reviewer).

## Remaining limitation

A `type_source` output whose source is an unmapped sample sheet, batched over a list, still creates `sample_sheet` children under a `list:list` parent at job time (`create_collection` in `tools/actions/__init__.py`). The scope evaluation's claim that Scope B covers this is narrowed. It belongs with the `type_source` work (#24303/#24308).
