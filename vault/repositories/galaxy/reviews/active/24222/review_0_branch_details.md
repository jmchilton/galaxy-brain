# pr_24222_review_0

Branch `pr_24222_review_0` sits on reviewed head `8e75e467e47`. It makes picker-built tag clauses with quote characters round-trip through the inline parser, shares the favorite-toggle in-flight guard across components, splits the curated-tag visibility unit test into one test per case, adds an integration test that `/api/tags/tool_tags` omits hidden tools, and adds E2E tests for the tag picker. Each commit has a test that was run and passes; the E2E tests ran under the Playwright backend only.

- `262d469a70e` Quote picker tag clauses containing quotes so they round-trip: wraps values containing `'` or whitespace in `"..."` and values containing `"` in `'...'`, and adds a `ToolsList.test.ts` case.
- `4292c2ab4af` Share favorite toggle in-flight guard across consumers: hoists `pending` in `useFavoriteObjects` to module scope, and adds `useFavoriteObjects.test.ts`.
- `fea07df3134` Split curated tool tag visibility unit test by case: separates the access and hidden cases and drops the `del allow_user_access` reset.
- `26744676021` Integration test: /api/tags/tool_tags omits hidden tools: adds `test/integration/test_curated_tool_tags.py`, which loads one visible and one hidden tagged tool and checks only the visible one is listed.
- `9cd9c8d1815` E2E tests for tool discovery tag picker: adds `tools_list` picker and chip selectors, a test that picking and removing tags narrows results and edits the search text, and a test that the picker is disabled under a boolean search.
