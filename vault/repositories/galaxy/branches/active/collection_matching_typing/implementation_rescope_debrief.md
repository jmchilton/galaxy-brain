Run via Claude Opus at high effort.

# Scope expansion: implementation debrief

I added three commits on top of `78266137b64`, implementing the approved scope from the [scope evaluation](scope_evaluation.md). The new head is `f45e16e607d`, pushed to `jmchilton` as a fast-forward from `78266137b64`.

1. `b0c4ee91d75` Check optional collection structures against None, not truthiness
2. `49d80d60bcd` Resolve a DCE default_identifier_source to its child collection
3. `f45e16e607d` Fully type collection type descriptions and the type registry

## 1. Linked-match and `map_over.py` truthiness

- **Change.** `MatchingCollections.__attempt_add_to_linked_match` now tests `self.linked_structure is None`.
  - The four `progress.subworkflow_structure` checks in `map_over.py` now use `is None` / `is not None`: the direct-match skip, the `elif is_data_param` branch, `_declared_collection_input_types` and `_reserve_outer_structure`.
  - I left the `progress.subworkflow_collection_info` checks (lines 45 and 53) alone. They test a `MatchingCollections`, which has no `__len__`, so their truthiness already means "not None".
- **Tests.**
  - `test_matching.py::test_empty_list_does_not_match_non_empty_list` checks both orders.
  - The new `test/unit/workflows/test_map_over.py` calls `MapOverPlanner._reserve_outer_structure` and `_declared_collection_input_types` with a `Bunch` progress whose `subworkflow_structure` is an empty `list:list` `Tree`. It follows the `cast(ProvidesHistoryContext, Bunch())` pattern from other unit tests.
- **Red on `78266137b64`, then green.** 3 failed, then 3 passed.
  - The matching test failed on its empty-first case (`assert threw_exception`).
  - `_reserve_outer_structure` returned `[]` instead of `["list"]`.
  - `_declared_collection_input_types` returned `["paired"]` instead of `["list:list"]`.
- The `map_over.py` tests guard the path. Per the scope evaluation, an empty subworkflow map-over schedules zero jobs either way. No framework workflow test was added.

## 2. DCE `default_identifier_source`

- **Change.** `ExecutionTracker._structure_for_output` resolves the source through `get_collection` before building the `Tree`, as `sliced_input_collection_structure` already does.
- **Tests.** There are two unit tests in `test/unit/app/tools/test_execution.py`, with no API test.
  - They build transient model collections. `inputA` is `[p, q]`. `inputB` is either an HDCA `[x, y]` (the control) or the `inner1` DCE `[x, y]` of a `list:list`.
  - Matching goes through `MatchingCollections.for_collections`, and the tests call `ToolExecutionTracker._structure_for_output` for an `outputB` with `default_identifier_source="inputB"`.
- **Red, then green.** Before the fix, the DCE test failed with `assert ['p', 'q'] == ['x', 'y']` and the HDCA control passed. After the fix, both pass.

## 3. Typing `type_description.py` and `registry.py`

- **Annotations.** All 19 incompletely annotated defs in `type_description.py` are annotated, and the 3 defs in `registry.py`. Collection-type parameters use `CollectionTypeLike`.
- **`mypy.ini`.** Both relaxation sections are removed, header and keys together.
- **The fallback wasn't needed.** Typing `for_collection_type(collection_type: CollectionTypeLike)` and the `can_map_over`/`accepts` parameters added no errors in any caller.
- **`hasattr` sites.** Every `hasattr(..., "collection_type")` duck-typing site keeps its semantics: `effective_collection_type`, `can_map_over`, `accepts`, `compatible` and `map_over_collection_type`.
  - In `compatible()`, mypy can't narrow `str | CollectionTypeDescription` through `hasattr`. That branch now assigns `cast(CollectionTypeDescription, ...)` to a local, and the `else` branch still converts through `for_collection_type`.
  - I tried `isinstance` first and dropped it. It would have raised for a duck-typed object with `collection_type`, such as a `DatasetCollection`, where the old code could return `True`.
- **Test setup.** `test_structure.py` and `test_type_descriptions.py` built `CollectionTypeDescriptionFactory(None)`. The typed signature rejects `None`, so both now use `CollectionTypeDescriptionFactory()`, which takes the default registry. Neither test uses the registry, and no assertions changed.

## Verification

- **Unit tests.** The command was `PYTHONPATH=lib pytest test/unit/data/dataset_collections/ test/unit/workflows/ test/unit/app/tools/test_execution.py test/unit/app/tools/test_meta_expansion.py`.

  | state | passed | skipped |
  | --- | --- | --- |
  | before (`78266137b64`) | 449 | 1 |
  | after commit 1 | 452 | 1 |
  | after commits 2 and 3 | 454 | 1 |

- **Targeted mypy.** I ran it on the touched modules and the callers of the changed APIs, against the `origin/dev` worktree.
  - The files were the earlier list, plus `model/__init__.py`, `tools/parameters/basic.py`, `tool_util/parser/output_objects.py`, `dataset_collections/{registry,query,builder,subcollections,types/__init__,types/record}.py`, and the touched and related unit tests.
  - At each commit the error set (line numbers stripped) is identical to base. The new `test_map_over.py` reports no errors.
- **Full `make mypy`** (`cd lib && mypy . ../test`) on the final head `f45e16e607d` and on base: 35 errors in 20 files on both, and the error sets are identical with line numbers ignored.
  - The branch was re-run after commit 3 was amended. Base was unchanged.
- **Formatting.** black and isort are clean, and the pre-commit hooks passed on every commit.

## Deferred

- `_structure_for_output` still uses `Tree.for_dataset_collection` over the whole source collection, not `get_structure(..., leaf_subcollection_type=...)`.
  - A source that is itself mapped over a subcollection type (e.g. `list:paired` over `paired`) still fails `compatible_shape` against the mapping structure. It falls back to the first linked input's identifiers.
  - That's unchanged here and wasn't approved as part of this scope.
- No API test was added for the DCE identifier-source path. The unit test covers the changed function.
- `subworkflow_mapping` adds another `if linked_structure:` (its `map_over.py:199`). It should switch to `is None` when that branch is rebased onto this one.
