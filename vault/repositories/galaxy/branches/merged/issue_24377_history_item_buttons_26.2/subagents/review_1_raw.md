# Review 1 (raw) - issue_24377_history_item_buttons_26.2 @ 1755ced7f18

## Verdict

Approve. Small, correct, right-sized for `release_26.2`. No real bugs. Below: a few points to consider and optional nits. None block the merge.

## Real bugs

None found.

Checked:
- Selectors match current markup: `.info-btn` with `title="Dataset Details"` (DatasetActions.vue:153), `.edit-btn` with title "Edit attributes" (ContentOptions.vue:145; it reads "This dataset is not yet editable." only for discarded/new/upload/queued/running/waiting, and `_prepare_dataset` waits for hid OK first), `.display-btn` with title "View", and `.download-btn` with title `Download (<size>)`, or plain "Download" when there is no `file_size` (DatasetDownload.vue:34-39).
- Nothing else used `info_button` / `.params-btn`, so the selector fix has no other effect. Dropping `rerun` from `BUTTON_TOOLTIPS` is safe: `_assert_buttons` never asks for it, and `hda_click_primary_action_button(..., "rerun")` uses the yml selector, not this dict.
- `edit_button` was already in `schema.ts` (yml/schema drift), so only `details_expanded` needed adding there. It sits right after `details`, the same spot a regen would put it.
- `assert_tooltip_text_contains` already exists in navigates_galaxy.py:3017. This is its first caller under lib/galaxy_test, which is fine.
- `details_expanded` cannot match early through a nested GCollapse: `DatasetDetails` / `DatasetActions` / `DatasetMiscInfo` don't use GCollapse, and GCollapse is a direct child of the `.content-item` root in ContentItem.vue:433.

## Considerations (not bugs)

1. **Coupling to galaxy-ui internals.** `[style*="overflow: visible"]` depends on how GCollapse is built: it sets inline `overflow: visible` in `onTransitionEnd` and `onMounted`. If galaxy-ui later moves that to a class, or drops the inline style, the wait never matches. That is a loud timeout, not a silent pass, so the risk is acceptable. On a release branch it is the right call, because the alternative (a client change that adds a "shown" class or data attribute) touches shipped UI. Suggested follow-up on dev or in galaxy-ui: have GCollapse set a stable signal when it emits `shown` (e.g. a `g-collapse-shown` class or `data-state="shown"`), then point `details_expanded` at it.
   - Chromium and Firefox both serialize the inline style as `height: auto; overflow: visible;`, so the substring holds on both backends.
   - Hang case: if `transitionend` never fires (height 0 -> same height), overflow stays `hidden`. Here `px-2 pb-2` padding plus content keeps scrollHeight > 0, and if it did happen the real UI would be clipped too, so a timeout there would be a true positive.

2. **Should the wait live in `navigates_galaxy.py`?** The natural home is `history_panel_click_item_title(wait=True)` (or `history_panel_ensure_showing_item_details`), which today only waits for `.details` to be visible. `.details` can be "visible" while the collapse is still clipping it. Moving the wait there would protect every caller that hovers or clicks inside an expanded item, e.g. `hda_click_primary_action_button`. Playwright's non-forced click already waits for hit-target actionability, so clicks are mostly safe today; hover with `force=True` is the gap. On a release branch where the full E2E suite can't run locally, keeping it local to this test is the right blast radius. Note it as a dev follow-up, ideally together with item 1. The collapse branch (`details_displayed` true -> `wait_for_absent_or_hidden`) needs no change.

3. **Download substring.** `"Download ("` is the right strength. It proves the size suffix is rendered, which is stricter than `"Download"`, which would also match the no-size fallback. It doesn't pin `bytesToString` formatting. An exact match on the 1.fasta size would be stronger but couples the test to size formatting. Optional only.

4. **CI flakiness.** The added wait removes the known Playwright race. The remaining risks are pre-existing in `get_tooltip_text`: `_clear_tooltip` + hover + `click_center` between buttons. The four title/action buttons sit close together, but each hover clears the old balloon first. The implementer's 3/3 repeat of `test_dataset_state` under Playwright is reasonable evidence. No added `sleep` is needed.

## Nits (optional)

a. Tighten the selector to the direct child. It is cheap and documents that this is the item's own collapse:
```diff
-      details_expanded: '${_} .g-collapse-open[style*="overflow: visible"]'
+      details_expanded: '${_} > .g-collapse-open[style*="overflow: visible"]'
```
(schema.ts is unaffected. Re-run the file once under both backends if taken.)

b. The `PARTIAL_TOOLTIP_BUTTONS` comment repeats the dict value. Either drop it, or name the constant for what it does:
```diff
-# Download tooltip ends with the file size.
-PARTIAL_TOOLTIP_BUTTONS = {"download"}
+# tooltip text continues past the expected value (e.g. file size)
+PARTIAL_TOOLTIP_BUTTONS = {"download"}
```
Leaving it as-is is also fine. The name `PARTIAL_TOOLTIP_BUTTONS` reads clearly next to `assert_tooltip_text_contains`.

c. Naming `details_expanded`: fine, and it pairs with `details`. `details_expand_settled` would be more precise, since the item is "expanded" (class `g-collapse-open`) before the transition finishes, but that is not worth a churn.

Comment density otherwise matches the surrounding code: one yml comment and one test comment, each about a non-obvious constraint.

## Reuse / abstraction

- Reuses the existing `assert_tooltip_text_contains`, `history_panel_item_component`, and the component `wait_for_present`. It adds no new helpers.
- It does not leave a reusable "wait for history item expand to settle" abstraction. See considerations 1 and 2 for the dev follow-up. That's acceptable for this scope.
