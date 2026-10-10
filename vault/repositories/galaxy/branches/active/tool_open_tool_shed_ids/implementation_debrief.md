# tool_open_tool_shed_ids — implementation debrief

Branch `tool_open_tool_shed_ids` @ `bea69f779b7`, a single commit on `dev` @ `df3932ed4ba`, cherry-picked unchanged from `galaxy_ui_driver` (`88fe295ef38`). 5 files, +111/−12.

## Two bugs

- **Panel search.** `searchObjectsByKeys` regex-escaped the query with `sanitizeString`, then used it as a regex against the tool's value: `actualValue.match(queryValue)`. Any `.`, `/` or `+` in the query stopped matching, so `id:toolshed.g2.bx.psu.edu/repos/.../1.1.2+galaxy2` found nothing. The fix switches to `includes()` for plain substring matching and drops the escaping from `sanitizeString`. `matchingTerm` gets the same treatment.
- **Selectors.** `tool_panel.tool_link`, `outer_tool_link` and `data_source_tool_link` matched `tool_id` in the href, but the client URL-encodes it, so a GUID never matched. They now match the link's `data-tool-id`.

## Tests

- vitest: `utilities.test.ts` adds an `id:<GUID>` case, 25 passed. With the old `utilities.ts`, that case fails (1 failed, 24 passed).
- Unit: `test/unit/selenium/test_navigation_tool_panel.py` is new and runs against a static `fixtures/tool_panel.html` under both backends. 12 passed. With the old `navigation.yml`, 4 failed (the GUID cases on both backends).
- No E2E test: CI has no Tool Shed tools installed.

vitest ran with `client/node_modules` symlinked from the `galaxy_ui_driver` worktree, under node 22.20.0. Python tests ran with the main repo's venv and `PYTHONPATH=lib`.
