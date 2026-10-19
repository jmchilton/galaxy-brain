

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at low effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this is mostly client UI on the tool discovery page (a tag picker over the existing `tag:` search syntax, chip/card refactors, a new opt-in `GDropdown` `initialFocus` prop), so it doesn't lock Galaxy into hard-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- `/api/tags/tool_tags` now returns only tools visible to the requesting user (toolbox filters applied), not every loaded tool. Narrower output is the safer direction, but it is an observable API behavior change on a release branch.
- `GDropdown` (shared `@galaxyproject/ui` package) gets an `initialFocus` prop that changes ArrowUp/ArrowDown handling when set; existing callers don't set it, so they keep current behavior.
- Tool-store refactor: tags are now kept as a separate mapping and applied when tools are read, rather than copied into the tool objects. Any consumer reading `toolsById` before the mapping loads sees tools without tags.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the visibility filter on `/api/tags/tool_tags` is wanted for 26.2 and that no external client depends on the full mapping. Otherwise review focuses on keyboard/accessibility behavior of the tag picker, since that is the one place users learn a new interaction.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch</summary>

# [pr_24222_review_0](https://github.com/jmchilton/galaxy/tree/pr_24222_review_0)

Branch [`pr_24222_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24222_review_0) sits on reviewed head `8e75e467e47`. It makes picker-built tag clauses with quote characters round-trip through the inline parser, shares the favorite-toggle in-flight guard across components, and splits the curated-tag visibility unit test into one test per case. Each commit has a test that was run and passes. The tag-picker E2E test and API-level hidden-tool coverage are not included.

- [`262d469a70e`](https://github.com/jmchilton/galaxy/commit/262d469a70e) Quote picker tag clauses containing quotes so they round-trip: wraps values containing `'` or whitespace in `"..."` and values containing `"` in `'...'`, and adds a `ToolsList.test.ts` case.
- [`4292c2ab4af`](https://github.com/jmchilton/galaxy/commit/4292c2ab4af) Share favorite toggle in-flight guard across consumers: hoists `pending` in `useFavoriteObjects` to module scope, and adds `useFavoriteObjects.test.ts`.
- [`fea07df3134`](https://github.com/jmchilton/galaxy/commit/fea07df3134) Split curated tool tag visibility unit test by case: separates the access and hidden cases and drops the `del allow_user_access` reset.

</details>

### P3 1: Picker-built tag clauses with quote characters don't round-trip (implementation verified)

`buildFilterClause` in `ToolsList.vue` quoted a value only when it contained whitespace, so a tag like `it's` was written as `tag:it's`. The inline parser's unquoted arm (`[^\s"']+`) rejects that, so the clause fell into free text. The tag then looked deselected, and toggling it again appended a duplicate. The parser has no escape handling either, so an embedded `"` inside `"..."` can't round-trip.

Quote values that contain `'` or whitespace with `"...\"`, and values that contain `"` with `'...'`. Commit `262d469a70e` on the review branch does this and adds a `ToolsList.test.ts` case that toggles `it's` on and off.

Fix: [`262d469a70e`](https://github.com/jmchilton/galaxy/commit/262d469a70e)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>

### P3 2: Favorite in-flight guard is per consumer (implementation verified)

`useFavoriteObjects` creates `pending` inside each call. A card and a filter chip for the same tag can therefore each start a toggle while the other is still in flight, and the "saving" guard doesn't stop it.

Hoist `pending` to module scope so every consumer shares it. Commit `4292c2ab4af` does this and adds `useFavoriteObjects.test.ts`, which fails before the change and passes after it.

Fix: [`4292c2ab4af`](https://github.com/jmchilton/galaxy/commit/4292c2ab4af)

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at low effort.

</details>

### P3 3: Hidden-tool filtering of `/api/tags/tool_tags` is only unit-tested

`curated_tool_tags_by_id` now filters by what the user can see, which is an API contract. Only `test/unit/app/tools/test_toolbox.py` covers it. That test combined two cases and reset the first one with a `del tool.allow_user_access` trick.

Commit `fea07df3134` splits the unit test into an access case and a hidden case. API coverage still needs a hidden or inaccessible tool that has curated tags, plus an assertion in `test_search_curated_tool_tags` that its id is absent. The API test toolbox has no such tool, so this likely needs an integration test with toolbox filters. That part is not on the branch.

Fix: [`fea07df3134`](https://github.com/jmchilton/galaxy/commit/fea07df3134)

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
