# Re-scope debrief

The first scope evaluation recommended expanding to Scope E. I implemented all three pieces. The original scope is kept in the alt branch `issue_24377_history_item_buttons_26.2_alt_original_scope` (`db138499905`; see [alts/original_scope.md](alts/original_scope.md)).

## What changed
1. **`d8c8c893fce`: GCollapse marker.** `client/packages/ui/src/components/GCollapse.vue`, in the in-repo `@galaxyproject/galaxy-ui` workspace package, gets an `isShown` ref.
   - It renders as the `g-collapse-shown` class.
   - It is set on `transitionend` while open, and on mount when the collapse starts open.
   - It is cleared by the sync watcher on any toggle.
   - New `GCollapse.test.ts` has 5 cases. It went red before green.
2. **`17fb861cd42`: settle wait in the shared helper.**
   - `content_item.details_expanded` is now `${_} > .g-collapse-shown`, replacing the inline-style match.
   - `history_panel_click_item_title(wait=True)` waits on it in the open path.
   - The test-local wait was removed.
3. **`41173e686b5`: button checks for discarded and deferred datasets.**
   - Both states check title tooltips (display, delete), info, and that download is hidden.
   - Deferred also checks edit ("Edit attributes").
   - For discarded, the edit button is checked for `aria-disabled="true"` and is not hovered.

## New finding, not fixed here
The discarded dataset's disabled edit button never shows "This dataset is not yet editable.":
- `vGTooltip` skips `aria-disabled` elements.
- The directive also blanks the native `title`.

This isn't new in 26.2: on 26.1 the button was natively disabled. Fixing it needs two things:
- moving `ContentOptions` to GButton `tooltip` + `disabled-title`, which is a UI change on the release branch
- making the framework tooltip helpers understand the always-mounted `GTooltip`

The re-scope rule says further scope changes go to John, so I queued it for filing at `vault/agents/gx_issues/to_file/history_item_disabled_edit_tooltip.md`.

## Validation
- **`test_history_dataset_state.py`:** 4/4 under Playwright and 4/4 under Selenium.
- **Other callers of the changed wait, under Playwright:**
  - `test_uploads::test_upload_file` passes.
  - `test_history_panel::test_refresh_preserves_state` passes. It covers both `wait=True` and `ensure_showing_item_details`.
  - `test_collection_edit::test_change_datatype_simple_list` fails at line 34, before it reaches the helper. The "Change Datatype" tab is missing locally because the local server has no Celery. That is an environment problem; CI runs the rest.
- **Client vitest:** `packages/ui/src/components/`, `DetailBlock.test.ts` and `History/Content/` pass, 21 files and 138 tests. Review 2 also ran `MarkdownGalaxy.test.js`.
- **Not run:** the Tool Shed's `galaxyUi.test.ts`, because its frontend has no `node_modules` locally.
- **Reduced motion:** no `prefers-reduced-motion` or `transition: none` rule targets `.g-collapse`. A zero-duration transition, which would never fire `transitionend`, can't happen for history items.
- **Review:** review 2 found the branch ready to ship ([subagents/review_2.md](subagents/review_2.md)).
