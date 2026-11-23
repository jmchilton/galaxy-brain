Run via Claude Opus at high effort.

**Recommendation: a modest expansion. Keep the typing as implemented and fix two latent bugs in code the branch already rewrites. The first is the `is None` check in `MatchingCollections.__attempt_add_to_linked_match`, done together with the four `progress.subworkflow_structure` truthiness checks in `map_over.py` so the same bug class is handled the same way everywhere. The second is resolving the `default_identifier_source` collection through `get_collection` in `ExecutionTracker._structure_for_output`. Also type `type_description.py` and `registry.py` fully and drop both from `mypy.ini`.**

Both bugs are user-reachable. I probed them against the branch's `lib` and traced the rest of the path through the code:
- **Empty list linked first (workflows).** A tool step's linked inputs are matched in input-name order. If the first input is an empty list and another is not empty, the invocation fails with a generic `unexpected_failure` that carries no details and no step id. The cause is a `KeyError` from `DatasetCollection.__getitem__`. With the input names the other way round, the same step fails cleanly with "Cannot match collection types."
- **DCE source.** When a map-over's identifier source is a `src: "dce"` input, `default_identifier_source` is silently ignored. The output takes the first linked input's element identifiers instead.

Both lines are unchanged on `subworkflow_mapping` and on `release_26.2`, so fixing them here carries through the rebase.

Typing the two neighbors finishes the file commit 2 already opened.

No contraction. The three behavior tweaks are small and each is pinned or required by the types. `subworkflow_mapping` still types `structure` as `BaseTree | None`, but every consumer there asserts the `None` away, so the rebase can drop those asserts rather than undo this contract.

Leave out three things, because `subworkflow_mapping` redesigns or depends on each of them:
- `when_values` passed into the walk;
- removing the `is_leaf`/`children_known` flags;
- caching `structure`.

# Scope evaluation

The branch has four commits on `origin/dev` `7dd58b00674`, head `78266137b64`. It changes 9 files, +281 −120. About 230 of the added lines are non-test, and none of the code is generated.

## Possible Decompositions

Splits 1 and 2 need no rewriting. Splits 3 and 4 split commit 4.

1. **One PR (as is).** Commits 1 to 4.
2. **Prep, then typing.**
   - PR A: commits 1 to 3. These are the empty and unenumerated structure tests that pin `dev` behavior, the `CollectionTypeLike` alias and return types in `type_description.py`, and the dead code removal. Each is behavior-neutral on `dev`.
   - PR B: commit 4, after A.
3. **Structure, then matching.**
   - PR A: commits 1 to 3.
   - PR B: `structure.py` typing. That covers the `BaseTree` ABC, `UninitializedTree` owning `NotImplementedError`, `CollectionSlice`/`WhenValues`, the `walk_collections` rewrite and `_child_collection`. It also takes the `Tree.for_dataset_collection` call in `execute.py`, the `test_unenumerated_tree_rejects_element_queries` test and the `structure` entry in `mypy.ini`.
   - PR C: `matching.py` typing. That covers `CollectionToMatch`, the non-optional `structure`, the call-site narrowing in `execute.py`, `modules.py` and `map_over.py`, and the `matching` entry in `mypy.ini`. It needs B.
4. **Behavior tweaks apart.**
   - PR A: the nameless step input skip in `map_over.py` and the removal of the redundant `when_value is not False` in `ToolModule.execute`, each with a one-line rationale.
   - PR B: the rest. It needs A, because `CollectionsToMatch.add(input_name: str)` rejects the nullable `WorkflowStepInput.name` unless something guards it.
   - `NotImplementedError` can't be split out: it follows from `BaseTree` becoming abstract.
5. **With the recommended fixes as their own PRs.** Either fix can come before or after the typing PRs.
   - PR D: the linked-match `is None` fix, the `map_over.py` checks and the unit test.
   - PR E: the `_structure_for_output` fix and its API test.
   - Both bugs exist on `release_26.2`, so D and E could also target it and merge forward.
   - Either way, they touch lines commit 4 also edits (the `__attempt_add_to_linked_match` signature and the `Tree.for_dataset_collection` call), so the conflicts are small and mechanical.

## Scopes considered

### 1. As implemented

`matching.py` and `structure.py` are fully typed and leave the `mypy.ini` red list. The call sites in `tools/execute.py`, `workflow/modules.py` and `workflow/map_over.py` are narrowed. There are three small behavior tweaks: `NotImplementedError` for unenumerated trees, the nameless input skip, and a non-optional `structure`.

| Pros | Cons |
| --- | --- |
| <ul><li>Two modules come off the red list with no new mypy errors anywhere in their callers.</li><li>The empty and unenumerated regression caught in test challenges is pinned by commit 1, which passes on `dev`.</li><li>Small enough to read on GitHub, which is why it was extracted.</li></ul> | <ul><li>It leaves the same truthiness bug that it fixed in `structure` in two other places, one of them three lines above the fix.</li><li>It retypes `_structure_for_output` line by line and keeps its parent-collection bug.</li><li>Its non-optional `structure` differs from the standing branch's `BaseTree \| None` (scope 4).</li></ul> |

<details>

- Commit 4 already edits both latent-bug sites. It retypes the `__attempt_add_to_linked_match` signature right above `if not self.linked_structure:`, and it changes the call `structure.for_dataset_collection(source_collection.collection, ...)` to `Tree.for_dataset_collection(source_collection.collection, ...)`. A reviewer reading the diff sees both lines.
- The test challenge's argument that "an `is None` check changes matching semantics, so separate branch" is the kind of narrowing the scope process overrides. The semantics it would change are the bug.

</details>

### 2. Plus the linked-match and `map_over.py` truthiness fixes (recommended)

Replace `if not self.linked_structure:` with `is None` in `__attempt_add_to_linked_match`. Do the same for the four `progress.subworkflow_structure` checks in `map_over.py`: the direct-match skip, the `elif is_data_param`, `_declared_collection_input_types` and `_reserve_outer_structure`. Add the unit test, and optionally type `WorkflowProgress.subworkflow_collection_info`/`subworkflow_structure` while there.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes a user-reachable failure: the invocation's error depends on input-name order (details).</li><li>Red-to-green with existing helpers: `assert_cannot_match(list_instance(ids=[]), list_instance())` fails on the branch and passes with the fix.</li><li>Finishes what the branch started in `structure`: no optional tree is tested by truthiness anywhere.</li><li>The lines are unchanged on `subworkflow_mapping`, so the fix carries through the rebase.</li></ul> | <ul><li>The `map_over.py` half has no observed symptom. Empty subworkflow map-overs fall back to `progress.subworkflow_collection_info` and schedule zero jobs either way, so its test is a guard, not red-to-green.</li><li>No API or framework workflow test maps a subworkflow over an empty list today, so a new framework test is needed (a few minutes in CI).</li><li>It adds a fix to a PR titled as typing, so the PR description needs a line about it.</li></ul> |

<details>

**Linked match, empty first (probed and traced).**
- **Probe.** I built real transient `model.DatasetCollection`/HDCA objects and called `for_collections` followed by `list(slice_collections())`.
  - `input1` empty and `input2` `[a, b]` gives a match whose linked structure is `input2`'s. `slice_collections` then raises `KeyError('Dataset collection has no element_index with key 0.')`, which is not a `MessageException`.
  - `input1` `[a, b]` and `input2` empty raises `MessageException("Cannot match collection types.")`.
- **Workflow path (traced).** Whether an input joins the match comes from `_find_collections_to_match`, where a non-multiple data input calls `collections_to_match.add(name, data)` and is linked by default. `for_collections` takes the inputs in `sorted()` order. The `ToolModule.execute`/`SubWorkflowModule.execute` → `slice_collections()` → `Tree.walk_collections` chain does `collection[index]` on the empty collection.
- **What the user sees (traced).** In `run.py`, the step-level `except Exception` turns only a `MessageException` into a `FailWorkflowEvaluation` with details and a step id. Anything else is re-raised. `__invoke`'s `except Exception` then marks the invocation failed with a bare `InvocationUnexpectedFailure(reason=unexpected_failure)`, and the `KeyError` is only logged.
  - A realistic trigger is a two-input tool such as `paste1` (`input1`/`input2`) where `input1` comes from `__FILTER_FAILED_DATASETS__` or `__FILTER_EMPTY_DATASETS__` and every element was filtered out.
- **Tool form and API: mostly masked (traced).** Both `expand_meta_parameters` and `expand_meta_parameters_async` run `build_combos` and its `assert_matched_lengths` before `match_collections`. The user gets a clear 400 ("Received 2 inputs for ... and 0 inputs for ...").
  - The bug only gets past that when the flattened lengths agree, for example an empty `list` linked with a `list:list` of empty lists. Then zero jobs run and the output collection silently takes the second input's shape.

**Unenumerated linked structure: no path found.**
- `get_structure` returns `UninitializedTree` only when `leaf_subcollection_type` is one the collection can't map over, essentially its own type.
- On the tool path, `_split_dataset_collection` rejects that with "Cannot split collection in desired fashion." before matching, in both `__expand_collection_parameter` and `_async`.
- On the workflow path, `_find_collections_to_match` passes only subcollection types that come from `HistoryQuery.can_map_over`, and `can_map_over` is False for equal types. I couldn't build a `_concrete_subcollection_type` or `_consume_outer_structure` result that equals the data's own type.

**`map_over.py` (traced, no divergence found).**
- `progress.subworkflow_structure` is falsy only for a subworkflow mapped over an empty collection.
  - Its direct-match skip and the `elif is_data_param` branch then either keep the input out of the match or let it in.
  - If it stays out and nothing else is matched, `plan_map_over` returns `progress.subworkflow_collection_info`, which is the same empty outer structure.
  - Either way the step schedules zero jobs and builds an empty implicit collection.
- `_reserve_outer_structure` gives `[]` either way when the outer structure has one level. For deeper ones, `is None` routes empty mapping through the same `_consume_outer_structure` path that non-empty mapping already takes and the tests already cover.
- With `is None`, an empty map-over takes the tested non-empty path instead of working by accident.
- The unenumerated "raises" half has no producer, because nothing in the workflow planner builds an `UninitializedTree` linked structure (see above).
- `subworkflow_mapping` adds another `if linked_structure:` (its `map_over.py:199`). Worth noting there when rebasing.

**Tests.**
- Unit: extend `test_lists_of_different_cardinality_do_not_match` or add a sibling test using `list_instance(ids=[])`. `build_collections_to_match` names the inputs `input_0` and `input_1`, so the empty list sorts first.
- Framework: an empty-list subworkflow map-over in `lib/galaxy_test/workflow/`. `test_empty_list_mapping` in `test_workflows.py` is a template (`empty_list` tool).

</details>

### 3. Plus the `_structure_for_output` DCE fix (recommended)

Resolve the identifier source through `get_collection` (and `get_structure`), as `sliced_input_collection_structure` directly above it already does. Add an API test.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes silently wrong element identifiers (probed).</li><li>A one-line change that reuses the helper written for exactly this parent/child mix-up, whose docstring explains it.</li><li>The branch already edits that statement.</li><li>Unchanged on `subworkflow_mapping` (its `execute.py` still reads `source_collection.collection`), so the fix carries.</li></ul> | <ul><li>Red-to-green needs an API test, which can't be run locally here, so CI is the only check.</li><li>Only one in-repo tool (`identifier_source.xml`) uses `default_identifier_source`, so the reach is mainly third-party tools.</li></ul> |

<details>

**Probe.**
- **Setup.** `inputA` is an HDCA list `[p, q]`. `inputB` is a DCE (`inner1`) of a `list:list`, and its child is `[x, y]`.
- **Matching.** `get_collection(dce)` gives the child, so the two inputs match as lists of two.
- **On the branch.** `source_collection.collection` is the parent `list:list`. `list.compatible("list:list")` is False, so `compatible_shape` fails. `_structure_for_output` then keeps the mapping structure, and the output gets `[p, q]`.
- **With `get_collection`.** `compatible_shape` is True and the output gets `[x, y]`.
- **What the user sees.** `identifier_source`'s `outputB` (`default_identifier_source="inputB"`) gets `inputA`'s identifiers. There's no error.

**Reach.**
- The tool API accepts `{"batch": true, "values": [{"src": "dce", "id": ...}]}`, which `_load_batch_collection` handles explicitly.
- `FormData.test.ts` shows the tool form accepting `src: "dce"` values. The fixture I looked at isn't a batch, so I haven't confirmed the form can send one as a map-over.
- On the workflow side, `_find_collections_to_match` accepts a `DatasetCollectionElement` as `data`.

**Gate.** `hasattr(tool_output, "default_identifier_source")` distinguishes only data outputs (`ToolOutput`) from collection outputs. The XML parser defaults it to the string `"None"`, so `collections.get(...)` is what actually gates the swap.

**Test.** Copy `test_default_identifier_source_map_over` in `test_tools.py`. Build `inputB` as a `list:list` and pass one of its elements as `src: "dce"`, then assert `outputB`'s identifiers.

</details>

### 4. Contract: the behavior tweaks, especially `MatchingCollections.structure` back to `BaseTree | None` (not recommended)

Undo thermo-nuclear finding 1's change and put the asserts back at the `execute.py` call sites. Optionally, split out the nameless-input skip and `NotImplementedError` as well.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches `subworkflow_mapping`'s current signature, `BaseTree \| None` ("None when nothing is mapped over"). Its `execute.py` still has the three asserts.</li><li>Takes one behavior tweak out of a typing PR.</li></ul> | <ul><li>Brings back what thermo-nuclear called cast churn: three asserts for an invariant that holds on `dev`, because `for_collections` never builds a collection-less match.</li><li>Downstream gives no reason to keep `None`. Every `MatchingCollections.structure` consumer there asserts it away: `execute.py` 634, 798 and 833, and `map_over.py` 878. None of them branches on it.</li><li>The other two tweaks are pinned or required by the types (details).</li></ul> |

<details>

- **Downstream.** `subworkflow_mapping` builds `MatchingCollections.from_axes([])` (its `map_over.py:134`).
  - Usually that result is the `inherited` argument to `with_inherited_mapping`, which keeps the local axes.
  - It becomes the step's `collection_info` directly only when there are inherited bindings, no inherited match and no local match. I couldn't confirm that this path survives `_axis_index_for_id` with zero axes.
- **On rebase.** The downstream `Optional` reads as a leftover from the pre-thermo-nuclear typing. The rebase can adopt `BaseTree` and drop the asserts. If the zero-axis path above turns out to be real, that's a downstream bug to fix there, not a reason to loosen `dev`.
- **The other two tweaks stay.**
  - `NotImplementedError` follows from the ABC, is pinned by `test_unenumerated_tree_rejects_element_queries`, and no `except` site catches the old types.
  - The nameless-input skip is what the `str` key type requires. Only legacy rows with a null `WorkflowStepInput.name` reach it, and on `dev` they would hit a `TypeError` in `sorted()`.
  - Splitting either into its own PR (decomposition 4) adds ordering for a two-line change.

</details>

### 5. Plus fully typing `type_description.py` and `registry.py` (recommended)

Annotate the 19 incompletely annotated defs in `type_description.py` and drop its `disallow_untyped_defs = False`. Type the 3 defs in `registry.py` (38 lines) and drop its `check_untyped_defs`/`disallow_untyped_defs` entry.

| Pros | Cons |
| --- | --- |
| <ul><li>Finishes the file commit 2 already opened. `CollectionTypeLike` describes the six `hasattr(..., "collection_type")` duck-typing sites in `can_map_over`, `accepts`, `compatible`, `effective_collection_type` and `map_over_collection_type`.</li><li>`registry.py` is trivial, and `CollectionTypeDescriptionFactory` takes it as `type_registry`.</li><li>Three modules in `model.dataset_collections` leave the red list together.</li></ul> | <ul><li>`type_description.py` is already a conflict file for both standing branches, and more lines there mean more rebase work.</li><li>Typing `other_collection_type` might push narrowing into the many external callers of `can_map_over`/`accepts`. mypy has to be re-run across them.</li></ul> |

<details>

- It's modest and on-theme, and it would put a typed `CollectionTypeLike` contract under every `structure.py`/`matching.py` call into `CollectionTypeDescription`. It fixes nothing, so if mypy over the callers of `can_map_over`/`accepts` turns up widespread narrowing, drop `type_description.py` and keep only `registry.py`.
- The other neighbors (`subcollections.py`, `query.py`, `builder.py`, `adapters.py`) only carry `disallow_untyped_defs = False` and are not on the matching/structure path. They're beyond a modest expansion.

</details>

### 6. Plus `when_values` passed into the walk (not recommended)

Make `walk_collections(collection_dict, when_values=None)` pure. Drop `BaseTree.when_values`, `Tree.__init__(when_values=...)` and the two mutations in `slice_collections`/`structure`.

| Pros | Cons |
| --- | --- |
| <ul><li>Small. There are only two walk entry points: `slice_collections` and `ExecutionTracker.walk_implicit_collections`.</li><li>Removes the class attribute that the branch added to type the mutation, and stops writes to the shared `linked_structure`.</li></ul> | <ul><li>`subworkflow_mapping` redesigns this. `when_values` becomes a property with a setter on `MatchingCollections` and is aligned per coordinate (its `matching.py` around `slice_collections`). Doing it here means a third design for one rebase.</li><li>No bug: the readers always see the owning match's current value.</li></ul> |

<details>

- The real aliasing hazard is one level up. `plan_map_over` returns `progress.subworkflow_collection_info` itself when the step adds no mapping, and `SubWorkflowModule.execute` then assigns `collection_info.when_values` onto that shared object. That belongs with the axes redesign, not here.

</details>

### 7. Plus removing `is_leaf`/`children_known` (not recommended)

Replace the flags with `isinstance`, including in `DatasetCollectionManager.precreate_dataset_collection`.

| Pros | Cons |
| --- | --- |
| <ul><li>One model instead of two. The branch already narrows with `isinstance`.</li></ul> | <ul><li>`subworkflow_mapping` mentions `children_known` 12 times across `structure.py`, `matching.py` (axis refinement) and `map_over.py` (axis checks) and documents it as part of the `BaseTree` contract. Removing it here forces those to be rewritten on rebase.</li><li>Pulls `managers/collections.py`, a red-listed module, into the PR.</li></ul> |

<details>

- `precreate_dataset_collection` reads the flags twice: `not structure.is_leaf and structure.children_known`, and `substructure.is_leaf`. Its `structure` argument is untyped, so the flags are what keep it working with `Leaf`. That's a follow-up for after the standing branches land.

</details>

### 8. Plus caching `structure` (not recommended)

Compute the cross product once instead of on each access.

| Pros | Cons |
| --- | --- |
| <ul><li>It saves one multiply and clone per access.</li></ul> | <ul><li>Accesses are O(outputs), not O(elements): `_structure_for_output` per output, the finalize loop per implicit collection, and `walk_implicit_collections` twice per execution. There's no measurable win.</li><li>A cache needs invalidation. `structure` stamps `when_values` on every access, and `subworkflow_mapping`'s `map_over.py` reassigns `collection_info.linked_structure` after matching, so a cached tree would go stale.</li><li>The axes model replaces the body.</li></ul> |

<details>

- If it's ever needed, `functools.cached_property` invalidated by the `linked_structure`/`when_values` setters belongs in the axes model, where `structure` is defined over `mapping_axes`.

</details>
