# Test Challenges Debrief

Run via claude-opus-5-5 at default effort.

Fresh pass after re-scope. No test changes needed; no commits. Baseline tests commit `5435b4e10c9` still first. Status: not blocked.

## Unit tests

- `ContentOptions.test.ts` (Baseline, 7 cases): pins aria-disabled + no `edit` emit for non-editable states; Selenium only covers `discarded`. Kept. Only mock is `createTestingPinia`.
- `GCard.test.ts` `describes a disabled %s button with its title` (2 cases, new in re-scope): asserts the a11y surface (`aria-describedby` → `role="tooltip"` text) for disabled primary/secondary actions. No Selenium covers a disabled GCard action tooltip, and GCard is a shared component, so unit layer fits. Verified red on base GCard.vue (`expected undefined to be defined` at the `aria-describedby` assertion), green on head. Kept.
- `JobInformation.test.js`: selector moved `title` → `data-title`, follows the GButton tooltip change. Kept.
- 41/41 pass across the three files on head (node 22.20.0).

## E2E

- `test_history_dataset_state.py` `assert_tooltip_text(edit_button, "This dataset is not yet editable.")` is the red-to-green check for the issue; `navigates_galaxy.get_tooltip_text` gained a GTooltip (`data-show`) branch. Not run here (another agent owns Playwright in this worktree).
- `workflow_card_button` selector changed to `button[...][data-title=...]`; callers should be exercised by the Playwright run.
- No tests for HistoryNavigation / MultiviewPanel / WorkflowPublishedButtons / RuleCollectionBuilder disabled titles. These reuse the same GButton `tooltip` path covered by the GCard unit test and history Selenium check; a per-site Selenium hover test adds little. Optional: one anonymous-user published-workflow hover check for "Log in to run workflow".

## Not acted on

- Nothing dropped: no implementation-mirroring, layout faking, or E2E-duplicated unit tests remain (earlier pass already dropped the ContentOptions tooltip unit test).
