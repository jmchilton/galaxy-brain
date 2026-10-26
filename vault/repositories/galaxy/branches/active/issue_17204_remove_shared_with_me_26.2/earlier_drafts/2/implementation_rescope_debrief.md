# Rescope debrief

Scope evaluation (now `earlier_drafts/1/scope_evaluation.md`) recommended a modest expansion; implemented as recommended. Original scope kept as `issue_17204_remove_shared_with_me_26.2_alt_original_scope` (`alts/original_scope.md`). Head `cbdc2e042f6`.

## Added
- `WorkflowsManager.unshare_with` override: removing a share (recipient- or owner-side) also deletes that recipient's `StoredWorkflowMenuEntry` bookmark; previously the bookmark returned on re-share. API tests with two recipients + owner bookmark; red against base manager.
- Client wrappers `unshareHistoryWithMe`, `unshareVisualizationWithMe` (alongside `unshareWorkflowWithMe`); card/row actions route through them.
- Bulk "Remove from Shared (N)" in Histories Shared with Me and Workflows Shared with Me (existing `useSelectedItems` selection + footer, owner bulk actions stay hidden), batch op in shared visualizations grid. Per-item loop, continues past failures, reports them.
- Keyboard Delete/Backspace does nothing in shared views (safer than an unshare one keypress away).
- Hidden select gates in HistoryCard/HistoryCardList/WorkflowCard loosened for shared views only (E2E caught the history one).
- E2E `test_bulk_unshare_with_me` (3 shared, remove 2, third stays); setup helper generalized to share several histories.

## Left out (per scope eval)
Share-time ordering (needs migration → dev), shared-with-me pages list, options-object refactor, cross-type client helper.

## Reviews
`subagents/normal_review_rescope_bookmarks.md`, `subagents/normal_review_rescope.md`: approve, nits applied or explained.

## Tests
vitest History/Workflow/Grid/api 546 passed; type-check clean; workflow sharing API 14 passed; E2E bulk + both single-item tests pass (Playwright).
