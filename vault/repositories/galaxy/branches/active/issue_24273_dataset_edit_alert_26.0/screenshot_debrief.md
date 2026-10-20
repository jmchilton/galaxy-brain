screenshots successfully obtained

Captured from `lib/galaxy_test/selenium/test_dataset.py` under Selenium against head `2844b08fb87` (local Galaxy on 8092 with framework tools/datatypes, Vite on 5182).

## Screenshots

| File | Test | Shows |
|---|---|---|
| `screenshots/dataset_edit_attributes_rename_success.png` | `test_history_dataset_rename` | Edit tab after a rename. The "Attributes updated." alert survives the history-watcher refresh. Header, form and history panel all show `newname.txt`. Attributes tab stays active. This is the original bug, fixed. |
| `screenshots/dataset_edit_datatype_auto_detect_success.png` | `test_history_dataset_auto_detect_datatype` | After auto-detect: "Detection was finished and changed the datatype to txt." alert stays, the **Datatypes** tab stays active, dropdown shows `txt`, header shows format `txt`. Metadata had settled by capture time, so the `.dataset-attributes-metadata-running` notice isn't in the shot. |

## Regression found and fixed

The previous capture (head `8f275f3dc7d`) found a tab jump: after a datatype change or auto-detect, the in-place form reload dropped the Datatypes `BTab` (`v-if` on `metadata_disable`) while metadata was set, and `BTabs` kept index 1, landing on Permissions, which stayed selected after metadata settled.

- `f86dee4a307` keeps the Datatypes tab rendered while metadata is set and shows a `.dataset-attributes-metadata-running` notice in it.
- `2844b08fb87` adds `assert datatype_component.wait_for_text() == expected_datatype` right after the success alert in `test_history_dataset_auto_detect_datatype`. That assertion timed out before the fix and passes now.

The old `dataset_edit_datatype_auto_detect_settled_permissions_tab.png` was removed since it documented the fixed bug.

## Test changes

- `8f275f3dc7d`: `navigation.yml` adds `dataset_view.name` (`.dataset-view .dataset-name`). `test_history_dataset_rename` waits for the header to show the new name (history-watcher refresh), re-asserts the success alert is visible, scrolls it into view and takes a screenshot. `test_history_dataset_auto_detect_datatype` adds a screenshot step.
- `2844b08fb87`: the datatype dropdown assertion above.

## Findings

- **Header rename timing (observation, no action).** The header name updates once the history-watcher summary arrives, about 1-3 s after save. That matches the rescope intent: it doesn't wait for the detailed refetch.
- **Test-infra note (out-of-scope follow-up).** In `NavigatesGalaxy._wait_on`, a predicate that returns `False` counts as done, because only `None` keeps it waiting. `test_collection_edit.py:56` uses `lambda: x == y`, so it never really waits. I use `... or None`.

## Test results (Selenium, one at a time, head `2844b08fb87`)

- `test_history_dataset_auto_detect_datatype`: passed, first try.
- `test_history_dataset_rename`: passed on the 3rd try. Tries 1-2 failed in `perform_single_upload` at `assert after_latest_history_item` (upload-timing race below), before any changed UI.
- Earlier run at `8f275f3dc7d`: `test_history_dataset_update_annotation_and_info` passed; `test_history_dataset_display_text` not run.

## Problems recording

- `perform_single_upload` sometimes fails at `assert after_latest_history_item` (earlier: Playwright 3/3 tries, Selenium 2 of about 8; this run: 2 of 4 Selenium tries). The contents query lands before `POST /api/tools/fetch`. This is a local upload-timing race, not evidence about the branch. Because of it, Playwright never got past the upload. The new `dataset_view.name` wait and `scroll_into_view` in the rename test are unverified on Playwright, and CI is their first Playwright check.
- Galaxy must be started with the worktree `.venv` activated, else upload jobs exit 127. Use `GALAXY_CONFIG_DATATYPES_CONFIG_FILE=test/functional/tools/sample_datatypes_conf.xml`; the default datatypes sniffed `1.txt` as `gg` and showed `dbnsfp.tabular`.
- Setup used: gunicorn on 8092 with `PYTHONPATH=lib`, `GALAXY_CONFIG_OVERRIDE_TOOL_CONFIG_FILE=test/functional/tools/sample_tool_conf.xml`; Vite via `GALAXY_URL=http://127.0.0.1:8092 VITE_PORT=5182 pnpm run develop --strictPort`; tests with `GALAXY_TEST_EXTERNAL=http://localhost:5182/`, chromedriver from `~/.cache/selenium` on `PATH`, no `GALAXY_TEST_END_TO_END_CONFIG`.
- Ports 8080/5173 and 8090/5180 belonged to other sessions (`workflow_editor_run_cancel`, `selenium_stories_core`) and were left alone.
