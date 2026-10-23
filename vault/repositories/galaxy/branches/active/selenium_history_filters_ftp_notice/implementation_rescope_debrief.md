# Re-scope debrief

The first [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest expansion. The original scope is kept as [an alt](alts/original_scope.md), `selenium_history_filters_ftp_notice_alt_original_scope` at `c0dc095f409`. Two commits were added on top. Head: `e623c41bf81`.

1. **`df457e55a04` Let FtpUploadHelp decide when it shows.**
   - The component takes `uri` and renders only for `gxftp://`.
   - FilesDialog drops `showFTPHelper`. RemoteFilesUpload passes `currentFileSourceUri`.
   - When `ftp_upload_site` is unset, the "log in to the FTP server at" sentence is skipped, so the notice no longer names an empty server.
   - New `FtpUploadHelp.test.ts` covers the shown and hidden cases and the missing-site case.
2. **`e623c41bf81` Wrap long names in the data library browser too.**
   - `DataLibraryUpload.vue` had the same overflow at both levels: a folder or dataset name ran 917px past its column, a library name 1063px. Both tests were red first.
   - The rule is now an `upload-browser-label` mixin in `Panels/Upload/shared/upload-table-shared.scss`, used by both browsers.
   - The new test is `test_long_data_library_names_stay_in_their_column`.
   - The [re-scope review](subagents/rescope_review.md) found the library-level case and extracted `assert_label_within_its_column`, which both long-name tests now share.

**Not taken from the evaluation:** none. Both recommended items are in.

**Tests.**
- Data-library tests pass on Playwright and Selenium.
- Remote-files and FTP integration tests (6) pass on both backends. The run on both came after `df457e55a04`; after the helper extraction, only Playwright was rerun.
- Vitest `FilesDialog/` passes (21 tests).

The re-scope review debrief is in `subagents/rescope_review.md`. Re-hardening follows. The first-round debriefs are in `earlier_drafts/1/`.
