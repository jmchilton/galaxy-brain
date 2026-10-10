# Debrief: gmodal_dialog_unnamed

## Research

- dev sha: `20f365a2654751ba0f390733f261199ceb3f272d` (fresh `origin/dev`, 2026-10-10).
- Scratch worktree: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/8085a6b3-fc13-41f7-b964-fa636a69fe53/scratchpad/C/wt` (untracked repro test left in place).
- Repro: `client/src/components/BaseComponents/GModalAccessibleName.test.ts`, node 22.20.0. Both tests red on dev, received accessible name `""` for the dialog and for the close button. Uses jest-dom `toHaveAccessibleName` (dom-accessibility-api), already in vitest setup, so it's a real computed-name check, not an attribute check.
- Fix sanity: 4-line temp edit (`titleId` from `currentId`, `:id` on GHeading, `aria-labelledby` on dialog, `title="Close"` on close GButton) → green at medium and `size="large"` (separator wrapper gets the id, name still exact). Existing `GModal.test.ts` passes. Reverted.
- Found in addition to the BUGS_FOUND row: the close × (`GButton icon-only`, icon only) is unnamed too. Folded into the same issue, since it's the same component and the same migration regression.
- Origin: `GModal` added in #20168 (commit `7dc48c872f1`, 2025-05) and never named its dialog. bootstrap-vue `BModal` did name it: `computedModalAttrs` sets `aria-labelledby` → `modalTitleId` when titled, has an `ariaLabel` prop, and `headerCloseLabel` defaults to `"Close"` (`node_modules/bootstrap-vue/src/components/modal/modal.js`; the Galaxy patch doesn't touch modal). Regression came in via the migrations: #20375 (SelectionDialog), #22114, #23023 (final batch), tracked by #21976. No `BModal` left in `client/src`.
- Reusable pattern: `GPopover.vue` `dialogName()` (title id → `ariaLabel` prop → trigger), from #23731. The proposal mirrors it. `useUid` / `currentId` already exist in GModal.
- Callers: 62 files use `<GModal`. The `header` slot replaces `title` in 4 (`JobStepJobs`, `SelectionDialog`, `UploadMethodModal`, `ReviewCleanupDialog`). It sits next to a title in 2 (`PageEditorView`, `WorkflowCardList`), and that's why labelling from the whole header is rejected. GModal doesn't set `inheritAttrs: false`, so `aria-label` already falls through to `<dialog>`.
- Play lane workaround confirmed on `vitest_story_play`: `WorkflowMissingToolsRequest.stories.ts` uses `findByRole("dialog")`, then a heading inside it.
- Duplicates: REST search hit the rate limit (parallel drafters), so the searches ran over GraphQL instead: "GModal aria", "GModal accessible", "modal aria-labelledby", "dialog accessible name", "modal close button aria-label", "GModal in:title", "unnamed dialog", "aria-labelledby dialog". No match. Nearest hits: #24008 (open PR, tag dialog keyboard fixes; doesn't touch GModal naming), #23830 (Vue 3 a11y checklist; no GModal item), #23464 (GButton sweep; no modal close label).
- Unverified: real screen-reader output; not run in a browser. The name is computed by dom-accessibility-api under happy-dom. Native `<dialog>` naming has no content fallback per the ARIA spec, so the result should match browsers.
- `WorkflowMissingToolsRequest.vue` was born on GModal (`0e19e645c44`), never BModal, so the table's BModal column is what BModal would give the same modal (from `modal.js`), not a measured before-state.

## Review round (subagent)

- Repro rerun: both tests still red on dev 20f365a2654. The 4-line fix is green for a medium modal, a large modal, a caller-supplied `id` and a header slot with `aria-label`; the fix was reverted.
- Fixed the table header: `WorkflowMissingToolsRequest` was written on GModal and never ran on BModal. The column is now "what BModal gives the same modal".
- Dropped the new `ariaLabel` prop: a plain `aria-label` already falls through to `<dialog>` (verified), so untitled callers just pass it, and the doc comment says so. The prop is now a rejected alternative (GPopover needed one because its root is a host `<span>`).
- Kept the close-button name in the same issue (same header, same PR), framed as a second problem. Found a fifth untitled caller, `JobError.vue`. PR numbers verified (#20168, #20375, #22114, #23023, #21976, #23731).

## Leftover

- Not checked with a real screen reader or browser.
- John may prefer a typed `ariaLabel` prop for discoverability in the published galaxy-ui package; it's laid out as an alternative.
- Overlaps with the Heading proposal on the title `id`; the two don't clash.
