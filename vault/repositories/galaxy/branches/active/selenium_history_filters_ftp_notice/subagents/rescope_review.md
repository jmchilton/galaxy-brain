# Re-scope review (c0dc095f409..HEAD)

Acted on: the library list's `<strong>` name had the same overflow bug (red at 1063px past the column, Playwright), now wraps via the shared mixin; extracted the duplicated overflow JS into `UsesUploadActivity.assert_label_within_its_column` (used by the remote-files and data-library tests); reshaped the data-library E2E into `test_long_data_library_names_stay_in_their_column`, which checks both library and folder labels. Folded into the "Wrap long names in the data library browser too" commit (now e623c41bf81). FilesDialog parity and the vitest looked fine; no change.

Not acted on:
- `FtpUploadHelp.test.ts` repeats the `[data-description='ftp upload help']` selector 4x - cheap nit, left as is.
- "names the FTP server" vitest overlaps the FilesDialog baseline test - kept as the positive control for the hidden/no-site cases.
- Dataset List phase name cell (`.font-weight-medium` span in `file-table`) not checked for overflow - that table isn't `fixed`, out of scope.
- `isort --check` flags `upload_activity_helpers.py` at HEAD before this change (imports untouched) - pre-existing.

Tests: Playwright data-library long-names (red, then green after rebuild); Selenium same + `test_upload_from_data_library` (2 passed); Playwright `test/integration_selenium/test_upload_activity_remote_files.py` (3 passed); vitest `src/components/FilesDialog/` (21 passed).

<details>
<summary>Full review</summary>

**df457e55a04 Let FtpUploadHelp decide when it shows**
- FilesDialog parity: `showFTPHelper` was set at the top of `load()`, right after `open()`/`onGoBack()` changed `urlTracker.current`. Binding `:uri="urlTracker.current.value?.url"` changes at the same moment, so behavior matches; it also stays right if `current` changes without a `load()`. `SelectionDialog` renders `<slot name="helper" />` unconditionally, and with the alert's `v-if` false the `id="helper"` fallthrough has no root, so `#helper` is absent. The FilesDialog baseline test (`should show ftp helper only in ftp directory`) still passes.
- Both callers now pass a URI. The `gxftp://` literal lives in one place. Good reuse.
- Skipping the log-in sentence when `ftp_upload_site` is unset is a reasonable fix and is covered by the vitest.
- The vitest mocks `useConfig` the way FilesDialog.test.ts does. The three cases are behavioral, not trivial. Nit: the selector is repeated.

**cbedbb99ef7 Wrap long names in the data library browser too**
- The mixin in `upload-table-shared.scss` is a good small shared abstraction; RemoteFilesUpload uses it too.
- Bug: the library list view (`<strong data-test-id="data-library-browser-library-label">`) sits in the same `fixed` GTable, and a long library name overflowed in the same way. Confirmed red at 1063px. Fixed by adding the class to the mixin selector (`overflow-wrap` works on inline text).
- E2E placement: `TestUploadActivityDataLibrary` (admin, `run_as_admin`), next to `test_upload_from_data_library`. Right class. It reuses `libraries_index_create`, `libraries_open_with_name`, `libraries_folder_create` and the existing `data_library_*_label` navigation entries.
- The overflow JS was copied verbatim from the remote-files integration test, so it is now one helper on `UsesUploadActivity`.
- The test now builds its own long-named library (random suffix) and doesn't rely on `self.name` from `navigate_to_new_library`.

</details>
