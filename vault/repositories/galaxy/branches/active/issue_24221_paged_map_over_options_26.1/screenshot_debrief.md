Screenshots successfully obtained.

No E2E test (Selenium/Playwright) in the branch or in `lib/galaxy_test/selenium/` covers these tool forms (`__EXTRACT_DATASET__`, `collection_list_or_nested_list_input`), so none was modified or run. Captures were taken ad hoc with a headless Python Playwright script against a local Galaxy (branch server, test tools, port 8080) and two Vite dev servers: branch client on 5173 ("after") and a `git archive` of the base client (`dbe4f2f7e41`, origin/release_26.1) on 127.0.0.1:5191 ("before"). Branch code was not changed.

Demo history "map-over options demo": 3 pasted txt datasets, `4: samples (list)` (list of 3) and `5: groups (list:list)` (2 x list of 3).

## Index (`screenshots/`, gitignored)

| File | Shows |
|------|-------|
| `01_before_extract_dataset_dropdown.png` | Base, Extract dataset: Input List dropdown lists `4: samples (list)` twice, identically. |
| `02_before_extract_dataset_mapover_row_clicked.png` | Base, after clicking the second (map-over) `4: samples (list)` row and reopening: both identical rows highlighted, no way to tell which is selected. |
| `03_before_list_or_nested_dropdown.png` | Base, `collection_list_or_nested_list_input`: `5: groups (list:list)` listed twice, identically. |
| `04_before_list_or_nested_mapover_row_clicked.png` | Base, same after clicking the second row and reopening: both identical rows highlighted. |
| `05_after_extract_dataset_dropdown.png` | Branch, Extract dataset: `4: samples (list)` and `4: samples (list) (one job per dataset)` as distinct rows (plus `5: groups (list:list) (one job per list)`). |
| `06_after_extract_dataset_mapover_selected.png` | Branch, `4: samples (list) (one job per dataset)` selected; field shows the map-over label. |
| `07_after_extract_dataset_mapover_selected_reopened.png` | Branch, dropdown reopened: only the map-over row is checked. |
| `08_after_list_or_nested_dropdown.png` | Branch, list:list input: `5: groups (list:list)` and `5: groups (list:list) (one job per list)` distinct. |
| `09_after_list_or_nested_mapover_selected.png` | Branch, `(one job per list)` row selected and retained in the field. |
| `10_after_list_or_nested_mapover_selected_reopened.png` | Branch, dropdown reopened: only the map-over row is checked. |

## Notes / problems

- "Before" uses the base client against the branch server. The only server change (`pagination.py`) affects page boundaries past the page size; with 2 collections it doesn't affect what's listed, so the before captures reflect base UI behavior.
- Paging beyond 50 items not captured (not required).
- First "before" attempt used port 5174, which another session's Vite (issue_24173 worktree) also held on 127.0.0.1, so those captures hit the wrong client. They were discarded and retaken on 5191 after confirming the listener was this run's.
- In the before captures, the masthead icons show as empty boxes (icon font not served on that origin). This is cosmetic and doesn't affect the dropdown. The client trees differ only in the branch's FormData/ToolForm/WorkflowRunDefaultStep files and tests.
- Batch mode switch is not visibly labeled for a collection input in the tool form; the screenshots show the selection only.
