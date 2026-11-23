Run via Claude Opus at high effort.

# Thermo-nuclear review: collection_matching_typing

Acted on findings 1 to 6 in four commits on top of `6f9d5ea1cbf`: `3b271be1e3b`, `c1ae9a4a57c`, `67e3111e50d` and `772533a98a3`. Head is now `772533a98a3`. These commits haven't been pushed. I didn't act on findings 7 to 12. Each of them changes behavior, reaches outside the typing motivation, or needs `managers/collections.py`. None of them blocks this PR.

## Not acted on

- **7. `_structure_for_output` reads `source_collection.collection`.** For a `DatasetCollectionElement` that is the parent collection, so this should go through `get_collection`. It's a latent bug and fixing it changes behavior, so it needs its own branch with a test.
- **8. Truthiness checks on trees.** `map_over.py` tests `if progress.subworkflow_structure:` in four places. That condition is false for an empty `Tree` and raises for an `UninitializedTree`. `__attempt_add_to_linked_match` uses `if not self.linked_structure:`, already noted in test challenges. Switching both to `is None` changes matching and scheduling semantics, so it belongs in a separate branch.
- **9. `when_values` is set by mutation.** `slice_collections` and `structure` write `when_values` onto trees, including the shared `linked_structure`, instead of passing it to `walk_collections`. That's an API change.
- **10. `is_leaf` and `children_known` duplicate the class hierarchy.** The branch now narrows with `isinstance`. The flags stay because `managers/collections.py` (`precreate_dataset_collection`) reads them.
- **11. `structure` recomputes the cross product on every access.** That includes once per implicit collection in the finalize loop, and each time the tree is cloned. Caching it is a performance change, out of scope.
- **12. `execute.py` is over 1000 lines.** It was already 1024 lines on `dev`. The branch adds 2 lines and crosses no threshold.

## Verification

- Unit tests pass on every commit: 258 across `test/unit/data/dataset_collections/`, `test/unit/workflows/test_modules.py`, `test/unit/app/tools/test_execution.py` and `test_meta_expansion.py`.
- mypy ran on the touched modules, every module that calls `for_collection_type` or `CollectionTypeDescription.multiply`, `workflow/run.py`, `managers/collections.py` and `tools/parameters/meta.py`. I compared each file's errors against the `origin/dev` worktree, and both sides have the same error set. All 24 are pre-existing errors in unrelated, transitively checked modules.
- isort, black, `ruff@0.17.6` and the pre-commit hooks are clean.

<details>
<summary>Full review</summary>

Verdict: the branch is a sound typing PR, but it left avoidable cast and indirection churn. It patched the `None` return of `MatchingCollections.structure` with asserts at three call sites, kept `UninitializedTree` semantics on the base class, and repeated the same unions. None of this is a structural regression, and all of it is fixable without changing behavior.

### 1. `MatchingCollections.structure` should not be Optional (cast churn, fixed)

The branch typed `structure` as `BaseTree | None`, then added `assert structure is not None` at three `ExecutionTracker` sites. `None` can't actually happen. `for_collections` returns `None` when there is nothing to match, and every collection it does take becomes a `BaseTree` through `get_structure`. `leaf.multiply(tree)` is a tree, so the result is never a `Leaf`. That invariant now lives in the property as a single assert, and the property returns `BaseTree`. The three `execute.py` sites go back to their `dev` form.

### 2. `BaseTree` encoded `UninitializedTree` semantics (structural, fixed)

`BaseTree` raised "children are not known" from `__len__`, `walk_collections` and `compatible_shape`, plus bare `NotImplementedError()` from `clone`/`multiply`. A future subclass would inherit "unenumerated" behavior silently. `BaseTree` is now an `ABC` with abstract methods, and `UninitializedTree` raises through one `_unknown_children()` helper. That helper also replaces the fourth copy of the message in `Tree.compatible_shape`. The messages are unchanged, so the test-challenge test still pins them.

### 3. `walk_collections` closures (code judo, fixed)

The branch added a second closure inside the loop, `get_child_collection`, next to `get_element` with its `# noqa: B023`. A dict comprehension over `collection_dict` builds the elements directly. A module-level `_child_collection()` holds the non-null assert, and `for_dataset_collection` reuses it. Both closures, the `noqa`, `dict_map` (which had no other users in `lib` or `test`) and the `T`/`V` type variables are gone.

### 4. `compatible_shape` mixed `isinstance` and `.is_leaf` (legibility, fixed)

The loop narrowed with `isinstance`, compared with `.is_leaf` inside that branch, and kept the "At least one is nested" comment on the wrong branch. It is now three flat checks:
- both are leaves: continue;
- one is a leaf: return False;
- otherwise recurse.

This is equivalent to `dev`.

### 5. `str | CollectionTypeDescription` repeated six times (missing shared alias, fixed)

`type_description.py` already took that union in `CollectionTypeDescription.__init__`, so it is the alias's home. The new `CollectionTypeLike` is defined beside the class. It parallels `CollectionLike` in `structure.py` and replaces every copy in `matching.py`, `structure.py` and that `__init__`.

`CollectionSlice` names the `(elements, when_value)` pair. That pair was spelled out in three walk and slice signatures.

`for_collection_type` and `CollectionTypeDescription.multiply` gained return types. That removed three local `x: CollectionTypeDescription = ...` annotations, which were only casts of `Any`. mypy over every caller is unchanged.

### 6. `getattr(mapping_type, "collection_type", None)` in `modules.py` (magic duck typing, fixed)

`mapping_type` is now typed `CollectionTypeLike | None`, so `isinstance(mapping_type, CollectionTypeDescription)` states the contract directly. The change is equivalent. Workflow map-over (`map_over.py`) only adds `CollectionTypeDescription` objects or `None`, and the `getattr` already returned `None` for a `str`.

### 7. `_structure_for_output` uses the parent collection for a DCE (latent bug, recommend)

`source_collection.collection` is the parent when `source_collection` is a `DatasetCollectionElement`. `get_collection()` exists for exactly this. Fix it in a separate branch with a test.

### 8. Truthiness on trees (latent bug, recommend)

`map_over.py` has `if progress.subworkflow_structure:` and the `elif` that follows it. `matching.py` has `if not self.linked_structure:`. Both go through `__len__`, which is false for an empty `Tree` and raises for an `UninitializedTree`. Use `is None` in a separate behavior PR.

### 9. Non-atomic `when_values` (design smell, recommend)

`slice_collections` and `structure` mutate `when_values` on tree objects before walking them. The tree from `slice_collections` is the shared `linked_structure`. Passing `when_values` into `walk_collections` would make the walk pure. That's an API change across `matching.py`, `execute.py` and the workflow modules.

### 10. `is_leaf` / `children_known` vs `isinstance` (duplicate model, recommend)

The class hierarchy already says both things. Dropping the flags means editing `precreate_dataset_collection` in `managers/collections.py`.

### 11. Repeated `structure` computation (orchestration, recommend)

Every `.structure` access re-multiplies and clones the trees. The finalize loop in `execute.py` accesses it once per implicit collection. Compute it once and cache it.

### 12. File size

`execute.py` was 1024 lines on `dev` and is 1026 on the branch, so the PR doesn't cross 1000. `modules.py` was already far past it. `structure.py` (344 lines) and `matching.py` (175) are fine.

### Kept as is

- The `CollectionToMatch` dataclass replacing `Bunch` is a typed model and an improvement.
- `Tree.for_dataset_collection` replaces the old instance-dispatched `structure.for_dataset_collection` in `execute.py`. It's clearer, and on `dev` that call would have raised `AttributeError` for an `UninitializedTree`.
- The two `iteration_elements_iter` annotations in `modules.py` allow `None` elements, so they don't fit `CollectionSlice`. They stay local.
- The trimmed docstrings and comments, all added by the branch, are one line each now: the `BaseTree` docstring, the `structure` docstring, `WhenValues`, and the `CollectionToMatch` field and `Tree.__init__` comments.

</details>
