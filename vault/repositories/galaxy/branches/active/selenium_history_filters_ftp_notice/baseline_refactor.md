# Baseline refactor: selenium_history_filters_ftp_notice

I split the `FtpUploadHelp.vue` extraction out of the FTP fix into its own commit. It changes no behavior and now sits directly before the fix.

## What changed

- **New `3cb2cd26015` "Move FilesDialog's FTP upload notice into FtpUploadHelp"**
  - Changes only `FilesDialog.vue` and the new `FilesDialog/FtpUploadHelp.vue`, including the `data-description="ftp upload help"` attribute, which nothing uses yet.
  - FilesDialog renders `<FtpUploadHelp v-if="showFTPHelper" id="helper" />`, and `useConfig` moved into the component.
  - The earlier baseline vitest (`a47703fbac1`, the notice names `ftp_upload_site` via `#helper`) still passes on this commit.
- **`15a5ef5663f` "Show the FTP upload notice in Choose Remote Files again" (was `65fbe586a79`)**
  - Now contains only the fix:
    - the `RemoteFilesUpload.vue` import and `v-if`
    - the `remote_files_ftp_help` nav entry
    - the `test_upload_ftp.py` changes (the `FTP_UPLOAD_SITE` hoist and the new red-before test)
  - I reworded the message so it no longer claims the move.
- I left the rest alone. The helper commits already come before the tests and fixes that use them, and the long-names fix is two CSS lines.
- I didn't do the two changes thermo-nuclear deferred: making `FtpUploadHelp` own the `gxftp://` visibility rule, and moving it out of `FilesDialog/`. See `thermo_nuclear_review.md`.

## Verification

- `git diff 2bdb5e887ea c0dc095f409` is empty. The final tree is unchanged, so I didn't rerun E2E or rebuild the client.
- At the detached `3cb2cd26015`, vitest on `client/src/components/FilesDialog/` passed: 2 files, 18 tests.
- Pre-commit hooks (prettier, eslint) passed on both new commits.

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests: FilesDialog FTP notice names the FTP server | `a47703fbac1` | unchanged |
| Fix history_panel.search and add history_panel_filter | `85cdc82cd75` | unchanged |
| Add Selection menu undelete and hide history panel helpers | `0ac901aa482` | unchanged |
| Baseline tests: undelete and hide history items from filters and the Selection menu | `4e6666a7ffe` | unchanged |
| Search for each remote file before ticking it in Choose Remote Files | `519f7e8739d` | unchanged |
| Let the upload helpers open remote file folders | `baa08b28110` | unchanged |
| Baseline tests: upload from a remote file source subfolder | `38efba63f5b` | unchanged |
| Move FilesDialog's FTP upload notice into FtpUploadHelp | (new) | `3cb2cd26015` |
| Show the FTP upload notice in Choose Remote Files again | `65fbe586a79` | `15a5ef5663f` |
| Wrap long names in the remote files browser (head) | `2bdb5e887ea` | `c0dc095f409` |
