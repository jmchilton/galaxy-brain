# PR #23714 — Don't duplicate MetadataFile rows when re-importing edited metadata

PR: https://github.com/galaxyproject/galaxy/pull/23714  
Reviewed head: `b37de64b702a3a013ee4254e1672cf4a0392ac50`  
Base: `release_26.1` (current `origin/release_26.1` was `e03fbb5de35efe894d2dfa72c1b33f80e1b0291b` during review)

## Summary

This is a focused repair for duplicate `metadata_file.uuid` rows produced when an editable extended-metadata import updates an existing dataset. The import now reuses the oldest matching row when it belongs to the target HDA/LDDA, and metadata assignment avoids copying a row that already belongs to that target. `FileParameter.wrap` also selects the oldest matching row deterministically so datasets already affected by duplicate rows can be serialized again.

## Findings

No blocking findings.

The implementation matches the reported failure mode and preserves the important distinction between editing an existing dataset and importing a new dataset. In particular, it does not attach another dataset's `MetadataFile` row directly to the target. The `make_copy` fast path is appropriately limited to a file already owned by the exact target HDA/LDDA.

The PR explicitly documents a remaining edge case: an archive imported as new datasets can create another row for an already-used UUID, while later UUID lookup resolves to the oldest row. The added test only establishes that this import remains usable. That limitation is real, but it is not a regression from this patch and does not block the targeted production repair.

`release_26.1` advanced after the PR branch point, but the intervening changes are in the job deletion path rather than any of the three files changed here. GitHub reports the PR mergeable.

## Tests and CI

- Focused local regression selection: 3 passed.
- Full `test/unit/data/model/test_model_store.py`: 37 passed, 1 expected failure.
- `git diff --check`: clean.
- GitHub CI at the reviewed head: all reported checks successful (including Python linting on 3.10/3.14, unit tests on 3.10/3.14, PostgreSQL unit tests, package tests, API/integration/framework tests, and CircleCI).

## Recommendation

Approve and merge. The fix is suitably narrow for the release branch, repairs existing affected rows at read time, prevents the known edit-import path from creating more duplicates, and has direct regression coverage.
