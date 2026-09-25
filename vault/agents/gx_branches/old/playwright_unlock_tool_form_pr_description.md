Runs the whole of `test_tool_form.py` under the Playwright backend.

All 19 `selenium_only` decorators in the file carried the blanket reason "Not yet
migrated to support Playwright backend" — nobody had tried them. Seventeen pass
untouched.

The other seven failed on a **render race, not a backend gap**.
`table#tool-parameters` (and `table#dataset-details`, `table#job-outputs`) become
visible with only their header row; the body populates a tick later. Both helpers
snapshotted `tbody` immediately after `wait_for_visible`, so `find_elements(td)`
returned `[]` and the tests failed as `assert []`. Selenium's slower round-trips let
the rows land first, which is why this never surfaced before. Both helpers now wait
for a row rather than the container, via a new `dataset_details.tool_parameters_row`
selector.

Removing `selenium_only` cannot affect the Selenium backend — the decorator only
skips under Playwright — but the helper change does, so both were verified.

Verification:

- 24/24 pass under Playwright (full file)
- 8/8 pass under Selenium (every test touching the changed helpers)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
