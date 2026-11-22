Run via Claude Opus 5.5 at high effort.

A third refactor commit now sits ahead of the fix. It builds the collection rows from the element wrappers, keeps Galaxy-side paths, and caches as the old model-backed list did. The fix is now a 19-line `wrappers.py` change plus its tests. Both cache commits and the input-only guard were folded in, so the branch went from 8 commits to 6. The final tree is unchanged.

- Old head: `b36849cea7d38412064a21f2efb30c38062b9840` (8 commits)
- New head: `cd4d46bb801a8430c2a3f1a770fbcc4a2ae91a4a` (6 commits). Its tree is `34d642b1117c`, the same tree as the old head.

## New history (on `origin/release_26.2` @ `4cc69d30122`)

1. `777d96e2af9` **Baseline tests for collection and dataset wrapper path accessors**. Unchanged (same SHA).
2. `fece82a987e` **Put the collection name once at the top of nested staging paths**. Unchanged (same SHA). It stays second so it can be cut as its own backportable PR.
3. `023fd402d11` **Extract the metadata file path rewrite from DatasetFilenameWrapper** (refactor). Unchanged.
4. `39d9792a984` **Build collection staging JSON from the wrapper rows directly** (refactor). Unchanged.
5. `e486edd1465` **Build collection path accessors from the element wrappers** (new refactor, no behavior change). This commit:
   - adds `__element_identifiers`, `_DatasetRow` and the cached `_dataset_rows`, and the accessors read from them
   - sets `_DatasetRow.path` to `element.unsanitized.get_file_name()`, the same call the model query made
   - adds a cached `DatasetFilenameWrapper._job_metadata_files` with no rewrite yet
   - keeps `all_paths` and `get_all_staging_paths` from loading metadata files
   - drops the model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files` and its mapping test assertion
6. `cd4d46bb801` **Route collection and metadata file path accessors through the compute environment** (the fix, `Fixes #25040`). In `wrappers.py`, `_DatasetRow.path` becomes `str(element)`, and `_job_metadata_files` maps paths through `_job_metadata_path`, for inputs only. The commit also adds docstrings and every new test:
   - the compute environment test
   - the test that output metadata is not staged
   - both caching tests
   - the functional tool and the Pulsar integration test

## Why the old fix commit was split

In round 1 the row rebuild stayed in the fix, on the grounds that "`str(element)` applies the path rewrite". But that rewrite is a single expression. The rest of the rebuild doesn't depend on the fix:
- walking the element list instead of querying the model
- keeping repeated identifiers
- flattening nested collections
- dropping the model property
- not loading metadata for paths-only accessors

With the path set to `get_file_name()`, the rebuild returns exactly what the base returned.

This gives each commit one question for a reviewer:
- Refactor 3: does walking the wrappers give the same rows as the query? This is the larger, structural diff.
- The fix: is `str(element)`, plus the input-only metadata rewrite, correct? Before the split, those few lines were buried in an ~80-line restructure.

How base behavior was checked:
- All baseline tests pass at refactor 3. They cover nested `list:paired`, repeated identifiers, a missing collection, metadata files, `serialize()` and `data_style=paths`.
- A throwaway DB-backed check (not committed) used real mapped `list:paired`, `list:list:paired` and repeated-identifier collections. It took the base commit, which goes through the model query's session branch, and refactor 3, then dumped `element_identifiers_extensions_paths_and_metadata_files`, `all_paths`, `all_metadata_files`, the staging paths with and without the collection name, and `serialize()`. The two dumps were byte-identical.
- No tool code builds collection wrappers with `formats`, so element wrappers never swap in a converted dataset. Wrapper rows and query rows refer to the same HDAs.

## Squash decisions

- **Both cache commits went into refactor 3, and their tests into the fix.** The base already cached the row list on the collection wrapper, metadata files included. So caching is not a new optimization. It keeps the performance the base already had. Without it, refactor 3 (and the old fix commit) would re-walk the collection and reload every metadata file (one query per file) on each accessor call, and two later commits would then repair that. Putting the caching in refactor 3 means no commit in the history is slower than the base. Both caching tests need the fix to pass:
  - `test_collection_wrapper_metadata_files_are_loaded_and_rewritten_once` checks rewritten paths.
  - `test_collection_wrapper_paths_are_computed_once` counts `_path_or_uri` calls, and only `str(element)` makes those calls.

  So they land with the fix and keep their final form. Refactor 3 has no new tests of its own. The baseline tests and the DB check above stand in for them.
- **The input-only guard went into the fix.** The old fix asked the compute environment to rewrite an output's metadata files too, which Pulsar records as files to stage. The guard corrected that bug in the fix itself, so no commit should ship without it. Its test (`test_output_dataset_wrapper_metadata_files_are_not_staged`) also passes at refactor 3, where nothing is rewritten. That's expected: it guards the fix, not the base.
- **Kept separate:** the two existing refactors (3 and 4) and the nested-prefix commit. Each is independent and reads cleanly alone. Merging them would only make the diffs bigger.

## Verification

- `test/unit/app/tools/test_wrappers.py` at each commit: 38 passed at commits 1 through 5, and 42 passed at the fix.
- The baseline test file passes against unmodified `origin/release_26.2`: 38 passed.
- With the fix commit's test file run against refactor 3, `test_collection_wrapper_path_accessors_follow_compute_environment` fails, so the regression test still catches the bug. Both caching tests fail there too.
- `test/unit/data/test_galaxy_mapping.py` at refactor 3: 17 passed, 17 skipped.
- ruff, black and isort pass on each commit's changed Python files.
- `cd lib && mypy . ../test` at head: no issues found in 2612 source files. A per-file mypy run on `wrappers.py` and `model/__init__.py` found no new errors at refactor 3 compared with refactor 2.
- `test/integration/test_pulsar_embedded_rewrite_parameters_input_paths.py` at head: 1 passed.
- The final tree is identical to the old head's tree.

Nothing was pushed. The local branch is 6 ahead and 2 behind `jmchilton/issue_25040_collection_paths_rewrite_26_2`, so publishing it will need a force-push.
