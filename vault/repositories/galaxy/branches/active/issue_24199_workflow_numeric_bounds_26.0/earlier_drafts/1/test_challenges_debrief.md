# Test challenges debrief

One change: the `None`/`None` case in `test_parameter_input_range_reaches_run_form` already passed on the base. I moved it into the baseline commit as its own test, `test_parameter_input_without_bounds_is_unbounded`, and cleaned up how the parametrize list is built. I rebased the branch with autosquash and pushed it with `--force-with-lease` to `jmchilton`. New head is `5481c9a2b31` (`01a8f0c4783` baseline, `f6d27d6e82b` fix, `5481c9a2b31` review fixes).

## Red/green checks (run)

- Baseline commit tests against base `modules.py`: 65 passed.
- Head `test_modules.py`: 70 passed.
- New `reaches_run_form` cases against base `modules.py`: all 5 fail at the `(min, max)` assertion. Before the change, `None`/`None` was a 6th case that passed on base. It is the one I moved.
- `FormNumber.test.js` against base `FormNumber.vue`: the single-bound test fails (`[null]` vs `[5]`) and the clear-optional test fails (alert shown), each at its own assertion. The other 9 pass. The baseline version of the single-bound test leaves out the min-only value assertion, so it passes on base. The fix commit adds that assertion.

## Challenges

- **Python unit tests: are they implementation tests?** No. They test `get_runtime_inputs(...)` through the public parameter API (`to_dict`, `validate`). `len(validators) == 1` is the only check close to an internal detail. It guards against double validation from the new min/max plus validator path, so I kept it.
- **Silly or duplicated?** No. Nothing at the API, integration or Selenium layer covers workflow numeric bounds.
- **Move to the API layer?** No. The run form is a thin loop over these same calls. gxformat2 cannot express parameter bounds, so an API test would need a hand-built native `.ga` workflow with a persisted `in_range` validator. That costs a lot to cover what the unit test already covers.
- **Mocks:** only the shared `MockTrans`, plus `workflow_building_mode` set on it. There is no SimpleNamespace or ad-hoc mock to replace.
- **Restructure for testability?** I considered extracting the range-validator split into a helper function. I didn't, because testing through the module's public output is better here and no mocks would go away.
- **Vitest:** follows the file's existing `mount` and helper-closure pattern (`checkFractionsAlert`). The tests check emitted values and rendered alerts, not `vm` internals.
- **E2E:** none added. The bug is user-visible (no slider or range warning), but both sides are pinned by unit tests: the server emits `min`/`max`, and `FormNumber` acts on them. The `FormElement` → `FormNumber` `:min`/`:max` passthrough already exists. A Selenium test would need a native workflow fixture with validators, or would have to drive the editor's bounds UI. That cost is out of proportion for a 26.0 point fix. A reviewer could reasonably ask for one.

## Status

No blocker. Status can stay READY.
