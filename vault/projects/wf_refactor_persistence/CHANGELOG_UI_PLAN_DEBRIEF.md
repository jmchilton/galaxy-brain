# Changelog UI Plan — Debrief

## Plan vs Implementation Comparison

### Step 6.5: ChangelogPanel Component

**Status: Implemented as planned with minor deviations.**

| Aspect | Plan | Implementation | Match? |
|--------|------|----------------|--------|
| Props (`workflowId: string`) | Yes | Yes | Yes |
| State (`entries`, `loading`, `totalMatches`, `currentOffset`, `pageSize`, `error`) | Yes | Yes, plus explicit `hasMore` ref | Close |
| ActivityPanel wrapper | Yes | Yes | Yes |
| Refresh button (header) | FontAwesomeIcon + faSync icon | Text "Refresh" button | Deviation |
| Loading state | LoadingSpan | LoadingSpan | Yes |
| Error state | `alert alert-danger` | `alert alert-danger m-2` (added margin) | Yes |
| Empty state | "No changelog entries yet..." | Same text, added `p-2` padding | Yes |
| Entry rendering | title + UtcDate | title + UtcDate | Yes |
| Revert badge | `div.entry-badge.badge-revert` | `span.badge.badge-warning.entry-badge` | Deviation (uses Bootstrap badge class) |
| Revert button | With `v-if="!entry.is_revert \|\| true"` | No `v-if` — always shown | Correct simplification (the plan's condition was always true) |
| execution_messages display | Placeholder comment in template | Omitted entirely | Gap (see Q4) |
| Load more pagination | BButton with `hasMore` computed | Same, `hasMore` as explicit ref | Yes |
| `fetchChangelog` logic | Described | Matches — offset-based append vs replace | Yes |
| `refresh()` exposed | Yes | Yes via `defineExpose` | Yes |
| `onMounted` + `watch(workflowId)` | Yes | Yes | Yes |
| Styling | Not specified | Scoped SCSS with theme import | Addition |

**Deviations that make sense:**
- `hasMore` as explicit ref instead of computed: functionally equivalent, slightly more explicit about state management.
- Text "Refresh" instead of icon: simpler, avoids another font-awesome import. Could revisit for polish.
- Bootstrap `badge-warning` class for revert badge: better than custom CSS class since it leverages existing design system.
- Scoped SCSS: good practice, not specified in plan but necessary for a polished component.
- Removing the always-true `v-if` guard: the plan's `!entry.is_revert || true` was effectively `true`, so removing it is correct.

### Step 6.6: Integration into Workflow Editor

**Status: Implemented as planned with deviations.**

| Aspect | Plan | Implementation | Match? |
|--------|------|----------------|--------|
| Activity entry in activities.ts | `faClockRotateLeft` icon | `faListUl` icon | Deviation (see Q1) |
| Activity position | After "Changes" | After "Changes" | Yes |
| Activity fields (title, id, description, tooltip, panel, visible, optional) | As specified | As specified | Yes |
| Feature flag filtering | Filter in `workflowActivities` computed | Same pattern | Yes |
| Feature flag source | `useConfigStore().config?.enable_workflow_action_persistence` | `undoRedoStore.persistenceEnabled` (which wraps the same check) | Deviation — DRY, good |
| ChangelogPanel in template | `v-else-if="isActiveSideBar('workflow-editor-changelog')"` | Same | Yes |
| `changelogPanel` ref | Yes | Yes | Yes |
| Refresh after save | `this.changelogPanel?.refresh?.()` | Same, in `onSave()` | Yes |
| **Register in `components` object** | **Yes (explicitly called for)** | **Missing** | **Gap** |
| Import ChangelogPanel | Yes | Yes (line 307) | Yes |
| Return from setup | `changelogPanel` | Yes | Yes |

**Potential bug: ChangelogPanel not registered in `components` hash.**
The plan explicitly says to add `ChangelogPanel` to the `components` object. The implementation imports it (line 307) and uses it in the template (line 72) but does NOT register it in the `components:` block (lines 310-333). Every other component in this file follows the registration pattern. In Vue 2.7 Options API, this may cause a runtime resolution failure. With `@vitejs/plugin-vue2`'s template compilation, the module-scope import _might_ be resolved at compile time, but this is inconsistent with the rest of the file and should be fixed for safety.

### Step 6.7: Revert Functionality

**Status: Implemented as planned with one addition.**

| Aspect | Plan | Implementation | Match? |
|--------|------|----------------|--------|
| Unsaved changes guard | Confirm -> save first -> cancel flow | Exact match | Yes |
| Revert confirmation dialog | Confirm with title, okTitle, okVariant | Exact match | Yes |
| Confirmation message text | Matches plan | Matches plan | Yes |
| `revertWorkflow(id, entry.workflow_id_before)` | Yes | Yes | Yes |
| `resetStores()` + `fromSimple()` + `_loadEditorData()` | Yes | Yes | Yes |
| Refresh versions | `getVersions` + assign | Yes | Yes |
| Refresh changelog | `changelogPanel?.refresh?.()` | Yes | Yes |
| Toast success | Yes | Yes | Yes |
| Error handling | `onWorkflowError` | Yes, same pattern | Yes |
| `loadingWorkflow` guard | Yes | Yes | Yes |
| **`fitWorkflow()` after revert** | Proposed in Q6, not in main plan | **Implemented** (line 941) | Addition |

The addition of `this.workflowGraph.fitWorkflow()` after revert is the resolution of unresolved question #6. Good call — reverting to a potentially very different workflow state warrants re-fitting the graph.

### Testing

**Status: Implemented with more coverage than planned.**

Plan specified 8 test cases. Implementation has 12.

| Plan Test | Implementation | Status |
|-----------|---------------|--------|
| Renders loading state initially | Yes | Pass |
| Renders empty state when no entries | Yes | Pass |
| Renders entries with title and timestamp | Split into "renders entries with title" + "renders timestamp for each entry" | Pass |
| Revert button emits event with entry | Yes | Pass |
| Load more pagination | Split into "shows Load more when more exist" + "does not show Load more when all loaded" + "load more appends entries" | Pass |
| Refresh replaces entries | Yes | Pass |
| Error state renders | Yes | Pass |
| Revert badge shown for revert entries | Split into positive + negative case ("does not show revert badge for non-revert entries") | Pass |

All 12 tests pass. The split into positive/negative cases is good testing practice.

**Missing from test plan:** No integration tests for the revert flow in `Index.vue`. The plan acknowledged this and deferred to E2E/Selenium tests, which is reasonable given the Options API complexity.

---

## Status of Unresolved Questions

### Q1: Icon choice — `faClockRotateLeft` vs `faHistory`
**Resolved: Used `faListUl` instead.**
Neither of the proposed icons was used. `faListUl` (list icon) was chosen, which differentiates from the adjacent "Changes" panel that uses `faHistory`. This avoids confusion between two history-related icons. Reasonable choice, though `faClockRotateLeft` (if available in font-awesome-6) might be more semantically appropriate. Low priority.

### Q2: Revert semantics — "before" vs "after"
**Resolved: Uses `workflow_id_before`.**
The implementation uses "Revert to before this" with `entry.workflow_id_before`, matching the plan's primary proposal. Button text is "Revert to before this" and tooltip is "Revert to the state before this change". Consistent and clear.

### Q3: Activity ordering
**Resolved: Placed after "Changes" (undo/redo).**
Matches the plan's proposal. The two history-related icons are adjacent, which is conceptually logical. The `faListUl` icon (Q1) helps differentiate them visually.

### Q4: Execution messages display
**Resolved: Omitted for v1.**
The `execution_messages` field is not rendered at all. The plan's placeholder comment was dropped. This is acceptable for v1 — the messages are likely rare and their structure (`unknown[]`) needs investigation before displaying. Should be tracked as a follow-up.

### Q5: User display
**Resolved: Omitted for v1.**
No user information is displayed. Acceptable for the initial implementation since most Galaxy instances are single-user.

### Q6: Coordinate shift handling
**Resolved: Uses `fitWorkflow()`.**
The implementation calls `this.workflowGraph.fitWorkflow()` after revert (line 941), matching the plan's proposal. This ensures the graph view adjusts to the potentially very different reverted state.

---

## Concerns and Gaps

### High Priority

1. **ChangelogPanel not registered in `components` hash in Index.vue.** The component is imported (line 307) but not added to the `components: { ... }` block (lines 310-333). This is inconsistent with every other component in the file and may cause a runtime failure depending on how `@vitejs/plugin-vue2` resolves template component references. Should be verified at runtime and fixed if broken.

### Medium Priority

2. **No `execution_messages` display.** If execution messages contain warnings about the refactor (e.g., tool version mismatches after revert), users won't see them. Track as follow-up.

3. **No TypeScript annotation on `onRevertToEntry(entry)`.** The method parameter `entry` has no type annotation (line 898: `async onRevertToEntry(entry)`). The Options API method block doesn't enforce types, so `entry` is implicitly `any`. Should be typed as `ChangelogEntry` for safety — or at minimum, add a JSDoc annotation.

### Low Priority

4. **Refresh button is text-only.** The plan called for an icon button (faSync). Text is fine for v1, but an icon would be more compact in the narrow sidebar panel.

5. **No loading indicator during pagination.** When "Load more" is clicked, the button is disabled but there's no spinner/loading indication. The loading state only shows on initial load when `entries.length === 0`.

6. **No E2E/Selenium test coverage.** The revert flow, feature-flag gating, and changelog refresh after save are only tested indirectly through the unit tests. Full round-trip validation requires E2E tests.

---

## Prioritized Next Steps

1. **Fix `components` registration** — Add `ChangelogPanel` to the `components: { ... }` hash in `Index.vue`, or verify at runtime that the current import works correctly with Vue 2.7 + Vite template compilation. Quick fix.

2. **Type `onRevertToEntry` parameter** — Add `ChangelogEntry` type annotation or JSDoc to the revert handler method.

3. **Manual smoke test** — Verify the full flow with feature flag enabled: sidebar icon appears, changelog loads, pagination works, revert executes, changelog refreshes after save and revert.

4. **Execution messages display (follow-up)** — Investigate actual shape of `execution_messages`, decide on inline vs expandable rendering, implement.

5. **User display (follow-up, multi-user only)** — Add username lookup/display for changelog entries. Only relevant for multi-user Galaxy instances.

6. **E2E test coverage** — Add Selenium test for: open changelog panel, verify entries display, perform revert, verify editor reloads and new changelog entry appears.

7. **Polish: icon refresh button** — Replace text "Refresh" with faSync icon for visual consistency with other sidebar panels.

8. **Polish: loading indicator for pagination** — Add inline spinner when loading more entries.
