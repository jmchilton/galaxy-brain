One behavior-free refactor moved to the base: `4cba87aa0c9` names the generated composite-data rename prefix (`COMPOSITE_DATA_RENAME_PREFIX` in `parser/util.py`, used by `parser/xml.py`). The fix and the Codex follow-up now touch only `parameters/case.py` and tests.

## New history

Base `df713519127` (`release_26.1`):

1. `23d7dbe5c7d` Baseline tests (unchanged, still first)
2. `4cba87aa0c9` Name the generated composite data rename prefix (new; split out of the old follow-up `77097faf349`)
3. `651b0dd6d0d` Fix (was `74913630f85`, content unchanged)
4. `497b90bc667` Codex follow-up (was `77097faf349`, minus the parser hunks)

`git diff 77097faf349 497b90bc667` is empty, so the final tree is the same. No other site uses the `_COMPOSITE_RENAMED_` literal.

## Hunks left in the fix commits (they change base behavior)

- `test_case_validation` building state inside the `try`: a state-build error becomes a per-test validation error, not the tool-wide "Serious problem parsing". It also mirrors dev `262e080dfe0` to keep merge-forward easy.
- `_inputs_as_dict` → `_inputs_by_name`: on base, the duplicates would reach `input_for`, which would take the first one where base takes the last.
- `input_for` exact matches going through `_resolve_matching_inputs`: this is the fix.
- `_comparable_test_input`: it changes comparison on the existing unqualified-duplicate path too. A stub version with no normalization would be ceremony.
- Parser `edit_attributes` stored as dicts: deferred to dev (thermo-nuclear review), because it changes parsed output for external consumers.

## Tests

The 3-file command passed at every commit: 142/142/150/153 passed, 1 skipped each.
