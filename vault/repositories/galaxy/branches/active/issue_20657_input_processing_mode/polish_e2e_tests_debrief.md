Second polish pass after the re-scope: E2E surface was already polished in round 1, so the only change moves the repeated dropdown-close wait into the shared `_assert_processing_hint` helper; all four in-scope E2E tests pass on both drivers. Commit `668b095ceab`. Round 1 is in [earlier_drafts/2/polish_e2e_tests_debrief.md](earlier_drafts/2/polish_e2e_tests_debrief.md).

## Checked

- `test_tool_form.py::test_data_input_map_over_hint`, `::test_data_input_reduction_hint`: all selectors already go through navigation.yml (`tool_form.parameter_processing_hint`, `parameter_map_over_marker`, `parameter_data_select_menu`). No sleeps. Screenshots of each hint state and the dropdown marker are in place (only E2E tests for this component).
- `NavigatesGalaxy.tool_form_clear_multiselect_tags`: wait-based, no sleep; shared with `RunsToolTests`.
- navigation.yml: `parameter_multiselect_tag_close` and the five admin `remove_selected_*` XPaths use `*[contains(@class,'multiselect__tag-icon')]`. Nothing to change.
- `test_admin_role_and_user_forms.py`: branch changes only the selectors it uses. Already `wait_for_and_click` via components; no raw selectors or sleeps. Not touched.
- Re-scope label changes (`list:list` → "list of lists") don't alter the texts these tests assert ("one job per dataset pair", "one job per list", "processed as a whole in a single job").

## Change

- `test_tool_form.py`: `tool_set_value(...)` followed by `select_menu.wait_for_absent_or_hidden()` appeared three times before `_assert_processing_hint`. The wait now lives at the top of the helper (with a comment: the menu fades over the hint), and the three call-site lines plus one local are gone. Every hint assertion and the following screenshot still see a settled form. No assertions removed or weakened.

## Runs (one at a time, Galaxy 8080 + Vite 5173, servers stopped after)

- Playwright headless: both hint tests passed; both admin tests passed.
- Selenium (chromedriver 155 via selenium-manager, headless unset): both hint tests passed; both admin tests passed.
- Admin runs used `GALAXY_CONFIG_OVERRIDE_ADMIN_USERS` (incl. `test@bx.psu.edu`), `GALAXY_CONFIG_OVERRIDE_BOOTSTRAP_ADMIN_API_KEY=TEST123`, and a temp 0600 context without `admin_*` lines, deleted after.

## Left

- Several orphaned Galaxy/celery processes from earlier runs in this worktree (not listening on 8080) were found and stopped.
- Carried over from round 1: close "x" on multiselect tag chip overlaps chip text in screenshots (cosmetic, out of scope).
