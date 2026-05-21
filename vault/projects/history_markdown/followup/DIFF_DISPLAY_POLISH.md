# Diff display polish: status + follow-up scope

## Plan status (vs DIFF_VIEWER_POLISH_AND_TESTING.md)

| Step | Item | Status | Evidence |
|---|---|---|---|
| 1 | Store: `previousRevisionContent`, `isNewestRevision`, `isOldestRevision`, viewMode enum, clear-on-back | done | `client/src/stores/pageEditorStore.ts:62-63, 81-86, 391-410, 451-465, 541-560` |
| 2 | PageEditorView passes new props | done (props consumed by `PageRevisionView` from store; revision view uses them) | `client/src/components/PageEditor/PageRevisionView.vue:15-23` |
| 3 | Three view modes, conditional buttons, "no changes" message | done | `PageRevisionView.vue:64-93, 116-121` |
| 4 | Unit tests for `PageRevisionView` | done | `PageRevisionView.test.ts:31-33, 52-155` (renamed viewMode, hidden-button cases, both diff modes) |
| 5 | Store unit tests for new computeds + `previousRevisionContent` | done | `pageEditorStore.test.ts:1065-1251` |
| 6 | navigation.yml selectors | done | `client/src/utils/navigation/navigation.yml:733-746` |
| 7 | Selenium: `test_revision_diff_view` (history pages) | done | `lib/galaxy_test/selenium/test_history_pages.py:498-539` |
| 8 | Selenium: `test_standalone_page_revision_diff` | done | `lib/galaxy_test/selenium/test_pages.py:160-198` |
| Verification | vitest + selenium suites runnable against above | done (suites + selectors exist) | same |

All eight steps + verification have landed.

## Outstanding gaps from the plan

- None. The plan as written is fully implemented in branch `history_pages`.

## New polish opportunities (not in the plan)

1. **Word/intra-line diff granularity in `ProposalDiffView` / `PageRevisionView`**
   - Problem: line-level diff only -- a one-word edit highlights whole lines red+green; reader has to eyeball the delta.
   - Fix: layer `diffWordsWithSpace` on top of `Change[]` for paired removed+added blocks; render `<ins>`/`<del>` spans inside the existing `pre.diff-line`.

2. **Section-aware diff in the revisions tab**
   - Problem: revisions tab uses raw `computeLineDiff`, ignoring `sectionDiff` which the rest of the system relies on; long edits sprawl with no heading grouping.
   - Fix: optional "by section" toggle that reuses `sectionDiff` to chunk the revision diff like `SectionPatchView`, with each heading collapsible.

3. **Collapse unchanged context**
   - Problem: when only one section changes in a long page, the diff shows hundreds of unchanged lines (`diff-context`).
   - Fix: collapse runs of >N (e.g. 3) context lines into a "... N unchanged lines ..." disclosure (jsdiff `Change` blocks where `!added && !removed`).

4. **Stale warning is tooltip-only**
   - Problem: `stale` state in `ProposalDiffView`/`SectionPatchView` just disables buttons + sets a `title=`; users won't see why Accept is greyed.
   - Fix: render a visible warning banner at the top of the diff ("Page changed since this suggestion -- accept will overwrite N edits") + a "show what diverged" link.

5. **Section accept/reject lacks per-section reject**
   - Problem: `SectionPatchView` is opt-in (checkbox to accept) only; no way to mark a section "rejected" distinct from "not yet decided", and no per-section undo after Apply.
   - Fix: tri-state per section (accept/reject/undecided) with a counter; reject just hides; Apply still uses accepted set.

6. **Diff stats not surfaced in revision list**
   - Problem: `PageRevisionList` shows date + source only; cannot scan for "which revision was the big edit".
   - Fix: precompute `diffStats` between adjacent revisions (lazy/on-hover) and show `+12/-3` next to each row.

7. **No "compare arbitrary two revisions"**
   - Problem: only "vs current" and "vs previous" are wired; comparing rev N to rev N+3 requires restoring or eyeballing.
   - Fix: add a "Compare with..." dropdown on the revision toolbar listing the other revisions; reuse `currentChanges` computation with the chosen baseline.

8. **Visual contrast / dark-mode hardening**
   - Problem: `diff-added`/`diff-removed` colors are hard-coded (`#1e7e34`, `#bd2130`, rgba green/red) instead of theme tokens; dark mode + colorblind users underserved.
   - Fix: route through Galaxy CSS variables (`--state-success-*`, etc.) and add a non-color cue (left-border bar + `+`/`-` glyph already present, but bar would survive grayscale).

9. **Word-break: break-all on monospace**
   - Problem: `word-break: break-all` on `.diff-line` (all three views) shatters URLs/identifiers mid-token.
   - Fix: `overflow-wrap: anywhere` or `break-word`, or horizontal scroll for code-ish runs.

10. **Large-diff perf / max-height inconsistency**
    - Problem: `ProposalDiffView` caps `.diff-content` at `max-height: 400px`; `PageRevisionView` diff has no cap and renders one `<pre>` per line for the full doc (O(lines) Vue nodes).
    - Fix: virtualize via `RecycleScroller` (already used elsewhere in Galaxy) past a threshold; cap revision diff height too.

11. **No section-patch keyboard a11y / "Apply all" shortcut**
    - Problem: BFormCheckbox is keyboard-reachable but no roving focus, no "A/N" shortcut for All/None, no aria-live for the `acceptedCount` updates.
    - Fix: add `aria-live="polite"` to header, label All/None buttons with `accesskey`, ensure tabindex order matches reading order.

12. **`SectionPatchView` matches sections by exact heading string**
    - Problem: trivial heading edit ("## Results" -> "## Results ") yields a remove + add pair instead of an edit (per `sectionDiff` in `sectionDiffUtils.ts:94`).
    - Fix: normalize headings (trim + collapse whitespace) for the match map; keep raw heading for display.

13. **Per-section diff stats recomputed inline in template**
    - Problem: `SectionPatchView.vue:121-122` calls `diffStats(sc.changes)` twice per row each render.
    - Fix: precompute a stat per `SectionChange` (memoize); tiny but trivial.

14. **No "accept then edit before save" affordance**
    - Problem: `ProposalDiffView` accept replaces editor content immediately; user wanting to tweak the agent's prose has to find the just-applied text in the editor.
    - Fix: secondary "Accept into draft" action that inserts but leaves a marker / opens an editor diff overlay.

15. **No empty-document edge case in `ProposalDiffView`**
    - Problem: when `original === proposed` (rare but possible), the view renders an empty body with `+0/-0`; no message.
    - Fix: render the same "No changes" sentinel as `PageRevisionView` uses.

## Prioritized backlog

| Item | Scope | Files | Size | Priority |
|---|---|---|---|---|
| Visible stale banner | header alert in both views | `ProposalDiffView.vue`, `SectionPatchView.vue` | XS | P1 |
| Collapse unchanged context | runs of context lines -> disclosure | `PageRevisionView.vue`, `ProposalDiffView.vue`, `SectionPatchView.vue` | S | P1 |
| Word-level diff inside lines | `diffWordsWithSpace` overlay | `sectionDiffUtils.ts`, three views | M | P1 |
| Theme-token colors / dark mode | swap hex for vars | three view stylesheets | XS | P1 |
| Heading-match normalization | trim + whitespace fold | `sectionDiffUtils.ts:94-131` + test | XS | P2 |
| `+/-` stats in revision list | precompute or lazy compute | `PageRevisionList.vue`, store | S | P2 |
| Empty-diff sentinel in `ProposalDiffView` | reuse pattern | `ProposalDiffView.vue` | XS | P2 |
| Tri-state per-section accept/reject | UI + state | `SectionPatchView.vue` | M | P2 |
| Compare arbitrary two revisions | dropdown + store wiring | `PageRevisionView.vue`, `pageEditorStore.ts` | M | P2 |
| Section-aware revision diff toggle | reuse `sectionDiff` in revisions | `PageRevisionView.vue` | M | P2 |
| Memoize section diff stats | computed map | `SectionPatchView.vue` | XS | P3 |
| `overflow-wrap` fix | css tweak | three view stylesheets | XS | P3 |
| Virtualize large diffs | RecycleScroller above N lines | three views | L | P3 |
| A11y / keyboard polish on checkboxes | aria-live, accesskey | `SectionPatchView.vue` | S | P3 |
| "Accept into draft" affordance | new action | `ProposalDiffView.vue`, store | L | P3 |

## Recommended next slice (single follow-up PR)

- Land the four P1 items as one focused "diff readability" PR: visible stale banner, context-line collapse, word-level intra-line diff, theme-token colors.
- All four share the same three files (`PageRevisionView.vue`, `ProposalDiffView.vue`, `SectionPatchView.vue`) plus `sectionDiffUtils.ts` for the word-diff helper -- one round of touch, one round of vitest updates.
- Add a `diffWordsInLine(change: Change)` helper to `sectionDiffUtils.ts` with unit tests; keep line-level diff as the data source so existing tests stay valid.
- Empty-diff sentinel + heading-normalization match are cheap drive-bys worth bundling if review bandwidth allows.

## References

- `client/src/components/PageEditor/PageRevisionView.vue:13, 40-54, 64-93, 116-146`
- `client/src/components/PageEditor/PageRevisionList.vue:49-78`
- `client/src/components/PageEditor/sectionDiffUtils.ts:86-131, 198-217`
- `client/src/components/PageEditor/ProposalDiffView.vue:25-77, 99-121`
- `client/src/components/PageEditor/SectionPatchView.vue:24-72, 107-141`
- `client/src/components/PageEditor/PageRevisionView.test.ts:31-155`
- `client/src/components/PageEditor/SectionPatchView.test.ts`, `ProposalDiffView.test.ts`
- `client/src/stores/pageEditorStore.ts:62-86, 391-410, 451-465`
- `client/src/stores/pageEditorStore.test.ts:1065-1251`
- `client/src/components/PageEditor/PageChatPanel.vue:260-267, 463-475` (stale detection feeding diff views)
- `client/src/utils/navigation/navigation.yml:733-746`
- `lib/galaxy_test/selenium/test_history_pages.py:498-539`
- `lib/galaxy_test/selenium/test_pages.py:160-198`
- `vault/projects/history_markdown/HISTORY_MARKDOWN_ARCHITECTURE.md:360, 515, 555`
- galaxyproject/galaxy#22361
