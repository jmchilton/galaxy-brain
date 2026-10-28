Run via claude-opus-5-5 at default effort.

# Thermo-nuclear code quality review (re-harden, post scope expansion)

Verdict: clean, no code changes. Branch is already the "code judo" move - it deletes logic rather than adding it: two hand-rolled title computeds (ContentOptions, WorkflowPublishedButtons) and the `TooltipOnHover` wrapper component disappear in favor of GButton's existing `tooltip` / `disabled-title` API. Net +101/-52, mostly tests. No file crosses 1k lines it wasn't already over (GCard.vue pre-existing), no new conditionals in unrelated flows.

## Acted on

- Nothing; no findings warranted a change.

## Not acted on

- `editDisabled` state list in ContentOptions duplicated by test `NOT_EDITABLE_STATES` - pre-existing; shared constant is scope creep for 26.2.
- Selenium `assert_tooltip_text` dual path (GTooltip via `aria-describedby` + `.g-tooltip`, else legacy balloon) couples to galaxy-ui markup; acceptable while `v-g-tooltip` and GTooltip coexist. Remove fallback when `v-g-tooltip` is gone.
- RuleCollectionBuilder keeps bare `<div class="menu-option">` wrappers where `TooltipOnHover` was; preserves footer layout/CSS. Folding class onto GButton is a styling risk not worth it here.
- WorkflowPublishedButtons anonymous case: old "Log in to edit Workflow" branch was dead (button only rendered for non-shared owned workflows); dropping it is a correct simplification, not a behavior loss.
- `workflow_card_button` selector now keys on `data-title` - matches GButton's tooltip contract (native `title` is removed when `tooltip` is set); JobInformation test updated the same way. Consistent.

## Validation

No code changed; no tests rerun (Playwright run owned by another agent).

<details>
<summary>Details</summary>

Reviewed full `git diff origin/release_26.2...HEAD` (7 commits, 13 files). GButton (`client/src/components/BaseComponents/GButton.vue`) already implements `tooltip`, `tooltip-placement`, `disabled-title`, `data-title`, aria-disabled click guard, and tests for each in `GButton.test.ts` - branch reuses the canonical abstraction everywhere instead of `v-g-tooltip`, which skips aria-disabled buttons (root cause of #24531). New tests: ContentOptions disabled/enabled edit (baseline), GCard disabled action tooltip (it.each over primary/secondary), Selenium tooltip assertion in `test_history_dataset_state.py` replacing the "never shown" comment. Earlier pass (`earlier_drafts/1/thermo_nuclear_review.md`) findings still hold; scope expansion (GCard, RuleCollectionBuilder, TooltipOnHover deletion) follows the same pattern with no new smells.
</details>
