Moved "Isolate sample files when resetting tool shed metadata" ahead of "Add dry_run to the tool shed upload API" as a standalone base fix, so the feature no longer adds the `isolate_files_dir` flag only for the next commit to delete it; the unit test app's tool data scaffolding moved with it.

## History

```
574ce683a19 Report tool shed dry run metadata generation failures as ok=false
9e0e41626e1 Report whether a tool shed upload dry run's revision is installable
9813d55182b Add dry_run to the tool shed upload API                         (moved after isolation)
b6f362b2bbc Isolate sample files when resetting tool shed metadata          (moved before feature)
4a7ff284e3b Key tool shed metadata path stripping and cleanup on files_dir
dff4425ce14 Extract tool shed orphan tool dependency warning into a helper
4731af41295 Split tool shed tip metadata decision out of set_repository_metadata
1edf3d22bf6 Fix tool shed upload_tar dry run leaking its clone and sending alerts
304d663321f Baseline tests for tool shed upload metadata outcomes
```

- The first five commits keep their SHAs.
- `git diff 7c7eb5ffade HEAD` is empty.
- The feature commit's tree equals the old isolation commit `9d345c02955`. The last two commits keep their old trees and messages.
- Authors and author dates are preserved. The commits were built with `git commit-tree`, and the ref was moved with `update-ref` guarded on `7c7eb5ffade`. Nothing was pushed.

## What moved

**`b6f362b2bbc` Isolate sample files** (parent `4a7ff284e3b`)
- `metadata_generator.py` changes to its final content: samples are read from the revision and staged in `ValidationContext`'s temp tool data dir, and the prefer-working-copy branch is dropped. The `isolate_files_dir` flag never appears.
- `test_repository_metadata_manager.py` changes to its final content. Its two new tests are the red-to-green evidence.
- `_util.py`: only the tool data scaffolding.
  - `TestToolShedConfig.tool_data_path`, `shed_tool_data_path` and `shed_tool_data_table_config`
  - `TestToolShedApp.tool_data_tables`
  - Without it, `test_reset_reads_sample_files_from_each_revision` can't upload a `tool_data_table_conf.xml.sample` (InternalServerError on upload), and the sample-only test hits `AttributeError: tool_data_path`.
- Red at this position: tests and scaffolding applied, no lib change, both tests fail for the intended reasons.
  - `{'Add_a_column1', 'Filter1'} != {'Add_a_column1'}`: the sample-only tool became a tool.
  - The revision rows mismatch: the first revision got the tip's samples.
- Green: once the generator change is added.
- Message:
  - The "drops the dry run's isolate_files_dir flag" sentence is gone.
  - New scope line: only the tool shed uses reset mode, and Galaxy installs now just stage samples in the ValidationContext dir instead of their own temp dir.
  - Verified on base: every `resetting_all_metadata_on_repository=True` caller is in `lib/tool_shed/`.
  - `ValidationContext.from_app` without `work_dir` makes its own mkdtemp and removes it in `finally`.

**`9813d55182b` Add dry_run**
- No longer touches `metadata_generator.py` or `repository_metadata_manager.py`, which had only the flag. It no longer passes `isolate_files_dir=True`.
- `_util.py` keeps only `repository_fixture(type=)` and `tar_path`.
- Message: "Metadata reads sample files from the clone, not the real repo's working copy…" becomes "Metadata is generated from the clone in reset mode, which reads sample files from it…". The behaviour now comes from the prior commit.

## Left in place, and why

- **`4a7ff284e3b` (files_dir keying)** adds `if work_dir != files_dir: remove_dir(work_dir)`, and the next commit deletes it. This is deliberate. Isolation needs the switch to strip on `files_dir` once `work_dir` stops being the clone. Folding the commit into isolation would mix a behaviour-preserving refactor into a fix. Its "lets work_dir differ from the clone later" wording is still accurate.
- **`ValidationContext`-owned staging dir**: now part of the isolation commit. No `ValidationContext` change was needed.
- **`tool_data_tables=` on `handle_sample_tool_data_table_conf_file`**: its only caller is the dry-run branch of `commit_util`, so it stays in the feature.
- **`changeset_revision=` kwarg**: already in `4731af41295`.
- **`hg_util.get_repo` / `get_changed_paths`**: no base caller, so they stay in the feature.
- The re-scope's `installable` commit and the metadata-failure commit both depend on the dry run, so neither moves ahead of it.

## Tests

`PYTHONPATH=lib pytest -q -p no:warnings test/unit/tool_shed/`. Intermediate commits ran in a scratch worktree using the branch venv, which has since been removed. The HEAD tree was also run there.

| Commit | Result |
|---|---|
| 304d663321f baseline | 124 passed, 12 skipped |
| 1edf3d22bf6 | 126 passed, 12 skipped |
| 4731af41295 | 126 passed, 12 skipped |
| dff4425ce14 | 126 passed, 12 skipped |
| 4a7ff284e3b | 126 passed, 12 skipped |
| b6f362b2bbc isolation | 128 passed, 12 skipped |
| 9813d55182b dry_run | 138 passed, 12 skipped |
| 9e0e41626e1 installable | 139 passed, 12 skipped |
| 574ce683a19 HEAD | 140 passed, 12 skipped |

The results above were measured on commits with the same trees whose isolation message differed by one sentence. Only messages changed after that, and I checked that each tree is identical.

Pre-commit (black, ruff, flake8 and the others) passed on the isolation commit's three files. It was run with `-c <WORKING_DIRECTORY>/.pre-commit-config.yaml.sample`, which is the config the installed hook uses; there is no `.pre-commit-config.yaml` in the worktree. No functional tests were run.
