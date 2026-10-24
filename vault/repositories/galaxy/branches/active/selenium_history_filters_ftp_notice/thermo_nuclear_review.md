# Thermo-nuclear code quality review (round 2, after re-scope)

Acted on one nit: `_upload_all`'s name check now sorts both sides. No structural regression found, and no code-judo move left that fits a 26.2 PR. Round 1's one code-judo candidate (FtpUploadHelp owning the `gxftp://` rule) landed in the re-scope. Scope `d83f7eaa13c..HEAD`, reviewed fresh at `ba331b4b9df`. New head `5ebde678b29`.

## Acted on

- **`_upload_all` compared sorted names to an unsorted list** (`test_upload_ftp.py`). The list was `[f"{i}.txt" for i in range(n)]`, which only sorts the same way while `n <= 10`, so `n = 11` would fail. The file labels are now built once, passed to `stage_remote_files`, and compared with `sorted(file_labels)`. No assertion weakened. Folded into "Search for each remote file before ticking it in Choose Remote Files", where it was added.

## Not acted on

- **`_search_remote_files` stacks a fixed `UX_RENDER` sleep on a wait that swallows its timeout.** Two timing layers is a smell. But the client gives no "query applied" signal: `DataDialogSearch`'s 500ms debounce happens before `searchQuery` changes, and `isBusy` doesn't cover that window. Codex round 2 added the sleep for a real race, and the swallow covers Invenio ignoring the query (round 1). The clean fix is a client-side hook, such as the applied query in a `data-` attribute. That's a dev follow-up, not part of a 26.2 test-helper PR.
- **`history_panel_hide_selected(unhide=True)`.** The flag inverts the operation. Round 1 kept it because gxui's `history-hide` verb passes `unhide` through, and it mirrors `delete_selected(purge=)`. The test reads a bit oddly, but the reasoning still holds.
- **`FtpUploadHelp.vue` lives in `FilesDialog/` but is imported from `Panels/Upload/`.** Cosmetic. Moving it would add churn to a backport.
- **`id="helper"` passed to FtpUploadHelp.** Only `FilesDialog.test.ts` reads it. The id predates the branch, and the baseline test asserts on it, so keep it.
- **Paired `class` + `data-test-id` on the DataLibraryUpload labels.** That's correct: styles hang on classes, not test ids. The `upload-browser-label` mixin follows the "use as mixin" convention already in `upload-table-shared.scss`.
- **File sizes.** `upload_activity_helpers.py` (1063), `RemoteFilesUpload.vue` (1009), `DataLibraryUpload.vue` (1051) and `navigates_galaxy.py` all grow, but each was already over 1k at the base. None crosses the threshold here, so splitting them is out of scope.
- **`path` threaded through four pass-through signatures.** This was settled in round 1. The layering predates the branch, gxui uses `stage_remote_files(path=)`, and putting the path in the label would mean magic parsing.
- **`assert_label_within_its_column(label, ...)` has no type on `label`.** Minor. The element type differs by backend, and the sibling helpers don't annotate it either.

<details>
<summary>Full review</summary>

**History panel (`85cdc82cd75`, `0ac901aa482`, `4e6666a7ffe`)**
- The `history_panel.search` and `search_reset` selectors replace two raw `history_element(..., scope=".content-operations-filters")` lookups. That is a net cut in ad-hoc selectors.
- `history_panel_confirm_selected_operation` is the single primitive. delete, purge, undelete, hide and unhide are one-line wrappers keyed by SelectionOperations' `data-description` values.
- `_show_hidden_content` lost two sleeps and now delegates to `history_panel_filter`. Its callers wait on hids afterwards.
- The tests reuse `_wait_for_history_item_states` and `history_panel_wait_for_and_select`. Each filter step is checked from both sides: UI absence plus API state.

**Remote files helpers (`88038878b15`, `547a61f53a8`)**
- `open_remote_folder` is now the one way to enter a source. It is shared by `stage_remote_file(s)` and by both new tests.
- The search race is contained in `_search_remote_files`, `_remote_labels_match` and `_select_remote_file`. Stale-element handling goes through the canonical `exception_indicates_stale_element`.
- `_wait_on` is the same driver-wrapper wait used across the Selenium tests (23 call sites).

**FTP notice (`c2f568a4869`, `1475a6793ef`, `1316048b601`)**
- After the re-scope, FtpUploadHelp owns its visibility (`uri === 'gxftp://'` plus config loaded). FilesDialog lost `showFTPHelper` and its set-in-`load()` timing, and RemoteFilesUpload gained one tag with no new state. This removes the round-1 duplicated condition.
- The `ftp_upload_site` guard removes the empty-server sentence instead of adding a mode.
- The vitest uses a static `vi.mock`, with no cast and no helper.

**Long names (`353b57eff3e`, `5ebde678b29`)**
- A two-property mixin, applied at three label sites. `assert_label_within_its_column` is shared by both E2E tests.
- `libraries_folder_create` now waits for its POST, mirroring `libraries_index_create`.

**Runs**
- `uvx ruff check` / `ruff format --check`: clean. Pre-commit passed on the fixup.
- `git diff ba331b4b9df HEAD`: only `test_upload_ftp.py` (+3/-2). No client change, so no rebuild.
- `test_upload_ftp.py` `test_upload_simplest` and `test_upload_multiple` (the `_upload_all` callers): see Runs below.

</details>

## Hash map

| Commit | Old | New |
| --- | --- | --- |
| Baseline tests: FilesDialog FTP notice names the FTP server | `a47703fbac1` | unchanged |
| Fix history_panel.search and add history_panel_filter | `85cdc82cd75` | unchanged |
| Add Selection menu undelete and hide history panel helpers | `0ac901aa482` | unchanged |
| Baseline tests: undelete and hide history items from filters and the Selection menu | `4e6666a7ffe` | unchanged |
| Search for each remote file before ticking it in Choose Remote Files | `5301068fd65` | `88038878b15` |
| Let the upload helpers open remote file folders | `025850b5a8f` | `547a61f53a8` |
| Baseline tests: upload from a remote file source subfolder | `c4a8b00237e` | `160829ed053` |
| Move FilesDialog's FTP upload notice into FtpUploadHelp | `77d353fb5f1` | `c2f568a4869` |
| Show the FTP upload notice in Choose Remote Files again | `456fd2c2500` | `1475a6793ef` |
| Wrap long names in the remote files browser | `4ad46b5b441` | `353b57eff3e` |
| Let FtpUploadHelp decide when it shows | `cb6b63526e9` | `1316048b601` |
| Wrap long names in the data library browser too (head) | `ba331b4b9df` | `5ebde678b29` |

## Runs

One at a time, at `5ebde678b29`:

- `test_upload_ftp.py -k "test_upload_simplest or test_upload_multiple"` under Playwright: 2 passed.
- The same under Selenium: 2 passed.
