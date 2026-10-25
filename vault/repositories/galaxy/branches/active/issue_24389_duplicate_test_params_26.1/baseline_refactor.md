The round 1 base refactor is kept (`07ba880404c` names the composite rename prefix) and no new refactor was added. History was cleaned up: every commit now adds its tests straight to `test_parameter_test_cases_duplicates.py`, the relocation commit is gone, and the content-comparison commit was folded into the fix because the fix failed the baseline tests without it.

## Refactor evaluation

- `COMPOSITE_DATA_RENAME_PREFIX` (`parser/util.py`, used by `parser/xml.py`) stays as the only base refactor. It doesn't change behavior.
- `edit_attributes` stored as dicts (re-scope, `6b6251ff6e2`): not a refactor. It changes parsed output and fixes the `to_dict()` JSON serialization bug, so it stays with the feature work.
- The rest of the fix hunks change base behavior; see round 1's list (`earlier_drafts/1/baseline_refactor.md`). The re-scope didn't change that.

## History hygiene

Old head `f8761cc62c4` → new head `60607462357`, base `df713519127` (`release_26.1`):

1. `f6d8ce3bcbb` Baseline tests (was `2a2ff57e989`). It creates `test_parameter_test_cases_duplicates.py`, and its lib matches base.
2. `07ba880404c` Name the generated composite data rename prefix (was `337009b5b44`)
3. `0887ec8a863` Reject conflicting duplicate test params (was `dd0e5727580` + `53caa8b2b42`, folded; the message gained a paragraph on content comparison)
4. `6b6251ff6e2` Store test edit_attributes as dicts (was `c33a26283d7`)
5. `60607462357` Ignore generated composite renames inside duplicate test collections (was `50717f7c63e`)

The old commit 7 (`f8761cc62c4`, the test relocation) was dropped.

Why the fold: the original fix commit `dd0e5727580` failed 2 of its own baseline tests, `test_duplicate_identical_data_test_param_with_children_is_tolerated[edit_attributes|composite_data]`. It compared attributes by identity (XML elements, per-param generated composite names), and `53caa8b2b42` fixed that. I confirmed the failure on the original commit, not only on the rewrite.

How the intermediate duplicates modules were built: each one is the original commit's test block, plus only the imports that commit needs (`re`/`validate_test_cases_for_tool_source` from the fix onward, `json` from the dicts commit onward). isort, black, `ruff@0.15.13 check` and the pre-commit hooks all pass.

## Verification

- `git diff f8761cc62c4 HEAD`: empty.
- For each commit, `lib/` and `test_tool_linters.py` match the corresponding original commit (the fold matches `53caa8b2b42`).
- `test_parameter_test_cases.py` is identical to base at every commit; `git log --stat` never lists it.
- 4-file pytest command: 144 / 144 / 153 / 154 / 155 passed, 1 skipped each.
- Red check: with base `case.py` and `xml.py` dropped into HEAD, 10 new tests fail (conflict rejection, legacy profile, conflicting edit_attributes, JSON round trip, 2 linter cases). The identical-composite-collection test passes on base: it guards the fix against over-rejecting.
