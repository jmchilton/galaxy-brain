# Codex review (round 2)

I acted on Codex's single finding, a likely flaky wait, which I confirmed. Head `ba331b4b9df`, scope `d83f7eaa13c..HEAD`.

Not acted on: none.

<details>

**P2 (concurrency), confirmed: the remote-files search can be judged settled before its debounce fires.**

- **Problem.**
  - `DataDialogSearch.vue` puts `debounce="500"` on its `BFormInput`.
  - `_search_remote_files` typed the query and immediately checked whether every listed label contained the text.
  - When the current listing already matched (e.g. a folder whose only entry is `subdir1`), the check passed at once and `open_remote_folder` clicked into the folder.
  - `RemoteFilesUpload.open()` clears `searchQuery`, but it can't cancel the input's pending emission. So the parent folder's query is applied inside the child folder and can hide the target file.
- **Fix.** Folded into "Let the upload helpers open remote file folders". `_search_remote_files` now waits `UX_RENDER` (1s) after typing, which outlasts the debounce, and only then runs the match wait. A comment says why.
- **Tests.** `test_upload_activity_remote_files.py`, `test_upload_ftp.py` and `test_upload_file_sources.py` (8 tests) passed on Playwright and on Selenium.
- **Cost.** About 1s per searched folder or file.

**Coverage.** Codex reviewed every changed file plus the search, table, breadcrumb, SelectionOperations and LibraryFolder components and the Selenium/Playwright wait plumbing. It ran no tests.

Round 1's single finding (Invenio ignoring the query) is in `earlier_drafts/1/codex_review.md`. The fix it got is still on the branch.

</details>
