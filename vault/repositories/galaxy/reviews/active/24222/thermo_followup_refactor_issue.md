# Follow-up: clause-preserving filter edits in `Filtering`

PR #24222 added a local clause editor to `client/src/components/ToolsList/ToolsList.vue` because `Filtering.setFilterValue` (`client/src/utils/filtering.ts`) drops free text, folds trailing words into filter values, and merges repeated filters.

Plan:
1. Add red tests to `filtering` unit tests: setting/toggling a filter preserves free text, repeated MultiTags clauses, and as-written quoting.
2. Add a clause-preserving toggle (e.g. `toggleFilterValue(text, key, value)`) to `Filtering`, with per-filter value comparison (case-insensitive for tags) declared on the filter definition rather than hardcoded on `"tag"`.
3. Expose a parse API (free text + clauses, or null for boolean queries) so `ToolsList.vue`'s `parseInlineFilterClauses`/`hasExplicitBooleanQuery`/`pickerSearch` can be replaced.
4. Port `ToolsList.vue` to it; delete `toggleFilterClause`, `buildFilterClause`, `isSameFilterValue`. Keep `ToolsList.test.ts` passing unchanged.
5. Check other `FilterMenu` consumers benefit (advanced filter panels on history/workflow lists).
