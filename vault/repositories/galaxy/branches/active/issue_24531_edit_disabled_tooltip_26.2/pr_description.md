Fix 🎯 #24531 - disabled buttons (history item edit and others) never showed the tooltip explaining why they're disabled.

![Disabled history item edit button showing "This dataset is not yet editable."](screenshots/01b_history_edit_disabled_tooltip_crop.png)

Hovering the pencil on a queued, running or otherwise not-ready dataset showed nothing - no balloon, no native `title` - so users got no hint why it did nothing. The text was in the DOM; `v-g-tooltip` refuses to show on `aria-disabled` elements and blanks the native `title`, so nothing ever displayed it. The same pattern silenced disabled-reason titles elsewhere, e.g. a deleted workflow's Run button, or the rule builder's Finish button, whose "Button is disabled due to validation errors. Please see alerts above." was hidden exactly when it was needed:

![Deleted workflow's Run button showing "You cannot run a deleted workflow. Restore it first."](screenshots/02b_workflow_card_run_disabled_tooltip_crop.png)

***The fix adds no new tooltip mechanism: each site moves to GButton's existing `tooltip` / `disabled-title` props, which already keep hover working on disabled buttons, and `v-g-tooltip` itself is untouched.***

***Scope is limited to disabled buttons whose title tells the user why they can't act (log in, restore first, not ready yet, fix validation errors);*** about 10 other disabled buttons using `v-g-tooltip` remain, mostly bulk-action buttons in history, workflow and dataset lists that are disabled only while a request runs, and are left for `dev`. (The history switch button was converted for its "Log in to…" reason; its in-flight "Switching history..." text came along with it.)

***It targets `release_26.2` because it's a user-visible bug fixed with an API GButton already ships;*** if that's too much for a release branch, 🌿[`_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24531_edit_disabled_tooltip_26.2_alt_original_scope) is the narrow fallback.

<details><summary>Changes</summary>

- `ContentOptions.vue`: edit button uses `tooltip` + `disabled-title="This dataset is not yet editable."`; `editButtonTitle` computed dropped.
- `GCard.vue`: primary/secondary actions use `tooltip`, so caller titles like "Log in to run workflow" and "…Restore it first." show when disabled (workflow, tool, history, page and curated workflow cards).
- `HistoryNavigation.vue`, `MultiviewPanel.vue`, `WorkflowPublishedButtons.vue`: same conversion. The history switch button, also disabled while a switch is in flight, now says "Switching history..." then.
- `RuleCollectionBuilder.vue`: Reset/Finish use GButton tooltips; the now-unused `TooltipOnHover.vue` is deleted.
- GButton tooltips drop the native `title` in favor of `data-title`, so `JobInformation.test.js` keys on `data-title`; the unused `workflow_card_button` selector in `navigation.yml` is kept consistent (its old form never matched).
- `navigates_galaxy.py`: tooltip text helper understands GTooltip (waits for the `.g-tooltip` with `data-show="true"`); `test_history_dataset_state.py` now asserts the edit button's tooltip instead of only `aria-disabled`.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

<details><summary>Risk Details</summary>

- Every converted button (history item edit, history navigation, multiview, published workflow Edit, rule builder Reset/Finish, GCard actions) loses its native `title`; downstream Selenium/Playwright code selecting them by `title` must use `data-title`. The one Selenium test that did (`test_tool_discovery_view.py`, tool card favorite button) now reads `data-title`. Screen readers get the text via GTooltip's `aria-describedby` instead.
- Targets `release_26.2`; the bug isn't a 26.2 regression (26.1's disabled `BButton` link never got hover either), but GCard and the rule builder are touched on a release branch.

</details>

## Context

Found while working on 🎯 #24377. Alternative kept on 🌿[`issue_24531_edit_disabled_tooltip_26.2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24531_edit_disabled_tooltip_26.2_alt_original_scope) - no GCard or rule builder changes and `TooltipOnHover.vue` kept; the narrowest 26.2 fix. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 6 items pass; disabled buttons now explain themselves.</summary>

- [x] What does the user see when it fails? Hovering or focusing a disabled button now shows a GTooltip that gives the reason, where before it showed nothing. Examples: "This dataset is not yet editable." (`ContentOptions.vue:143`), "You cannot edit a deleted workflow. Restore it first." (`WorkflowPublishedButtons.vue:79`), "Switching history..." (`HistoryNavigation.vue:82`), GCard action titles such as "Log in to run workflow" (`GCard.vue:862,891`), and the rule builder's validation-error title (`RuleCollectionBuilder.vue:575`).
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Mostly. `GCard.test.ts:71` follows `aria-describedby` to the `role="tooltip"` text, and `ContentOptions.test.ts:31,40` checks `aria-disabled` and that no `edit` event is emitted. `HistoryNavigation.test.ts:49` is weaker (shallow-mounted prop check, matching the file's style). The E2E check is `test_history_dataset_state.py:77` `assert_tooltip_text`.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The first commit touches only `ContentOptions.test.ts`.
- [x] Are the comments free of excess archeology? Yes. The stale "vGTooltip skips aria-disabled buttons" test comment is removed.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/pr_checklist/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: every disabled-reason tooltip silenced by the same cause is fixed.</summary>

- Expanded once from the original fix to GCard actions and the rule builder (shared-component fix covers many callers).
- Remaining `v-g-tooltip` + `:disabled` sites are mostly loading-only disables or titles that don't explain the disabled state.
- Rejected: making `v-g-tooltip` show on `aria-disabled` elements - app-wide behavior change duplicating GButton's `disabled-title`, too risky for 26.2.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/scope_evaluation/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Clean, no changes: the branch deletes logic in favor of GButton's existing API.</summary>

- Two hand-rolled title computeds and `TooltipOnHover.vue` removed.
- Not acted on: shared constant for the not-editable state list (scope creep), dual-path Selenium tooltip helper (needed while `v-g-tooltip` and GTooltip coexist).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/thermo_nuclear_review/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: the history switch button's tooltip while a switch is in flight.</summary>

The switch button is also disabled while `changingCurrentHistory` is true and showed "Switch to history" then; it now says "Switching history...", with a vitest red before the fix.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/codex_review/).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>No test changes needed; baseline tests stay first.</summary>

- `GCard.test.ts` disabled-action case verified red on base, green on head.
- Selenium `assert_tooltip_text` on the edit button is the red-to-green check for the issue.
- Per-site Selenium hovers for the other conversions add little over the shared GButton path already covered.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/test_challenges_debrief/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>None: every candidate is a consequence of the fix, not a behavior-preserving refactor.</summary>

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_24531_edit_disabled_tooltip_26.2/baseline_refactor/). Run via claude-opus-5-5 at default effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

Vitests for ContentOptions (baseline), GCard and HistoryNavigation disabled states; Selenium `test_history_dataset_state.py` asserts the edit button's "not yet editable" tooltip.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
