# Thermo review — PR #24222

- Profile: thermo_review
- Model: claude-opus-5-5
- Effort: low
- Reviewed commit: `8e75e467e47c8f8e5586ab71a5a594bf3dead977` (diff vs merge-base with `origin/release_26.2`)

Release-branch PR; scope accepted. Good reuse moves: `ToolFilterChip` + `useFavoriteObjects` pull favorite logic out of `ToolsListCard.vue` (-163 net), `toolTagNames` replaces the inline tag-set computation, and the backend `curated_tool_tags_by_id` sits beside `curated_tool_tags` on the toolbox. Remaining concerns are structural and collapsed per profile rules.

### P3 1: Second filter-text editor in `ToolsList.vue` instead of fixing `Filtering`

`ToolsList.vue` now carries its own clause model (`InlineFilterClause.text`, `pickerSearch`, `isSameFilterValue`, `buildFilterClause`, `toggleFilterClause`) because, per its comment, `Filtering.setFilterValue` "would drop the free text, fold words that follow a filter into its value and merge repeated filters". That is a defect in the shared `client/src/utils/filtering.ts` abstraction, which every other list page (histories, workflows, datasets) also uses; working around it in one component leaves two editors with diverging semantics (case-insensitive tag matching, quoting rules, MultiTags handling re-derived from `validFilters`), and `applyFilter` still falls back to `setFilterValue` when `pickerSearch` is null. The component also already held a hand-rolled inline parser (`parseInlineFilterClauses`, `hasExplicitBooleanQuery`), so this grows a page-local query language. Acceptable for a release fix; the follow-up is to move clause-preserving edit into `Filtering` and delete the local copy. See `thermo_followup_refactor_issue.md`.

### P3 2: Store exports internals `rawToolsById` / `toolTagsById`

`toolStore` now returns `rawToolsById` and `toolTagsById`. No production consumer uses either; only tests (`toolStore.test.ts`, `ToolsList.test.ts:286` assigns `toolTagsById` directly). Exporting the undecorated map invites callers to bypass the decoration `toolsById` exists to provide. Keep them private and have tests go through `fetchToolTagsMapping` (axios mock) or `toolsById`/`toolTagNames`.

### P3 3: `useFavoriteObjects` pending state is per-instance

`pending` is created per composable call, so a card and a filter chip for the same tag each allow an in-flight toggle; the "saving" guard doesn't dedupe across consumers. Also the `actions` table is rebuilt on each call. Hoist the pending set (or put pending/toggle in `userStore`, which already owns the add/remove actions) so the guard is shared.
