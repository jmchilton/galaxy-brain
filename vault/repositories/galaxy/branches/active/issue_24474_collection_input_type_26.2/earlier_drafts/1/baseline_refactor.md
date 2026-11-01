Run via Opus 5.5 at low effort.

Moved the `HistoryQuery` type-string split (`direct_match_type` / `can_map_over_type`) out of "Reuse HistoryQuery for the data_collection type check" into its own behavior-neutral commit directly after "Baseline tests". The rest of the branch is unchanged, and the final tree matches the old HEAD exactly.

## What changed

Old HEAD `7b651353741` became new HEAD `b6791d07a7c`. `git diff 7b651353741 b6791d07a7c` is empty. Nothing was pushed.

New history (`origin/release_26.2..HEAD`, oldest first):

1. `b50680eaf60` Baseline tests for data_collection input type handling (unchanged, still first)
2. `394b2bfb762` Give HistoryQuery collection-type-string match variants (**new**: only the `lib/galaxy/model/dataset_collections/query.py` hunk; `direct_match` / `can_map_over` become thin HDCA wrappers around the new type-string methods; no behavior change)
3. `c3b8ee63b09` Reject data_collection inputs of undeclared collection types
4. `50b6778afb6` Let workflow runtime collection values map over
5. `0e98bc2e8a3` Only exempt real batch wrappers from the collection type check
6. `6ab5e05134f` Reuse HistoryQuery for the data_collection type check (no longer touches `query.py`; commit message updated to match)
7. `b6791d07a7c` Unit test allow_map_over and subcollection elements in the collection type check

## Why this split and no more

- The `query.py` change is a pure extract-method refactor of existing `HistoryQuery` behavior. It applies cleanly to the base, and reviewers can check it on its own.
- The rest of the "Reuse HistoryQuery" commit replaces the fix's own hand-rolled match loop and renames `allow_collection_map_over` to `allow_map_over`. Both changes only touch code added by this branch, so neither applies to the base. Folding them back into the fix commits would mean rewriting three fix commits for a cosmetic history gain, so they stay as a follow-up commit.

## Verification

At each new commit, `PYTHONPATH=lib pytest -p no:postgresql test/unit/app/tools/test_data_collection_parameters.py test/unit/data/dataset_collections` passed with these counts: 100 (baseline), 100 (refactor), 107, 107, 107, 107, 114. `ruff check` on `query.py` at the refactor commit was clean.

Side note, not acted on (the tree had to stay identical): when mypy runs on `query.py` alone, it reports "missing return type annotation" for `can_map_over_type` and for the existing unannotated methods, including `can_map_over`. The new method follows the existing style. Adding `-> bool` to it would be a harmless follow-up.
