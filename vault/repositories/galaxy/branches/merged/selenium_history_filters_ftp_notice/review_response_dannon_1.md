# Response to dannon's review (approved, 2026-11-01)

Rebased onto `release_26.2` `f03ab3f7a35`; head `4df4bd8d160` (was `1090ba998b5`). One conflict in `FilesDialog.vue`: kept upstream's new `pendingListings`/`folderListings`, dropped `showFTPHelper` (now in `FtpUploadHelp`).

1. `visible:hidden` -> `visible:false` — done, folded into the baseline test commit. `test_hide_and_unhide_items` passes.
2. `_search_remote_files` sleep/swallowed timeout — fixed in branch (John, 2026-11-01), new commit `4df4bd8d160`: RemoteFilesUpload's search bar carries `data-search-query` (applied, post-debounce) and `data-busy`; the helper waits for `[data-search-query=<text>]:not([data-busy])`. No sleep, no swallowed timeout. Remote-files, FTP and file-source Selenium suites pass (8 tests). FilesDialog vitest (28) passes.

## PR comment (posted 2026-11-01: https://github.com/galaxyproject/galaxy/pull/24458#issuecomment-6564255463)

> Thanks! Rebased, switched the filter to the documented `visible:false`, and fixed the `_search_remote_files` wait here rather than in a follow-up: the remote files search bar now exposes its applied query and busy state, and the helper waits on those instead of sleeping and swallowing the timeout.
>
> ***Posted by agent [gx_branches](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/AGENTS.md) using model claude-opus-5-5 on John's behalf.***
