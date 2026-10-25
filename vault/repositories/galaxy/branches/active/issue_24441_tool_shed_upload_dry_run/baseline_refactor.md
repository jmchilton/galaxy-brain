Split two behavior-preserving refactors out of the dry-run feature commit: the orphan tool dependency warning moves into a helper (and the unused `dry_run` argument of `upload_tar_and_set_metadata` is dropped), and the metadata generator keys path stripping and work dir cleanup on `files_dir`.

## History

```
6a0913cf62a Add dry_run to the tool shed upload API
2a540f0bbbe Key tool shed metadata path stripping and cleanup on files_dir   (new)
8288b0bdbb2 Extract tool shed orphan tool dependency warning into a helper   (new)
62df8a55c20 Split tool shed tip metadata decision out of set_repository_metadata
c2bac1bd542 Fix tool shed upload_tar dry run leaking its clone and sending alerts
a3007c8cc7b Baseline tests for tool shed upload metadata outcomes
```

The first three commits keep their SHAs. The feature commit has the same tree as the old `d3e0d3e7cbc` (`git diff d3e0d3e7cbc HEAD` is empty), with the same author and date. Its message drops the "Drops the unused dry_run argument" sentence because that change moved to `8288b0bdbb2`.

## Refactor commits

- **8288b0bdbb2: extract the orphan warning** (`lib/tool_shed/managers/repositories.py`)
  - `_orphan_tool_dependencies_message(app, repository, metadata_dict)` replaces the inline `DependencyDisplayer` block. It sits right after `upload_tar_and_set_metadata`, so the feature only adds `upload_tar_dry_run` above it and a second call site.
  - `generate_message_for_orphan_tool_dependencies` always returns a `str` (`""` when there are no orphans), so the unconditional `+=` matches the old `if orphan_message:`.
  - The unused `dry_run` argument is dropped. The only callers (api2 `repositories.py`, test `_util.upload`) never passed it.
- **2a540f0bbbe: key on `files_dir`** (`lib/galaxy/tool_shed/metadata/metadata_generator.py`)
  - In the resetting branch, `work_dir = files_dir` is set after `files_dir`.
  - Both `get_relative_path_to_repository_file` calls get `files_dir`.
  - Cleanup runs `if work_dir != files_dir` instead of `if not resetting_all_metadata_on_repository`.
  - Adds the `-> None` annotation.
  - Why it's equivalent on base: in the resetting branch `work_dir == files_dir`; in the non-resetting branch `work_dir` is a fresh mkdtemp and `get_relative_path_to_repository_file` ignores its 5th argument. The reset path is covered by `test/unit/tool_shed/test_repository_metadata_manager.py` (`resetting_all_metadata_on_repository=True`; 9 passed). The feature now only adds `isolate_files_dir` (mkdtemp work dir plus a sample-file read guard).

## Left in the feature, and why

- **`tool_data_tables=` on `handle_sample_tool_data_table_conf_file`**: its only caller is commit_util's dry-run branch. Without that caller it is unused plumbing, not a refactor.
- **`hg_util.get_repo` / `get_changed_paths`**: no base caller. `lib/tool_shed/util/shed_index.py:132` and `lib/tool_shed/test/base/testcase.py:1339` repeat the `hg.repository(ui.ui(), ...)` pattern and could use `get_repo`. Converting them would change the final tree, so that is not done here.
- **Test `_util.py` changes**:
  - The tool data table config and app tables, and the `repository_fixture(type=)` parameter, are scaffolding only the new tests use.
  - `tar_path`'s only new caller is the dry-run test helper. Splitting it out alone would just fragment the history.
- **`changeset_revision=` on `generate_message_for_invalid_tools`**: already in `62df8a55c20`.

## Tests

`PYTHONPATH=lib pytest -q -p no:warnings test/unit/tool_shed/`:

- `8288b0bdbb2`: 126 passed, 12 skipped (scratch worktree)
- `2a540f0bbbe`: 126 passed, 12 skipped (scratch worktree)
- `6a0913cf62a` (HEAD): 136 passed, 12 skipped

Pre-commit (black, ruff, flake8 and the others) passed on both refactor files. It was run explicitly with the repo config because the hook's relative config path doesn't resolve from the scratch worktree.
