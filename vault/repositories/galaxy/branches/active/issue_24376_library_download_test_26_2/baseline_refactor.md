Run via Opus at default effort.

I moved one test-only refactor onto the base: `LibraryPopulator.download_library_datasets_raw`, with the existing `test_download_preserves_extension` converted to use it. It is built as the first commit of the LOCAL, unpushed branch `issue_24376_library_download_test_26_2_refactor_proposal` (`27875b5e26f`). That branch ends with the same tree as the working branch (`84e84ac478d`). The working branch and the pushed history are unchanged.

## The refactor commit

`14cf67271ca` "Add LibraryPopulator.download_library_datasets_raw", on the branch's merge base `0fa4dc4c4fa` (`release_26.2`):
- `populators.py`: adds `download_library_datasets_raw(ld_ids, archive_format="zip")`, a thin `GET libraries/datasets/download/{format}` wrapper.
- `test_libraries.py::test_download_preserves_extension`: its two hand-built `self._get("libraries/datasets/download/...")` calls now go through the helper.
- Behavior is unchanged: the same GET, with the same parameters, through the same test interactor. That test passed on HEAD during the thermo-nuclear review (`-k download`).
- Checked statically at this commit: ruff, black and `py_compile` are clean on both files. I did not start a server to re-run the API test at this commit.

This is the only part of `7771e277294` that predates the branch's new code, so it is the only piece that makes sense on the base by itself. The rest of `7771e277294` switched the new `test_download_fetched_dataset` to the helper. On the proposal branch that change is folded into the commit that adds the test, so the test uses the helper from the start.

## How the proposal branch differs from the working branch

| Working branch | Proposal branch |
| --- | --- |
| (none) | `14cf67271ca` refactor (above) |
| `765e06ff71a`, `56807d9a4e0`, `4806c50d1cb`, `63267ab1311` | `7b4f6fbc274`, `1f8a910d2d6`, `afba08acbe9`, `65c1512fe83`: same changes, replayed |
| `b8a71a90c34` API test, then later `7771e277294` helper | `bee62a99d46`: the API test, using the helper directly |
| `25224faf2ba`, `9593bbfbd8d`, `f552bcc3656` | `63222d91a0c`, `56a1b8c87cc`, `27875b5e26f`: same changes, replayed |

- I built it with plumbing only: a temporary `GIT_INDEX_FILE`, `git merge-tree --write-tree` and `git commit-tree`, then `git branch` for the ref. Every replay applied without conflicts.
- Commit authorship and dates are kept.
- No checkout, stash or worktree changes were made.

## What I did not move to the base, and why

These are the same conclusions as the earlier run, re-checked against the expanded scope:
- **`library_datasets.py` (`ldda.library_dataset.folder` → `ld.folder`).**
  - It looks like a simplification, but for LDDAs created before the fix it is the fix: `ldda.library_dataset` is `None` for those rows.
  - On the base it would change behavior (500 → 200) and need its own justification. It belongs with the fix.
- **The `discover.py` and `store/__init__.py` back-links.** These are the fix.
- **`FolderTopBar.vue` `download--btn` → `download-btn`.** A behavior fix: the selector never matched before.
- **`framework.py` `download_file_from`.**
  - It is new infrastructure, and there is still no existing download-polling code in `lib/galaxy_test` / `lib/galaxy/selenium` for it to replace.
  - On its own on the base it would have no caller.
- **The `LibraryPopulator.fetch_to_folder` setup switch (`f552bcc3656`).**
  - It only touches tests the branch adds or revives, so on the base there is nothing for it to refactor.
  - Its E2E half also depends on the server fix: before the fix, fetched datasets fail to download.

## History recommendation for the PR (recommendation only)

The tests added here fail before the fix, so none of them qualifies as "Baseline tests" under the workhorse convention. My suggestion is to squash the proposal branch into three commits:

1. `Add LibraryPopulator.download_library_datasets_raw` (`14cf67271ca` as-is). This can go upstream separately or lead the PR.
2. `Link fetched and imported LDDAs back to their library datasets`: fold `b8a71a90c34` + `25224faf2ba` + `9593bbfbd8d`, plus the API half of `f552bcc3656`.
   - The regression tests and their fix go in together, so bisection never lands on a red API test.
   - If reviewers want to see the test fail first, CI on a test-only commit would show it. I don't think it's worth it, though, because the commit message and the PR text can state the 500.
3. `Fix the library folder Download button id and run its E2E test`: fold `765e06ff71a` + `56807d9a4e0` + `4806c50d1cb` + `63267ab1311` + the Selenium half of `f552bcc3656`.
   - This must come **after** commit 2: the final E2E setup uses `fetch_to_folder`, which needs the server fix to download.

The current pushed order (E2E first, server fix later) is green at every commit, because the E2E test used the legacy upload until `f552bcc3656`. So the reorder is a matter of readability, not correctness. All of this would need a force-push of the PR branch, which is the coordinator's or John's call.
