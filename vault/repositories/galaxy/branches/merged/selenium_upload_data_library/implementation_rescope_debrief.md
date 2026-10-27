# Re-scope debrief

Implemented the two additions `scope_evaluation.md` recommended. The branch is still tests-only, with no client or server product code. The original scope is kept as alt `selenium_upload_data_library_alt_original_scope` at `aa8326448f9`, unchanged.

New head: `d03ab9986c5`, force-pushed to `jmchilton/selenium_upload_data_library`.

| Commit | What |
|---|---|
| `7d12e823b7e` | Baseline tests: API library setup + multi-dataset staging (unchanged) |
| `aa8326448f9` | Baseline tests: regular user + list into picked history (unchanged) |
| `393f09e69cb` | **Baseline tests: subfolder navigation and select-all** (new) |
| `d03ab9986c5` | **Upload Activity E2E helper: wait for Start to be enabled before clicking** (new, not Baseline) |

Diff vs `release_26.2`: 4 files, +139/-10.

## 1. Folder navigation + select-all (`393f09e69cb`)

**I folded this into `test_upload_list_from_data_library_to_target_history` instead of adding a new test.**
- Setup now puts `3.bed` in the library root and `1.bed`/`2.bed` in a `list folder` subfolder.
- The test opens the subfolder by clicking its row label, stages with `data_library_select_all`, and builds the list.
- The existing assertion that the list elements are exactly `["1.bed", "2.bed"]` now also proves that select-all stayed inside the subfolder: the root `3.bed` didn't land.
- Why fold: the suite stays at 3 data-library tests, and each run is about 60-80s per backend.
- What it gives up: per-label multi-click staging is no longer exercised with more than one label. Single-label staging is still covered by `test_upload_from_data_library` and `..._as_other_user`, and both use the same loop.

**Helpers**
- `UploadContext.stage_data_library_datasets` (and the `DataLibraryContext` wrapper) gained `folder_label=None` and `select_all=False`.
- With `select_all`, it waits for every expected label to be visible before clicking select-all. This avoids a race where the root view's checkbox gets clicked before the folder loads.
- The test file's `_create_and_populate_library(filenames, subfolders=None)` builds nested fetch items (`{"name", "description", "elements"}`), and a new `_library_items()` helper builds the per-file items.
- **No folder-creation helper existed.** `scope_evaluation.md` said `LibraryPopulator` had one; it only has fetch-to-folder helpers, and `_create_folder` is private to `api/test_folders.py`/`test_libraries.py`. The data fetch API creates nested library folders natively (`NestedElement` → `persist_elements_to_folder`), so no new populator helper was needed.
- The existing restrictions loop over `get_library_contents` already covers nested files (checked by hand against :8092).

**Selector fix:** `data_library_select_all` was dead and broken on 26.2.
- bootstrap-vue's `BFormCheckbox` puts `data-test-id` on the hidden `custom-control-input` (`bvAttrs` go on the input), so `[data-test-id=...] input[type=checkbox]` matched nothing.
- The input's sibling `.custom-control-label` is empty and zero-sized, so Selenium won't click it.
- The new selector is `.custom-control:has(> [data-test-id="data-library-select-all"])`, which clicks the wrapper. Its centre lands on the label's `::before` box. It passes under both backends.
- **Forward-merge note:** dev's e971fc43a4d already rewrote this line to `[data-test-id="data-library-select-all"]` (plain `GCheckbox` input). Take dev's version on conflict.
- `remote_files_select_all` (`... .custom-control-label`) and the `data_library_item_checkbox` xpath (targets the hidden input) look broken the same way on 26.2. Neither has a Python caller, so they were left alone.

**New product bug found:** a library folder created through the fetch API without a `description` makes `GET /api/folders/{id}/contents` return 500. `LibraryFolderMetadata.folder_description` is a non-optional `str` and the value is `None` (`library_folder_contents.py:_serialize_library_folder_metadata`). The UI shows "An internal server error occurred (500)" in the folder browser. The test passes a description to work around it, with a one-line comment. This is a candidate for a queued issue or a small release fix alongside the other bugs listed in `scope_evaluation.md`.

## 2. `start()` waits on `start_button_enabled` (`d03ab9986c5`)

- `_UploadStaging.start()`, used by `UploadContext`, now calls `start_button_enabled.wait_for_and_click()`. `GButton` disables Start only through `aria-disabled`, so the old wait could click a disabled Start and nothing would happen.
- `_screenshot_when_startable` keeps its own wait because it screenshots before `start()`.
- **The inline workflow-form `UploadMethodInlineContext.start()` is left unchanged.** I tried the same change there: `:not([aria-disabled])` plus a polling wait in `_click_visible_element_with_selector`, because the labeled path had no wait at all. Its only callers are 5 tests in `test_workflow_run.py`, and on this server they fail before reaching the upload with "Workflow cannot be executed... Following tools missing: cat". The 8092 server has no framework test toolbox, and I can't restart it. I reverted the inline change rather than ship it untested. It's a follow-up for a server with the test tools.
- `ExploreZipContext.start_import` and `RuleImportContext` click wizard buttons, not Start, so they're out of scope.
- `test_upload_activity_collection.py::_click_start_upload` clicks `start_button` directly in the test file. I left it as is (outside the helpers; could be converted later).
- No test asserts that Start stays disabled or clicks it expecting no effect (grepped), so a stricter wait can't turn an intended no-op into a timeout.

## Test runs

All runs were against gunicorn :8092 / Vite :5181, one at a time.

| Run | Backend | Result |
|---|---|---|
| `TestUploadActivityDataLibrary` at `393f09e69cb` | Playwright | 3/3 pass |
| `TestUploadActivityDataLibrary` at `393f09e69cb` | Selenium | 3/3 pass |
| full `test_upload_activity.py` (10) at head* | Playwright | 9 pass + `test_multiple_paste_links` env failure (see below); it passes on a single rerun after the env fix, so all 10 have passed |
| full `test_upload_activity.py` (10) at head* | Selenium | 8 pass, 2 env failures (see below); both pass on rerun |
| full `test_uploads.py` (18) at head | Selenium | 17 pass, `test_rules_example_5_matching_collections` fails; **same failure on base helpers** |
| full `test_uploads.py` at head | Playwright | 17 pass, `test_rules_example_5_matching_collections` fails (detached element in the rule builder) on the third attempt; the first two attempts ERRORed every test at setup (see below) |
| full `test_uploads.py` on base helpers (HEAD~1) | Playwright | 17 pass, 1 fail (a rule-builder detached-element click; I didn't capture the test name) |
| 5 inline-upload tests in `test_workflow_run.py` | Playwright | all fail in setup: `cat` tool missing on this server (env) |

Failure triage:
- `test_multiple_paste_links`: `TestDataNotFoundError: 2.txt`. The branch_context command sets `GALAXY_TEST_FILE_DIR` to local `test-data` only, and `2.txt` lives in the galaxy-test-data repo. Adding the default git resolver to `GALAXY_TEST_FILE_DIR` fixes it (worth updating the run recipe).
- Selenium full-file run: `test_upload_with_metadata` and `test_paste_content` failed on a DNS failure fetching axe-core from cdnjs, then a dropped browser session. Both pass on rerun.
- `test_rules_example_5_matching_collections`: `ElementClickInterceptedException` on the rule builder's `rule-btn-okay`. It reproduces with HEAD~1's helpers (before the `start()` change), so it's pre-existing and not caused by this branch.
- `test_uploads.py` under Playwright, first two attempts: the first test hit a `Page.goto` timeout, and every later test then errored with "Playwright Sync API inside the asyncio loop". A base-helper run and a third head run both completed normally (17 pass), so the cascade was transient environment trouble, not this change.

**UsesUploadActivity users not run** (about 20 other selenium modules): the change only makes the pre-click wait stricter on the same element. It fails only if `aria-disabled` never clears, which would mean the upload could never have started anyway. CI covers the rest.

\* Both full `test_upload_activity.py` runs happened while the since-reverted inline edit was still in the working tree. That file never reaches the inline path, so the results hold for the committed head.

Follow-up: `data-library-add-selected` is also a `GButton` disabled only through `aria-disabled` (`:disabled="!hasSelection"`), so the helper's add-selected click has the same theoretical click-while-disabled race. Not fixed here.

Lint: ruff, black and isort are clean on the changed files, and the pre-commit hooks passed on both commits.
