# Initial implementation debrief

```
created .../differential-review/snapshots/20261028T151809Z-implementation-1274f58d63d1.json
  implementation @ 1274f58d63d1 vs origin/release_26.0 (merge-base e27589acb8d2)
  first snapshot: 3 commits, 4 files, 5 hunks
```

## What

- New `DatasetAssociationManager.get_accessible_converted(trans, item, target_ext)`: wraps `item.get_converted_dataset` and runs the converted dataset through the manager's `dataset_manager.is_accessible`, raising `ItemAccessibilityException` otherwise.
- Callers moved onto it: `DatasetsService._get_or_create_converted` (`converted/{ext}`), `_search_features` (`fli`), custom builds `len`/`linecount` in `api/users.py`.
- Commits: baseline test (`converted/{ext}` returns the existing conversion), fix + 403 test, docstring tweak.

## Decisions

- 403 rather than starting a fresh conversion: the model lookup returns the first association, so a fresh one would never be returned.
- Kept `_get_or_create_converted` returning `get_converted_files_by_type` to preserve bam/bai metadata behaviour.
- Tests seed the conversion via the `implicit_conversion` test tool (fasta→tabular). Calling `converted/{ext}` to create one 500s for API-key clients on 26.0 (no current history), which is sibling `issue_24529_custom_build_fasta_history_26.0`'s bug. Kept independent of that blocked branch.
- `converted/{ext}` response ids appear double-encoded on base; tests match on `hid`. Pre-existing, not addressed.

## Not covered

- No tests for custom-build or feature-search paths (no test tool consumes `len`).
- Other `get_converted_dataset` callers untouched: `visualization/genomes.py`, `managers/dbkeys.py`, data-provider `registry.py`, tool-input implicit conversion.

## Tests

- `test_datasets.py::test_converted_ext_returns_existing_conversion`, `::test_converted_ext_checks_conversion_access` pass; `test_users.py` custom-build tests pass. ruff/mypy clean on changed files.
