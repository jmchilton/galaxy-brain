# original_scope

Branch `jmchilton/selenium_history_filters_ftp_notice_alt_original_scope` at `c0dc095f409`: the branch as first hardened, before the re-scope. It has the batch 7 extraction and all the hardening fixes up to the scope evaluation.

The parent adds two commits on top:
- `FtpUploadHelp` takes the current URI and decides for itself when to show. FilesDialog drops `showFTPHelper`, and the "log in to the FTP server at" sentence is skipped when `ftp_upload_site` is unset. It has a vitest.
- The data library browser gets the same long-name wrap as the remote files browser, shared as an `upload-browser-label` mixin. Its test, `test_long_data_library_item_name_stays_in_its_column`, was red before the fix.
