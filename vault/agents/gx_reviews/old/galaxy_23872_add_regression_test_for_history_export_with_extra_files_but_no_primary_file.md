# galaxy#23872 — [26.1] Add regression test for history export with extra files but no primary file

- Author: davelopez
- Base: `release_26.1` (merge-base `f05457c1536`, base tip at review `5db830ec6f4`)
- Head reviewed: `e826c5ca121`
- Size: +25/-0, one file: `test/unit/data/model/test_model_store.py`
- Worktree: `~/projects/worktrees/galaxy/pr/23872`
- Closes #20678; guards the fix in #20984 ("Ensure that conversion_key is defined", merged to dev 2025-10-02, already in release_26.1)

## Summary

Adds `test_export_history_with_extra_files_but_no_primary_file`. It creates a PAUSED html
HDA with only a composite child file (no primary file), exports the history with
`export_files="copy"`, re-imports it, and asserts one dataset came back.

## Does it guard the fix? (reasoned, unrun)

Yes. In `DirectoryModelExportStore.serialize_files`
(`lib/galaxy/model/store/__init__.py:2053`), `file_name` stays `None` when the primary
file is missing (`:2078-2083`). Before #20984, `conversion_key` was assigned only inside
`if file_name:`, and the `if extra_files_path:` branch read it at `:2125-2127`. That
read raised `UnboundLocalError` when the directory listing was non-empty. The test sets
up that exact state: `write_composite_file` creates `extra_files_path/parent_dir/child_file`,
so `os.listdir` is non-empty, and there is no primary file. The test's own preconditions
(`assert not os.path.exists(...)`, `assert d1.extra_files_path_exists()`) pin that
setup. `export_history` does not filter by state (`:2307-2316`), so PAUSED isn't required
to reach the bug. It matches the issue report, though. The PR body says the author
reverted the fix locally and saw the original error.

## Verdict

Approve. The test is small, sits at the right level (a model-store unit test, not API),
and closely follows the neighbouring `test_import_export_composite_datasets` and its
helpers (`_mock_app`, `_create_datasets`, `app.write_composite_file`,
`_perform_import_from_directory`). Imports are already at module top (`os`, `store`,
`model`). The issue-link comment is useful.

## Findings

1. (nit, optional) `test_model_store.py:1014` — the final `assert len(import_history.datasets) == 1`
   says little about the export half, which is the half that regressed. Because the
   dataset has no primary file, the import drops it into the discarded/deferred branch
   (`store/__init__.py:695-711`) and never touches the extra files. A cheap, sharper
   check is to assert the export wrote the extra files dir: for example,
   `datasets_attrs.txt` has a non-empty `extra_files_path` for the dataset, and
   `tmp_path / that_path / "parent_dir" / "child_file"` exists. That would also catch a
   future change that skips the extra-files branch silently, which would leave the
   test green without covering `:2117-2130`. Not blocking.

No other findings. Nothing was weakened and there are no new abstractions to judge.

## CI (at `e826c5ca121`, 2026-10-02)

Unit tests (3.10/3.14), Unit w/postgres, Python linting, API, and the other checks are
green. The four Integration shards were still in progress and are unrelated to a
unit-test-only change.

## Draft PR comment (unposted)

> *Posted by Claude (AI assistant) on behalf of jmchilton.*
>
> Thanks, this looks good. I traced it against `serialize_files`. With no primary file
> and a non-empty extra files dir, the pre-#20984 code would hit the unbound
> `conversion_key` in the extra-files branch, so this test does guard the fix.
>
> One optional suggestion: the final assertion only checks the import count, and the
> import puts this dataset in the discarded/deferred path anyway. Asserting on the
> export side would pin the branch that regressed and catch the test going vacuous
> if export ever stops writing extra files for such datasets. For example, check that
> `datasets_attrs.txt` records a non-empty `extra_files_path` and that
> `parent_dir/child_file` exists under the export dir. Not blocking. Approving either way.
