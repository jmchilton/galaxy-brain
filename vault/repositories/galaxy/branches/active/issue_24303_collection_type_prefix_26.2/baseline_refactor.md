I added one refactor commit after "Baseline tests": `1de9e4ee662` "Extract step input/connection helpers from get_step_map_over". It pulls the helper extraction out of the subworkflow export fix and applies it to the base with no behavior change.

## What moved

`27e2be7a655` ("Resolve sliced type_source type in subworkflow editor export") did two things at once: it restructured `WorkflowContentsManager.get_step_map_over` / `_resolve_collection_type` in `lib/galaxy/managers/workflows.py`, and it changed the map-over semantics. The restructuring now sits on the base as commit 2:

- `_step_data_input(step, input_name)` finds the tool input definition. Base inlined this lookup.
- `_connected_collection_type(steps, input_connection)` finds the upstream output's collection type. Base inlined this lookup twice, once in `get_step_map_over` and once in `_resolve_collection_type`.
- `_input_map_over(current_data_input, collection_type) -> str | None` holds base's string algebra unchanged: the exact-match check, the `endswith` suffix loop for the lowest map-over, and the whole type returned when nothing matches.

Two small differences, neither a behavior change:
- The input lookup moved out of the per-connection loop. This only changes how many times the existing "failed to find input" log message fires.
- `_resolve_collection_type` now assigns `None` when a connection names an output that doesn't exist. Base skipped that assignment. That case only arises in an invalid workflow, and HEAD already behaved this way.

Two commits had to be resolved by hand:
- `63e3b3f2518` (now `b1680b741e5`): `_prefixed_collection_type` wraps `_connected_collection_type`.
- `27e2be7a655` (now `3ed14a9ad0f`): the file is taken verbatim from the original commit. Its `workflows.py` delta drops from 157 to 76 lines. What remains is the actual fix: `_input_map_over` returns a `(map_over, slice)` tuple, the check uses `CollectionTypeDescription` `accepts` / `can_map_over` / `effective_collection_type`, and the sliced type has the prefix applied.

All other commits are byte-identical in `range-diff`. Matthias Bernt's Nest fix keeps his authorship.

## Considered, not refactored

- NestTool's `get_collection` / `dce.hda` change is part of the slice bug fix, not a refactor.
- Client `prefixedCollectionType` and the `structure.py` `elif` are new feature code.
- Type annotations on `for_collection_type` / `multiply` are too small to justify their own commit.
- Moving `_input_map_over` into `type_description.py` (thermo review #4) would be a new refactor, not a reordering of existing work, so it's out of scope here.
- `27e2be7a655`'s semantic switch could become a standalone fix (scope_evaluation option B). I didn't split it.

## Verification

- `git diff 772364db7ae HEAD` is empty, so the final tree is unchanged.
- On the refactor commit, `test/unit/workflows/test_modules.py` passed (89 tests). This includes `test_subworkflow_map_over_type`, which pins base `get_step_map_over`. black and flake8 are clean. mypy reports no errors in `managers/workflows.py`.
- On HEAD, `test_modules.py` plus `test/unit/data/dataset_collections` passed (205 tests).
- I didn't rerun the API, framework or Selenium tests, because the final tree is identical to the one they already ran against.

New head: `e0239d8d74b` (15 commits on `origin/release_26.2`). Not pushed. The old head was `772364db7ae`.
