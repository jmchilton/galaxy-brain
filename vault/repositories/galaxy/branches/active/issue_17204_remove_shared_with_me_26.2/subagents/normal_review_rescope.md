# Normal review: rescope (batch removal, wrappers)

Verdict approve; no bugs, no security findings. Acted on: dropped `_l()` around the interpolated viz batch confirm string (can't match a translation key).

Not acted on:
- Failed items stay selected after a partial workflow bulk removal but are cleared for histories: each follows its own file's existing bulk convention (`selectTmpSelected` in WorkflowList, `resetSelection` in HistoryList).
- Shared `eachCollectingFailures` helper for the three bulk loops: optional; existing owner bulk loops abort on first error, so a helper would mean changing them on a release branch.
- Inline `pluralX` helpers: no pluralize util exists; inline is the norm.
- Duplicate keyboard-Delete comment in HistoryList/WorkflowList, two-line JSDoc: cosmetic.
- Extra HistoryCard test for "published view + not mine → no select": published passes `sharedView=false`, gate unchanged there.
- Shared viz grid config `id` "visualizations-published-grid": pre-existing copy-paste, out of scope.

<details><summary>Full review</summary>

- Owner-only actions unreachable in shared views: footer `v-else-if="sharedView"` branch holds only Remove from Shared; `onDelete` returns early outside my view (histories) / in shared-with-me (workflows); tag edit/rename still key off ownership.
- Loosened select gates (`isMyHistory || sharedView`, `!shared || sharedWithMeView`) don't affect published/archived/editor views.
- "Select all in query" only selects loaded page items; bulk actions see current-page ids only, same as my-view bulk actions.
- `window.confirm` in grid batch matches admin*/pages grid configs. First grid config using `batch` since 387d1141070.
- Wrappers follow `rethrowSimple` pattern.
- Tests: negative keyboard tests have my-view controls; viz batch asserts exact ids and messages; E2E checks removal, 403, and the kept history.
- vitest 29/29 on touched files; eslint 0 errors.
</details>
