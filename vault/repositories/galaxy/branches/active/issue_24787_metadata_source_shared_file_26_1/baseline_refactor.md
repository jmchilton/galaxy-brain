Run via Opus 5.5 at medium effort.

The earlier refactor commit `52f07e6f188` (resolve `make_copy`'s target first) still stands, and this pass found nothing new to move onto the base and did not rewrite history.

The tip is unchanged: `8c9d6135164`, tree `822f331a7ca`.

## The refactor that stands

`52f07e6f188` sits directly after the baseline tests commit `5fb51d0c180`. It changes only `make_copy` in `lib/galaxy/model/metadata.py`, and it is still needed because the fix's new branch reads `target`.

I rechecked its one behaviour difference on the base: an id-less value with no parent used to return the value and now returns `None`. That case still can't be reached. `make_dict_copy` is the only caller that reaches `FileParameter.make_copy`, and it evaluates `key in self.spec` first. `spec` reads `self.parent.datatype`, so a missing parent raises before the call. I read this in the code and did not exercise it.

## What the re-scope added, and why none of it moves

- **`from_external_value` (`a47a14988ce`).** This is a one-clause behaviour change, with nothing to separate out.
- **`_metadata_file_named_by_live_row` in `cleanup_datasets.py`.** This is the fix's logic and would have no caller on the base.
- **`_delete_dataset`'s re-indent.** The guard pushes the existing `try` one level deeper. Extracting a removal helper onto the base would make the fix commit shorter, but it adds a single-caller helper on a release branch only to avoid a re-indent that `git diff -w` already hides.
- **`RemovesMetadataFiles` in `pgcleanup.py`.** `RemovesObjects.remove_objects` and `Cleanup._update` already exist on the base, so the guard needs no preparation. The override and `_keep_files_named_by_live_rows` are the fix.
- **`_hda`, `_metadata_files_with_same_uuid` and `_metadata_file` in `test_scripts.py`.** Only the new tests call these helpers, so they are not a refactor of existing tests.

## History left as it is

The pgcleanup guard is built over three commits, and the last two rework the first: `68438838e68`, `badfe530121`, `8c9d6135164`. Together they net out to one guard, with `Action._conn` added and then removed.

Squashing them, along with the test-only cleanups `b0de86460d8`, `6953cb52a99`, `b6d91bbfa8c` and `7f16b0d9fbd`, would give a cleaner series. I left it because that isn't a refactor onto the base, so this process doesn't call for it, and it would invalidate the SHAs the current debriefs cite. It is a reasonable step before opening a PR.

## Test results

The refactor commit ran from a `git archive` export in the scratchpad, using the worktree's `.venv`, so the worktree was never checked out to another commit. The first export left out `client`, which broke the `navigation.yml` symlink and failed collection. Results below are from the export with that directory restored.

| Commit | Run | Result |
|---|---|---|
| `52f07e6f188` | `test_model_store.py`, both `test_metadata.py` unit files | 65 passed, 1 xfailed |
| `52f07e6f188` | `test_metadata_source_metadata_files.py` (the 2 baseline tests) | 2 passed |
| `52f07e6f188` | ruff, black, isort on `metadata.py` | clean |
| `8c9d6135164` | `test_model_store.py`, both `test_metadata.py` unit files | 65 passed, 1 xfailed |
| `8c9d6135164` | `test_metadata_source_metadata_files.py` | 7 passed |
| `8c9d6135164` | `test_scripts.py -k cleanup_keeps_metadata_file` | 1 passed |
| `8c9d6135164` | `test_scripts_pgcleanup.py -k metadata_file`, on Postgres | 2 passed |

mypy reports 268 errors on `metadata.py` at both commits. I compared those counts only and did not run mypy on the base. This closes the gap the previous pass noted, when the refactor commit's tree was tested but not linted or type-checked.

## Notes for the coordinator

- The local branch `issue_24787_pre_baseline_refactor_backup` from the previous pass still exists, at `48a69409aaa`. Delete it once the history is accepted. Only the debriefs in `earlier_drafts/1/` cite its old SHAs, and those citations stop resolving once it's gone.
