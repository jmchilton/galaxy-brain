Run via Claude Opus at high effort.

I rebuilt the branch as four commits on `dev` `7dd58b00674`. Three standalone base commits come first: a test that pins `dev` behavior, the `type_description.py` alias and return types, and the dead-code removal. The typing work follows as one commit, with the regression fix and the four thermo-nuclear commits folded in. Head moved from `772533a98a3` to `78266137b64`, and `git diff 772533a98a3 78266137b64` is empty.

## New history (oldest first)

1. `4657945a682` Test MatchingCollections.structure of empty and unenumerated collections
   - This takes `test_matching.py` from the old `0dc79186e48`.
   - Both tests pass on plain `dev`, so they pin `dev` behavior, and the typing commit has to keep them green.
   - The truthiness regression they caught never existed on `dev`, so neither the history nor the messages mention it.
2. `2862ed99f3d` Add CollectionTypeLike alias and return types to collection type descriptions
   - This is the old `3b271be1e3b` unchanged (only `type_description.py`).
   - It stands alone on `dev`: mypy error sets are unchanged across every caller.
3. `e401dcd9ae0` Remove dead code from the collection structure module
   - It drops `Leaf.sliced_collection_type`, which returned the builtin `input` and had no callers.
   - It also drops the `if ...: pass` block at the end of `tool_output_to_structure`, keeping its TODO.
   - Both edits were made by hand on `dev`'s `structure.py`, and the removal is behavior-neutral.
   - `dict_map` stayed for the typing commit. It only becomes dead once `walk_collections` is rewritten.
4. `78266137b64` Type the collection matching and structure modules
   - This folds in the old commits `0f66e1d1b93`, `0dc79186e48` (fix part), `6f9d5ea1cbf`, `c1ae9a4a57c`, `67e3111e50d` and `772533a98a3`.
   - The `NotImplementedError` test (`test_unenumerated_tree_rejects_element_queries`) goes in this commit, because it pins behavior that this commit introduces.
   - The message keeps the substance of the original and is updated to the final content:
     - `BaseTree` is an ABC, and `UninitializedTree` owns the `NotImplementedError`.
     - `CollectionSlice` names the `(elements, when value)` pair.
     - `walk_collections` drops the closures and `dict_map`.
     - `structure` returns a non-optional `BaseTree`, and the Leaf case is asserted.
     - The single_datasets check uses `isinstance`.
     - The two small behavior notes stay: the nameless-input skip and the redundant `when_value` check.
   - It keeps the original `Co-Authored-By: Claude Fable 5.2` line.

## Considered, not split out

- **Simplifying `walk_collections` (closures, `dict_map`) and flattening `compatible_shape` ahead of the typing work.** Both could be written as behavior-neutral changes on `dev`. They are bound up with the narrowing (`isinstance` and the `_child_collection` asserts), though, and splitting them would add a commit without making the typing diff easier to read.
- **Making `BaseTree` abstract as a base commit.** It carries the `NotImplementedError` behavior change, so it belongs with the typing change.

## Old to new SHA map

| old | new |
| --- | --- |
| `0f66e1d1b93`, `0dc79186e48` (fix), `6f9d5ea1cbf`, `c1ae9a4a57c`, `67e3111e50d`, `772533a98a3` | `78266137b64` |
| `0dc79186e48` (tests) | `4657945a682` |
| `3b271be1e3b` | `2862ed99f3d` |
| (dead code that was in `0f66e1d1b93`) | `e401dcd9ae0` |

The backup branch is `collection_matching_typing_pre_baseline_backup`, at `772533a98a3` on `jmchilton`. The rebuilt branch was force-pushed to `jmchilton/collection_matching_typing` with a lease on `772533a98a3`.

## Verification (every commit)

- **Unit tests.** The command was `PYTHONPATH=lib pytest test/unit/data/dataset_collections/ test/unit/workflows/test_modules.py test/unit/app/tools/test_execution.py test/unit/app/tools/test_meta_expansion.py`.
  - Commits 1 to 3 pass with 257 tests each.
  - Commit 4 passes with 258, which includes the new `NotImplementedError` test.
- **mypy.** Run from `lib` with `../mypy.ini` on these files:
  - `dataset_collections/{type_description,matching,structure,builder,query}.py`
  - `tools/{execute,actions/__init__,actions/upload,parameters/meta}.py`
  - `workflow/{map_over,modules,run}.py`
  - `managers/collections.py`
  - `job_execution/output_collect.py`

  At each commit the error set (file and message, line numbers ignored) is identical to the `dev` worktree's. All 24 errors are pre-existing and in transitively checked modules (`galaxy/util`, `objectstore`, `web/framework`, and so on), none of them in the touched files.
- **Hooks.** The pre-commit hooks (black, ruff, flake8 and others) passed on every commit.
