Run via Claude Opus at high effort.

# Test challenges: collection_matching_typing

Branch head before: `0f66e1d1b93`. After: `0dc79186e48` (fix + tests), `6f9d5ea1cbf` (test). Not pushed.

## Headline: the branch regressed `MatchingCollections.structure`

The rewrite `effective_structure.multiply(self.linked_structure or leaf)` uses tree truthiness, which calls `__len__`. Dev used an explicit `is None` check. Probe (scratchpad script against branch and `origin/dev`):

| case | dev | branch `0f66e1d1b93` |
| --- | --- | --- |
| map over empty list | `Tree[list, children=()]` | `None` (empty Tree is falsy, so it falls back to `leaf`) |
| `(paired, "paired")` (unenumerated linked) | `UninitializedTree[paired]` | `NotImplementedError` from `__len__` |

`structure is None` then trips the new `assert structure is not None` sites in `tools/execute.py` when mapping over an empty list. API tests likely to go red in CI: `test_workflows.py::test_empty_list_mapping`, `test_tools.py::test_run_multi_data_optional_map_over_empty_subcollection_use_cached_job` and neighbours. These weren't run (unit-only scope).

Fix (implementation change, `0dc79186e48`): restore the explicit `None` check in `matching.py`. The branch record's statement that only three spots change behavior was wrong before this fix. With the fix it's accurate again.

## Tests added

- `test_matching.py::test_structure_of_empty_list_is_empty_tree`: the structure is an empty `list` `Tree`.
- `test_matching.py::test_structure_of_unenumerated_collection`: the structure is a `paired` `UninitializedTree`.
  - Both reuse `build_collections_to_match`, `list_instance(ids=[])` and `pair_instance()`, and import `structure` through the existing package import.
- `test_structure.py::test_unenumerated_tree_rejects_element_queries`: `len()`, `walk_collections()` and `compatible_shape()` on an `UninitializedTree` raise `NotImplementedError("... children are not known")`. So does `Tree.compatible_shape(UninitializedTree)`.

## Red-to-green

- The two matching tests are regression tests, so the cycle runs in reverse. They pass on `origin/dev`, fail on `0f66e1d1b93` (`structure` is `None`, and `NotImplementedError` from `__len__`), and pass after the fix.
- The structure test fails on `origin/dev` at its own assertion (`Exception: Unknown length`, which is not `NotImplementedError`) and passes on the branch.
- Base runs copied both test files to scratch and ran them with `PYTHONPATH=lib` from the merge-base worktree. The base `lib` was confirmed as the one imported. The worktree was not modified.
- `test/unit/data/dataset_collections` plus `test/unit/workflows/test_modules.py`: 222 passed. The other unit-test users of this code are `test/unit/app/tools/test_execution.py` and `test_meta_expansion.py`, found by grepping for `MatchingCollections`, `collection_info`, `ExecutionTracker` and `walk_implicit_collections`. They passed too (36).
- mypy on `matching.py`, `structure.py`, `tools/execute.py`, `workflow/map_over.py` and `workflow/modules.py`: no errors in those files. The 23 errors reported are all in transitively checked, unrelated modules.
- black, isort and ruff are clean, and the pre-commit hooks passed.

## Focus items without new tests

1. **`when_values` no longer set on the shared `leaf`.** The `when_values` readers are `Tree.walk_collections` (through `slice_collections` and `ExecutionTracker.walk_implicit_collections`) and `map_over.py`/`modules.py`. All of them read it from a `MatchingCollections` or a `Tree`, never from a `Leaf`. `structure` can only reach `Leaf` with no linked or unlinked structures, and `for_collections` returns `None` in that case. So the old write mutated a module singleton nobody reads. A `hasattr(leaf, "when_values")` test would test the implementation, so I skipped it.
2. **`NotImplementedError` vs `AttributeError`/`Exception`.** No `except` site catches either old type around structure calls. The checked sites are `tools/execute.py:616`, `tools/actions/__init__.py` (974, 1050, 1345, 1365), `managers/collections.py:753`, `workflow/modules.py` and `workflow/run.py`. All of them wrap unrelated calls, so only the new structure test was needed.
3. **`map_over.py` skips nameless step inputs.** `WorkflowStepInput.name` is nullable in the model. On dev a nameless input would hit `input_connections_by_name[None]`, which works because connections are keyed by `conn.input_name`. It would then add a `None` key to `CollectionsToMatch`, where `sorted()` fails with `TypeError` beside string keys. Current code never creates one, because `get_or_add_input` always sets the name and is the only creator besides `copy`. Only legacy DB rows with a null name could reach it. I skipped a test because it would need a fake `WorkflowProgress` driving a private method.
   - The removed `when_value is not False` check in `ToolModule.execute` was redundant. The enclosing `if step.when_expression and when_value is not False` already guards it, and `when_value` isn't reassigned in between.
4. **Dead code** (`Leaf.sliced_collection_type`, which returned the builtin `input`, and the no-op `pass` branch in `tool_output_to_structure`): nothing to test.

## Pre-existing, not fixed

- `__attempt_add_to_linked_match` has the same truthiness bug: `if not self.linked_structure:`.
  - If an empty list is linked first and a non-empty list second, the second silently replaces the first instead of failing with `CANNOT_MATCH_ERROR_MESSAGE`. This reproduces on both dev and the branch.
  - If an `UninitializedTree` is linked first, the second linked input raises from `__len__`.
  - An `is None` check fixes both, but it changes matching semantics, so it belongs in a separate branch.

## Existing tests challenged

- Checked against `doc/source/dev/writing_tests.md` (Backend/Python Unit Tests): the tests are stand-alone pytest functions in `test/unit`, with no Galaxy instance and no doctests. The structure test keeps four `pytest.raises` blocks in one test because they share a fixture and a single contract, and the failure line shows which call broke.

- The branch's `isinstance(tree, Tree)` narrowings in `test_structure.py` strengthen the tests and are kept.
- The existing fixtures (`MockCollection*` classes) are plain classes rather than `unittest.mock`. They're shared with `test_structure.py`, so I left them alone.
- No E2E or API test is warranted for a typing branch. The empty-list regression is already covered by the existing API tests named above.
