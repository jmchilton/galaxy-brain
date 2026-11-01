# Alt: refactored_history

Branch `issue_24376_library_download_test_26_2_alt_refactored_history` (pushed to `jmchilton`, tip `27875b5e26f`).

It has the same final tree as the parent at `f552bcc3656` (tree `84e84ac478d`), with the history restructured by the baseline-refactor step (`baseline_refactor.md`):
- The first commit, `14cf67271ca`, adds `LibraryPopulator.download_library_datasets_raw` on the base and converts the existing `test_download_uses_download_extension` to use it. Behaviour is unchanged.
- The rest of the parent's commits are replayed on top, with the helper used from the start.

Adopting it means force-pushing the parent branch to this history. I wasn't permitted to force-push, so this is left for John or the branch agent. `baseline_refactor.md` also suggests squashing into three commits for the PR: refactor, server fix, E2E fix.
