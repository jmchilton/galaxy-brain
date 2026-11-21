Run via Claude Fable 5.2 at medium effort.

# Polish E2E tests debrief

READY. Three commits moved the credentials test onto `data-description` selectors, replaced two racy reads and one sleep with waits, and added screenshots to all three tests; each passes under both backends.

## Changes made

- `7952ad4dec8` Select the credentials dialog by data-description in Selenium.
  - The test reached the service toggle through `.service-title`, and the group name input and error through id suffixes (`input[id$="-name-input"]`), all inside `dialog.g-dialog[open]`.
  - `ServiceCredentials.vue` now marks its root `credentials service` with `data-service-name`, and its toggle `credentials service toggle`. `CredentialsGroupForm.vue` marks the group name field and its input.
  - The selectors moved out of `tool_form` into a `credentials.service` component keyed by service name, so a tool with several services can be addressed. Only `tool_form.credentials_manage` stays on the tool form.
  - The test now waits for the service to finish expanding (`g-collapse-shown`) before clicking "Create New Group". Without it the Playwright run took both screenshots mid-animation, with the form clipped to a sliver.
  - Two screenshots: `tool_form_credentials_new_group`, `tool_form_credentials_group_name_error`. This is the only E2E test over the credentials dialog.
- `808ef51ba96` Wait for the API key input type in Selenium instead of reading it.
  - `test_api_key` read the input's `type` attribute straight after clicking show/hide, with nothing waiting for the re-render. It now waits on `preferences.api_key_input_of_type(type=...)`, and reads the key with `wait_for_value()`.
  - Dropped `sleep_for(UX_TRANSITION)` from `_create_api_key`; the click on the create button already waits for it. `test_copy_api_key` shares the helper and was rerun.
  - One screenshot: `preferences_api_key_revealed`.
- `44d5df632ff` Capture screenshots in the history panel index range filter test.
  - `history_panel_advanced_filter_index_range` (menu filled in) and `..._applied` (filtered list). It is the only E2E test over the history panel's advanced filters.
  - `lower_than.wait_for_and_send_enter()` replaces `self.send_enter(lower_than.wait_for_visible())`.

No existing commit was rewritten.

## Considered and left alone

- **`history_panel.advanced_search_input: '#history-items-advanced-filter-${filter}'`.** It selects by id, not `data-description`, but that is how every other filter menu is addressed in `navigation.yml` (`#history-list-filter-advanced-filter-name`, `#workflows-advanced-filter-name`). The id is built by the shared `FilterMenu` components from an `identifier` prop, so it is already the stable hook.
- **`credentials.service.group_name_error`** still ends in `.invalid-feedback`. `BFormGroup` renders that element itself, so there is nothing of ours to decorate; the selector is scoped by the decorated form group.
- **No shared helper in `NavigatesGalaxy`.** Each sequence is used by one test. The credentials steps are the likeliest to recur; a helper can follow the second test.
- **No client refactor.** The decorations were enough.

## Tests run

All on the final code of each test.

| Test | Backend | Result |
| --- | --- | --- |
| `test_history_panel.py::TestHistoryPanel::test_advanced_filter_index_range` | Playwright (Chromium, headless) | passed |
| same | Selenium (Chrome 158 under Xvfb) | passed |
| `test_personal_information.py::TestManageInformation::test_api_key` | Playwright | passed |
| same | Selenium | passed |
| `test_personal_information.py::TestManageInformation::test_copy_api_key` | Playwright | passed |
| same | Selenium | passed |
| `test_tool_form.py::TestLoggedInToolForm::test_credentials_group_name_error` | Playwright | passed |
| same | Selenium | passed |
| Vitest: `src/components/User/Credentials` | node 22.20.0 | 1 file, 9 tests passed |
| `eslint`, `prettier --check` on the two credentials components and `navigation.yml` | | clean |
| `ruff`, `black --check` on the three Selenium files | | clean |

The E2E runs set `GALAXY_TEST_SCREENSHOTS_DIRECTORY`, and the screenshots were looked at under both backends for the credentials test and under Playwright for the other two.

Not run: `vue-tsc` (the client change is three static attributes and one bound `data-` attribute) and the Vitest specs outside `User/Credentials`, which these commits don't touch. Each E2E test was run once per backend, so the removed sleep has not been stress-tested for flakiness.

## Environment

Reused as left by the previous step: `.venv/galaxy_e2e_bash.sh` on Galaxy 8091 / Vite 5181. Servers were stopped at the end of the run.
