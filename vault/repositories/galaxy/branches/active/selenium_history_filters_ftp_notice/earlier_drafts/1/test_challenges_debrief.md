# Test challenges: selenium_history_filters_ftp_notice

Scope: `d83f7eaa13c..HEAD`. I made two changes and dropped no tests or assertions.

1. `test_long_remote_file_name_stays_in_its_column` used to rebuild the label selector inside `execute_script`. It now passes the smart component's element as `arguments[0]`. Both backends unwrap element args. Folded into "Wrap long names in the remote files browser".
2. I split `test_upload_from_remote_file_source_folder` out of "Let the upload helpers open remote file folders" into its own commit, "Baseline tests: upload from a remote file source subfolder". It covers existing product behavior (uploading from a subfolder) and passes without the branch's client fixes. It needs only the `path=` helper, the same pattern as the history-panel baseline that follows its helpers commit. I dropped the test's name from the helper commit's message.

Moving the test between commits changed no code: `git diff` of the tree before and after the rebase is empty.

Hashes that changed (update `index.md` and `subagents/normal_review.md`):

| Commit | Old | New |
| --- | --- | --- |
| Let the upload helpers open remote file folders | `c777b4c01ed` | `debacd25f69` |
| Baseline tests: upload from a remote file source subfolder | (new) | `52f21d4f934` |
| Show the FTP upload notice in Choose Remote Files again | `8065c748995` | `aa820be92c4` |
| Wrap long names in the remote files browser (head) | `6890643f6e0` | `fa69613dd93` |

## Per-test verdicts

- **Vitest, `FilesDialog.test.ts` "ftp helper"** (Baseline): keep. It adds a text assertion to an existing test and pins the FilesDialog side of the shared `FtpUploadHelp.vue`; the E2E test covers RemoteFilesUpload. It follows client/README practice: it mounts the real component, uses no new mocks and asserts on user-visible text. Verified as a baseline: with FilesDialog.vue checked out at `a47703fbac1` (before the extraction), the file's 17 tests pass.
- **`test_delete_undelete_and_purge_items` extension** (Baseline): keep. It covers the Selection menu undelete under `deleted:true`, and checks the item leaves the filter and the API state at each step. No other test covers this.
- **`test_hide_and_unhide_items`** (Baseline): keep. It doesn't duplicate #24380's `test_unhide_item_with_include_hidden`, because it adds the Selection menu hide/unhide and the `visible:hidden` filter path with the per-item Unhide.
- **`test_upload_from_remote_file_source_folder`**: keep, now in a Baseline commit (above). It checks the dataset content, not just that the dataset is ok.
- **`test_ftp_directory_shows_upload_site`** (fix): keep. Before the fix it fails at its own assertion: the notice element is missing, and that missing notice is the regression. The initial debrief recorded it red, then green.
- **`test_long_remote_file_name_stays_in_its_column`** (fix): keep. It measures real layout in a real browser, which the process wants instead of jsdom layout fakes. It was red before the fix (733px of overflow).
- **`test_collection_builders._show_hidden_content`, `test_history_related_filter`**: these only switch the existing tests to the fixed `history_panel.search` component. Its existing `sleep_for(UX_RENDER)` calls are older than this branch and out of scope.

## E2E gaps

None found. Every user-visible fix on this branch (FTP notice, long-name wrap) has a test that was red before the fix, and the helpers are exercised by E2E tests.

## Runs (one at a time)

- Vitest `FilesDialog.test.ts` with FilesDialog.vue at `a47703fbac1`: 17 passed.
- `test_long_remote_file_name_stays_in_its_column` after the edit: Playwright passed, Selenium passed.
- I didn't rerun the folder test, since the rebase left the tree unchanged.
- ruff check and format on the changed file: clean. Pre-commit hooks passed on the fixup commit.

<details>
<summary>Notes</summary>

- writing_tests.md and the E2E docs prefer SmartTarget waits and components over raw selectors. The raw selector duplicated in `execute_script` was the one deviation, now fixed.
- The long-name test leaves its file in the class's shared Posix `root_dir`. The labels are exact-matched, so sibling tests aren't affected (the normal review already noted this; left as is).
- No mocks or SimpleNamespace were added on this branch, so there were no unit-test refactors to make.

</details>
