# Scope evaluation: selenium_history_filters_ftp_notice (round 2, after re-scope)

**Recommendation: keep as implemented.** Evaluated `d83f7eaa13c..HEAD` at head `152f307c6d3`. Round 1 recommended two expansions, and both are now on the branch: `FtpUploadHelp` owns its `gxftp://` rule and skips the log-in sentence when no site is set, and the long-name wrap now covers the data library browser through a shared mixin. I checked again for the same bug in other places and found none. The other Upload Activity `fixed` tables render names in a `BFormInput` (`UploadTableNameCell`). The Dataset List phase table and SelectionDialog's table aren't `fixed`. Every remaining candidate is a refactor or a cosmetic change with no bug behind it, so none earns a place in a 26.2 PR. Don't contract either: John chose all of batch 7 in one branch, stacked on #24380.

## Possible Decompositions

The branch adds about 295 lines and removes about 48, all non-generated. This section is for John to decide on later and doesn't recommend a split. Each piece sits on #24380, or on `release_26.2` once #24380 merges.

**Option A: three PRs by area, in landing order.**
1. **History panel filters and Selection menu** (test-only; the only piece that needs #24380).
   - `85cdc82cd75`: `history_panel.search` fix and `history_panel_filter`, plus the `test_collection_builders` / `test_history_related_filter` switch.
   - `0ac901aa482`: Selection menu confirm, undelete and hide helpers.
   - `4e6666a7ffe`: Baseline undelete/hide E2E.
2. **Remote-files helpers** (test-only, independent of #24380).
   - `88038878b15`: search before ticking.
   - `547a61f53a8`: `open_remote_folder` and `path=`.
   - `160829ed053`: Baseline subfolder upload test.
3. **Upload Activity client fixes** (needs (2) for `open_remote_folder`).
   - `a47703fbac1`: Baseline FilesDialog vitest. It can go first on its own, and the round-1 order already puts it there.
   - `b752aa13822`: move the notice into `FtpUploadHelp` and give it the `uri` prop. No behavior change.
   - `7a7afe7061b`: FTP notice regression fix.
   - `5d849a9a1c5`: the unset-`ftp_upload_site` guard.
   - `80a2948c6b2`: remote-files wrap.
   - `3fa0eac12a7`: shared mixin and column check. It must come after `80a2948c6b2`.
   - `152f307c6d3`: data-library wrap.
   - `1c99ce30725`: the `libraries_folder_create` wait. `152f307c6d3`'s test needs it. It also hardens a helper that `test_library_contents` calls, so it could ride with (1) instead.

**Option B: two PRs, tests versus fixes.**
- PR A is (1) plus (2), plus optionally `1c99ce30725`. It holds only helpers and E2E coverage.
- PR B is (3). It holds the 26.2 client fixes, so reviewers get a single "client bugs" PR.

**Option C: as is, one PR.** This is John's current decision. The Baseline-first ordering means A or B can be cut by commit range without rewriting.

**Option D: four PRs.** Split (3) into an FTP notice PR (`a47703fbac1`, `b752aa13822`, `7a7afe7061b`, `5d849a9a1c5`) and a long-name wrap PR (`80a2948c6b2`, `1c99ce30725`, `3fa0eac12a7`, `152f307c6d3`). The wrap PR still needs (2) for its remote-files test.

## Scopes considered

### 1. As implemented (recommended)

The branch contains:
- Two 26.2 client fixes. The FTP notice is back in Choose Remote Files, and long names wrap in both the remote-files and data-library browsers.
- `FtpUploadHelp` owns its visibility and guards an unset `ftp_upload_site`.
- History panel filter and Selection menu helpers, remote-files folder and search helpers, and the E2E tests for each.

| Pros | Cons |
| --- | --- |
| Covers all of batch 7, as John decided, plus both round-1 expansions | It's a big PR: three areas, 14 commits |
| Every fix was red before and green after, on both backends | It still waits for #24380 before it can be opened |
| The `gxftp://` rule and the wrap rule each live in one place now | |
| No sibling copy of either bug is left in the Upload Activity | |

<details>
<summary>Details: where else I looked for the same bugs</summary>

- **Long-name overflow.** The overflow needs a `fixed` GTable with a bare text label in the Name cell.
  - `LocalFileUpload`, `PasteContentUpload`, `PasteLinksUpload` and RemoteFilesUpload's selected-files table all render `UploadTableNameCell`, which is a `BFormInput`. Inputs don't overflow like that.
  - DataLibraryUpload's Dataset List phase table (line 902) has no `fixed`, so it is auto layout. The re-scope review noted this too.
  - `SelectionDialog`'s GTable, used by FilesDialog, isn't `fixed` either.
- **The FTP notice.**
  - `gxftp://` appears only in `FtpUploadHelp.vue` and in `Collections/wizard/useFileSetSources.ts`. The wizard opens the FTP folder through the same remote-files browser, so it gets the fixed notice already.
  - `ftp_upload_site` is also used by `SampleSheetCollectionCreator` and `RulesStandalone`. They pass it to builders that validate and link; neither renders the notice.

</details>

### 2. Round 1's recommendations: done

`FtpUploadHelp` takes `uri` and FilesDialog's `showFTPHelper` is gone (`b752aa13822`). The unset-site guard is `5d849a9a1c5`. The data-library wrap uses the shared `upload-browser-label` mixin and a shared column check (`3fa0eac12a7`, `152f307c6d3`), and the re-scope review also fixed the library-list case. Nothing is left from round 1.

### 3. Hoist the duplicated `.browser-table-container` block into `upload-table-shared.scss`

RemoteFilesUpload and DataLibraryUpload repeat the same block, about 15 lines: flex/overflow, header mixin, and row hover. The two browsers could share one mixin.

| Pros | Cons |
| --- | --- |
| Removes real duplication that sits next to the new mixin | The duplication predates the branch, and there's no bug behind it |
| | Restyles both browsers in a 26.2 fix PR for no user-visible change |
| | `selenium_upload_data_library` is editing the same area |

Not recommended. It's a dev follow-up.

### 4. A client "query applied" hook for the remote-files search

Thermo-nuclear round 2 raised this. Expose the applied query, for example as a `data-` attribute, so `_search_remote_files` can drop its fixed `UX_RENDER` sleep and its swallowed timeout.

| Pros | Cons |
| --- | --- |
| Replaces two timing layers with one deterministic wait | Adds a client attribute only for tests to a 26.2 PR |
| | The `DataDialogSearch` debounce is shared with FilesDialog, so the hook belongs in a general dev change |

Not recommended here. It's a dev follow-up.

### 5. Move `FtpUploadHelp.vue` out of `FilesDialog/`

The file is now imported from `Panels/Upload/` as well. The normal review and thermo-nuclear both raised this.

| Pros | Cons |
| --- | --- |
| A neutral home would read better | Cosmetic, and the file is new on this branch, so it costs little either way |
| | Adds rename churn to a backport |

Not recommended. If John wants it, it's a one-line move in `b752aa13822`.

### 6. FTP notice in FTP subfolders (round 1 #4)

Not recommended. 26.1 and FilesDialog show the notice at the root only, so this would be a behavior change, not a fix.

### 7. Shared "every label contains the query" wait with `_workflow_card_named` (round 1 #5)

Not recommended. It would touch an unrelated workflow helper, and the two match on different attributes.

### 8. Split `upload_activity_helpers.py` (round 1 #6; thermo file sizes)

The file is now 1063 lines, but it was over 1k before this branch. `RemoteFilesUpload.vue`, `DataLibraryUpload.vue` and `navigates_galaxy.py` are in the same position. A split would conflict with `selenium_upload_data_library` and gxui. Not recommended.

### 9. `history_panel_unhide_selected()` in place of `hide_selected(unhide=True)` (round 1 #7; thermo)

Not recommended. gxui's verb passes `unhide` through, and it mirrors #24380's `delete_selected(purge=)`.

### 10. Remove the leftover `sleep_for` calls in untouched tests (round 1 #8)

The branch has already dropped the `_upload_all` sleep, now that it touches that function. The rest are in code the branch doesn't change. Not recommended.

### 11. Contract: drop the helpers with no caller on this branch (round 1 #9)

`stage_remote_files(path=)` has gxui as its caller, and John chose batch 7 whole. Not recommended.
