Fix two Upload Activity bugs - Choose Remote Files never shows the FTP server notice FilesDialog has, and long names overflow the remote files and data library browsers - plus history panel filter and remote-folder E2E coverage.

| | Before (`release_26.2`) | After |
| --- | --- | --- |
| Choose Remote Files > FTP Directory | ![no FTP notice](screenshots/before_ftp_help.png) | ![FTP notice](screenshots/after_ftp_help.png) |
| Choose Remote Files, long file name | ![name runs over Details](screenshots/before_remote_files_long_name.png) | ![name wraps](screenshots/after_remote_files_long_name.png) |
| Import from Data Library, long library name | ![name clips past the table](screenshots/before_data_library_long_library_name.png) | ![name wraps](screenshots/after_data_library_long_library_name.png) |

The older FilesDialog modal tells users which FTP server to log in to; the Upload Activity's Choose Remote Files (new in 26.0) never did, so a user browsing an empty FTP directory gets no hint how to fill it. Long unbroken names push into the next column in both Upload Activity browsers.

***Every user-visible fix has an E2E test that failed on `release_26.2` at its own assertion (notice not visible; file name 734px and library name 1063px past the Name column), and the empty-site guard's vitest failed before its fix. The only UI changes are the restored notice and a CSS wrap rule; the test helpers ride along because the fix tests need them (`history_panel.search` never matched, and the remote-files search raced its debounce).***

<details><summary>Client fixes</summary>

- **FTP notice.** FilesDialog's inline notice moved into the existing `FtpUploadHelp.vue`, which now takes `uri` and decides for itself when to show (`gxftp://` plus config loaded). FilesDialog drops `showFTPHelper`; `RemoteFilesUpload.vue` adds `<FtpUploadHelp :uri="currentFileSourceUri" />`.
- When `ftp_upload_site` is unset, the "log in to the FTP server at" sentence is skipped instead of rendering with an empty server.
- **Long names.** A two-property `upload-browser-label` mixin in `upload-table-shared.scss`, applied to the name labels in `RemoteFilesUpload.vue` and `DataLibraryUpload.vue` (libraries, folders, datasets).

</details>

<details><summary>Test helpers and coverage</summary>

- **History panel.** Fixes `history_panel.search`, whose selector never matched, and adds `history_panel_filter`. Adds Selection menu confirm, undelete and hide/unhide helpers. `test_collection_builders` and `test_history_related_filter` switch to them.
- New `test_hide_and_unhide_items`, and `test_delete_undelete_and_purge_items` extended with undelete under `deleted:true`. An item that stops matching the filter must leave the list; API state is checked at every step.
- **Remote files.** The upload helpers search for each file before ticking it, and gain `open_remote_folder` and `path=`. The search outlasts `DataDialogSearch`'s 500ms debounce and tolerates sources that ignore the query (Invenio). New `test_upload_from_remote_file_source_folder` checks the uploaded content.
- `assert_label_within_its_column` measures each label against its `td` for both long-name tests.
- `libraries_folder_create` now waits for its save to finish (also used by `test_library_contents`).

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The client changes are one restored alert and a CSS wrap rule; everything else is test code.

## Context

Builds on 🔀 #24380, whose history panel test and helpers the undelete/hide tests extend. Split out of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives these flows. Alternative kept on 🌿[`selenium_history_filters_ftp_notice_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_history_filters_ftp_notice_alt_original_scope) - the notice condition duplicated in RemoteFilesUpload, no empty-site guard, no data library wrap, and no remote-files search debounce/Invenio hardening or `libraries_folder_create` wait. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented after one widening round.</summary>

- Round 1 widened the branch: `FtpUploadHelp` owns its `gxftp://` rule and guards an unset site, and the wrap fix covers the data library browser.
- A second search for the same overflow elsewhere found none: other Upload Activity tables render names in inputs or aren't `fixed`.
- Baseline-first commit order lets it be split by commit range (history tests / remote-files helpers / client fixes) if reviewers prefer.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>One nit fixed; no structural regression.</summary>

- `_upload_all` compared sorted names to an unsorted list (breaks at 11 files); now sorts both sides.
- The sleep-plus-wait in `_search_remote_files` stays until the client exposes a "search applied" signal - a dev follow-up.
- Moving `FtpUploadHelp.vue` out of `FilesDialog/` is cosmetic churn for a release branch.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Cut redundant vitests; moved one check to E2E; no assertion weakened.</summary>

- Dropped the vitest "names the FTP server" - covered by the FilesDialog baseline vitest and the E2E, and not red before its commit.
- "Hidden outside the FTP directory" moved into `test_ftp_directory_shows_upload_site`, after the notice is first shown.
- Kept the "no FTP site" vitest; it went red against the old component at its own assertion.

</details>

### ✅ Second Frontier Model Review

<details><summary>One confirmed race fixed: the remote-files search could settle before its debounce fired.</summary>

The helper now waits out the debounce before checking the listing; 8 remote-files/FTP tests pass on Playwright and Selenium. An earlier round's finding (Invenio ignores the query) is also handled.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Refactors moved ahead of the fixes that use them.</summary>

- The `FtpUploadHelp` move (with its `uri` prop) is a no-behavior commit before the FTP fix.
- The wrap mixin and column check are their own commit between the two long-name fixes.
- The `libraries_folder_create` wait is its own commit. Final tree unchanged.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The FTP notice is a plain alert; without `ftp_upload_site` it just leaves out the server sentence. The wrap is CSS only.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes - both vitests check rendered text.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - FilesDialog notice, history undelete/hide and remote subfolder upload baselines precede the changes; each fix adds its red-first test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/integration_selenium/test_upload_ftp.py::TestUploadFtpSeleniumIntegration::test_ftp_directory_shows_upload_site`
- `test/integration_selenium/test_upload_activity_remote_files.py::TestUploadActivityRemoteFiles::test_long_remote_file_name_stays_in_its_column`
- `test/integration_selenium/test_upload_activity_remote_files.py::TestUploadActivityRemoteFiles::test_upload_from_remote_file_source_folder`
- `lib/galaxy_test/selenium/test_upload_activity.py::TestUploadActivityDataLibrary::test_long_data_library_names_stay_in_their_column`
- `lib/galaxy_test/selenium/test_history_panel.py::TestHistoryPanel::test_hide_and_unhide_items`
- `lib/galaxy_test/selenium/test_history_panel.py::TestHistoryPanel::test_delete_undelete_and_purge_items`
- `client/src/components/FilesDialog/FtpUploadHelp.test.ts`, `client/src/components/FilesDialog/FilesDialog.test.ts`

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
