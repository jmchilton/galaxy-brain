# Codex review

Acted on Codex's single finding, which I confirmed. Head `3f9fa2cb20d`, scope `d83f7eaa13c..HEAD`.

Not acted on: none.

<details>

**P2, confirmed: the remote-file search times out on a source that ignores the query.**

- **Problem.** `_search_remote_files` waited until every listed label contained the search text. Invenio's `get_files_in_container` takes `query` but never uses it (`lib/galaxy/files/sources/invenio.py:378-388`). On an Invenio record with `a.txt` and `b.txt`, `stage_remote_file(..., "a.txt")` therefore timed out. The normal review flagged the same risk.
- **Fix.** Folded into "Let the upload helpers open remote file folders".
  - The all-labels-match wait now runs for `UX_TRANSITION`.
  - If it times out (`TimeoutAssertionError`), the helper goes on to the normal `wait_for_and_click` on the target label. By then the 500ms debounced search has settled.
  - On sources that filter, the wait still guards against clicking mid-render.
- **Tests.** `test_upload_activity_remote_files.py`, `test_upload_ftp.py` and `test_upload_file_sources.py` (8 tests) pass on Playwright and on Selenium.
- **Residual risk.** On a filtering source whose search takes longer than `UX_TRANSITION`, the fallback can click before the re-render, as the helper did before this branch.

Codex's coverage notes say it reviewed every changed file plus the client search/table components and the posix/invenio sources. It ran no tests.

</details>
