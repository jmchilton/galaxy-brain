# original_scope

Branch `jmchilton/selenium_history_filters_ftp_notice_alt_original_scope` at `c0dc095f409`: the branch as first hardened, before the re-scope. It has the batch 7 extraction and all the hardening fixes up to the scope evaluation.

Compared with this alt, the parent branch also:
- Has `FtpUploadHelp` take the current URI and decide for itself when to show. FilesDialog drops `showFTPHelper`. The "log in to the FTP server at" sentence is skipped when `ftp_upload_site` is unset, with a vitest.
- Wraps long folder, dataset and library names in the data library browser too. The wrap rule is shared as the `upload-browser-label` mixin, and `test_long_data_library_names_stay_in_their_column` was red before the fix.
- Waits for `libraries_folder_create` to finish saving.
- Lets the remote-files search outlast its debounce and survive sources that ignore the query.

Round-2 hardening rewrote the parent's history, so its commits don't line up one-to-one with this alt's.
