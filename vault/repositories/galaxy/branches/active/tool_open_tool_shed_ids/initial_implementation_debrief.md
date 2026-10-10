# tool_open_tool_shed_ids — implementation debrief

Branch `tool_open_tool_shed_ids` @ `953ad71c656`, a single commit on `dev` @ `df3932ed4ba`, cherry-picked from `galaxy_ui_driver` (`88fe295ef38`). After review, the commit was amended to drop an unused `base_url` parameter from the test's driver fixture. 5 files, +111/−12.

## Two bugs

- **Panel search.** `searchObjectsByKeys` regex-escaped the query with `sanitizeString`, then used it as a regex against the tool's value: `actualValue.match(queryValue)`. Any regex metacharacter in the query, such as `.` or `+`, stopped matching, so `id:toolshed.g2.bx.psu.edu/repos/.../1.1.2+galaxy2` found nothing. The fix switches to `includes()` for plain substring matching and drops the escaping from `sanitizeString`. `matchingTerm` gets the same treatment.
- **Selectors.** `tool_panel.tool_link`, `outer_tool_link` and `data_source_tool_link` matched `tool_id` in the href, but the client URL-encodes it, so a GUID never matched. They now match the link's `data-tool-id`.

## Tests

- vitest: `utilities.test.ts` adds an `id:<GUID>` case, 25 passed. With the old `utilities.ts`, that case fails (1 failed, 24 passed).
- Unit: `test/unit/selenium/test_navigation_tool_panel.py` is new and runs against a static `fixtures/tool_panel.html` under both backends. 12 passed. With the old `navigation.yml`, 4 failed (the GUID cases on both backends).
- No E2E test: CI has no Tool Shed tools installed.

vitest ran with `client/node_modules` symlinked from the `galaxy_ui_driver` worktree, under node 22.20.0. Python tests ran with the main repo's venv and `PYTHONPATH=lib`.

## Review (2026-10-10)

The review found no blockers.
- `sanitizeString` is private to `utilities.ts`.
- `Tool.vue:54-63` renders `a.title-link.tool-link[data-tool-id]`, and the fixture mirrors it.
- The only selector callers are `tool_open`, `datasource_tool_open` and `test_tool_panel_search.py`.

The driver fixture duplicates `test_smart_components.py:35`. Moving it into a shared `conftest.py` was skipped to keep the PR small.

Possible follow-up, out of scope here: the `tools_list.tool_card` selectors (`navigation.yml:445-450`) build `#…-${tool_id}` ids, so they would break the same way for Tool Shed ids.
