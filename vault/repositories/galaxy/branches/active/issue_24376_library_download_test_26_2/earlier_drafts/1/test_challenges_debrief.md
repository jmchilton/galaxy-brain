Run via Opus at default effort.

# Test challenges debrief

The branch has no unit, Vitest, or API tests, so the challenge was limited to the one E2E test (`test_library_contents.py::test_download_dataset_from_library`) and the new `download_file_from` helper. I rewrote the test's setup to use the API. I also found a product bug outside this branch's scope (see "Finding" below).

Commit: `4806c50d1cb` "Set up the library download E2E test through the API" (pushed to `jmchilton/issue_24376_library_download_test_26_2`).

## Changed
- **Setup goes through the API.** The test used to call `self.test_import_dataset_from_history()`, which drove the full UI import-from-history flow (with several `UX_RENDER` sleeps) before testing the download. `doc/source/dev/writing_tests.md` says to "Use API/populator methods for test setup". The test now:
  - creates the library with `LibraryPopulator.new_library`,
  - uploads `test-data/1.txt` as `txt` with `create_dataset_request` + `raw_library_contents_create`, and waits with `wait_on_library_dataset`,
  - opens the folder with `libraries_open_with_name` and selects the row with `libraries_folder_select_datasets(["1.txt"])`. That helper waits for the rows to load, which the old hard-coded `select_one` row-0 click did not.
- **Exact assertion.** Because the datatype is now fixed, the test asserts `archive.namelist() == [f"{library_name}/1.txt.txt"]` and compares the entry's bytes to the file. This replaces the old `startswith("<lib>/1.txt.")`, whose extension was left open because sniffing turned it into `.gg`.
- Both backends pass locally: Selenium (headless Chrome) and Playwright. Earlier attempts failed in the setup phase on `#masthead` and `Page.goto` timeouts while the host load average was 10–17. Those failures were load-related, and retries passed.

## Considered and not changed
- **`download_file_from` (framework.py).** It is shared E2E infrastructure with no unit tests, so there was nothing to drop. I looked for other callers: the invocation export tests in `test_workflow_run.py` only check that the download link exists, and `test_workflow_extraction` downloads through the API. Moving those tests onto the helper would widen this 26.2 test-fix branch, so I left them alone. That conversion is a reasonable follow-up on `dev`.
- **Does the test fail without the fix?** Yes. Without the `download--btn` → `download-btn` fix, `libraries.folder.download_button` (`#download-btn`) never matches and `wait_for_and_click` times out. Before the branch, the method had no `test_` prefix and never ran. No baseline commit is needed (as the initial debrief says).
- **API-layer test.** `test_libraries.py::test_download_uses_download_extension` already covers the zip endpoint. The E2E test covers the button wiring and the browser download, which an API test cannot.
- **Why not `new_library_dataset` or `fetch_to_folder`?**
  - `new_library_dataset(name, ...)` takes the library name as `name`, so the dataset name can't be passed. It also calls `new_private_library`, which fails for the shared admin user because `user_id()` asserts exactly one user matches the email. Uploading the real file handle names the dataset `1.txt` (from the file's basename).
  - `fetch_to_folder` triggers the bug below.

## Finding: zip download returns 500 for library datasets created through `/api/tools/fetch` (not acted on)
My first rewrite created the dataset with `LibraryPopulator.fetch_to_folder` (`/api/tools/fetch`). Clicking Download then returned HTTP 500:

```
lib/galaxy/webapps/galaxy/api/library_datasets.py:681, in download
    parent_folder = ldda.library_dataset.folder
AttributeError: 'NoneType' object has no attribute 'folder'
```

Cause: in `lib/galaxy/model/store/discover.py` (around line 200), fetch-into-library builds `LibraryDataset(folder=..., name=...)` and the LDDA with `# library_dataset=ld,` commented out. It only sets `ld.library_dataset_dataset_association = ldda`, so `ldda.library_dataset` (the `library_dataset_id` back-reference) stays `None`. The legacy upload path (`upload_common.py`) and import-from-HDA both pass `library_dataset=ld`, which is why the existing API test and the old UI setup did not hit this.

The impact is probably real for users: the client's Upload activity sends library uploads through the fetch API. If so, the folder Download button would 500 on those datasets. I did not verify this in the UI. The likely fix is to pass `library_dataset=ld` (or set `ldda.library_dataset = ld`). It needs care around the flush/`post_update` ordering, and it needs an API test that fetches into a library and then calls `libraries/datasets/download/zip`.

This is a server bug outside this test-only branch's scope. The coordinator should decide whether to queue an issue or expand scope (see `GX_QUEUING_ISSUE_CREATION.md`). The test now uses the legacy upload path so the release-branch test stays green.
