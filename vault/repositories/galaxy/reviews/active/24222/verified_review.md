### P3 1: Picker-built tag clauses with quote characters don't round-trip (implementation verified)

`buildFilterClause` in `ToolsList.vue` quoted a value only when it contained whitespace, so a tag like `it's` was written as `tag:it's`. The inline parser's unquoted arm (`[^\s"']+`) rejects that, so the clause fell into free text. The tag then looked deselected, and toggling it again appended a duplicate. The parser has no escape handling either, so an embedded `"` inside `"..."` can't round-trip.

Quote values that contain `'` or whitespace with `"...\"`, and values that contain `"` with `'...'`. Commit `262d469a70e` on the review branch does this and adds a `ToolsList.test.ts` case that toggles `it's` on and off.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>

### P3 2: Favorite in-flight guard is per consumer (implementation verified)

`useFavoriteObjects` creates `pending` inside each call. A card and a filter chip for the same tag can therefore each start a toggle while the other is still in flight, and the "saving" guard doesn't stop it.

Hoist `pending` to module scope so every consumer shares it. Commit `4292c2ab4af` does this and adds `useFavoriteObjects.test.ts`, which fails before the change and passes after it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>

### P3 3: Hidden-tool filtering of `/api/tags/tool_tags` is only unit-tested

`curated_tool_tags_by_id` now filters by what the user can see, which is an API contract. Only `test/unit/app/tools/test_toolbox.py` covers it. That test combined two cases and reset the first one with a `del tool.allow_user_access` trick.

Commit `fea07df3134` splits the unit test into an access case and a hidden case. API coverage still needs a hidden or inaccessible tool that has curated tags, plus an assertion in `test_search_curated_tool_tags` that its id is absent. The API test toolbox has no such tool, so this likely needs an integration test with toolbox filters. That part is not on the branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>

### P3 4: No E2E coverage for the tag picker

`lib/galaxy_test/selenium/test_tool_discovery_view.py` is untouched. Unit tests mock the store, API, and router, so nothing exercises the full tag picker path.

Add a case that picks a tag and asserts that the results narrow and a chip appears. It can also check that the picker is disabled under a boolean search. This needs new `tools_list` navigation selectors for the picker and chip. It was not written on the review branch.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort.

</details>

### P3 5: Second filter-text editor in `ToolsList.vue` instead of fixing `Filtering`

`ToolsList.vue` now has its own clause model (`pickerSearch`, `isSameFilterValue`, `buildFilterClause`, `toggleFilterClause`) alongside its inline parser. It needs one because `Filtering.setFilterValue` drops free text and merges repeated filters. The result is a page-local query language whose semantics differ from the shared `client/src/utils/filtering.ts` used by the other list pages, and `applyFilter` still falls back to `setFilterValue`. This is acceptable for a release branch, and the follow-up below moves the clause-preserving edit into `Filtering`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at low effort.

</details>

<details><summary>Suggested Follow-Up Refactorings</summary>

# Follow-up: clause-preserving filter edits in `Filtering`

PR #24222 added a local clause editor to `client/src/components/ToolsList/ToolsList.vue` because `Filtering.setFilterValue` (`client/src/utils/filtering.ts`) drops free text, folds trailing words into filter values, and merges repeated filters.

Plan:
1. Add red tests to `filtering` unit tests: setting/toggling a filter preserves free text, repeated MultiTags clauses, and as-written quoting.
2. Add a clause-preserving toggle (e.g. `toggleFilterValue(text, key, value)`) to `Filtering`, with per-filter value comparison (case-insensitive for tags) declared on the filter definition rather than hardcoded on `"tag"`.
3. Expose a parse API (free text + clauses, or null for boolean queries) so `ToolsList.vue`'s `parseInlineFilterClauses`/`hasExplicitBooleanQuery`/`pickerSearch` can be replaced.
4. Port `ToolsList.vue` to it; delete `toggleFilterClause`, `buildFilterClause`, `isSameFilterValue`. Keep `ToolsList.test.ts` passing unchanged.
5. Check other `FilterMenu` consumers benefit (advanced filter panels on history/workflow lists).

</details>
