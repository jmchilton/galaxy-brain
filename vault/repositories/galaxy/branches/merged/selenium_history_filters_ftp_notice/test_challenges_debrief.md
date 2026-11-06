# Test challenges: selenium_history_filters_ftp_notice (round 2, after re-scope)

Scope: `d83f7eaa13c..HEAD`, done fresh. Round 1 is in `earlier_drafts/1/`.

Summary of changes:
- Cut `FtpUploadHelp.test.ts` from three tests to one.
- Moved the "hidden outside the FTP directory" check into the E2E test.
- Weakened no assertion. Dropping two vitest cases is logged below.

`git diff e623c41bf81 HEAD` shows only these three files.

| Commit | Old | New |
| --- | --- | --- |
| Show the FTP upload notice in Choose Remote Files again | `15a5ef5663f` | `9d9ebbd00d3` |
| Wrap long names in the remote files browser | `c0dc095f409` | `b3c2164b9df` (rebased only) |
| Let FtpUploadHelp decide when it shows | `df457e55a04` | `ee7e1a1b5bb` |
| Wrap long names in the data library browser too (head) | `e623c41bf81` | `3d7daa91867` (rebased only) |

The hashes before `15a5ef5663f`, including the Baseline commits, are unchanged.

## Changes

1. **Dropped the vitest "names the FTP server in the FTP directory".**
   - It is covered twice already: by the FilesDialog baseline vitest (the same sentence) and by `test_ftp_directory_shows_upload_site`.
   - It is also not red before its commit, because at `df457e55a04^` the component rendered unconditionally.
   - The re-scope review kept it as a positive control. The remaining test asserts "upload files via FTP" itself, so it doesn't need one.
2. **Moved "is hidden outside the FTP directory" from vitest to E2E.**
   - The E2E test is `test_ftp_directory_shows_upload_site`. After the notice is shown, it clicks the "Sources" breadcrumb, waits for the root listing, and then `remote_files_ftp_help.wait_for_absent_or_hidden()`.
   - The notice was visible first, so the check isn't vacuous. At the root the URI is `undefined`, which is the case the vitest covered with `mountHelp(undefined)`.
   - The FilesDialog baseline vitest already covers the `gxfiles://` side.
   - Added the `upload_activity.remote_files_breadcrumb_link` selector (xpath on the `.breadcrumb-link` button, next to `remote_files_current_folder`).
   - Folded into "Show the FTP upload notice in Choose Remote Files again". The gating first appears in that commit, as `v-if` in RemoteFilesUpload.
3. **Kept "skips the log in sentence without an FTP site"** and simplified it.
   - It now uses one static `vi.mock` of `useConfig` (empty config), the same pattern as `FilesDialog.test.ts`. The `mountHelp` helper, the `mockReturnValue` and the `as unknown as` cast are gone.
   - An E2E test would need a second integration server config, with `ftp_upload_dir` set and no `ftp_upload_site`, so it stays at the vitest layer.
   - It was red with `FtpUploadHelp.vue` from `df457e55a04^`, at its own assertion: `expected 'This Galaxy server allows you to uplo…' not to contain 'log in to the FTP server'`.
   - Folded into "Let FtpUploadHelp decide when it shows".

## Per-test verdicts

- **FilesDialog baseline vitest:** keep. It was verified as a baseline in round 1 and is unchanged.
- **`test_delete_undelete_and_purge_items` extension and `test_hide_and_unhide_items` (Baseline):** keep. The re-scope didn't touch them, and they don't duplicate #24380's tests.
- **`test_upload_from_remote_file_source_folder` (Baseline):** keep. It checks the dataset content.
- **`test_ftp_directory_shows_upload_site`:** keep, strengthened (change 2). It is red before at its own text assertion.
- **`test_long_remote_file_name_stays_in_its_column`:** keep. It measures real layout and was red before (733px).
- **`test_long_data_library_names_stay_in_their_column` (new in the re-scope):** keep.
  - Red before at its own assertion (917px and 1063px).
  - It sets up the library and folder through the admin UI. The Selenium framework has no `LibraryPopulator` and no folder-create populator, and the sibling `_create_and_populate_library` also uses the UI, so I kept it consistent.
  - `logout_if_needed()` plus `admin_login()` matches the sibling helper.
- **`assert_label_within_its_column` helper:** fine. It is shared by both long-name tests and takes the smart component's element.
- **`test_collection_builders._show_hidden_content`, `test_history_related_filter`:** these only switch to the fixed `history_panel.search` component.

## Considered, not done

- **`setupMockConfig` (`tests/vitest/mockConfig.js`):** doesn't fit. It returns `config: { value }` as a plain object, not a ref, so the template's `config.ftp_upload_site` wouldn't unwrap it.
- **`shallowMount`:** not used. The component is a leaf whose text comes from the GAlert slot.

## Runs (one E2E at a time)

- Client rebuilt at HEAD before the E2E runs. The old bundle predated the last amend.
- Vitest `src/components/FilesDialog/`: 19 passed. The kept vitest was red against the pre-change component (above).
- `test_ftp_directory_shows_upload_site`: Playwright passed, Selenium passed.
- Round-1 gaps closed under Selenium:
  - `test_long_remote_file_name_stays_in_its_column` passed. It had only run on Playwright since the helper extraction.
  - `test_collection_builders.py::test_build_paired_list_auto_matched` passed. It exercises `_show_hidden_content`.
- ruff, ruff format and prettier are clean. Pre-commit passed on both fixups.
