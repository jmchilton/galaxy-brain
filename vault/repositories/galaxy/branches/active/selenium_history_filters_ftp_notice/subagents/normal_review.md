# Normal review: selenium_history_filters_ftp_notice

Acted on one finding: `_select_remote_file` clicked a file label right after typing the search, the same debounced-search race `open_remote_folder` already guards. Moved the search plus wait into a shared `_search_remote_files` used by both, and switched `_remote_labels_match` to the smart component's `.all()`. Folded into "Let the upload helpers open remote file folders" (now `c777b4c01ed`). No other changes; the branch is otherwise sound.

Not acted on:
- `FtpUploadHelp.vue` lives in `FilesDialog/` but is used from `Panels/Upload/` too. A neutral home (e.g. `Upload/`) would read better, but it's cosmetic and FilesDialog is where the notice came from.
- `min-width: 0` is redundant next to `overflow-wrap: anywhere`, which already lowers the min-content width. It's harmless and guards the flex child, so I kept it. Bootstrap's `text-break` would also work, but a scoped rule next to the existing one is fine.
- `test_long_remote_file_name_stays_in_its_column` leaves its file in the class's shared Posix `root_dir`. It doesn't break the sibling tests (labels are exact-matched), so I didn't add cleanup.
- The helpers assume a file source's server search matches on name substrings, or the "every label contains text" wait times out. That holds for posix, irods, dataverse and cbioportal, and for client-side filtering. The existing `_workflow_card_named` makes the same assumption.

<details>
<summary>Full review</summary>

**Scope:** `d83f7eaa13c..HEAD`, 8 commits.

**History panel (`7a3e361`, `23ceab1`, `5469fdf`)**
- The `history_panel.search` fix points at the real filter input. Its two consumers (`test_collection_builders._show_hidden_content`, `test_history_related_filter`) now go through the component. `_show_hidden_content` used to append to the existing text and now clears it first. The text was empty there, so behavior is the same.
- `history_panel_confirm_selected_operation` is a clean extraction: delete, purge, undelete, hide and unhide share one dialog. The other `selected content menu` callers (build list, collection edit) open builders, not confirm dialogs, so they don't belong in it.
- Flakiness:
  - After `history_panel_filter("deleted:true")` the test waits for hid 1 to leave. Hid 1 isn't deleted, so this proves the debounced filter applied before items are selected.
  - Under `visible:hidden`, waiting for hid 1 to be hidden does the same before the unhide assertion.
  - API state is checked at every step.

**Remote files helpers (`3bc85d0`, `c777b4c`)**
- Parity:
  - Both backends go through smart components and `_wait_on`.
  - The stale-element handling uses `exception_indicates_stale_element`, which covers both Selenium's "stale" and Playwright's "not attached to the DOM".
  - It mirrors `_workflow_card_named` in `navigates_galaxy.py`, which also waits until every title contains the query.
- Bug (fixed): `_select_remote_file` typed the search and called `wait_for_and_click` at once. When the file was already on the unfiltered first page, the click could race the 500ms debounced re-render. Under Playwright the click lands by coordinates, so it can tick whatever row now sits there. Now it waits for the filtered list, like the folder path.
- `path.split("/")` with `filter(None, …)` handles leading and trailing slashes.

**FTP notice (`a47703f`, `8065c74`)**
- The extraction is clean. FilesDialog still renders `#helper`, because the `id` falls through to GAlert's root, and the strengthened vitest pins the text.
- RemoteFilesUpload shows the notice only when `currentFileSourceUri === 'gxftp://'`. Like FilesDialog's `urlTracker.current.value?.url === "gxftp://"`, it doesn't show in FTP subfolders. That matches 26.1, so it's consistent.
- The notice still shows with an empty `ftp_upload_site`. That's existing FilesDialog behavior, out of scope.

**Long names (`6890643`)**
- The table has `fixed` layout, and the label is a flex child of `d-flex` with `min-width: auto`. An unbroken name widened past the `td`. `overflow-wrap: anywhere` gives it break opportunities, and `min-width: 0` lets it shrink. The scoped style applies because the slot content is compiled in RemoteFilesUpload's scope.
- The bounding-rect `execute_script` passes `arguments[0]` and returns a number. Both backends pass it, and the debrief shows it going red to green.

**Tests run after the fix (one at a time)**
- `test_upload_activity_remote_files.py` (3 tests): Playwright pass, Selenium pass.
- `test_upload_ftp.py` + `test_upload_file_sources.py` (5 tests): Playwright pass.
- ruff check and format, plus pre-commit hooks: pass.

</details>
