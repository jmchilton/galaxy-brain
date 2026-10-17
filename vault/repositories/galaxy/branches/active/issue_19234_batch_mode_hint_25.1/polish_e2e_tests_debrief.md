Acted: replaced raw CSS selector and sleeps in both map over hint selenium tests with new navigation.yml targets and two shared tool form helpers, tightened hint assertions to the full sentence, and re-recorded clean screenshots (commit `954306b0bd5`).

## Not acted on

- Kept `.info` (component's own scoped class) for `parameter_batch_info` instead of adding a `data-description` to `FormData.vue` - avoids a client change + webpack rebuild on a 25.1 bug fix branch. Easy follow-up if wanted.
- Pre-existing `sleep_for` calls in `test_rerun_dataset_collection_element` (after the collection toggle click, around the rerun/expand steps) left alone - not part of this branch's change; the one after the toggle precedes async option loading and has no obvious target to wait on.
- Did not change `select_set_value` itself to wait for dropdown close - other callers may rely on current behavior; the wait lives in the new tool form helper.

## Details

### Changes (`954306b0bd5`, on top of `74e1f5aca0f`)

- `client/src/utils/navigation/navigation.yml` (`tool_form`):
  - `parameter_data_select_dropdown`: `... .multiselect__content-wrapper`
  - `parameter_batch_info`: `... .info` (the map over / batch hint)
  - pre-commit's trailing-whitespace hook also stripped one pre-existing blank-line space in `history_panel` (base file issue).
- `lib/galaxy/selenium/navigates_galaxy.py`:
  - `tool_form_select_data(parameter, value, multiple=False)`: `select_set_value` on the data select, then waits for the dropdown to be hidden (vue-multiselect fades out; screenshots taken right after caught the fading menu over the hint).
  - `tool_form_wait_for_batch_info(parameter, text) -> str`: waits for `text` in the hint (`ec.text_to_be_present_in_element`), returns whitespace-collapsed text (the inline `HelpText` link renders on its own line in `.text`).
- `lib/galaxy_test/selenium/test_tool_form.py`:
  - `test_rerun_dataset_collection_element`: removed raw `find_element(By.CSS_SELECTOR, "input.multiselect__input")` + `send_escape` + 2 sleeps; uses `tool_form_select_data(..., multiple=True)` (existing `select_set_value` escape path) and asserts full hint "The supplied input will be mapped over this tool: one job per list." (new assertion - strengthening).
  - `test_map_over_paired_collection_hint`: removed sleep and `parameter_div` substring check; asserts full sentence "... one job per dataset pair.".

### Test runs (Selenium, headless Chrome, `GALAXY_TEST_SELENIUM_BROWSER=CHROME`, embedded server, one at a time)

- `TestToolForm::test_map_over_paired_collection_hint` - passed (26s)
- `TestToolForm::test_rerun_dataset_collection_element` - passed (51s)
- First attempt at full-text assert failed on a newline inside `.text` -> fixed by whitespace normalization in helper.
- No client code changed, so no rebuild needed (navigation.yml is read by Python via symlink).

### Screenshots (`screenshots/`, replaced)

- `tool_form_map_over_paired_collection_hint.png` - dropdown closed, hint fully visible.
- `tool_form_map_over_nested_collection_hint.png` - previously showed the fading dropdown overlapping the hint; now clean.

Run env note: `GALAXY_TEST_SELENIUM_HEADLESS=1` forces pyvirtualdisplay (not installed); leave default `auto` and set `GALAXY_TEST_SELENIUM_BROWSER=CHROME` so selenium-manager finds chromedriver.
