No new refactoring of the base branch was performed. The two base refactor commits from the prior round (`a5de02c79cf`, `f7603faeb1f`) stay at the bottom with the same SHAs. The owned-current-history and thermo-cleanup commits were folded into the fix, and the pending-dependency 202 commit is kept as its own commit on top. Final tree identical to old head `c60840e7689`. New head `025d2d5450c`, force-pushed to `jmchilton`.

## New history

Merge-base with `origin/release_26.0` is unchanged (`29d1801ad21`).

1. `a5de02c79cf` Add custom build populator helpers (refactor, unchanged).
2. `f7603faeb1f` Route API dataset conversions through HistoryManager (refactor, unchanged).
3. `897eabb92b3` Pass conversion context to dependency converters (backport carry, unchanged).
4. `bb3f23dc1c9` Stop double-encoding ids in converted/{ext} response (unchanged).
5. `814c879279f` Run API conversions in an active history the user owns (fix, #24529). This is old `0a6c27e2cae` with `631784c3100` and `c60840e7689` folded in. The message now says "their own current history", and that ownership is compared by user id (admins) and anonymous users use only the session's history.
6. `025d2d5450c` Return 202 from converted/{ext} while conversion deps are pending. Clean cherry-pick of `1ba51ea6acc`.

## Decisions

- **New commits re-evaluated for base refactors:**
  - `631784c3100` (owned current history) and `c60840e7689` (`usable()` predicate, `can_convert_to`, `_is_active` removed) only change `_history_for_conversion`/`get_converted_dataset`, and that code doesn't exist on base. Nothing in them can be pre-applied, so both were folded into the fix. That also removes the add-then-remove churn of `_is_active`.
  - `1ba51ea6acc` changes behavior (500 to 202), so it isn't a refactor. It also fixes a separate bug that exists on base for session users. Its test needs the fix (`get_converted_dataset_raw`, keyless history resolution) and the dependency-context backport, so it stays after the fix as its own commit.
- **Still no base consumers for the fix's raw helpers:** `get_converted_dataset_raw` and `search_dataset_features_raw` have none on base, so they stay in the fix commit.
- **No "Baseline tests" commit.** Same reasoning as the prior round.

## Notes

- New restore point: local `backup/issue_24529_pre_baseline_refactor_2` at `c60840e7689`. The local `backup/issue_24529_pre_baseline_refactor` (at `2b86cad3ba8`) was not touched.
- Old to new SHAs: `0a6c27e2cae` + `631784c3100` + `c60840e7689` became `814c879279f`, and `1ba51ea6acc` became `025d2d5450c`.
- Commits 1–4 have the same SHAs, so the prior round's per-commit validation of them still holds. They were not re-tested.
- Not rebased onto the current `origin/release_26.0` tip. Out of scope.

## Validation

- `git diff c60840e7689 025d2d5450c` is empty.
- At `814c879279f` (the only new intermediate tree):
  - ruff/black/isort/mypy clean on the 6 changed Python files.
  - Unit `test_actions.py` + `test_HistoryManager.py`: 41 passed.
  - API `test_datasets.py -k "converted or search_features or raw_data_no_converter"`: 5 passed. The 202 test lands in the next commit.
  - API `test_users.py -k custom_build`: PENDING
- At head `025d2d5450c`: PENDING
