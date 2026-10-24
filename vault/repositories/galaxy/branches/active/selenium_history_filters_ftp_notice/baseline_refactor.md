# Baseline refactor: selenium_history_filters_ftp_notice (round 2)

I moved two refactors ahead of the fixes that use them. The `uri` prop on `FtpUploadHelp` went into the move commit, which now comes before the FTP fix. The `upload-browser-label` mixin and its column check went into their own no-behavior commit between the two long-name fixes. I also split the `libraries_folder_create` wait into its own commit. The final tree matches the old head exactly.

## What changed

- **`b752aa13822` "Move FilesDialog's FTP upload notice into FtpUploadHelp"** (was `c2f568a4869`)
  - Now also contains the visibility part of `1316048b601`:
    - `FtpUploadHelp` takes `uri` and owns the `gxftp://` check.
    - FilesDialog drops `showFTPHelper` and binds `:uri="urlTracker.current.value?.url"`.
  - This changes no behavior. `open()`, `onGoBack()` and mount each call `load()` right after moving `urlTracker`, so binding the URI matches the old snapshot that `load()` took.
- **`7a7afe7061b` "Show the FTP upload notice in Choose Remote Files again"** (was `1475a6793ef`)
  - Same fix as before, except it uses `<FtpUploadHelp :uri="currentFileSourceUri" />` from the start.
  - This exact code never existed before the rewrite, so I tested it on its own (see below).
- **New `5d849a9a1c5` "Skip the FTP log-in sentence when ftp_upload_site is unset"**
  - This is the behavior half of `1316048b601`: the `v-if` span and `FtpUploadHelp.test.ts`.
  - I moved it before the wrap commit so the FTP commits sit together.
- **`80a2948c6b2` "Wrap long names in the remote files browser"** (was `353b57eff3e`): cherry-picked unchanged.
- **New `1c99ce30725` "Wait for libraries_folder_create to save the folder"**
  - Split out of `5ebde678b29`.
  - It hardens a helper that existing tests also call (`test_library_contents.py`), so it is not part of the data-library fix.
- **New `3fa0eac12a7` "Share the browser name wrap rule and column check"**
  - Changes no behavior. It adds the `upload-browser-label` mixin to `upload-table-shared.scss` and `assert_label_within_its_column` to `upload_activity_helpers.py`.
  - It switches `RemoteFilesUpload.vue` and `test_upload_activity_remote_files.py` over to them.
  - It can't go onto the base: nothing there has the wrap rule, so the mixin would be dead code. It sits directly after the first wrap fix instead.
- **`152f307c6d3` "Wrap long names in the data library browser too"** (head, was `5ebde678b29`)
  - Now contains only the fix: the `DataLibraryUpload.vue` classes and mixin use, plus the new test.
  - I reworded the message so it no longer claims the extraction.
- I didn't touch the commits before `160829ed053`. Their helpers already come before the tests and fixes that use them.

## Verification

- `git diff 5ebde678b29 152f307c6d3` is empty.
- `git diff 1316048b601 80a2948c6b2` was empty: the FTP and remote-files state matches the old branch at the same point.
- **Vitest**
  - At `b752aa13822`: `client/src/components/FilesDialog/` passed (2 files, 18 tests), including baseline `a47703fbac1`.
  - At `5d849a9a1c5`:
    - With the parent's `FtpUploadHelp.vue`, `FtpUploadHelp.test.ts` failed as expected (it still showed "log in to the FTP server").
    - With the commit's version, all of `FilesDialog/` passed (3 files, 19 tests).
- **E2E at detached `7a7afe7061b`** (client rebuilt): `test_ftp_directory_shows_upload_site` passed on Playwright and on Selenium.
- **E2E at head `152f307c6d3`** (client rebuilt), one test at a time, all passed on Playwright and on Selenium:
  - `test_ftp_directory_shows_upload_site`
  - `test_long_remote_file_name_stays_in_its_column`
  - `test_long_data_library_names_stay_in_their_column`
- I also ran `test_library_contents.py::test_sub_folder`, an existing caller of `libraries_folder_create`, on Selenium. It passed.
- Pre-commit hooks (prettier, eslint) passed on every new commit.
- The backup branch `selenium_history_filters_ftp_notice_pre_baseline2` points at `5ebde678b29`.

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests ... through "Baseline tests: upload from a remote file source subfolder" | `a47703fbac1`..`160829ed053` | unchanged |
| Move FilesDialog's FTP upload notice into FtpUploadHelp | `c2f568a4869` | `b752aa13822` |
| Show the FTP upload notice in Choose Remote Files again | `1475a6793ef` | `7a7afe7061b` |
| Skip the FTP log-in sentence when ftp_upload_site is unset (was "Let FtpUploadHelp decide when it shows") | `1316048b601` | `5d849a9a1c5` |
| Wrap long names in the remote files browser | `353b57eff3e` | `80a2948c6b2` |
| Wait for libraries_folder_create to save the folder | (split from `5ebde678b29`) | `1c99ce30725` |
| Share the browser name wrap rule and column check | (split from `5ebde678b29`) | `3fa0eac12a7` |
| Wrap long names in the data library browser too (head) | `5ebde678b29` | `152f307c6d3` |
