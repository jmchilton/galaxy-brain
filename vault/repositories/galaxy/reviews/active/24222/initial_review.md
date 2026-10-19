# PR #24222 re-review: default profile

- Profile: default
- Model: claude-opus-5-5
- Effort: low
- Reviewed commit: 8e75e467e47c8f8e5586ab71a5a594bf3dead977 (diff vs merge-base with origin/release_26.2)
- Focus: new commits 0d6282330fd, cef1d2e3780; scope/target accepted per John.

## Prior P2 (search conditions lost on tag selection)

Resolved. `pickerSearch` keeps free text as `remainder` and the clauses as written; `toggleFilterClause` edits those directly, so `Filtering.setFilterValue` no longer drops or merges anything on the picker path. Boolean/favorites searches still disable the pickers. Tests cover free text, mixed filters, `unknown:term`, and ontology.

## Findings

### P3 1: Picker-built clauses can't round-trip tag values containing quotes

`buildFilterClause` quotes a value only when it has whitespace. A tag with `'` or `"` and no whitespace is written unquoted (`tag:o'x`), which the `[^\s"']+` arm of `parseInlineFilterClauses` won't match. It then falls into the free text, so the tag looks deselected and a second toggle appends a duplicate. Quoted values with an embedded `"` hit the same parser limit (`"([^"]*)"` has no escape handling, though `escapeQuotedWhooshToken` writes `\"`). This is rare for curated tags. A simple fix is to always quote values containing quote characters, or to make the parser accept escaped quotes. A test with a tag like `it's` would pin it.

## Notes (no finding)

- Backend `curated_tool_tags_by_id` now filters by the user's toolbox filters. That is correct, and a unit test was added.
- GDropdown ArrowUp-to-search and the `initialFocus`-not-a-menu-item guard look right and are tested.
- `ToolFilterChip` without `kind` (non-EDAM ontology) only offers removal. That is fine.
