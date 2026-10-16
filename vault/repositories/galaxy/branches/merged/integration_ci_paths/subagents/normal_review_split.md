# Normal review, round 3 (helpers/mixins split)

Verdict: clean, nits only. Acted on 2 nits: return annotations, and deleting a dead duplicate helper. Kept John's module names and kept the helpers out of `populators.py`.

Acted on:
- Nit 3: added `-> None` / `-> dict` to the two `api_helpers.py` functions.
- Nit 4: deleted `_assert_one_collection_created_in_history` from `api/test_dataset_collections.py`. It was never called (dead on `origin/dev` too) and duplicated `api_helpers.assert_one_collection_created_in_history`.

Not acted on:
- Nit 1: `api_mixins.py` sits close in name to `api.py` (infra mixins), and two of its classes carry real `test_*` methods. The reviewer suggested something like `shared_api_test_cases.py`. Kept John's requested name; the reviewer also found no better existing home.
- Nit 2: the helpers could become populator methods or live in `populators.py`. That file is 5277 lines; a small module is defensible. The reviewer agreed: keep.

## Details

Checks: no `shared_api_tests` leftovers in the worktree or `HEAD`. `packages/test_base` symlinks the whole `base/` dir and uses `packages.find`, so no manifest edits are needed. Rename similarity is 90%: only the docstring changed and the helpers moved out unchanged. All 14 importers are updated and sorted. No unused imports. mypy shows no galaxy_test errors (23 baseline errors elsewhere). Collection: 907 tests in the touched files, 1787 in `test/integration`, no errors. No imports from excluded dirs in `test/integration`, `base` or `driver`, and importing the new modules loads none of them into `sys.modules`. Docstrings are accurate. No security concerns.
