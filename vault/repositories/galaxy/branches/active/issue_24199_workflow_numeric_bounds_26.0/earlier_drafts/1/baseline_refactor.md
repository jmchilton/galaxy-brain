Split the FormNumber `isAboveMax`/`isBelowMin` helper extraction into a behavior-preserving refactor commit ahead of the fix; folded the "Simplify" commit into the fix and optional-clear commits.

## New history (on `release_26.0` @ `a6544be047d`)

1. `01a8f0c4783` Baseline tests for workflow numeric parameter ranges — unchanged.
2. `22d2cef086d` Extract FormNumber range bound helpers — adds `isAboveMax`/`isBelowMin`, uses them in `isOutOfRange` and `showOutOfRangeWarning`. Both already had the `typeof == "number"` guard, so no behavior change. `onInputChange` keeps base's unguarded `value > this.max` (min-only bug preserved).
3. `220c6107a4b` Send workflow numeric input bounds to the run form — `modules.py` in final form (bounds passed straight through, `parameter_kwds: dict[str, Any]`), `test_modules.py` in final form, and the one-line `onInputChange` switch to `isAboveMax` that fixes the min-only snap-to-null. Fix diff in `FormNumber.vue` is now that single line.
4. `bfe5dc0e49f` Let optional bounded number fields be cleared — empty/undefined guard in `isOutOfRange` + its test.

Final tree identical to old head `bdcb548a9a9` (local backup branch `issue_24199_workflow_numeric_bounds_26.0_pre_refactor`).

## Considered, not split

- `parameter_kwds` type widening in `modules.py`: only needed because of the new `min`/`max` entries; meaningless alone, kept with the fix.

## Verification

Each of commits 2–4: `test/unit/workflows/test_modules.py` (65 / 70 / 70 passed) and `src/components/Form/` vitest (115 / 115 / 116 passed). Red check: commit 3's `FormNumber.test.js` against commit 2 fails (`expected [ null ] to deeply equal [ 5 ]`), so the fix is still red-to-green after the refactor.

Pushed to `jmchilton` with `--force-with-lease` (bdcb548a9a9 -> bfe5dc0e49f).
