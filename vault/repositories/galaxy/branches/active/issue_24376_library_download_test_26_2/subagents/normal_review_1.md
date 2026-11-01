# Normal review 1 (post-implementation)

Run via a general-purpose subagent (inherited model, default effort). No must-fix or security findings. Acted on: the Firefox `.part` completion race in the Selenium download poll (now also requires a non-empty file), reuse of `NavigatesGalaxy._wait_on` instead of a raw `wait_on` + `cast`, and a tighter `[entry] = archive.namelist()` assertion.

Not acted on:
- Moving `download_file_from` into the driver layer (`HasDriverProtocol` + per-backend implementations). Defensible later; kept next to `get_download_path()` in `framework.py` to keep a 26.2 backport small.
- Asserting the exact entry name `<library>/1.txt.txt`. Locally the upload sniffs `1.txt` as `gg`, so the entry was `<library>/1.txt.gg`; the extension comes from sniffing and is left open. The content comparison carries the weight.
- Early remote-Selenium skip (before the import setup). Only wastes time on remote drivers, which CI doesn't use.
- Clearer error when another OS user owns `/tmp/selected_library_files.zip`. Only on shared dev boxes; a per-worker download dir is out of scope.
- `data-description` instead of an id on the button. A minimal typo fix suits a release branch.

<details><summary>Full review</summary>

Verdict: small and correct for Chrome and Playwright locally. No must-fix. One should-fix correctness gap in the Selenium path for Firefox.

Should-fix
1. Firefox completion detection (framework.py `_downloaded`): Firefox creates an empty placeholder under the final name and streams into `<name>.part`, so the poll could return a zero-byte file. Also check `.part` and non-empty size.
2. Reuse `self._wait_on(f, on_str, wait_type=...)` (navigates_galaxy.py:719) instead of `cast(str, wait_on(...))`; drop the extra import.
3. Optional: place the helper on `HasDriverProtocol` with per-backend implementations; keeping it in framework.py is defensible for a 26.2 backport.

Nits
- Loose `startswith` assertion; `[entry] = archive.namelist()` reads better.
- Remote skip fires after the full import setup.
- `os.remove` on shared sticky `/tmp` could raise PermissionError for another user's file.
- Playwright `download.path()` waits without a timeout; fine for a one-file zip.
- `data-description` preferred for new selectors; the id fix is right for a backport.

Checked and fine
- The id change breaks nothing (only consumer is navigation.yml `libraries.folder.download_button`; other `download-btn` hits are unrelated classes / data-test-id).
- Zip name `selected_library_files` (library_datasets.py:670) and entry layout `<library root>/<folders>/<ldda.name>.<download ext>`.
- download.js submits a hidden GET form, a real navigation download that `expect_download` captures.
- New headless Chrome honours `download.default_directory`.
- Removing the stale file makes retries safe.
- No new API test needed: `test_libraries.py::test_download_uses_download_extension` already covers `/api/libraries/datasets/download/{uncompressed,zip}`.
- The test was strengthened, not weakened.

</details>
