Run via Opus at default effort.

No refactoring of the base branch was performed.

## Why

I reviewed the 4 commits in `upstream/release_26.2..HEAD` (`765e06ff71a`, `56807d9a4e0`, `4806c50d1cb`, `63267ab1311`). None of them restructures existing code in a way that keeps behavior the same.

- `FolderTopBar.vue`, `download--btn` changed to `download-btn`: this is the bug fix. The `#download-btn` selector never matched before. It changes what the page renders, so it can't move ahead of the fix as a refactor.
- `framework.py`, `download_file_from()`: a new helper, not a rewrite of existing code. Grepping `lib/galaxy_test` and `lib/galaxy/selenium` for `get_download_path`, `expect_download` and `crdownload` finds no other download-handling code it could replace. A commit that added only this helper would leave it with no caller, so it adds nothing as a standalone baseline commit. Its one consumer is the test this branch fixes.
- `test_library_contents.py`: the test was renamed so pytest collects it, its setup now goes through the API, and its assertions were fixed. All of that belongs to the fix. The old version was never collected and could not pass, so a "restore base behavior" refactor of it has nothing to preserve.
- The later commits only polish the first one: Firefox `.part` handling, API setup and a screenshot. They are not separate refactors.

Since no history was restructured, I created no `issue_24376_library_download_test_26_2_refactor_proposal` branch, and the working branch is unchanged.
