# Normal review (2026-10-10)

No blockers and no security issues. **Acted on:** dropped the unused `base_url` parameter from the test's driver fixture (amended into `953ad71c656`) and fixed the debrief's claim that `/` broke matching (`/` isn't a regex metacharacter).

**Not acted on:**
- **Shared driver fixture.** The fixture duplicates `test_smart_components.py:35`. Moving it into `test/unit/selenium/conftest.py` would grow the PR for little gain.
- **`tools_list.tool_card` id selectors** (`navigation.yml:445-450`). They build `#…-${tool_id}`, which breaks for Tool Shed ids in the same way. That's a separate fix, recorded as a follow-up.

## Details

The review confirmed:
- `sanitizeString` is module-private, called only in `utilities.ts`.
- `searchObjectsByKeys` is reached only through `searchTools`/`searchSections`.
- The old code escaped both the query and the value, so any query of two or more characters containing a metacharacter could never match. `includes()` is strictly better.
- The new vitest case is genuinely red on the old code.
- `Tool.vue:54-63` renders `a.title-link.tool-link[data-tool-id]`. `toolStore.ts:141-144` builds the `data_source_redirect` and `?tool_id=…&version=latest` hrefs, so the href guards in the new selectors still separate disabled, data-source and normal tools.
- The fixture mirrors that markup.
- The only callers are `navigates_galaxy.py:2008-2019` (`tool_open`, `datasource_tool_open`) and `test_tool_panel_search.py:49`.

Tests run by the reviewer: `test_navigation_tool_panel.py`, 12 passed. vitest `utilities.test.ts` + `ToolBoxSearch.test.ts`, 45 passed under node 22.20.0.

Note: this review predates the process doc and was not given `REVIEW_FOCUS.md`. The codex and thermo-nuclear reviews that follow cover that ground.
