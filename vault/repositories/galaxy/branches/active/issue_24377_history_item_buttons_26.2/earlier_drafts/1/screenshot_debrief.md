# Screenshot debrief

Screenshots not relevant for this change.

- The branch changes no UI. It changes `navigation.yml` and `schema.ts` selectors, which are test-only metadata, plus the test file. It adds and modifies no `screenshot()` calls.
- I checked two ways the branch could affect the screenshots the test already takes. I ran the file under Playwright with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` pointed at a scratch dir (4 passed, 95s) and looked at the shots:
  - `history_panel_edit_dbkey_post_click`: `db138499905` replaced the `UX_RENDER` sleep with a wait for the dbkey dropdown to be visible. The shot shows the Edit Dataset Attributes form fully rendered, with the Database/Build dropdown showing `unspecified (?)`. It is not half-rendered.
  - Tooltip leakage from the restored hovers: no tooltip balloons appear in `dataset_details_ok`, `history_panel_dataset_before_click_dbkey`, or the shots for the discarded and deferred states.
- I saved no shots to `screenshots/`. They would show the base branch's UI unchanged.
- The env var the framework reads is `GALAXY_TEST_SCREENSHOTS_DIRECTORY` (`framework.py:148`), not `..._DIR`. `screenshot()` is a no-op when it is unset, and `database/test_errors` only gets failure dumps.
