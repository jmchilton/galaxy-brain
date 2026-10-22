# Scope evaluation (round 2, after re-scope)

**Recommendation: keep the scope as implemented, with no further scope change.** The round-1 expansion (Scope E: GCollapse marker, settle wait in the shared helper, discarded and deferred button checks) is in place. None of the remaining candidates is a modest addition:
- **The queued disabled-edit-tooltip bug, even the smallest form of its fix.** That form is B1: switch the `ContentOptions.vue` edit button to GButton's `tooltip`/`disabled-title` props. It is one file and follows the established pattern, which 22 `client/src` files use and which is on this base via 7db6679d6aa. But it also moves the *enabled* edit button to GTooltip. GTooltip renders an always-mounted `.g-tooltip`. The framework's `tooltip_balloon` (`.tooltip, .g-tooltip-d`) doesn't match it, so this branch's own restored `edit` hover checks in the ok and deferred states would break. The change can't land without a framework tooltip helper that understands GTooltip, which affects every tooltip test under both backends. Keep it as its own issue.
- An `assert_aria_disabled` helper would have two callers.
- Extending the settle wait to `history_panel_item_body_component` and `history_panel_ensure_showing_item_details` would protect against a race that no current caller can hit.
- Fully regenerating `schema.ts` would pull in unrelated drift.
- Removing the `history_panel_create_new` sleep would change a helper with 7 callers, for no change to this issue.

## Possible Decompositions
The branch is about 103 lines added and 22 removed across 8 files. Only one line is generated (`schema.ts`). The commit order after the round-2 baseline refactor maps onto these splits:

1. **One PR (as is).** Marker, then helper wait, then fix, then discarded and deferred checks, then the two sleep-removal polish commits.
2. **Infrastructure first, then tests.**
   - PR 1: the GCollapse `g-collapse-shown` marker, its vitest, the public-class registry entry, and the helper wait with the `details_expanded` selector (commits 1-2). It could target `release_26.2` or `dev`.
   - PR 2: the #24377 fix, the discarded and deferred checks, and the sleep removals (commits 3-6). It lands after PR 1.
3. **Fix plus infrastructure, with the polish split off.**
   - PR 1: commits 1-4.
   - PR 2: the dbkey sleeps and the trailing `UX_RENDER` sleep (commits 5-6). This is a pure test-speed change, and commit 6 needs commit 2.

## A. As implemented (recommended)
Restore `_assert_buttons` and fix the `info_button` and `edit_button` selectors and the tooltips. Add a `g-collapse-shown` marker to galaxy-ui `GCollapse` and wait on it in `history_panel_click_item_title(wait=True)`. Check buttons in the discarded and deferred tests (discarded edit by `aria-disabled`), and remove the file's fixed sleeps.

| Pros | Cons |
| --- | --- |
| - Covers #24377 plus every state the file sets up<br>- The reusable piece (marker plus helper wait) is built, and the issue's case goes through it<br>- Green under both backends; reviews 1 and 2 and Codex found no bugs | - Touches a shipped UI component on a release branch, though the change only adds a class<br>- The discarded edit tooltip is checked by a stand-in attribute, not by the tooltip itself<br>- The helper wait changes timing for about 23 call sites; only CI runs them all |

## B. Also fix the disabled edit-button tooltip (queued issue)
Switch the `ContentOptions.vue` edit button to GButton's `tooltip` and `disabled-title` props, or make `vGTooltip` show on `aria-disabled` elements. Then teach the framework tooltip helpers about GTooltip's always-mounted `.g-tooltip`, so the discarded test can hover-assert "This dataset is not yet editable."

| Pros | Cons |
| --- | --- |
| - Fixes a real user-facing bug that this branch's tests exposed<br>- Lets the discarded test assert the tooltip instead of `aria-disabled` | - A UI behavior change in a component the branch doesn't touch, with three competing designs (local switch, app-wide directive change, audit), so it needs a design call<br>- A framework tooltip helper for GTooltip affects every tooltip test under both backends<br>- The issue draft says to check `dev` first, and the bug predates 26.2 in another form<br>- It doubles the branch and turns a test-coverage PR into a UI fix |

<details><summary>Why this isn't "a related bug in touched code"</summary>

The process leans toward fixing related bugs in code the branch touches. This bug sits next to the branch, not in it:
- The branch touches the test, `navigation.yml`, the selenium helper, and `GCollapse`.
- The bug lives in `ContentOptions.vue` and `vGTooltip.ts`.

The design choice also isn't local. Option 2 changes tooltip behavior for every `v-g-tooltip` user that has `:disabled`. That is wider than a release-branch test fix should decide on its own. Option 1 alone is evaluated separately as B1.

</details>

## B1. Only the `ContentOptions.vue` switch (issue fix option 1, without the directive change)
Replace `v-g-tooltip.hover` plus the `editButtonTitle` computed with `tooltip`, `title="Edit attributes"` and `:disabled-title="'This dataset is not yet editable.'"`. Keep `:disabled`, so `aria-disabled="true"` stays.

| Pros | Cons |
| --- | --- |
| - One file, following an established pattern: 22 `client/src` files use `disabled-title`<br>- Users see why the button does nothing<br>- Needs no `vGTooltip` change, and the hover support (7db6679d6aa) is on `release_26.2` (checked with `merge-base --is-ancestor`) | - It also moves the *enabled* edit tooltip to GTooltip (`.g-tooltip`, `sr-only` while hidden). `tooltip_balloon`/`get_tooltip_text` only match `.tooltip, .g-tooltip-d`, so the branch's restored `edit` checks in the ok, dbkey and deferred tests would fail<br>- Making them pass needs the GTooltip-aware framework helper, which brings back the cost of B<br>- Mixes a UI fix into a test-coverage PR, and the queued issue still says to check `dev` first |

## C. `aria-disabled` smart-component helper
Add something like `SmartTarget.assert_aria_disabled()` or `assert_disabled_including_aria`. Use it in the discarded test and at `test_workflow_extraction.py:202`.

| Pros | Cons |
| --- | --- |
| - Hides the Selenium/Playwright split: Selenium's `is_enabled()` ignores `aria-disabled` | - Only two callers<br>- If B lands, the discarded test hover-asserts instead, and that caller goes away<br>- Adds a framework API on a release branch for a one-line check |

## D. Extend the settle wait to the other "details shown" helpers
Wait on `details_expanded` in `history_panel_item_body_component(wait=True)` and in the already-showing branch of `history_panel_ensure_showing_item_details`. Review 2 flagged the second.

| Pros | Cons |
| --- | --- |
| - Every "details shown" helper would mean "settled"<br>- About 3 lines in the code the branch already touches | - No current caller hovers inside an item that is still expanding through these paths<br>- Playwright's plain `click` waits for actionability, and only `_hover` and `move_to_and_click` force<br>- Changes timing for more callers without a failure to justify it |

<details><summary>Caller survey</summary>

- `history_panel_ensure_showing_item_details`, already-showing branch:
  - It is reached only when details are already displayed.
  - Its callers are `hda_click_primary_action_button` (`test_tool_form` ×4, `test_custom_tools`), `test_history_panel:160`, `test_collection_edit:47` and `test_visualizations:83`.
  - None of them expands without waiting first. The non-waiting title clicks in `test_tool_form:37/92` and `navigates_galaxy:667` only read the peek or click the title-bar display button, which sits outside the collapse.
- `history_panel_item_body_component(wait=True)`:
  - `test_history_dataset_state:35` calls it after `_prepare_dataset`, which already waited for the expand to settle.
  - `test_history_panel:161` calls it after `ensure_showing`.

</details>

## E. Contract to the alt (`_alt_original_scope`)
Test-only: restore the checks, with a test-local settle wait on GCollapse's inline style.

| Pros | Cons |
| --- | --- |
| - No client or UI change on the release branch<br>- Already pushed as an alt | - The selector depends on GCollapse's inline style<br>- The race stays for other callers<br>- Discarded and deferred stay unchecked<br>- It reverses a re-scope that has already been reviewed |

## F. Regenerate `schema.ts` in full
Run `client/navigation_to_schema.mjs` instead of hand-adding the `details_expanded` line. The issue proposal suggested it, and round 1 listed it as F.

| Pros | Cons |
| --- | --- |
| - Clears the yml/schema drift | - It still pulls in drift that predates the branch (`visualize_button`, `dataset_operations_dropdown` and others) that isn't about #24377<br>- `edit_button` was never removed from `schema.ts`, so the branch needs only the one line<br>- Better as its own commit on `dev` |

## G. Remove the `UX_RENDER` sleep in `history_panel_create_new`
The polish debrief named it as out of scope. The helper already waits for the current history to switch, then sleeps.

| Pros | Cons |
| --- | --- |
| - The last fixed sleep on this file's path | - A shared helper with 7 test callers, plus indirect ones, and nothing to wait on in its place has been identified<br>- Unrelated to #24377's buttons<br>- Saves only a few seconds |
