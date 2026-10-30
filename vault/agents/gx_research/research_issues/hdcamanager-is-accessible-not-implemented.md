# HDCAManager advertises get_accessible but is_accessible is unimplemented

- Area: lib/galaxy/managers (HDCA access)
- Found while: [[Component - Dataset and Collection Access Checks]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`HDCAManager` (`lib/galaxy/managers/hdcas.py:63-125`) mixes in `secured.AccessibleManagerMixin` but overrides only `is_owner` (`:113`), not `is_accessible`.

- The mixin's `is_accessible` (`lib/galaxy/managers/secured.py:36-41`) raises `exceptions.NotImplemented` (HTTP 501, `lib/galaxy/exceptions/__init__.py:299-301`).
- So `hdca_manager.is_accessible`, `get_accessible` and `error_unless_accessible` all fail with 501.
- Nothing calls them at this SHA. HDCA reads go through `DatasetCollectionManager.get_dataset_collection_instance` → `__get_history_collection_instance` (`lib/galaxy/managers/collections.py:960-975`), which applies the history rule.
- `HDAManager.get_accessible` does work, so a developer reaching for the parallel HDCA call (for example, when checking a job's hdca input) gets a 501 at runtime instead of an access decision.

## Evidence / repro

`grep -rn "hdca_manager\.\(is_accessible\|get_accessible\|error_unless_accessible\)" lib/` returns nothing. Calling `app[HDCAManager].is_accessible(hdca, user)` in a unit test raises `NotImplemented`.

## Suggested fix

Implement `HDCAManager.is_accessible` to delegate to `HistoryManager.is_accessible(item.history, user, **kwargs)`. That is the same rule `__get_history_collection_instance` uses, and it needs a `HistoryManager` dependency or a lazy lookup. Alternatively, drop `AccessibleManagerMixin` from `HDCAManager` so the API doesn't advertise the method. Add a unit test in `test/unit/app/managers/` either way.

## Related

- `vault/repositories/galaxy/branches/active/compare_runs/` (needed an HDCA rule and chose history owned/importable/shared)
